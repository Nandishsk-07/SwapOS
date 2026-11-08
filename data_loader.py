"""
data_loader.py
===============
Reads the CSV files AND translates real-world column names into the
internal names the rest of the pipeline (classifier.py, scorer.py,
allocator.py...) already expects. This means classifier/scorer/
allocator never had to change at all when we swapped in the real
Siemens dataset -- only this adapter layer did.

REAL SIEMENS COLUMN NAMES  ->  INTERNAL NAMES USED EVERYWHERE ELSE
--------------------------------------------------------------------
Battery file:
  state_of_charge_percent          -> SoC
  state_of_health_percent          -> SoH
  temperature_C                    -> temperature
  internal_resistance_mOhm         -> internal_resistance
  cell_voltage_imbalance_mV        -> cell_imbalance   (STAYS IN mV --
                                       see config.py THRESHOLDS comment)
  estimated_available_energy_kWh   -> available_energy_kwh
  (battery_id, cycle_count, chemistry, nominal_voltage_V,
   rated_capacity_Ah, age_years, max_temperature_last_24h_C,
   station_status are carried through UNCHANGED -- either already
   correctly named, or extra context we keep for transparency/reporting)

Vehicle file:
  request_id                        -> vehicle_id
  required_range_km                 -> range_required_km
  minimum_acceptable_SOC_percent    -> min_acceptable_soc
  maximum_wait_time_min             -> max_waiting_time_min
  (arrival_time, vehicle_type, load_category, priority carried through
   unchanged)

If you get a DIFFERENT real dataset later with yet another naming
scheme, this is the only file you need to edit -- update the two
rename dictionaries below, nothing else in the project changes.
"""

import pandas as pd

BATTERY_COLUMN_MAP = {
    "state_of_charge_percent": "SoC",
    "state_of_health_percent": "SoH",
    "temperature_C": "temperature",
    "internal_resistance_mOhm": "internal_resistance",
    "cell_voltage_imbalance_mV": "cell_imbalance",
    "estimated_available_energy_kWh": "available_energy_kwh",
}

VEHICLE_COLUMN_MAP = {
    "request_id": "vehicle_id",
    "required_range_km": "range_required_km",
    "minimum_acceptable_SOC_percent": "min_acceptable_soc",
    "maximum_wait_time_min": "max_waiting_time_min",
}


def load_batteries(path):
    """Read the battery fleet CSV and normalize its column names."""
    df = pd.read_csv(path)
    df = df.rename(columns=BATTERY_COLUMN_MAP)
    return df


def load_vehicles(path):
    """
    Read the vehicle requests CSV, normalize column names, and sort by
    arrival_time if that column exists -- the baseline method (Highest-
    SoC-First) is specifically defined as processing requests "in
    arrival order", so we guarantee that order here once, centrally,
    rather than relying on the CSV's row order being correct.
    """
    df = pd.read_csv(path)
    df = df.rename(columns=VEHICLE_COLUMN_MAP)

    if "arrival_time" in df.columns:
        df["arrival_time"] = pd.to_datetime(df["arrival_time"])
        df = df.sort_values("arrival_time").reset_index(drop=True)

    return df
