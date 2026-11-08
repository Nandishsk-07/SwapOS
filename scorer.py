"""
scorer.py
==========
Computes a single "Battery Suitability Score" from 0-100 for every
battery, combining several health parameters into one number.

WHY WE NORMALIZE FIRST:
SoH is measured in %, internal resistance in milliohms, cycle count
as a raw integer -- these are totally different scales. If we just
multiplied by weights directly, internal_resistance (values like 90)
would completely dominate SoH (values like 0-100) for no good reason.
So we first squash every parameter into a common 0-1 range where
1 always means "best" and 0 always means "worst", THEN apply weights.
This is called min-max normalization.
"""

import pandas as pd


def normalize_higher_is_better(series):
    """
    Scale a column to 0-1 where the ORIGINAL HIGHEST value becomes 1
    and the ORIGINAL LOWEST value becomes 0.
    Use this for parameters where MORE is better (e.g. SoH, SoC).
    """
    min_val, max_val = series.min(), series.max()
    if max_val == min_val:  # avoid divide-by-zero if all values are identical
        return series * 0 + 1
    return (series - min_val) / (max_val - min_val)


def normalize_lower_is_better(series):
    """
    Scale a column to 0-1 where the ORIGINAL LOWEST value becomes 1
    and the ORIGINAL HIGHEST value becomes 0.
    Use this for parameters where LESS is better (e.g. internal
    resistance, cycle count, cell imbalance -- all signs of wear).
    """
    min_val, max_val = series.min(), series.max()
    if max_val == min_val:
        return series * 0 + 1
    return (max_val - series) / (max_val - min_val)


def score_fleet(battery_df, weights):
    """
    Add a 'suitability_score' column (0-100) to the battery DataFrame.
    weights must be a dict like config.SCORE_WEIGHTS with keys:
    soh, soc, internal_resistance, cycle_count, cell_imbalance
    """
    df = battery_df.copy()

    norm_soh = normalize_higher_is_better(df["SoH"])
    norm_soc = normalize_higher_is_better(df["SoC"])
    norm_resistance = normalize_lower_is_better(df["internal_resistance"])
    norm_cycles = normalize_lower_is_better(df["cycle_count"])
    norm_imbalance = normalize_lower_is_better(df["cell_imbalance"])

    combined = (
        weights["soh"] * norm_soh
        + weights["soc"] * norm_soc
        + weights["internal_resistance"] * norm_resistance
        + weights["cycle_count"] * norm_cycles
        + weights["cell_imbalance"] * norm_imbalance
    )

    # combined is 0-1 at this point (since weights sum to 1 and each
    # normalized column is 0-1) -- multiply by 100 to get a 0-100 score.
    df["suitability_score"] = (combined * 100).round(1)

    return df
