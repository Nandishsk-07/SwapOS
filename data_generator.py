"""
data_generator.py
==================
Generates a FAKE (synthetic) battery fleet dataset and vehicle request
dataset, shaped exactly like what Siemens is expected to give you.

WHY: You don't have the real data yet. This lets you build and test
your entire pipeline right now. When the real CSVs arrive, you just
point config.py at them instead -- nothing else changes.

Run this file directly:  python data_generator.py
"""

import numpy as np
import pandas as pd

# A "seed" makes randomness repeatable -- same numbers every time you run it.
np.random.seed(42)


def generate_battery_fleet(n=200):
    """Create n battery packs with health/electrical/thermal/usage data."""

    battery_id = [f"BATT_{i:04d}" for i in range(1, n + 1)]

    # State of Health: how much capacity remains vs. when new (100%).
    # Most batteries cluster in a healthy 70-100% band; a tail is worse.
    soh = np.clip(np.random.normal(loc=82, scale=14, size=n), 20, 100)

    # State of Charge: how full the battery is RIGHT NOW (0-100%).
    soc = np.random.uniform(10, 100, size=n)

    # Temperature in Celsius. Most are normal room/operating temp;
    # a handful run hot (simulating thermal issues).
    temperature = np.clip(np.random.normal(loc=32, scale=6, size=n), 15, 60)

    # Internal resistance in milliohms. Higher = older/more degraded.
    internal_resistance = np.clip(np.random.normal(loc=90, scale=35, size=n), 20, 250)

    # Cycle count: number of charge/discharge cycles completed.
    cycle_count = np.clip(np.random.normal(loc=600, scale=350, size=n), 0, 2000).astype(int)

    # Cell voltage imbalance in Volts. Small is normal; large = unsafe.
    cell_imbalance = np.clip(np.random.exponential(scale=0.02, size=n), 0, 0.15)

    # Available energy in kWh (roughly tracks SoC and pack health).
    available_energy = np.round((soc / 100) * (soh / 100) * 3.0, 2)  # 3kWh pack example

    df = pd.DataFrame({
        "battery_id": battery_id,
        "SoH": np.round(soh, 1),
        "SoC": np.round(soc, 1),
        "temperature": np.round(temperature, 1),
        "internal_resistance": np.round(internal_resistance, 1),
        "cycle_count": cycle_count,
        "cell_imbalance": np.round(cell_imbalance, 4),
        "available_energy_kwh": available_energy,
    })

    # --- Deliberately inject a few tricky edge cases for testing ---
    df.loc[0, "SoH"] = 59.5                 # exactly below unsafe threshold
    df.loc[1, "temperature"] = 45.1         # just barely over unsafe temp
    df.loc[2, "cell_imbalance"] = 0.051     # just barely over imbalance limit
    df.loc[3, ["SoH", "temperature", "internal_resistance"]] = [55, 47, 180]  # very unsafe
    df.loc[4, "SoC"] = 100.0                # perfect battery, full charge

    return df


def generate_vehicle_requests(n=50):
    """Create n vehicle battery-swap requests."""

    vehicle_id = [f"VEH_{i:03d}" for i in range(1, n + 1)]

    priority = np.random.choice(
        ["Critical", "High", "Medium", "Low"],
        size=n,
        p=[0.10, 0.25, 0.40, 0.25]  # realistic distribution: few Critical, many Medium
    )

    range_required_km = np.round(np.random.uniform(10, 80, size=n), 1)
    load_kg = np.round(np.random.uniform(20, 150, size=n), 1)

    # Minimum acceptable SoC depends loosely on how much range they need.
    min_acceptable_soc = np.clip(
        30 + (range_required_km / 80) * 40 + np.random.normal(0, 5, size=n),
        20, 90
    ).round(1)

    max_waiting_time_min = np.random.choice([5, 10, 15, 20, 30], size=n)

    df = pd.DataFrame({
        "vehicle_id": vehicle_id,
        "priority": priority,
        "range_required_km": range_required_km,
        "load_kg": load_kg,
        "min_acceptable_soc": min_acceptable_soc,
        "max_waiting_time_min": max_waiting_time_min,
    })

    # --- Edge cases ---
    df.loc[0, "priority"] = "Critical"
    df.loc[0, "min_acceptable_soc"] = 95.0   # near-impossible to satisfy -> should be unserved
    df.loc[1, "priority"] = "Critical"
    df.loc[1, "min_acceptable_soc"] = 30.0   # easy to satisfy, should always be served

    return df


if __name__ == "__main__":
    batteries = generate_battery_fleet(200)
    vehicles = generate_vehicle_requests(50)

    batteries.to_csv("data/battery_fleet.csv", index=False)
    vehicles.to_csv("data/vehicle_requests.csv", index=False)

    print(f"Generated {len(batteries)} batteries -> data/battery_fleet.csv")
    print(f"Generated {len(vehicles)} vehicle requests -> data/vehicle_requests.csv")
    print("\nBattery sample:\n", batteries.head())
    print("\nVehicle sample:\n", vehicles.head())
