"""
simulator.py
=============
Real-time simulation engine for the live-demo dashboard.

Replays the 50 vehicle requests in arrival_time order on a compressed
timer so the dashboard updates visibly, request-by-request, instead of
dumping all 50 at once.

HOW IT WORKS:
  1. On startup, runs the FULL optimized pipeline (classify → score →
     allocate_batteries_optimal) exactly like main.py.
  2. Sorts vehicles by arrival_time.
  3. On each WebSocket connect, iterates through the vehicles and
     reveals one allocation event at a time — with a configurable
     pause between events — including running totals that accumulate
     as if the allocations were happening live.

IMPORTANT: the allocation results are the REAL Hungarian-algorithm
output from allocator.py. The "simulation" is purely about PACING the
reveal for demo effect — no separate algorithm is used.
"""

import math
import pandas as pd

import config
from data_loader import load_batteries, load_vehicles
from classifier import classify_fleet
from scorer import score_fleet
from allocator import allocate_batteries_optimal
from baseline import baseline_allocate
from metrics import compute_metrics


# ── Default pacing ─────────────────────────────────────────────────
# 50 events × 3s = 150s ≈ 2.5 minutes for a full replay.
DEFAULT_INTERVAL_SECONDS = 3.0


def _sanitize(obj):
    """Replace NaN/Infinity/Timestamps with JSON-safe values."""
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    return obj


def _row_to_dict(row):
    """Convert a DataFrame row to a JSON-safe dict."""
    return {k: _sanitize(v) for k, v in row.to_dict().items()}


class AllocationSimulator:
    """
    Pre-computes the full optimal allocation, then generates
    time-paced events for streaming over a WebSocket.
    """

    def __init__(self, battery_df, vehicle_df):
        # ── Run the real pipeline on preloaded DataFrames ──────────
        battery_df = classify_fleet(battery_df, config.THRESHOLDS)
        battery_df = score_fleet(battery_df, config.SCORE_WEIGHTS)

        # Pre-compute both allocations (optimized is the real one;
        # baseline is needed for the final_metrics comparison).
        optimized_results = allocate_batteries_optimal(vehicle_df, battery_df)
        baseline_results = baseline_allocate(vehicle_df, battery_df)

        # Store everything we need for event generation
        self._battery_df = battery_df
        self._vehicle_df = vehicle_df
        self._optimized = optimized_results
        self._baseline_results = baseline_results

        # Vehicles in arrival-time order
        if "arrival_time" in vehicle_df.columns:
            self._vehicle_order = (
                vehicle_df.sort_values("arrival_time").reset_index(drop=True)
            )
        else:
            self._vehicle_order = vehicle_df.reset_index(drop=True)

        # Pre-compute the final metrics for the "complete" event
        self._final_optimized_metrics = compute_metrics(
            optimized_results, battery_df
        )
        self._final_baseline_metrics = compute_metrics(
            baseline_results, battery_df
        )

    # ── Public property ────────────────────────────────────────────
    @property
    def total_events(self) -> int:
        return len(self._vehicle_order)

    # ── Event generator ────────────────────────────────────────────
    def generate_events(self):
        """
        Yield one allocation-event dict per vehicle, in arrival-time
        order, with running totals that accumulate across events.

        Each yielded dict has the shape the frontend expects:
          {
            type: "allocation",
            index, total,
            request_id, vehicle_type, priority,
            battery_id, suitability_score, classification,
            timestamp,
            status,
            vehicle: { ... full row ... },
            battery: { ... full row or null ... },
            running_totals: { served, unserved, ... }
          }
        """
        total = len(self._vehicle_order)

        # Accumulators for running totals
        served = 0
        unserved = 0
        sum_soh = 0.0
        sum_score = 0.0
        priority_served = {"Critical": 0, "High": 0, "Normal": 0}
        priority_total = {"Critical": 0, "High": 0, "Normal": 0}
        batteries_used = []

        for idx in range(total):
            v_row = self._vehicle_order.iloc[idx]
            vid = v_row["vehicle_id"]
            priority = v_row["priority"]

            # Look up this vehicle's allocation from the pre-computed
            # optimal results.
            alloc_match = self._optimized[
                self._optimized["vehicle_id"] == vid
            ]
            alloc_row = alloc_match.iloc[0]

            status = alloc_row["status"]
            battery_id = alloc_row["allocated_battery_id"]

            # Track priority totals (all vehicles, served or not)
            if priority in priority_total:
                priority_total[priority] += 1

            # Build battery data and update accumulators
            battery_data = None
            suitability_score = None
            classification = None

            if status == "SERVED" and battery_id is not None:
                b_row = self._battery_df[
                    self._battery_df["battery_id"] == battery_id
                ].iloc[0]
                battery_data = _row_to_dict(b_row)
                suitability_score = float(b_row["suitability_score"])
                classification = b_row["classification"]

                served += 1
                sum_soh += float(b_row["SoH"])
                sum_score += suitability_score
                batteries_used.append(battery_id)

                if priority in priority_served:
                    priority_served[priority] += 1
            else:
                unserved += 1

            # Compute running averages
            avg_soh = round(sum_soh / served, 1) if served > 0 else 0.0
            avg_score = round(sum_score / served, 1) if served > 0 else 0.0

            # High+Critical service rate so far
            hc_total = priority_total["Critical"] + priority_total["High"]
            hc_served = priority_served["Critical"] + priority_served["High"]
            pct_hc_served = (
                round(100 * hc_served / hc_total, 1) if hc_total > 0 else 0.0
            )

            event = {
                "type": "allocation",
                "index": idx,
                "total": total,
                "request_id": vid,
                "vehicle_type": v_row.get("vehicle_type", "Unknown"),
                "priority": priority,
                "battery_id": (
                    battery_id if battery_id is not None else None
                ),
                "suitability_score": suitability_score,
                "classification": classification,
                "timestamp": _sanitize(v_row.get("arrival_time")),
                "status": status,
                "vehicle": _row_to_dict(v_row),
                "battery": battery_data,
                "running_totals": {
                    "served": served,
                    "unserved": unserved,
                    "total_processed": idx + 1,
                    "remaining": total - (idx + 1),
                    "avg_soh_allocated": avg_soh,
                    "avg_suitability_score": avg_score,
                    "pct_high_critical_served": pct_hc_served,
                    "critical_served": priority_served["Critical"],
                    "critical_total": priority_total["Critical"],
                    "high_served": priority_served["High"],
                    "high_total": priority_total["High"],
                    "normal_served": priority_served["Normal"],
                    "normal_total": priority_total["Normal"],
                    "batteries_allocated": len(batteries_used),
                },
            }

            yield event

        # No "complete" event here — the caller (api.py's WS handler)
        # sends that after the loop, including final_metrics.

    # ── Final metrics for the "complete" event ─────────────────────
    def get_final_metrics(self) -> dict:
        """
        Returns the complete metrics comparison (optimized vs baseline)
        for the 'complete' event sent after the last allocation.
        """
        return {
            "optimized": self._final_optimized_metrics,
            "baseline": self._final_baseline_metrics,
        }
