"""
metrics.py
===========
Takes an allocation result (from EITHER allocator.py or baseline.py --
they produce the same shape of output, which is the whole point) and
computes every number Siemens asks for in "Mandatory Quantitative
Outputs". Because it's one function, you call it once on your method's
results and once on the baseline's results, and the numbers are
guaranteed to be computed the exact same way both times -- fair comparison.
"""

import pandas as pd


def compute_metrics(result_df, battery_df):
    """
    result_df: output of allocate_batteries() or baseline_allocate()
               (columns: vehicle_id, priority, allocated_battery_id, status)
    battery_df: the full battery DataFrame WITH classification and
                suitability_score columns, used to look up details of
                whichever batteries were actually allocated.
    """
    total_vehicles = len(result_df)
    served = result_df[result_df["status"] == "SERVED"]
    unserved = result_df[result_df["status"] == "UNSERVED"]

    n_served = len(served)
    n_unserved = len(unserved)

    # % of High and Critical priority vehicles that were served
    high_crit_requests = result_df[result_df["priority"].isin(["High", "Critical"])]
    high_crit_served = served[served["priority"].isin(["High", "Critical"])]
    pct_high_crit_served = (
        round(100 * len(high_crit_served) / len(high_crit_requests), 1)
        if len(high_crit_requests) > 0 else 0.0
    )

    # Look up full battery details for every battery that got allocated
    allocated_ids = served["allocated_battery_id"].tolist()
    allocated_batteries = battery_df[battery_df["battery_id"].isin(allocated_ids)]

    # Safety check: count how many allocated batteries were unsafe.
    # This should ALWAYS be 0 -- if it's not, there's a bug in the
    # allocator, not something to "explain away".
    n_unsafe_allocations = (allocated_batteries["classification"] == "Unsafe/Quarantine").sum()

    avg_soh_allocated = round(allocated_batteries["SoH"].mean(), 1) if n_served > 0 else 0.0
    avg_suitability_allocated = round(allocated_batteries["suitability_score"].mean(), 1) if n_served > 0 else 0.0

    return {
        "total_vehicles": total_vehicles,
        "served": n_served,
        "unserved": n_unserved,
        "pct_high_critical_served": pct_high_crit_served,
        "unsafe_allocations": int(n_unsafe_allocations),
        "avg_soh_allocated": avg_soh_allocated,
        "avg_suitability_score_allocated": avg_suitability_allocated,
    }


def verify_constraints(result_df, battery_df, vehicle_df):
    """
    Runs the hard safety/logic checks Siemens lists under
    'Verification Rules'. Prints a clear pass/fail for each one.
    Run this EVERY time before you trust your results.
    """
    checks = {}

    served = result_df[result_df["status"] == "SERVED"]
    allocated_ids = served["allocated_battery_id"]

    # Rule 1: no unsafe battery was ever allocated
    allocated_batteries = battery_df[battery_df["battery_id"].isin(allocated_ids)]
    checks["No unsafe batteries allocated"] = (
        (allocated_batteries["classification"] != "Unsafe/Quarantine").all()
    )

    # Rule 2: no battery assigned to more than one vehicle
    checks["No duplicate battery assignment"] = allocated_ids.is_unique

    # Rule 3: no vehicle received more than one battery
    checks["No vehicle received multiple batteries"] = result_df["vehicle_id"].is_unique

    # Rule 4: every allocated battery meets that vehicle's min SoC
    merged = served.merge(vehicle_df, on=["vehicle_id", "priority"])
    merged = merged.merge(
        battery_df[["battery_id", "SoC"]],
        left_on="allocated_battery_id", right_on="battery_id"
    )
    checks["All allocations meet minimum SoC"] = (merged["SoC"] >= merged["min_acceptable_soc"]).all()

    print("\n--- Verification Checks ---")
    all_passed = True
    for name, passed in checks.items():
        status = "PASS" if passed else "FAIL"
        print(f"[{status}] {name}")
        if not passed:
            all_passed = False

    print("ALL CHECKS PASSED" if all_passed else "SOME CHECKS FAILED -- fix before submitting!")
    return all_passed
