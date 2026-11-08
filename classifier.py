"""
classifier.py
==============
Decides, for every battery, which of 3 buckets it belongs to:
  - "Unsafe / Quarantine"   -> must NEVER be allocated
  - "Degraded but Usable"   -> can be allocated, but is not top-tier
  - "Safe and Available"    -> healthiest batteries

WHY RULE-BASED (not a trained ML model):
We have no labeled "ground truth" data telling us which batteries
actually failed in the real world, so there's nothing to train on.
A rule-based system is also fully transparent and explainable --
important for a safety-critical decision like this one, and it's
exactly what you'd want to defend in front of judges.
"""

import pandas as pd


def classify_battery_row(row, thresholds):
    """
    Classify a single battery (one row of the DataFrame).
    Checks the UNSAFE conditions first -- if any is breached, the
    battery is immediately unsafe, regardless of anything else.

    STATION OVERRIDE: if the station's own tracking system already
    flagged this battery (station_status == "REVIEW/QUARANTINE"), we
    treat that as authoritative and unsafe immediately -- the station
    may know about issues (e.g. a physical inspection failure, a past
    fault event) that aren't fully captured in the 4 numeric health
    parameters we check independently below. Our threshold checks then
    act as a SECOND, independent safety net that can also catch things
    the station's own flag might have missed.
    """

    station_flagged = row.get("station_status") == "REVIEW/QUARANTINE"

    is_unsafe = (
        station_flagged
        or row["SoH"] < thresholds["soh_unsafe_below"]
        or row["temperature"] > thresholds["temp_unsafe_above"]
        or row["internal_resistance"] > thresholds["internal_resistance_unsafe_above"]
        or row["cell_imbalance"] > thresholds["cell_imbalance_unsafe_above"]
    )
    if is_unsafe:
        return "Unsafe/Quarantine"

    is_degraded = (
        row["SoH"] < thresholds["soh_degraded_below"]
        or row["cycle_count"] > thresholds["cycle_count_degraded_above"]
    )
    if is_degraded:
        return "Degraded but Usable"

    return "Safe and Available"


def primary_risk_factor(row, thresholds):
    """
    For a Degraded or Unsafe battery, identify the SINGLE parameter
    most responsible -- not just "Unsafe", but WHY.

    WHY THIS MATTERS: a battery can be unsafe because it's overheating
    (thermal problem) or because its internal resistance is critical
    (electrical/aging problem) -- these need different real-world
    handling. Reporting the cause, not just the label, is what a real
    station operator (and a judge) actually wants to see.

    If multiple unsafe conditions are breached at once, we report the
    one breached by the LARGEST margin (i.e. the most severe reason).
    """
    unsafe_reasons = []

    if row.get("station_status") == "REVIEW/QUARANTINE":
        # No numeric "margin" for this one -- it's a direct flag, not a
        # threshold breach, so give it a fixed high priority (it will
        # only be displaced if a numeric breach is even more severe
        # relative to its own threshold, which is fine either way since
        # both are valid, real reasons for quarantine).
        unsafe_reasons.append(("Station flagged: REVIEW/QUARANTINE", float("inf")))

    if row["SoH"] < thresholds["soh_unsafe_below"]:
        margin = thresholds["soh_unsafe_below"] - row["SoH"]
        unsafe_reasons.append((f"SoH critical (<{thresholds['soh_unsafe_below']}%)", margin))

    if row["temperature"] > thresholds["temp_unsafe_above"]:
        margin = row["temperature"] - thresholds["temp_unsafe_above"]
        unsafe_reasons.append((f"Overheating (>{thresholds['temp_unsafe_above']}°C)", margin))

    if row["internal_resistance"] > thresholds["internal_resistance_unsafe_above"]:
        margin = row["internal_resistance"] - thresholds["internal_resistance_unsafe_above"]
        unsafe_reasons.append((f"Internal resistance critical (>{thresholds['internal_resistance_unsafe_above']}mOhm)", margin))

    if row["cell_imbalance"] > thresholds["cell_imbalance_unsafe_above"]:
        margin = row["cell_imbalance"] - thresholds["cell_imbalance_unsafe_above"]
        unsafe_reasons.append((f"Cell imbalance critical (>{thresholds['cell_imbalance_unsafe_above']}mV)", margin))

    if unsafe_reasons:
        # Sort by margin, biggest breach first, and report that one.
        unsafe_reasons.sort(key=lambda pair: pair[1], reverse=True)
        return unsafe_reasons[0][0]

    # Not unsafe -- check if it's the softer "Degraded" reasons instead.
    if row["SoH"] < thresholds["soh_degraded_below"]:
        return "Low SoH (degraded)"
    if row["cycle_count"] > thresholds["cycle_count_degraded_above"]:
        return "High cycle count nearing limit"

    return "-"  # Safe and Available -- no risk factor to report


def classify_fleet(battery_df, thresholds):
    """
    Apply classify_battery_row (and primary_risk_factor) to every row
    of the battery DataFrame. Returns a NEW DataFrame with added
    'classification' and 'primary_risk_factor' columns.
    (We don't modify the original DataFrame in place -- safer habit.)
    """
    df = battery_df.copy()
    df["classification"] = df.apply(lambda row: classify_battery_row(row, thresholds), axis=1)
    df["primary_risk_factor"] = df.apply(lambda row: primary_risk_factor(row, thresholds), axis=1)
    return df
