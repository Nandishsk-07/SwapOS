"""
main.py
========
Runs the ENTIRE pipeline end to end, following the priority order from
the "Winning Strategy" document:

  1. Classification (Safe / Degraded / Unsafe) + risk-factor transparency
  2. Suitability Score (0-100)
  3. Baseline allocator (Highest-SoC-First) -- built FIRST so there is
     always a guaranteed-working fallback submission, no matter what
     happens to the optimizer.
  4. Optimization-based allocator (Hungarian Algorithm) -- THE actual
     submission / differentiator.
  5. Metrics + automated verification checks (printed as visible PASS/FAIL)
  6. Comparison visualization + all other required charts
  7. One-page plain-English summary, auto-generated from real results

On competition day, after editing config.py (or another module) to
handle the twist, you just re-run:   python main.py
and every output, chart, and the one-page summary regenerate automatically.
"""

import pandas as pd

import config
from data_loader import load_batteries, load_vehicles
from classifier import classify_fleet
from scorer import score_fleet
from allocator import allocate_batteries_optimal, allocate_batteries_greedy
from baseline import baseline_allocate
from metrics import compute_metrics, verify_constraints
from visualize import (
    plot_score_distribution,
    plot_allocation_by_priority,
    plot_method_vs_baseline,
    plot_unsafe_batteries,
    plot_risk_factor_breakdown,
)
from summary import generate_one_page_summary
from final_submission import build_final_submission_table


import argparse


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", choices=["part1", "part2"], default="part1", help="Dataset to process")
    args = parser.parse_args()

    print("=" * 60)
    print(f"Battery Health Assessment and Dynamic Allocation (Dataset: {args.dataset.upper()})")
    print("=" * 60)

    # 1. Load data ------------------------------------------------
    print("\n[1/9] Loading data...")
    battery_path = config.BATTERY_DATA_PATH if args.dataset == "part1" else "data/Onsite_Test_Battery_Dataset.csv"
    vehicle_path = config.VEHICLE_DATA_PATH if args.dataset == "part1" else "data/Onsite_Test_Vehicle_Requests.csv"

    battery_df = load_batteries(battery_path)
    vehicle_df = load_vehicles(vehicle_path)
    print(f"  Loaded {len(battery_df)} batteries and {len(vehicle_df)} vehicle requests.")

    # 2. Classify + risk factors -----------------------------------
    print("\n[2/9] Classifying batteries + identifying risk factors...")
    battery_df = classify_fleet(battery_df, config.THRESHOLDS)
    print(battery_df["classification"].value_counts().to_string())

    # Explicitly log TBAT-005 classification details if present
    tbat_005 = battery_df[battery_df["battery_id"] == "TBAT-005"]
    if not tbat_005.empty:
        row = tbat_005.iloc[0]
        print("\n" + "#" * 60)
        print(f"[PROOF POINT] Battery TBAT-005 Classification Details:")
        print(f"  Status: {row['classification']}")
        print(f"  Primary Failure Reason: {row['primary_risk_factor']}")
        print(f"  SoC: {row['SoC']}% | Temp: {row['temperature']}C | Resistance: {row['internal_resistance']} mOhm")
        print("#" * 60 + "\n")

    # 3. Score --------------------------------------------------------
    print("\n[3/9] Scoring battery suitability...")
    battery_df = score_fleet(battery_df, config.SCORE_WEIGHTS)
    print(f"  Suitability score range: {battery_df['suitability_score'].min()} - {battery_df['suitability_score'].max()}")

    # 4. Baseline FIRST -- guaranteed working fallback -----------------
    print("\n[4/9] Running Highest-SoC-First baseline (guaranteed fallback)...")
    baseline_results = baseline_allocate(vehicle_df, battery_df)
    print(baseline_results["status"].value_counts().to_string())

    # 5. Optimization-based allocator -- THE real method -----------------
    print(f"\n[5/9] Running optimization-based allocator (Hungarian Algorithm)...")
    our_results = allocate_batteries_optimal(vehicle_df, battery_df)
    print(our_results["status"].value_counts().to_string())

    # Optional internal sanity check: greedy, for side-by-side comparison
    greedy_results = allocate_batteries_greedy(vehicle_df, battery_df)

    # 6. Metrics -------------------------------------------------------------
    print("\n[6/9] Computing metrics...")
    our_metrics = compute_metrics(our_results, battery_df)
    baseline_metrics = compute_metrics(baseline_results, battery_df)
    greedy_metrics = compute_metrics(greedy_results, battery_df)

    print("\n  --- OUR METHOD (Optimization) ---")
    for k, v in our_metrics.items():
        print(f"  {k}: {v}")
    print("\n  --- BASELINE (Highest-SoC-First) ---")
    for k, v in baseline_metrics.items():
        print(f"  {k}: {v}")
    print("\n  --- INTERNAL CHECK: Greedy (not submitted) ---")
    for k, v in greedy_metrics.items():
        print(f"  {k}: {v}")

    # 7. Automated verification checks ------------------------------------
    print("\n[7/9] Verifying constraints on our method's results...")
    verify_constraints(our_results, battery_df, vehicle_df)

    # 8. Visualizations -----------------------------------------------------
    print("\n[8/9] Generating visualizations and saving outputs...")
    plot_score_distribution(battery_df)
    plot_allocation_by_priority(our_results)
    plot_method_vs_baseline(our_metrics, baseline_metrics)
    plot_unsafe_batteries(battery_df)
    plot_risk_factor_breakdown(battery_df)
    print("  Saved 5 charts to outputs/")

    # Save the required output tables
    battery_df.to_csv(f"{config.OUTPUT_DIR}/battery_classifications.csv", index=False)
    our_results.to_csv(f"{config.OUTPUT_DIR}/our_allocations.csv", index=False)
    baseline_results.to_csv(f"{config.OUTPUT_DIR}/baseline_allocations.csv", index=False)
    greedy_results.to_csv(f"{config.OUTPUT_DIR}/greedy_allocations_internal_only.csv", index=False)

    metrics_comparison = pd.DataFrame([
        {"method": "Baseline (Highest-SoC-First)", **baseline_metrics},
        {"method": "Our Method (Optimization)", **our_metrics},
        {"method": "Greedy (internal check only)", **greedy_metrics},
    ])
    metrics_comparison.to_csv(f"{config.OUTPUT_DIR}/metrics_comparison.csv", index=False)
    print("  Saved battery_classifications.csv, our_allocations.csv,")
    print("        baseline_allocations.csv, metrics_comparison.csv")

    # Merged submission table: classifications + assignments together,
    # exactly as required under "Scope / Limitations" item 2.
    final_table = build_final_submission_table(battery_df, our_results)
    final_table.to_csv(f"{config.OUTPUT_DIR}/final_submission_table.csv", index=False)
    print("  Saved final_submission_table.csv (classifications + assignments merged)")

    # 9. One-page summary ----------------------------------------------------
    print("\n[9/9] Generating one-page summary...")
    generate_one_page_summary(our_metrics, baseline_metrics, battery_df, config)
    print(f"  Saved {config.OUTPUT_DIR}/one_page_summary.md")

    print("\nDone. Check the outputs/ folder for all files, charts, and the summary.")


if __name__ == "__main__":
    main()
