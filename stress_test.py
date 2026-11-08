"""
stress_test.py
================
The normal practice dataset (200 batteries, 50 vehicles) has MORE
batteries than requests, so both the baseline and our method serve
100% of vehicles -- the optimizer's real advantage (protecting
high-priority vehicles when batteries are SCARCE) doesn't show up.

This script generates a scarcer dataset on purpose (fewer usable
batteries relative to demand) to prove, with real numbers, that the
optimization-based method serves more vehicles -- and more
importantly, more of the HIGH/CRITICAL priority ones -- than the
Highest-SoC-First baseline, exactly like the illustrative table in
the strategy document.

Run it directly:  python3 stress_test.py
It does NOT touch your real data/ folder or outputs/ folder.
"""

import numpy as np
import pandas as pd

from classifier import classify_fleet
from scorer import score_fleet
from allocator import allocate_batteries_optimal
from baseline import baseline_allocate
from metrics import compute_metrics
import config

np.random.seed(7)


def generate_scarce_batteries(n=40):
    """Deliberately fewer, more mixed-quality batteries than usual."""
    battery_id = [f"S_BATT_{i:04d}" for i in range(1, n + 1)]
    soh = np.clip(np.random.normal(75, 15, n), 20, 100)
    soc = np.random.uniform(20, 100, n)
    temperature = np.clip(np.random.normal(33, 7, n), 15, 60)
    internal_resistance = np.clip(np.random.normal(65, 20, n), 20, 95)
    cycle_count = np.clip(np.random.normal(900, 450, n), 0, 1600).astype(int)
    # cell_imbalance in MILLIVOLTS, matching the real dataset's units
    # and config.py's THRESHOLDS (which are now mV-scale, not Volts).
    cell_imbalance = np.clip(np.random.exponential(35, n), 5, 120)
    available_energy = np.round((soc / 100) * (soh / 100) * 1.5, 2)

    return pd.DataFrame({
        "battery_id": battery_id, "SoH": np.round(soh, 1), "SoC": np.round(soc, 1),
        "temperature": np.round(temperature, 1), "internal_resistance": np.round(internal_resistance, 1),
        "cycle_count": cycle_count, "cell_imbalance": np.round(cell_imbalance, 1),
        "available_energy_kwh": available_energy,
    })


def generate_demand(n=50):
    """Same style of demand as the real dataset (50 requests, 3-tier priority)."""
    vehicle_id = [f"S_VEH_{i:03d}" for i in range(1, n + 1)]
    # Matches the REAL dataset's 3 priority tiers -- Critical, High,
    # Normal (there is no "Low" tier in the real competition data).
    priority = np.random.choice(["Critical", "High", "Normal"], n, p=[0.15, 0.30, 0.55])
    range_required_km = np.round(np.random.uniform(10, 90, n), 1)
    min_acceptable_soc = np.clip(30 + (range_required_km / 90) * 40 + np.random.normal(0, 5, n), 20, 90).round(1)
    max_waiting_time_min = np.random.choice([2, 5, 8, 12, 16, 20], n)

    return pd.DataFrame({
        "vehicle_id": vehicle_id, "priority": priority, "range_required_km": range_required_km,
        "min_acceptable_soc": min_acceptable_soc,
        "max_waiting_time_min": max_waiting_time_min,
    })


def main():
    batteries = generate_scarce_batteries(40)   # fewer batteries...
    vehicles = generate_demand(50)               # ...than requests

    batteries = classify_fleet(batteries, config.THRESHOLDS)
    batteries = score_fleet(batteries, config.SCORE_WEIGHTS)

    print(f"Scarce test: {len(batteries)} batteries "
          f"({(batteries['classification'] == 'Unsafe/Quarantine').sum()} unsafe) "
          f"vs {len(vehicles)} vehicle requests\n")

    baseline_results = baseline_allocate(vehicles, batteries)
    our_results = allocate_batteries_optimal(vehicles, batteries)

    baseline_metrics = compute_metrics(baseline_results, batteries)
    our_metrics = compute_metrics(our_results, batteries)

    comparison = pd.DataFrame([
        {"method": "Baseline (Highest-SoC-First)", **baseline_metrics},
        {"method": "Our Method (Optimization)", **our_metrics},
    ])
    print(comparison.to_string(index=False))


if __name__ == "__main__":
    main()
