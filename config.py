"""
config.py
=========
This is the ONLY file you should need to edit when the competition-day
"30% twist" changes a rule (e.g. "batteries above 40C are now unsafe"
or "priority now matters more than suitability score").

Nothing else in the project should have hardcoded numbers in it.
That is the whole trick to handling live changes fast.
"""

# ---------------------------------------------------------------------
# 1. SAFETY / CLASSIFICATION THRESHOLDS
# ---------------------------------------------------------------------
# Calibrated against the REAL 200-battery dataset's actual distribution
# (checked min/max/percentiles directly -- these are not guesses).
# NOTE: cell_imbalance is in MILLIVOLTS in the real dataset (not Volts
# like our earlier practice data), so this threshold's unit changed too.
#
# station_status ("REVIEW/QUARANTINE") is treated as an AUTHORITATIVE
# override in classifier.py -- if the station's own system already
# flagged a battery, it's unsafe regardless of these thresholds. These
# thresholds are our INDEPENDENT second safety net on top of that flag,
# catching anything the station's own system might have missed.
THRESHOLDS = {
    "soh_unsafe_below": 60,          # State of Health %, below this = unsafe
                                      # (real data min=58, so this only
                                      # catches the worst few packs)
    "temp_unsafe_above": 48,         # Celsius (real data: mean 31.4, p95 38.8, max 51)
    "internal_resistance_unsafe_above": 85,   # milliohms (real data: mean 60.9, p95 78.6, max 89.9)
    "cell_imbalance_unsafe_above": 90,        # MILLIVOLTS now, not Volts
                                               # (real data: mean 47.6mV, p95 77.5mV, max 118mV)

    # A battery becomes "Degraded but Usable" (not unsafe, but not top-tier)
    # if it fails ANY of these but passed the unsafe checks above.
    "soh_degraded_below": 78,        # State of Health % (real data mean is 80.1%)
    "cycle_count_degraded_above": 1400,   # real data: mean 844.5, p95 1550, max 1592
}

# ---------------------------------------------------------------------
# 2. SUITABILITY SCORE WEIGHTS (must sum to 1.0)
# ---------------------------------------------------------------------
# Each battery gets a 0-100 score built from these weighted, normalized
# parameters. Higher weight = that parameter matters more.
SCORE_WEIGHTS = {
    "soh": 0.35,                 # State of Health - most important
    "soc": 0.25,                 # State of Charge - how full it is right now
    "internal_resistance": 0.20, # lower resistance = healthier battery
    "cycle_count": 0.10,         # fewer cycles = less worn
    "cell_imbalance": 0.10,      # lower imbalance = safer/healthier
}

# ---------------------------------------------------------------------
# 3. ALLOCATION SETTINGS
# ---------------------------------------------------------------------
# Order in which vehicle priorities are conceptually ranked (used for
# reporting/sorting; the optimizer itself uses UNSERVED_PENALTY below
# to actually enforce priority, not this list).
# NOTE: the REAL vehicle dataset only uses 3 priority tiers -- Critical,
# High, Normal (no "Low" tier exists in this dataset).
PRIORITY_ORDER = ["Critical", "High", "Normal"]

# Which allocation strategy main.py should use as "Our Method":
#   "optimal" -> Hungarian Algorithm, global best matching (the real submission)
#   "greedy"  -> simple one-at-a-time picker (kept only as an internal sanity check)
ALLOCATION_STRATEGY = "optimal"

# ---------------------------------------------------------------------
# 3b. OPTIMIZER (HUNGARIAN ALGORITHM) SETTINGS
# ---------------------------------------------------------------------
# The optimizer treats "leaving a vehicle unserved" as a cost. Making
# that cost HIGH for Critical/High priority vehicles is what forces
# the algorithm to prioritize them over Low-priority vehicles, even
# when Low priority arrived first or would technically fit a battery.
# These are in the SAME cost units as (100 - suitability_score), i.e.
# roughly 0-100 per real match, so unserved penalties are set well
# above that range to dominate the decision.
UNSERVED_PENALTY = {
    "Critical": 500,
    "High": 300,
    "Normal": 150,
}

# Cost assigned to a vehicle-battery pair that is NOT actually allowed
# (unsafe battery, or SoC below the vehicle's minimum). Must be much
# larger than UNSERVED_PENALTY so the optimizer always prefers leaving
# a vehicle unserved over breaking a hard safety/logic constraint.
INFEASIBLE_COST = 1_000_000

# ---------------------------------------------------------------------
# 4. FILE PATHS
# ---------------------------------------------------------------------
# REAL competition datasets (swapped in from the practice/synthetic ones)
BATTERY_DATA_PATH = "data/Problem_1_Battery_Fleet_200_Packs.csv"
VEHICLE_DATA_PATH = "data/Problem_1_Vehicle_Demand_50_Requests.csv"
OUTPUT_DIR = "outputs"
