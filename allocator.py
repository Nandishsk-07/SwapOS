"""
allocator.py
=============
This is the "brain" of the project. Two strategies live here:

  1. allocate_batteries_optimal()  <- THE REAL METHOD (Hungarian Algorithm)
     Looks at ALL vehicles and ALL batteries together and finds the
     single best overall pairing, instead of deciding one vehicle at
     a time. This is what actually beats the baseline convincingly.

  2. allocate_batteries_greedy()   <- kept only as an internal sanity
     check / fallback reference, NOT used as the main submission.

WHY OPTIMIZATION BEATS GREEDY (the actual reasoning):
Greedy processes vehicles one at a time and commits immediately. If a
Low-priority vehicle happens to be considered before a Critical one,
greedy can hand it the best battery, leaving the Critical vehicle with
a worse option (or none). The optimizer instead sees the whole picture
at once and can say "give the good battery to the Critical vehicle
instead" -- a strictly better global outcome from the exact same data.

HOW THE OPTIMIZATION WORKS (Hungarian Algorithm via scipy):
We build a "cost matrix": rows = vehicles, columns = batteries PLUS
one "leave this vehicle unserved" option per vehicle (a dummy column).
Lower cost = more desirable pairing. The algorithm finds the
assignment (one battery, or "unserved", per vehicle) that makes the
TOTAL cost as small as possible.

  - Cost of matching vehicle i to battery j (if allowed) = 100 minus
    that battery's suitability score. So a great battery (score 95)
    costs only 5; a mediocre one (score 40) costs 60.
  - Cost of matching vehicle i to battery j (if NOT allowed -- unsafe,
    or battery SoC below vehicle's minimum) = a huge number, so the
    optimizer will basically never pick it.
  - Cost of leaving vehicle i unserved = UNSERVED_PENALTY[priority].
    This is set much higher for Critical/High priority (see config.py)
    than for Low priority. That's the entire trick that makes the
    algorithm protect high-priority vehicles: leaving a Critical
    vehicle unserved is "expensive", so the optimizer avoids it even
    if it means giving a Low-priority vehicle a worse battery instead.

Because "leaving someone unserved" is always a real, available option
in the cost matrix, the problem is always solvable -- there's no
scenario where the algorithm gets stuck.
"""

import numpy as np
import pandas as pd
from scipy.optimize import linear_sum_assignment

from config import PRIORITY_ORDER, UNSERVED_PENALTY, INFEASIBLE_COST


def allocate_batteries_optimal(vehicle_df, battery_df):
    """
    THE REAL METHOD. Global optimal matching using the Hungarian
    Algorithm (scipy.optimize.linear_sum_assignment).

    Inputs:
      vehicle_df  - DataFrame of vehicle requests
      battery_df  - DataFrame of batteries, MUST already have
                    'classification' and 'suitability_score' columns

    Returns:
      DataFrame: vehicle_id, priority, allocated_battery_id (or None), status
    """
    vehicles = vehicle_df.reset_index(drop=True)
    # Only ever consider batteries that are not outright unsafe.
    eligible_batteries = battery_df[
        battery_df["classification"] != "Unsafe/Quarantine"
    ].reset_index(drop=True)

    n_v = len(vehicles)
    n_b = len(eligible_batteries)

    # ---- Build the cost matrix -----------------------------------
    # Shape: n_v rows x (n_b real batteries + n_v dummy "unserved" slots)
    # We need exactly n_v dummy columns so that, in the worst case,
    # EVERY vehicle could be left unserved and the problem still solves.
    cost = np.full((n_v, n_b + n_v), fill_value=float(INFEASIBLE_COST))

    for i, vehicle in vehicles.iterrows():
        # Fallback of 0 (not "Low") is intentional: if an unexpected
        # priority string ever appears that isn't in UNSERVED_PENALTY,
        # we want it to be VISIBLE as the cheapest-to-skip vehicle
        # (rather than silently inheriting some other tier's weight),
        # so it surfaces obviously in a review of the results.
        penalty = UNSERVED_PENALTY.get(vehicle["priority"], 0)
        # Every dummy column offers the same "give up on this vehicle" cost.
        cost[i, n_b:] = penalty

        for j, battery in eligible_batteries.iterrows():
            if battery["SoC"] >= vehicle["min_acceptable_soc"]:
                cost[i, j] = 100 - battery["suitability_score"]
            # else: leave as INFEASIBLE_COST -- this pair is not allowed

    # ---- Solve ------------------------------------------------------
    row_ind, col_ind = linear_sum_assignment(cost)

    # ---- Translate the solution back into a results table -----------
    results = []
    for i, j in zip(row_ind, col_ind):
        vehicle = vehicles.iloc[i]
        if j < n_b:
            battery = eligible_batteries.iloc[j]
            results.append({
                "vehicle_id": vehicle["vehicle_id"],
                "priority": vehicle["priority"],
                "allocated_battery_id": battery["battery_id"],
                "status": "SERVED",
            })
        else:
            results.append({
                "vehicle_id": vehicle["vehicle_id"],
                "priority": vehicle["priority"],
                "allocated_battery_id": None,
                "status": "UNSERVED",
            })

    result_df = pd.DataFrame(results)
    # Restore original vehicle order for readability (Hungarian solves
    # all rows at once, order isn't guaranteed to match input order).
    result_df["_orig_order"] = result_df["vehicle_id"].map(
        {vid: idx for idx, vid in enumerate(vehicle_df["vehicle_id"])}
    )
    result_df = result_df.sort_values("_orig_order").drop(columns="_orig_order").reset_index(drop=True)
    return result_df


def sort_vehicles_by_priority(vehicle_df, priority_order):
    """Sort vehicles so highest priority is processed first (used by greedy only)."""
    df = vehicle_df.copy()
    priority_rank = {p: i for i, p in enumerate(priority_order)}
    df["_priority_rank"] = df["priority"].map(priority_rank)
    
    sort_cols = ["_priority_rank"]
    if "max_waiting_time_min" in df.columns:
        sort_cols.append("max_waiting_time_min")
        
    df = df.sort_values(by=sort_cols)
    return df.drop(columns="_priority_rank")


def allocate_batteries_greedy(vehicle_df, battery_df, priority_order=PRIORITY_ORDER):
    """
    FALLBACK / REFERENCE ONLY -- not the main submission.
    Kept so you can run it side-by-side and SHOW judges the difference
    between greedy and optimal on the exact same data, if asked.
    Processes vehicles one at a time (priority order), picks the best
    eligible battery available AT THAT MOMENT, and commits immediately.
    """
    vehicles_sorted = sort_vehicles_by_priority(vehicle_df, priority_order)
    used_battery_ids = set()
    results = []

    for _, vehicle in vehicles_sorted.iterrows():
        eligible = battery_df[
            (battery_df["classification"] != "Unsafe/Quarantine")
            & (~battery_df["battery_id"].isin(used_battery_ids))
            & (battery_df["SoC"] >= vehicle["min_acceptable_soc"])
        ]

        if len(eligible) == 0:
            results.append({
                "vehicle_id": vehicle["vehicle_id"],
                "priority": vehicle["priority"],
                "allocated_battery_id": None,
                "status": "UNSERVED",
            })
            continue

        best_battery = eligible.loc[eligible["suitability_score"].idxmax()]
        used_battery_ids.add(best_battery["battery_id"])
        results.append({
            "vehicle_id": vehicle["vehicle_id"],
            "priority": vehicle["priority"],
            "allocated_battery_id": best_battery["battery_id"],
            "status": "SERVED",
        })

    return pd.DataFrame(results)


# Convenience dispatcher so main.py can switch strategy via config.py
# without an if/else block cluttering main.py itself.
STRATEGIES = {
    "optimal": allocate_batteries_optimal,
    "greedy": allocate_batteries_greedy,
}


def allocate_batteries(vehicle_df, battery_df, strategy):
    """Run whichever strategy name is passed in (see config.ALLOCATION_STRATEGY)."""
    if strategy not in STRATEGIES:
        raise ValueError(f"Unknown allocation strategy '{strategy}'. Choose from {list(STRATEGIES)}")
    return STRATEGIES[strategy](vehicle_df, battery_df)
