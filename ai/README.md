# VoltNet AI Microservice

FastAPI microservice providing real-time EV charging operational intelligence:
1. **Hybrid Network Demand Forecasting** (Phase 4): One-step-ahead 15-minute aggregate network charging power forecast with level-adaptive conformal prediction intervals.
2. **Station Occupancy Baseline**: In-memory Linear Regression model for per-station load and dynamic pricing recommendations (preserves 100% backwards compatibility for frontend/backend).
3. **Session Plausibility Screening** (Rule 2): Statistical review screening for completed charging sessions based on power-to-type physical caps, minimum duration limits, and duplicate session detection.
4. **Active Session Anomaly Detection**: Rule-based screening on high-frequency streaming telemetry (over-current, voltage fluctuation, non-monotonic energy, zero-duration consumption).
5. **Battery Health State-of-Health (SOH) Heuristic**: Charging impedance fading tracker.

---

## 1. Phase 4 Hybrid Network Demand Forecasting

### Architecture
* **Task**: One-step-ahead forecast of network-wide average charging power (in kW) for the next 15-minute interval across all chargers (aggregate load, not per station).
* **Model**: **Hybrid Linear Regression + XGBoost Residual (`voltnet_hybrid.joblib`)**:
  $$\hat{y} = \max\left(0, \hat{y}_{\text{LR}} + \hat{y}_{\text{XGB\_residual}}\right)$$
  * *Why Hybrid?* The dataset exhibits a strong upward trend over the year (peaking at 400–470 kW). Trees cannot extrapolate beyond their training maximum (plain XGBoost flat-topped at ~330 kW). Linear regression captures the global trend and baseline diurnal cycle, while XGBoost fits the non-linear residuals.
* **Prediction Intervals (`voltnet_intervals.joblib`)**:
  * Level-adaptive split-conformal prediction intervals at nominal **90% coverage** ($\alpha = 0.10$).
  * Bin edges: `[105.6, 154.0, 197.6, 243.4]` kW.
  * Half-widths ($q_{\text{bins}}$): `[24.7, 42.7, 50.0, 60.9, 64.6]` kW.

### Input Features (14 Exact Features)
Features must be supplied in this exact sequence:
```python
[
    'slot',         # 0 to 95 (15-minute slot of the day)
    'dow',          # 0 (Monday) to 6 (Sunday)
    'is_weekend',   # 1 if Saturday or Sunday, else 0
    'slot_sin',     # sin(2 * pi * slot / 96)
    'slot_cos',     # cos(2 * pi * slot / 96)
    'dow_sin',      # sin(2 * pi * dow / 7)
    'dow_cos',      # cos(2 * pi * dow / 7)
    'lag_1',        # power at t - 1 (15 min prior)
    'lag_4',        # power at t - 4 (1 hour prior)
    'lag_96',       # power at t - 96 (24 hours prior)
    'lag_672',      # power at t - 672 (7 days prior)
    'roll_mean_4',  # rolling mean of previous 4 intervals (shifted by 1)
    'roll_mean_96', # rolling mean of previous 96 intervals (shifted by 1)
    'roll_std_4'    # sample std (ddof=1) of previous 4 intervals (shifted by 1)
]
```

### Limitations & Boundary Conditions
1. **One-Step-Ahead Only (15 Minutes)**: The model is evaluated strictly for the immediate next 15-minute interval. Multi-step recursive forecasting was *not* evaluated in Phase 3 and will accumulate compounding errors.
2. **Strict History Requirement**: Generating a forecast requires exactly **672 consecutive 15-minute intervals (7 full days)** of historical power readings without gaps or missing values.
3. **Data Distribution Gap**: The training series (`voltnet_15min.csv`) was derived by uniformly allocating historical session energy across overlapping 15-minute intervals. If live data is populated from raw MQTT telemetry, minor distributional differences may exist.
4. **Fallback Behavior**:
   * If fewer than 672 intervals are present or NaNs are detected in required lags, the microservice returns `available: false` with a diagnostic reason (`insufficient_history`).
   * The microservice initializes an in-memory buffer seeded from the latest 800 intervals of `data/voltnet_15min.csv` to ensure immediate availability for demonstration.

---

## 2. API Endpoints

### `GET /predict-demand`
* **Query Parameters**: `station_id: int` (1–8), `hour: int` (0–23), `day_of_week: int` (0–6).
* **Response**: Preserves 100% backwards compatibility for legacy callers with additive Phase 4 network fields:
  ```json
  {
    "station_id": 2,
    "hour": 10,
    "day_of_week": 1,
    "predicted_occupancy_ratio": 72.4,
    "recommendation": "Critical Demand Surcharge Active (+30% Peak Pricing Markup)",
    "network_power_kw": 184.25,
    "network_interval_90": {
      "lower_kw": 134.28,
      "upper_kw": 234.22,
      "width_kw": 99.94,
      "nominal_coverage": 0.90,
      "bin_index": 2
    },
    "forecast_horizon": "15_minutes",
    "scope": "network_aggregate_power_kw"
  }
  ```

### `GET /forecast-network`
* **Description**: Returns the latest one-step-ahead network power forecast from the rolling buffer.
* **Optional Query Param**: `target_timestamp` (ISO string, e.g. `2022-08-15T14:30:00`).

### `POST /forecast-network`
* **Description**: Evaluates a one-step-ahead forecast using a caller-provided history series.
* **Body**:
  ```json
  {
    "targetTimestamp": "2026-10-23T12:00:00",
    "historyPowerKw": [12.4, 15.1, ... 672 float values ...]
  }
  ```

### `POST /screen-session` (Rule 2 Statistical Plausibility)
* **Description**: Screens an EV charging session for physical plausibility based on measured empirical caps.
* **Thresholds (99.9th percentile of training data)**:
  * ChargerType 0 (AC / Level 2): **9.71 kW**
  * ChargerType 1 (DC Fast): **112.96 kW**
  * Short-duration rule: Duration < 5 min and Demand > 1.0 kWh.
  * Duplicate rule: Identical `(ChargerID, Start, End)`.
* **Body**:
  ```json
  {
    "chargerType": 0,
    "demandKwh": 8.5,
    "durationHours": 1.0,
    "chargerId": "CH_101",
    "startTime": "2026-10-23T10:00:00",
    "endTime": "2026-10-23T11:00:00"
  }
  ```
* **Disclaimer**: A flag denotes *review recommended*, not confirmed fraud or hardware failure.

### `POST /network-telemetry`
* **Description**: Ingests newly closed 15-minute network average power readings into the rolling buffer.

---

## 3. Running & Testing

### Running the Microservice
```bash
cd ai
uv run uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Running Parity & Acceptance Tests
```bash
cd ai
uv run python -m unittest discover tests
```
* **Parity Test**: Rebuilds the 14 features against `voltnet_15min.csv` (with 2022-09-05 masked) and verifies predictions match `voltnet_hybrid_preds.csv` to numerical precision ($\text{MAE} \approx 3.21 \times 10^{-9}$, $\text{Max Error} \le 2.80 \times 10^{-6}$).
* **Interval Test**: Confirms test set empirical coverage is **0.8982** (nominal 0.90) and mean width is **94.60 kW**.

---

## 4. Model Replacement & Maintenance
* To replace the hybrid model, save a joblib dict with keys `{"lr", "xgb_residual", "features"}` to `models/voltnet_hybrid.joblib`.
* To replace interval calibration, save a joblib dict with keys `{"edges", "q_bins", "alpha"}` to `models/voltnet_intervals.joblib`.
* Pinned dependencies: `scikit-learn==1.6.1`, `xgboost>=3.4.1`, `joblib>=1.4.0`.
