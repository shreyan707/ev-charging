"""VoltNet Demand Forecasting and Session Plausibility Screening Module (Phase 4).

Features:
- Pure functions for 14-feature engineering, 1-step-ahead hybrid forecasting (Linear Regression + XGBoost residual),
  and level-adaptive conformal prediction intervals.
- Session plausibility screening (Rule 2) according to Phase 4 specifications.
- In-memory rolling history buffer for live 15-minute interval forecasting.
"""

from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
import numpy as np
import pandas as pd
import joblib

FEATURE_NAMES: List[str] = [
    "slot",
    "dow",
    "is_weekend",
    "slot_sin",
    "slot_cos",
    "dow_sin",
    "dow_cos",
    "lag_1",
    "lag_4",
    "lag_96",
    "lag_672",
    "roll_mean_4",
    "roll_mean_96",
    "roll_std_4",
]

# Section 6 / 8 screening thresholds (measured 99.9th percentile on clean training data before 2022-08-05 16:45)
CHARGER_TYPE_THRESHOLDS = {
    0: 9.7164,   # ~9.7 kW for AC / Level 2
    1: 112.9629, # ~113.0 kW for DC Fast
}


def load_forecasting_artifacts(models_dir: Optional[Path] = None) -> Dict[str, Any]:
    """Load the hybrid model and conformal interval parameters.

    Returns:
        dict with keys: 'lr', 'xgb_residual', 'features', 'edges', 'q_bins', 'alpha'
    """
    if models_dir is None:
        models_dir = Path(__file__).parent / "models"

    hybrid_path = models_dir / "voltnet_hybrid.joblib"
    intervals_path = models_dir / "voltnet_intervals.joblib"

    if not hybrid_path.exists():
        raise FileNotFoundError(f"Missing hybrid model file at: {hybrid_path}")
    if not intervals_path.exists():
        raise FileNotFoundError(f"Missing intervals model file at: {intervals_path}")

    hybrid = joblib.load(hybrid_path)
    intervals = joblib.load(intervals_path)

    return {
        "lr": hybrid["lr"],
        "xgb_residual": hybrid["xgb_residual"],
        "features": hybrid.get("features", FEATURE_NAMES),
        "edges": np.array(intervals["edges"], dtype=float),
        "q_bins": np.array(intervals["q_bins"], dtype=float),
        "alpha": float(intervals.get("alpha", 0.10)),
    }


def compute_calendar_features(dt: pd.Timestamp) -> Dict[str, float]:
    """Compute exact calendar features for a given 15-minute timestamp.

    - slot: 0 to 95 (15-minute interval of the day)
    - dow: 0 (Monday) to 6 (Sunday)
    - is_weekend: 1 if Saturday or Sunday, else 0
    - Sine/cosine encodings with periods 96 (slot) and 7 (dow).
    """
    slot = int(dt.hour * 4 + dt.minute // 15)
    dow = int(dt.dayofweek)
    is_weekend = 1 if dow >= 5 else 0

    slot_sin = float(np.sin(2.0 * np.pi * slot / 96.0))
    slot_cos = float(np.cos(2.0 * np.pi * slot / 96.0))
    dow_sin = float(np.sin(2.0 * np.pi * dow / 7.0))
    dow_cos = float(np.cos(2.0 * np.pi * dow / 7.0))

    return {
        "slot": float(slot),
        "dow": float(dow),
        "is_weekend": float(is_weekend),
        "slot_sin": slot_sin,
        "slot_cos": slot_cos,
        "dow_sin": dow_sin,
        "dow_cos": dow_cos,
    }


def build_feature_row_from_history(
    history_series: pd.Series, target_timestamp: pd.Timestamp
) -> pd.DataFrame:
    """Construct a 1-row feature DataFrame from the recent history series.

    The model requires exactly 672 past 15-minute intervals (7 days) without missing values.
    Rolling statistics (roll_mean_4, roll_mean_96, roll_std_4) and lags (1, 4, 96, 672)
    are calculated strictly on past values ending at t - 1.

    Args:
        history_series: pd.Series with chronological power_kW values ending right before target_timestamp.
        target_timestamp: Timestamp of the 15-minute interval to forecast.

    Returns:
        pd.DataFrame with 1 row and columns matching FEATURE_NAMES.
    """
    if len(history_series) < 672:
        raise ValueError(
            f"Insufficient history: {len(history_series)} intervals provided, 672 required."
        )

    # Use the last 672 elements (corresponding to t-672 to t-1)
    window = history_series.iloc[-672:].to_numpy(dtype=float)

    if np.isnan(window[-1]) or np.isnan(window[-4]) or np.isnan(window[-96]) or np.isnan(window[0]):
        raise ValueError("Missing values (NaN) found in required lag positions (t-1, t-4, t-96, t-672).")

    # Rolling windows ending at t-1:
    # 4 intervals: indices -4, -3, -2, -1
    # 96 intervals: indices -96 to -1
    win_4 = window[-4:]
    win_96 = window[-96:]

    if np.isnan(win_4).any() or np.isnan(win_96).any():
        raise ValueError("Missing values (NaN) found in rolling aggregation window.")

    lag_1 = float(window[-1])
    lag_4 = float(window[-4])
    lag_96 = float(window[-96])
    lag_672 = float(window[0])

    roll_mean_4 = float(np.mean(win_4))
    roll_mean_96 = float(np.mean(win_96))
    roll_std_4 = float(np.std(win_4, ddof=1))

    cal = compute_calendar_features(target_timestamp)

    row = {
        "slot": cal["slot"],
        "dow": cal["dow"],
        "is_weekend": cal["is_weekend"],
        "slot_sin": cal["slot_sin"],
        "slot_cos": cal["slot_cos"],
        "dow_sin": cal["dow_sin"],
        "dow_cos": cal["dow_cos"],
        "lag_1": lag_1,
        "lag_4": lag_4,
        "lag_96": lag_96,
        "lag_672": lag_672,
        "roll_mean_4": roll_mean_4,
        "roll_mean_96": roll_mean_96,
        "roll_std_4": roll_std_4,
    }

    df = pd.DataFrame([row], columns=FEATURE_NAMES, index=[target_timestamp])
    return df


def build_full_feature_dataframe(
    series: pd.Series, mask_gap_date: bool = True
) -> pd.DataFrame:
    """Build the feature matrix across a full pandas series with a DatetimeIndex.

    Used for batch evaluation, parity testing, and backtesting.
    """
    y = series.copy()
    if mask_gap_date and "2022-09-05" in y.index:
        y.loc["2022-09-05"] = np.nan

    dt = y.index
    slot = dt.hour * 4 + dt.minute // 15
    dow = dt.dayofweek
    is_weekend = (dow >= 5).astype(int)

    slot_sin = np.sin(2.0 * np.pi * slot / 96.0)
    slot_cos = np.cos(2.0 * np.pi * slot / 96.0)
    dow_sin = np.sin(2.0 * np.pi * dow / 7.0)
    dow_cos = np.cos(2.0 * np.pi * dow / 7.0)

    lag_1 = y.shift(1)
    lag_4 = y.shift(4)
    lag_96 = y.shift(96)
    lag_672 = y.shift(672)

    y_shift = y.shift(1)
    roll_mean_4 = y_shift.rolling(4).mean()
    roll_mean_96 = y_shift.rolling(96).mean()
    roll_std_4 = y_shift.rolling(4).std()

    df = pd.DataFrame(
        {
            "slot": slot,
            "dow": dow,
            "is_weekend": is_weekend,
            "slot_sin": slot_sin,
            "slot_cos": slot_cos,
            "dow_sin": dow_sin,
            "dow_cos": dow_cos,
            "lag_1": lag_1,
            "lag_4": lag_4,
            "lag_96": lag_96,
            "lag_672": lag_672,
            "roll_mean_4": roll_mean_4,
            "roll_mean_96": roll_mean_96,
            "roll_std_4": roll_std_4,
        },
        index=dt,
    )
    return df[FEATURE_NAMES]


def predict_hybrid_kw(artifacts: Dict[str, Any], X: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Run hybrid forecast: Linear Regression + XGBoost residual, clipped at zero.

    Returns:
        (hybrid_pred, lr_pred, xgb_pred)
    """
    features = artifacts.get("features", FEATURE_NAMES)
    X_in = X[features]

    lr_pred = artifacts["lr"].predict(X_in)
    xgb_pred = artifacts["xgb_residual"].predict(X_in)
    hybrid_pred = np.clip(lr_pred + xgb_pred, 0, None)

    return hybrid_pred, lr_pred, xgb_pred


def compute_prediction_intervals(
    artifacts: Dict[str, Any], predictions: np.ndarray
) -> Dict[str, np.ndarray]:
    """Compute level-adaptive split-conformal prediction intervals.

    edges: [105.6, 154.0, 197.6, 243.4]
    q_bins: [24.7, 42.7, 50.0, 60.9, 64.6]
    """
    edges = artifacts["edges"]
    q_bins = artifacts["q_bins"]

    preds = np.asarray(predictions, dtype=float)
    bin_indices = np.digitize(preds, edges)
    # Clip to valid bin index range
    bin_indices = np.clip(bin_indices, 0, len(q_bins) - 1)
    q_vals = q_bins[bin_indices]

    lower = np.maximum(preds - q_vals, 0.0)
    upper = preds + q_vals
    widths = upper - lower

    return {
        "lower": lower,
        "upper": upper,
        "width": widths,
        "bin": bin_indices,
        "q_val": q_vals,
        "alpha": artifacts.get("alpha", 0.10),
    }


def screen_session_plausibility(
    session: Dict[str, Any], historical_signatures: Optional[set] = None
) -> Dict[str, Any]:
    """Perform session plausibility screening ('rule2' statistical review screen).

    Rules:
    1. Average power (Demand kWh / Duration hours) exceeds ChargerType threshold:
       - Type 0: ~9.7 kW (9.7164 kW, training 99.9th percentile)
       - Type 1: ~113.0 kW (112.9629 kW, training 99.9th percentile)
    2. Short duration (< 5 minutes) with substantial energy (> 1.0 kWh).
    3. Duplicate session signature: (ChargerID, Start, End) matches an existing session.

    Note: A flag indicates 'review recommended', NOT confirmed fraud.
    """
    reasons: List[str] = []
    charger_type = session.get("charger_type", session.get("ChargerType", 0))
    demand_kwh = float(session.get("demand_kwh", session.get("Demand", 0.0)))

    # Duration handling (supports duration_minutes, duration_seconds, or dur_h)
    if "duration_hours" in session:
        dur_h = float(session["duration_hours"])
    elif "duration_minutes" in session:
        dur_h = float(session["duration_minutes"]) / 60.0
    elif "duration_seconds" in session:
        dur_h = float(session["duration_seconds"]) / 3600.0
    elif "dur_h" in session:
        dur_h = float(session["dur_h"])
    elif "Duration" in session:
        dur_h = float(session["Duration"])
    else:
        dur_h = 0.0

    avg_kw = (demand_kwh / dur_h) if dur_h > 0 else (float("inf") if demand_kwh > 0 else 0.0)

    # 1. Power threshold check
    threshold = CHARGER_TYPE_THRESHOLDS.get(int(charger_type), CHARGER_TYPE_THRESHOLDS[0])
    if avg_kw > threshold:
        reasons.append(
            f"Average power ({avg_kw:.2f} kW) exceeds Type {charger_type} threshold ({threshold:.2f} kW)."
        )

    # 2. Short duration with non-trivial demand
    dur_minutes = dur_h * 60.0
    if dur_minutes < 5.0 and demand_kwh > 1.0:
        reasons.append(
            f"Suspicious short duration ({dur_minutes:.1f} min) with substantial demand ({demand_kwh:.2f} kWh)."
        )

    # 3. Duplicate check
    charger_id = session.get("charger_id", session.get("ChargerID"))
    start_time = session.get("start_time", session.get("Start", session.get("StartDatetime")))
    end_time = session.get("end_time", session.get("End", session.get("EndDatetime")))

    signature = None
    if charger_id is not None and start_time is not None and end_time is not None:
        signature = (str(charger_id), str(start_time), str(end_time))
        if historical_signatures is not None and signature in historical_signatures:
            reasons.append(
                f"Duplicate session detected for Charger {charger_id} spanning {start_time} to {end_time}."
            )

    flagged = len(reasons) > 0

    return {
        "flagged": flagged,
        "review_recommended": flagged,
        "classification": "REVIEW_FLAGGED" if flagged else "PLAUSIBLE",
        "avg_kw": round(avg_kw, 2) if avg_kw != float("inf") else 9999.0,
        "threshold_kw": round(threshold, 2),
        "duration_minutes": round(dur_minutes, 2),
        "demand_kwh": round(demand_kwh, 2),
        "reasons": reasons,
        "signature": signature,
        "disclaimer": "Statistical review screening; does not constitute confirmed fraud or physical hardware fault.",
    }


class NetworkHistoryBuffer:
    """Maintains a rolling 15-minute network history buffer for live forecasting."""

    def __init__(self, seed_csv_path: Optional[Path] = None, max_len: int = 1000):
        self.max_len = max_len
        self.series: Optional[pd.Series] = None
        if seed_csv_path and seed_csv_path.exists():
            self.seed_from_csv(seed_csv_path)

    def seed_from_csv(self, path: Path):
        """Seed initial history from voltnet_15min.csv using the latest intervals."""
        df = pd.read_csv(path, index_col=0, parse_dates=True)
        # Use power_kW series
        if "power_kW" in df.columns:
            s = df["power_kW"].dropna()
            self.series = s.iloc[-self.max_len:].copy()
        elif "energy_kWh" in df.columns:
            s = (df["energy_kWh"] * 4.0).dropna()
            self.series = s.iloc[-self.max_len:].copy()

    def add_reading(self, timestamp: pd.Timestamp, power_kw: float):
        """Append or update a 15-minute interval reading."""
        if self.series is None:
            self.series = pd.Series([power_kw], index=[timestamp], name="power_kW")
        else:
            self.series[timestamp] = float(power_kw)
            if len(self.series) > self.max_len:
                self.series = self.series.iloc[-self.max_len:]

    def get_latest_forecast(
        self, artifacts: Dict[str, Any], target_timestamp: Optional[pd.Timestamp] = None
    ) -> Dict[str, Any]:
        """Generate a one-step-ahead forecast for the specified interval or next 15-minute slot."""
        if self.series is None or len(self.series) < 672:
            return {
                "available": False,
                "reason": f"Insufficient history: {len(self.series) if self.series is not None else 0} of 672 intervals recorded.",
            }

        last_ts = self.series.index[-1]
        if target_timestamp is None:
            target_ts = last_ts + pd.Timedelta(minutes=15)
        else:
            target_ts = target_timestamp

        X = build_feature_row_from_history(self.series, target_ts)
        hybrid_pred, lr_pred, xgb_pred = predict_hybrid_kw(artifacts, X)
        intervals = compute_prediction_intervals(artifacts, hybrid_pred)

        pred_val = float(hybrid_pred[0])
        lower_val = float(intervals["lower"][0])
        upper_val = float(intervals["upper"][0])
        width_val = float(intervals["width"][0])
        bin_val = int(intervals["bin"][0])

        return {
            "available": True,
            "target_timestamp": str(target_ts),
            "forecast_power_kw": round(pred_val, 2),
            "lr_baseline_kw": round(float(lr_pred[0]), 2),
            "xgb_residual_kw": round(float(xgb_pred[0]), 2),
            "interval_90": {
                "lower_kw": round(lower_val, 2),
                "upper_kw": round(upper_val, 2),
                "width_kw": round(width_val, 2),
                "nominal_coverage": 0.90,
                "bin_index": bin_val,
            },
            "horizon": "15_minutes",
            "model_type": "hybrid_lr_xgboost_residual",
        }
