"""
api.py
======
FastAPI layer that wraps the existing battery-allocation pipeline.

Holds exactly ONE active battery dataset and ONE active vehicle dataset
in-memory at a time, starting as the original default files.

Endpoints:
  GET  /fleet         - active batteries with classification + score + risk
  GET  /vehicles      - active vehicle requests
  GET  /metrics       - active baseline vs optimized comparison
  GET  /verification  - active constraint checks as {name, passed, detail}
  POST /upload        - replace battery/vehicle datasets via CSV files
  POST /reset         - restore the default Problem 1 datasets
  GET  /export        - export active assignments, metrics, and checks as ZIP
  WS   /live          - streams active vehicle-allocation event at a time
  WS   /simulate      - paced simulation replay in arrival-time order

Run:  uvicorn api:app --reload --port 8000
"""

import asyncio
import json
import math
import io
import zipfile
from datetime import datetime

import pandas as pd
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

# ── Import the existing pipeline modules ─────────────────────────
import config
from data_loader import load_batteries, load_vehicles
from classifier import classify_fleet
from scorer import score_fleet
from allocator import allocate_batteries_optimal
from baseline import baseline_allocate
from metrics import compute_metrics
from simulator import AllocationSimulator, DEFAULT_INTERVAL_SECONDS

# ── App setup ────────────────────────────────────────────────────
app = FastAPI(
    title="Battery Health Assessment & Dynamic Allocation",
    description="Single Source of Truth API for the SwapOS Console",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Active State Cache ───────────────────────────────────────────
_active_battery_df = None
_active_vehicle_df = None
_cache = {}
_simulator = None


def _reload_active_pipeline():
    """Recalculate the entire pipeline using the active DataFrames."""
    global _cache, _simulator
    
    battery_df = _active_battery_df.copy()
    vehicle_df = _active_vehicle_df.copy()

    # Re-run pipeline steps on active data
    battery_df = classify_fleet(battery_df, config.THRESHOLDS)
    battery_df = score_fleet(battery_df, config.SCORE_WEIGHTS)

    baseline_results = baseline_allocate(vehicle_df, battery_df)
    optimized_results = allocate_batteries_optimal(vehicle_df, battery_df)

    baseline_met = compute_metrics(baseline_results, battery_df)
    optimized_met = compute_metrics(optimized_results, battery_df)

    _cache = {
        "battery_df": battery_df,
        "vehicle_df": vehicle_df,
        "baseline_results": baseline_results,
        "optimized_results": optimized_results,
        "baseline_metrics": baseline_met,
        "optimized_metrics": optimized_met,
    }

    # Re-instantiate the simulator engine with active datasets
    _simulator = AllocationSimulator(battery_df, vehicle_df)


# ── Load Defaults on Startup ─────────────────────────────────────
_active_battery_df = load_batteries(config.BATTERY_DATA_PATH)
_active_vehicle_df = load_vehicles(config.VEHICLE_DATA_PATH)
_reload_active_pipeline()


# ── Helper: make DataFrames JSON-safe ────────────────────────────

def _sanitize(obj):
    """Replace NaN / Infinity with None so JSON serialization works."""
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    return obj


def _df_to_records(df: pd.DataFrame) -> list[dict]:
    """Convert a DataFrame to a list of dicts, NaN-safe."""
    records = df.to_dict(orient="records")
    return [
        {k: _sanitize(v) for k, v in row.items()}
        for row in records
    ]


# ══════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@app.get("/fleet")
def get_fleet():
    """All active batteries with classification, score, and risk factors."""
    df = _cache["battery_df"]
    
    # Explicitly log TBAT-005 classification details if present in current dataset
    tbat_005 = df[df["battery_id"] == "TBAT-005"]
    if not tbat_005.empty:
        row = tbat_005.iloc[0]
        print(f"\n[PROOF POINT] TBAT-005 Classification: {row['classification']} | Risk Factor: {row['primary_risk_factor']} | SoC: {row['SoC']}% | Temp: {row['temperature']}C | Resistance: {row['internal_resistance']} mOhm\n")
        
    return _df_to_records(df)


@app.get("/vehicles")
def get_vehicles():
    """All active vehicle requests in arrival/CSV order."""
    df = _cache["vehicle_df"]
    records = _df_to_records(df)
    for rec in records:
        for k, v in rec.items():
            if isinstance(v, pd.Timestamp):
                rec[k] = v.isoformat()
    return records


@app.get("/metrics")
def get_metrics():
    """Active baseline vs optimized comparison metrics."""
    return {
        "baseline": _cache["baseline_metrics"],
        "optimized": _cache["optimized_metrics"],
    }


@app.get("/verification")
def get_verification(index: int = None):
    """
    Run constraint checks on active allocations.
    If index is specified, validates allocations up to that request.
    """
    battery_df = _cache["battery_df"]
    vehicle_df = _cache["vehicle_df"]

    if index is not None:
        if "arrival_time" in vehicle_df.columns:
            vehicle_order = vehicle_df.sort_values("arrival_time").reset_index(drop=True)
        else:
            vehicle_order = vehicle_df.reset_index(drop=True)
        vehicle_slice = vehicle_order.iloc[:index]
        result_df = _cache["optimized_results"][
            _cache["optimized_results"]["vehicle_id"].isin(vehicle_slice["vehicle_id"])
        ]
    else:
        result_df = _cache["optimized_results"]

    served = result_df[result_df["status"] == "SERVED"]
    allocated_ids = served["allocated_battery_id"]
    allocated_batteries = battery_df[battery_df["battery_id"].isin(allocated_ids)]

    checks = []

    # 1. No unsafe batteries allocated
    if len(result_df) == 0:
        unsafe_count = 0
    else:
        unsafe_count = int(
            (allocated_batteries["classification"] == "Unsafe/Quarantine").sum()
        )
    checks.append({
        "name": "No unsafe batteries allocated",
        "passed": unsafe_count == 0,
        "detail": (
            "0 unsafe batteries in allocation"
            if unsafe_count == 0
            else f"{unsafe_count} unsafe batteries were allocated!"
        ),
    })

    # 2. No duplicate battery assignment
    if len(result_df) == 0:
        is_unique = True
        dup_count = 0
    else:
        is_unique = bool(allocated_ids.is_unique)
        dup_count = int(allocated_ids.duplicated().sum())
    checks.append({
        "name": "No duplicate battery assignment",
        "passed": is_unique,
        "detail": (
            "Every battery assigned at most once"
            if is_unique
            else f"{dup_count} batteries assigned to multiple vehicles"
        ),
    })

    # 3. No vehicle received multiple batteries
    if len(result_df) == 0:
        vehicle_unique = True
    else:
        vehicle_unique = bool(result_df["vehicle_id"].is_unique)
    checks.append({
        "name": "No vehicle received multiple batteries",
        "passed": vehicle_unique,
        "detail": (
            "Every vehicle received at most one battery"
            if vehicle_unique
            else "Some vehicles received multiple batteries!"
        ),
    })

    # 4. All allocations meet minimum SoC
    if len(served) == 0:
        soc_ok = True
        violations = 0
    else:
        merged = served.merge(vehicle_df, on=["vehicle_id", "priority"])
        merged = merged.merge(
            battery_df[["battery_id", "SoC"]],
            left_on="allocated_battery_id",
            right_on="battery_id",
        )
        soc_ok = bool((merged["SoC"] >= merged["min_acceptable_soc"]).all())
        violations = int((merged["SoC"] < merged["min_acceptable_soc"]).sum())
    checks.append({
        "name": "All allocations meet minimum SoC",
        "passed": soc_ok,
        "detail": (
            "Every allocated battery meets vehicle's min SoC requirement"
            if soc_ok
            else f"{violations} allocations violate minimum SoC"
        ),
    })

    return checks


@app.post("/upload")
async def upload_dataset(
    battery_file: UploadFile = File(None),
    vehicle_file: UploadFile = File(None)
):
    """Replace active datasets by uploading CSV file(s)."""
    global _active_battery_df, _active_vehicle_df
    
    updated = False
    if battery_file is not None and battery_file.filename:
        content = await battery_file.read()
        df = pd.read_csv(io.BytesIO(content))
        from data_loader import BATTERY_COLUMN_MAP
        df = df.rename(columns=BATTERY_COLUMN_MAP)
        _active_battery_df = df
        updated = True
        
    if vehicle_file is not None and vehicle_file.filename:
        content = await vehicle_file.read()
        df = pd.read_csv(io.BytesIO(content))
        from data_loader import VEHICLE_COLUMN_MAP
        df = df.rename(columns=VEHICLE_COLUMN_MAP)
        if "arrival_time" in df.columns:
            df["arrival_time"] = pd.to_datetime(df["arrival_time"])
            df = df.sort_values("arrival_time").reset_index(drop=True)
        _active_vehicle_df = df
        updated = True
        
    if updated:
        _reload_active_pipeline()
        
    return {
        "status": "success",
        "batteries": len(_active_battery_df) if _active_battery_df is not None else 0,
        "vehicles": len(_active_vehicle_df) if _active_vehicle_df is not None else 0
    }


@app.post("/reset")
def reset_dataset():
    """Restore default Problem 1 dataset."""
    global _active_battery_df, _active_vehicle_df
    _active_battery_df = load_batteries(config.BATTERY_DATA_PATH)
    _active_vehicle_df = load_vehicles(config.VEHICLE_DATA_PATH)
    _reload_active_pipeline()
    return {"status": "success"}


@app.get("/export")
def export_snapshot():
    """Package active assignments, metrics, and constraint checks into a ZIP snapshot."""
    assignments_csv = _cache["optimized_results"].to_csv(index=False)
    metrics_json = json.dumps(_cache["optimized_metrics"], indent=2)
    verification_checks = get_verification()
    verification_json = json.dumps(verification_checks, indent=2)
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("assignments.csv", assignments_csv)
        zip_file.writestr("metrics.json", metrics_json)
        zip_file.writestr("verification.json", verification_json)
        
    zip_buffer.seek(0)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"swapos_snapshot_{timestamp}.zip"
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/x-zip-compressed",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.websocket("/live")
async def live_allocation_stream(ws: WebSocket):
    """Streams active allocations one vehicle-allocation event at a time."""
    await ws.accept()

    battery_df = _cache["battery_df"]
    vehicle_df = _cache["vehicle_df"]
    optimized = _cache["optimized_results"]
    total = len(optimized)

    try:
        for idx, row in optimized.iterrows():
            vehicle_id = row["vehicle_id"]
            battery_id = row["allocated_battery_id"]
            status = row["status"]

            v_row = vehicle_df[vehicle_df["vehicle_id"] == vehicle_id].iloc[0]
            vehicle_data = {
                k: _sanitize(v) for k, v in v_row.to_dict().items()
            }
            for k, v in vehicle_data.items():
                if isinstance(v, pd.Timestamp):
                    vehicle_data[k] = v.isoformat()

            battery_data = None
            if status == "SERVED" and battery_id is not None:
                b_row = battery_df[battery_df["battery_id"] == battery_id].iloc[0]
                battery_data = {
                    k: _sanitize(v) for k, v in b_row.to_dict().items()
                }

            payload = {
                "event": "allocation",
                "index": int(idx),
                "total": total,
                "vehicle": vehicle_data,
                "battery": battery_data,
                "status": status,
                "priority": row["priority"],
            }

            await ws.send_text(json.dumps(payload))
            await asyncio.sleep(0.2)

        await ws.send_text(json.dumps({"event": "done"}))
    except WebSocketDisconnect:
        pass


@app.websocket("/simulate")
async def simulate_allocation_stream(ws: WebSocket):
    """Paced simulation replay streaming active allocations in arrival order."""
    await ws.accept()

    interval_str = ws.query_params.get("interval", str(DEFAULT_INTERVAL_SECONDS))
    try:
        interval = max(0.1, float(interval_str))
    except (ValueError, TypeError):
        interval = DEFAULT_INTERVAL_SECONDS

    try:
        for event in _simulator.generate_events():
            await ws.send_text(json.dumps(event))
            await asyncio.sleep(interval)

        complete_event = {
            "type": "complete",
            "final_metrics": _simulator.get_final_metrics(),
        }
        await ws.send_text(json.dumps(complete_event))
    except WebSocketDisconnect:
        pass
