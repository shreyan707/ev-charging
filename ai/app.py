import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sklearn.linear_model import LinearRegression

app = FastAPI(title="VoltNet AI Microservice", version="1.0.0")

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

# ----------------------------------------------------------------------
# DEMAND MODEL TRAINING ON APP STARTUP (Scikit-Learn)
# ----------------------------------------------------------------------
# We train a Linear Regression model on synthetic VIT Vellore charging occupancy logs.
demand_model = None

def train_demand_model():
    global demand_model
    print("Generating historical training dataset for demand forecasts...")
    
    np.random.seed(42)
    n_samples = 1500
    
    # Features: station_id (1 to 8), hour (0 to 23), day_of_week (0: Mon to 6: Sun)
    station_ids = np.random.randint(1, 9, n_samples)
    hours = np.random.randint(0, 24, n_samples)
    days = np.random.randint(0, 7, n_samples)
    
    # Target: Occupancy ratio (0.0 to 1.0)
    # Generate occupancy based on logical peak behaviors:
    # SJT (station 2) and Mens Hostel (station 7) are extremely busy
    # Morning peaks (8-11 AM) and Evening peaks (5-9 PM)
    # Weekdays (0-4) are busier than weekends (5-6)
    occupancy = []
    for s_id, hr, dy in zip(station_ids, hours, days):
        base = 0.2
        # Station weights
        if s_id in [2, 7]: base += 0.25
        elif s_id in [5]: base -= 0.1 # Solar station is active during midday
        
        # Hour weights (bimodal peak: morning and evening)
        if 8 <= hr <= 11: base += 0.4
        elif 17 <= hr <= 21: base += 0.5
        
        # Day weights
        if dy < 5: base += 0.15
        
        # Add random noise
        base += np.random.normal(0, 0.08)
        
        # Cap ratio between 0.05 and 0.98
        ratio = max(0.05, min(0.98, base))
        occupancy.append(ratio * 100.0) # convert to percentage
        
    df = pd.DataFrame({
        "station_id": station_ids,
        "hour": hours,
        "day_of_week": days,
        "occupancy": occupancy
    })

    # Train Scikit-Learn model
    X = df[["station_id", "hour", "day_of_week"]]
    y = df["occupancy"]
    
    demand_model = LinearRegression()
    demand_model.fit(X, y)
    print("Scikit-Learn demand forecast model trained successfully.")

train_demand_model()

# ----------------------------------------------------------------------
# API ENDPOINTS
# ----------------------------------------------------------------------

@app.get("/")
def read_root():
    return {"status": "VoltNet AI Service Online", "framework": "FastAPI"}

# 1. Rule-Based Fraud Detection
@app.post("/detect-fraud")
def detect_fraud(data: FraudRequest):
    telemetry = data.telemetry
    duration = data.durationSeconds
    session_id = data.sessionId

    if not telemetry:
        return {"sessionId": session_id, "fraud_flag": False, "reason": "No telemetry data provided."}

    # Extract readings
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

    # Rule 2: Exceeding physical charger maximum capacity
    # Level 2 chargers have a physical power limit of 22 kW (22000 Watts).
    # If any reading reports power above 25 kW, flag it.
    max_power = max(powers) if powers else 0
    if max_power > 25000:
        return {
            "sessionId": session_id,
            "fraud_flag": True,
            "reason": f"Anomaly: Over-current. Measured charging rate ({max_power} W) exceeds charger maximum physical capacity (22 kW)."
        }

    # Rule 3: Energy decreases over time (telemetry tampering)
    for i in range(1, len(energies)):
        if energies[i] < energies[i - 1] - 1.0: # allow 1 Wh tolerance for noise
            return {
                "sessionId": session_id,
                "fraud_flag": True,
                "reason": f"Anomaly: Telemetry tampering. Non-monotonic cumulative energy detected ({energies[i - 1]} Wh -> {energies[i]} Wh)."
            }

    # Rule 4: Voltage anomaly (short circuit risks)
    # Grid supply fluctuates but drops below 160V or exceeds 280V are dangerous anomalies.
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

# 2. Demand Occupancy Forecast
@app.get("/predict-demand")
def predict_demand(station_id: int, hour: int, day_of_week: int):
    if not (1 <= station_id <= 8):
        raise HTTPException(status_code=400, detail="Invalid station_id. Must be between 1 and 8.")
    if not (0 <= hour <= 23):
        raise HTTPException(status_code=400, detail="Hour must be between 0 and 23.")
    if not (0 <= day_of_week <= 6):
        raise HTTPException(status_code=400, detail="Day of week must be between 0 (Mon) and 6 (Sun).")

    # Predict occupancy using the trained model with matching feature names
    X_pred = pd.DataFrame([[station_id, hour, day_of_week]], columns=["station_id", "hour", "day_of_week"])
    prediction = demand_model.predict(X_pred)[0]
    
    # Bound forecast between 5% and 98%
    predicted_occupancy = max(5.0, min(98.0, prediction))
    
    # Recommendation logic
    if predicted_occupancy > 70.0:
        recommendation = "Critical Demand Surcharge Active (+30% Peak Pricing Markup)"
    elif predicted_occupancy > 40.0:
        recommendation = "Moderate Congestion Expected"
    else:
        recommendation = "Low occupancy. Green discounts available (-50% Renewable discount recommended)"

    return {
        "station_id": station_id,
        "hour": hour,
        "day_of_week": day_of_week,
        "predicted_occupancy_ratio": round(predicted_occupancy, 1),
        "recommendation": recommendation
    }

# 3. Lightweight Battery Health Heuristic Estimator
@app.post("/battery-health")
def estimate_battery_health(data: BatteryRequest):
    history = data.chargingHistory
    if len(history) < 2:
        return {
            "battery_health": 100.0,
            "status": "Healthy (Optimal)",
            "advice": "Perform at least 2 charging cycles to calibrate health degradation estimates."
        }

    # Calculate charging speed (Wh per minute) for each session
    speeds = []
    for s in history:
        if s.durationMinutes > 0:
            speeds.append(s.energyConsumedWh / s.durationMinutes)
        else:
            speeds.append(0)

    # Heuristic: Compare the charging speeds of initial sessions to the most recent ones.
    # A decline in average charging speed under equivalent conditions indicates impedance rise (degradation).
    initial_speed = np.mean(speeds[:max(1, len(speeds)//2)])
    recent_speed = speeds[-1]

    if initial_speed <= 0:
        return {"battery_health": 100.0, "status": "Unknown", "advice": "Invalid charging logs."}

    ratio = recent_speed / initial_speed
    
    # Calculate health index (100% base, drops proportionally if speed has dropped significantly)
    if ratio >= 0.95:
        health = 100.0
        status = "Healthy (Excellent)"
        advice = "Battery shows no significant capacity fading or high impedance."
    elif ratio >= 0.85:
        # linear scale down
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
