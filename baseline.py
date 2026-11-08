"""
baseline.py
============
The FIXED comparison method Siemens specifies: "Highest-SoC-First".
Process vehicles in arrival order (the order they appear in the
dataset -- NOT sorted by priority), and give each one the available
battery with the highest SoC that meets its minimum requirement.

IMPORTANT: Never edit this file to "improve" it. Its entire purpose
is to stay exactly as specified so your comparison is fair and valid.
"""

import pandas as pd


def baseline_allocate(vehicle_df, battery_df):
    """
    vehicle_df: used in its ORIGINAL (arrival) order -- do not sort it.
    battery_df: must have 'classification' column already added.
    """
    used_battery_ids = set()
    results = []

    for _, vehicle in vehicle_df.iterrows():
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

        # The ONLY difference from allocator.py: pick highest SoC,
        # not highest suitability_score.
        best_battery = eligible.loc[eligible["SoC"].idxmax()]
        used_battery_ids.add(best_battery["battery_id"])

        results.append({
            "vehicle_id": vehicle["vehicle_id"],
            "priority": vehicle["priority"],
            "allocated_battery_id": best_battery["battery_id"],
            "status": "SERVED",
        })

    return pd.DataFrame(results)
