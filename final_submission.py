"""
final_submission.py
=====================
Builds the ONE merged output table the problem statement asks for:
"Output file/table containing battery classifications and
battery-to-vehicle assignments."

Previously we had this split across two separate files
(battery_classifications.csv and our_allocations.csv). A judge
shouldn't have to cross-reference two CSVs to see, for a single
battery, both its health classification AND who it was given to
(if anyone). This file merges both into one row-per-battery table.
"""

import pandas as pd


def build_final_submission_table(battery_df, allocation_results):
    """
    battery_df: full battery DataFrame, must already have
                'classification', 'primary_risk_factor', and
                'suitability_score' columns.
    allocation_results: output of allocate_batteries_optimal()
                (or any allocator with the same shape) -- columns
                vehicle_id, priority, allocated_battery_id, status.

    Returns one row per battery, with:
      - all original health/classification/score columns
      - allocated_to_vehicle_id  (or "Unallocated")
      - allocated_to_priority    (or "-")
      - allocation_status        ("Allocated" / "Unallocated - Unsafe" /
                                   "Unallocated - Available")
    """
    df = battery_df.copy()

    # Only SERVED rows actually represent a real battery->vehicle link
    served = allocation_results[allocation_results["status"] == "SERVED"]

    # Build a lookup: battery_id -> (vehicle_id, priority)
    battery_to_vehicle = served.set_index("allocated_battery_id")[["vehicle_id", "priority"]]

    df["allocated_to_vehicle_id"] = df["battery_id"].map(battery_to_vehicle["vehicle_id"])
    df["allocated_to_priority"] = df["battery_id"].map(battery_to_vehicle["priority"])

    def status_row(row):
        if pd.notna(row["allocated_to_vehicle_id"]):
            return "Allocated"
        elif row["classification"] == "Unsafe/Quarantine":
            return "Unallocated - Unsafe"
        else:
            return "Unallocated - Available"

    df["allocation_status"] = df.apply(status_row, axis=1)

    # Fill blanks for unallocated batteries so the CSV reads cleanly
    df["allocated_to_vehicle_id"] = df["allocated_to_vehicle_id"].fillna("Unallocated")
    df["allocated_to_priority"] = df["allocated_to_priority"].fillna("-")

    # Put the most important columns first for readability
    front_cols = [
        "battery_id", "classification", "allocation_status",
        "allocated_to_vehicle_id", "allocated_to_priority",
        "suitability_score",
    ]
    other_cols = [c for c in df.columns if c not in front_cols]
    df = df[front_cols + other_cols]

    return df
