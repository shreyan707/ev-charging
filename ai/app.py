from pathlib import Path
from typing import List, Optional, Union, Dict, Any
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sklearn.linear_model import LinearRegression

from forecasting import (
    load_forecasting_artifacts,
    NetworkHistoryBuffer,
    build_feature_row_from_history,
    predict_hybrid_kw,
    compute_prediction_intervals,
    screen_session_plausibility,
)

app = FastAPI(title="VoltNet AI Microservice", version="2.0.0")

# ----------------------------------------------------------------------
# DATA MODELS
# ----------------------------------------------------------------------

class TelemetryReading(BaseModel):
    current: float
    voltage: float
    power: float
    energyConsumedWh: float

class FraudRequest(BaseModel):
    sessionId: int
    durationSeconds: float
    telemetry: List[TelemetryReading]

class BatterySession(BaseModel):
    sessionId: int
    durationMinutes: float
    energyConsumedWh: float

class BatteryRequest(BaseModel):
    chargingHistory: List[BatterySession]

class SessionScreenRequest(BaseModel):
    sessionId: Optional[int] = None
    chargerType: int = 0
    demandKwh: float
    durationMinutes: Optional[float] = None
    durationHours: Optional[float] = None
    chargerId: Optional[Union[str, int]] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None

class NetworkForecastRequest(BaseModel):
    targetTimestamp: Optional[str] = None
    historyPowerKw: Optional[List[float]] = None

class NetworkTelemetryPoint(BaseModel):
    timestamp: str
    powerKw: float

# ----------------------------------------------------------------------
# MODEL INITIALIZATION & TRAINING ON APP STARTUP
# ----------------------------------------------------------------------
# 1. Existing station-level baseline Linear Regression model
demand_model = None

def train_demand_model():
    global demand_model
    print("Generating historical training dataset for station demand forecasts...")
    
    np.random.seed(42)
    n_samples = 1500
    
    station_ids = np.random.randint(1, 9, n_samples)
    hours = np.random.randint(0, 24, n_samples)
    days = np.random.randint(0, 7, n_samples)
    
    occupancy = []
    for s_id, hr, dy in zip(station_ids, hours, days):
        base = 0.2
        if s_id in [2, 7]: base += 0.25
        elif s_id in [5]: base -= 0.1
        
        if 8 <= hr <= 11: base += 0.4
        elif 17 <= hr <= 21: base += 0.5
        
        if dy < 5: base += 0.15
        base += np.random.normal(0, 0.08)
        ratio = max(0.05, min(0.98, base))
        occupancy.append(ratio * 100.0)
        
    df = pd.DataFrame({
        "station_id": station_ids,
        "hour": hours,
        "day_of_week": days,
        "occupancy": occupancy
    })

    X = df[["station_id", "hour", "day_of_week"]]
    y = df["occupancy"]
    
    demand_model = LinearRegression()
    demand_model.fit(X, y)
    print("Scikit-Learn station demand model trained successfully.")

train_demand_model()

# 2. Phase 4 Hybrid Network Forecast (LR + XGB residual) & Level-Adaptive Conformal Intervals
MODELS_DIR = Path(__file__).parent / "models"
DATA_DIR = Path(__file__).parent / "data"

forecasting_artifacts: Optional[Dict[str, Any]] = None
network_buffer: Optional[NetworkHistoryBuffer] = None
seen_session_signatures: set = set()

try:
    forecasting_artifacts = load_forecasting_artifacts(MODELS_DIR)
    seed_csv = DATA_DIR / "voltnet_15min.csv"
    network_buffer = NetworkHistoryBuffer(seed_csv_path=seed_csv if seed_csv.exists() else None)
    print("Phase 4 Hybrid Network Demand Model and Conformal Intervals loaded successfully.")
except Exception as e:
    print(f"Warning: Could not load Phase 4 forecasting artifacts: {e}")

# ----------------------------------------------------------------------
# API ENDPOINTS
# ----------------------------------------------------------------------

@app.get("/")
def read_root():
    return {
        "status": "VoltNet AI Service Online",
        "framework": "FastAPI",
        "version": "2.0.0",
        "phase4_hybrid_model_loaded": forecasting_artifacts is not None,
        "history_buffer_points": len(network_buffer.series) if (network_buffer and network_buffer.series is not None) else 0,
    }

# 1. Rule-Based Fraud Detection (Telemetry Streaming)
@app.post("/detect-fraud")
def detect_fraud(data: FraudRequest):
    telemetry = data.telemetry
    duration = data.durationSeconds
    session_id = data.sessionId

    if not telemetry:
        return {"sessionId": session_id, "fraud_flag": False, "reason": "No telemetry data provided."}

    powers = [r.power for r in telemetry]
    voltages = [r.voltage for r in telemetry]
    energies = [r.energyConsumedWh for r in telemetry]

    # Rule 1: Zero elapsed time but nonzero energy
    if duration <= 2.0 and max(energies) > 5.0:
        return {
            "sessionId": session_id,
            "fraud_flag": True,
            "reason": f"Anomaly: Zero elapsed duration ({duration}s) but energy consumed ({max(energies)} Wh) detected."
        }

    # Rule 2: Exceeding physical charger maximum capacity (22 kW)
    max_power = max(powers) if powers else 0
    if max_power > 25000:
        return {
            "sessionId": session_id,
            "fraud_flag": True,
            "reason": f"Anomaly: Over-current. Measured charging rate ({max_power} W) exceeds charger maximum physical capacity (22 kW)."
        }

    # Rule 3: Energy decreases over time (telemetry tampering)
    for i in range(1, len(energies)):
        if energies[i] < energies[i - 1] - 1.0:
            return {
                "sessionId": session_id,
                "fraud_flag": True,
                "reason": f"Anomaly: Telemetry tampering. Non-monotonic cumulative energy detected ({energies[i - 1]} Wh -> {energies[i]} Wh)."
            }

    # Rule 4: Voltage anomaly
    for v in voltages:
        if v < 160.0 or v > 280.0:
            return {
                "sessionId": session_id,
                "fraud_flag": True,
                "reason": f"Anomaly: Electrical surge/short warning. Measured voltage dropped or peaked outside safe operational thresholds ({v}V)."
            }

    return {
        "sessionId": session_id,
        "fraud_flag": False,
        "reason": "Normal operational behavior. Telemetry complies with grid parameters."
    }

# 2. Demand Occupancy Forecast (Station Baseline + Additive Network Forecast)
@app.get("/predict-demand")
def predict_demand(station_id: int, hour: int, day_of_week: int):
    """Backwards-compatible demand prediction endpoint.

    Returns the original station occupancy ratio and recommendation required by
    the React frontend and Node backend, with strictly additive Phase 4 network-level
    power forecast and 90% conformal intervals.
    """
    if not (1 <= station_id <= 8):
        raise HTTPException(status_code=400, detail="Invalid station_id. Must be between 1 and 8.")
    if not (0 <= hour <= 23):
        raise HTTPException(status_code=400, detail="Hour must be between 0 and 23.")
    if not (0 <= day_of_week <= 6):
        raise HTTPException(status_code=400, detail="Day of week must be between 0 (Mon) and 6 (Sun).")

    # 1. Station baseline occupancy forecast (preserves existing UI contract)
    X_pred = pd.DataFrame([[station_id, hour, day_of_week]], columns=["station_id", "hour", "day_of_week"])
    prediction = demand_model.predict(X_pred)[0]
    predicted_occupancy = max(5.0, min(98.0, prediction))
    
    if predicted_occupancy > 70.0:
        recommendation = "Critical Demand Surcharge Active (+30% Peak Pricing Markup)"
    elif predicted_occupancy > 40.0:
        recommendation = "Moderate Congestion Expected"
    else:
        recommendation = "Low occupancy. Green discounts available (-50% Renewable discount recommended)"

    # 2. Additive Phase 4 Network Forecast (1-step-ahead aggregate kW & interval)
    network_fc = None
    if forecasting_artifacts is not None and network_buffer is not None:
        try:
            fc_res = network_buffer.get_latest_forecast(forecasting_artifacts)
            if fc_res.get("available"):
                network_fc = fc_res
        except Exception as e:
            print(f"Network forecast error: {e}")

    resp = {
        # Core backwards-compatible fields
        "station_id": station_id,
        "hour": hour,
        "day_of_week": day_of_week,
        "predicted_occupancy_ratio": round(predicted_occupancy, 1),
        "recommendation": recommendation,

        # Additive Phase 4 Network Forecast fields
        "network_power_kw": network_fc.get("forecast_power_kw") if network_fc else None,
        "network_interval_90": network_fc.get("interval_90") if network_fc else None,
        "network_forecast_details": network_fc if network_fc else None,
        "forecast_horizon": "15_minutes",
        "scope": "network_aggregate_power_kw",
    }
    return resp

# 3. Dedicated Network Forecast Endpoint (GET: Latest from Buffer)
@app.get("/forecast-network")
def get_network_forecast(target_timestamp: Optional[str] = None):
    """Retrieve the one-step-ahead network power forecast from the rolling history buffer."""
    if forecasting_artifacts is None or network_buffer is None:
        raise HTTPException(status_code=503, detail="Phase 4 forecasting model is not initialized.")

    ts = pd.Timestamp(target_timestamp) if target_timestamp else None
    result = network_buffer.get_latest_forecast(forecasting_artifacts, target_timestamp=ts)
    if not result.get("available"):
        raise HTTPException(status_code=400, detail=result.get("reason", "Forecast unavailable."))
    return result

# 4. Custom Network Forecast Endpoint (POST: Evaluates Provided History)
@app.post("/forecast-network")
def post_custom_network_forecast(req: NetworkForecastRequest):
    """Evaluate 1-step-ahead forecast using an explicit list of historical power values."""
    if forecasting_artifacts is None:
        raise HTTPException(status_code=503, detail="Phase 4 forecasting model is not initialized.")

    if not req.historyPowerKw or len(req.historyPowerKw) < 672:
        raise HTTPException(
            status_code=400,
            detail=f"At least 672 intervals (7 days) of 15-minute history are required. Received {len(req.historyPowerKw) if req.historyPowerKw else 0}."
        )

    ts = pd.Timestamp(req.targetTimestamp) if req.targetTimestamp else pd.Timestamp.now()
    history_series = pd.Series(req.historyPowerKw[-672:], dtype=float)

    try:
        X = build_feature_row_from_history(history_series, ts)
        hybrid_pred, lr_pred, xgb_pred = predict_hybrid_kw(forecasting_artifacts, X)
        intervals = compute_prediction_intervals(forecasting_artifacts, hybrid_pred)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Feature extraction/forecast failed: {e}")

    pred_val = float(hybrid_pred[0])
    return {
        "target_timestamp": str(ts),
        "forecast_power_kw": round(pred_val, 2),
        "lr_baseline_kw": round(float(lr_pred[0]), 2),
        "xgb_residual_kw": round(float(xgb_pred[0]), 2),
        "interval_90": {
            "lower_kw": round(float(intervals["lower"][0]), 2),
            "upper_kw": round(float(intervals["upper"][0]), 2),
            "width_kw": round(float(intervals["width"][0]), 2),
            "nominal_coverage": 0.90,
            "bin_index": int(intervals["bin"][0]),
        },
        "horizon": "15_minutes",
    }

# 5. Session Plausibility Screening (Rule 2 Statistical Review Screen)
@app.post("/screen-session")
def screen_session(req: SessionScreenRequest):
    """Screen an EV charging session for physical plausibility ('rule2' statistical screen).

    Flags sessions exceeding the 99.9th percentile power threshold for their ChargerType,
    or with suspicious short duration (<5 min, >1 kWh), or duplicate session signatures.
    Note: Flag indicates 'review recommended', NOT confirmed fraud.
    """
    session_data = {
        "charger_type": req.chargerType,
        "demand_kwh": req.demandKwh,
        "duration_minutes": req.durationMinutes,
        "duration_hours": req.durationHours,
        "charger_id": req.chargerId,
        "start_time": req.startTime,
        "end_time": req.endTime,
    }

    result = screen_session_plausibility(session_data, historical_signatures=seen_session_signatures)
    if result.get("signature") and not result.get("flagged"):
        seen_session_signatures.add(result["signature"])

    return result

# 6. Stream Live Interval Telemetry into Network Buffer
@app.post("/network-telemetry")
def append_network_telemetry(pt: NetworkTelemetryPoint):
    """Append a newly closed 15-minute network power reading into the rolling buffer."""
    if network_buffer is None:
        raise HTTPException(status_code=503, detail="Network buffer not initialized.")

    ts = pd.Timestamp(pt.timestamp)
    network_buffer.add_reading(ts, pt.powerKw)
    return {
        "status": "recorded",
        "timestamp": str(ts),
        "buffer_size": len(network_buffer.series) if network_buffer.series is not None else 0,
    }

# 7. Lightweight Battery Health Heuristic Estimator
@app.post("/battery-health")
def estimate_battery_health(data: BatteryRequest):
    history = data.chargingHistory
    if len(history) < 2:
        return {
            "battery_health": 100.0,
            "status": "Healthy (Optimal)",
            "advice": "Perform at least 2 charging cycles to calibrate health degradation estimates."
        }

    speeds = []
    for s in history:
        if s.durationMinutes > 0:
            speeds.append(s.energyConsumedWh / s.durationMinutes)
        else:
            speeds.append(0)

    initial_speed = np.mean(speeds[:max(1, len(speeds)//2)])
    recent_speed = speeds[-1]

    if initial_speed <= 0:
        return {"battery_health": 100.0, "status": "Unknown", "advice": "Invalid charging logs."}

    ratio = recent_speed / initial_speed
    
    if ratio >= 0.95:
        health = 100.0
        status = "Healthy (Excellent)"
        advice = "Battery shows no significant capacity fading or high impedance."
    elif ratio >= 0.85:
        health = round(100.0 - (1.0 - ratio) * 100.0, 1)
        status = "Good (Normal Fading)"
        advice = "Standard lithium-ion degradation. Recommended to charge between 20% and 80% SoC."
    else:
        health = round(max(50.0, 100.0 - (1.0 - ratio) * 150.0), 1)
        status = "Degraded (Anomalous Fading)"
        advice = "Fast charging capabilities are restricted due to cell health. Schedule physical diagnostic."

    return {
        "battery_health": health,
        "status": status,
        "advice": advice
    }
