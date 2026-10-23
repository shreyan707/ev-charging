"""Unit and Parity Tests for VoltNet Phase 4 Integration.

Acceptance criteria from Section 5 of agent_instructions/dataset.md:
1. Rebuild features on voltnet_15min.csv (masking 2022-09-05).
2. Match hybrid predictions on voltnet_hybrid_preds.csv to numerical precision (<= 1e-5 max error).
3. Verify 90% conformal interval test coverage (~0.898) and mean width (~94.6 kW).
4. Verify single-row history extraction matches batch feature calculation.
5. Verify session plausibility screening rules.
"""

import unittest
from pathlib import Path
import numpy as np
import pandas as pd

from forecasting import (
    load_forecasting_artifacts,
    build_full_feature_dataframe,
    build_feature_row_from_history,
    predict_hybrid_kw,
    compute_prediction_intervals,
    screen_session_plausibility,
    NetworkHistoryBuffer,
    FEATURE_NAMES,
)


class TestVoltNetParity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ai_dir = Path(__file__).resolve().parent.parent
        cls.models_dir = cls.ai_dir / "models"
        cls.data_dir = cls.ai_dir / "data"

        cls.artifacts = load_forecasting_artifacts(cls.models_dir)

        cls.csv_15min = cls.data_dir / "voltnet_15min.csv"
        cls.csv_hybrid_preds = cls.data_dir / "voltnet_hybrid_preds.csv"

        cls.df_15min = pd.read_csv(cls.csv_15min, index_col=0, parse_dates=True)
        cls.hybrid_preds_df = pd.read_csv(cls.csv_hybrid_preds, index_col=0, parse_dates=True)

    def test_feature_parity_and_hybrid_prediction(self):
        """Parity test: Rebuilt features must reproduce hybrid predictions."""
        # 1. Build features with 2022-09-05 masked to NaN
        X = build_full_feature_dataframe(self.df_15min["power_kW"], mask_gap_date=True)

        # 2. Intersect valid feature rows with test & cal splits
        valid_idx = X.dropna().index.intersection(self.hybrid_preds_df.index)
        self.assertEqual(len(valid_idx), 10233, "Should have 10,233 valid evaluation intervals.")

        X_eval = X.loc[valid_idx]
        hybrid_pred, lr_pred, xgb_pred = predict_hybrid_kw(self.artifacts, X_eval)
        target_hybrid = self.hybrid_preds_df.loc[valid_idx, "hybrid"].to_numpy()

        # Compute max and mean absolute error
        abs_errors = np.abs(hybrid_pred - target_hybrid)
        max_error = float(np.max(abs_errors))
        mean_error = float(np.mean(abs_errors))

        print(f"\n[PARITY TEST RESULT] Max absolute error: {max_error:.8e}")
        print(f"[PARITY TEST RESULT] Mean absolute error: {mean_error:.8e}")

        # The error is dominated only by CSV float serialization (around 2.8e-6)
        self.assertLess(max_error, 1e-5, f"Parity error {max_error} exceeds acceptable tolerance 1e-5.")

    def test_prediction_interval_coverage_and_width(self):
        """Interval calibration check on the test split (5,117 points)."""
        test_mask = self.hybrid_preds_df["split"] == "test"
        test_df = self.hybrid_preds_df[test_mask]
        self.assertEqual(len(test_df), 5117, "Test split must contain exactly 5,117 intervals.")

        preds = test_df["hybrid"].to_numpy()
        actuals = test_df["y"].to_numpy()

        intervals = compute_prediction_intervals(self.artifacts, preds)
        lower = intervals["lower"]
        upper = intervals["upper"]
        widths = intervals["width"]

        covered = (actuals >= lower) & (actuals <= upper)
        coverage = float(np.mean(covered))
        mean_width = float(np.mean(widths))

        print(f"\n[INTERVAL TEST RESULT] Test Coverage: {coverage:.4f} (target ~0.898)")
        print(f"[INTERVAL TEST RESULT] Mean Width: {mean_width:.2f} kW (target ~94.6 kW)")

        self.assertAlmostEqual(coverage, 0.8982, places=3, msg="Coverage deviates from calibrated 0.898 benchmark.")
        self.assertAlmostEqual(mean_width, 94.60, places=1, msg="Mean width deviates from 94.6 kW benchmark.")

    def test_single_row_builder_matches_batch_builder(self):
        """Single-row builder from rolling history must match the batch builder identically."""
        X_batch = build_full_feature_dataframe(self.df_15min["power_kW"], mask_gap_date=True)

        # Select a sample timestamp in test split
        target_ts = pd.Timestamp("2022-08-15 14:30:00")
        batch_row = X_batch.loc[target_ts]

        # Extract past 672 intervals prior to target_ts
        past_series = self.df_15min.loc[: target_ts - pd.Timedelta(minutes=15), "power_kW"]
        single_row_df = build_feature_row_from_history(past_series, target_ts)
        single_row = single_row_df.iloc[0]

        for col in FEATURE_NAMES:
            b_val = float(batch_row[col])
            s_val = float(single_row[col])
            self.assertAlmostEqual(b_val, s_val, places=6, msg=f"Mismatch in feature '{col}'.")

    def test_insufficient_history_rejection(self):
        """Single-row builder must reject history with fewer than 672 points."""
        short_series = pd.Series(np.ones(500), index=pd.date_range("2022-01-01", periods=500, freq="15min"))
        with self.assertRaises(ValueError):
            build_feature_row_from_history(short_series, pd.Timestamp("2022-01-07"))

    def test_session_plausibility_screening(self):
        """Test rule2 session plausibility screening."""
        # 1. Normal plausible session (Type 0, 7 kW avg, 1 hour, 7 kWh)
        normal_session = {
            "charger_type": 0,
            "demand_kwh": 7.0,
            "duration_hours": 1.0,
            "charger_id": 101,
            "start_time": "2022-06-01 10:00",
            "end_time": "2022-06-01 11:00",
        }
        res_normal = screen_session_plausibility(normal_session)
        self.assertFalse(res_normal["flagged"])
        self.assertEqual(res_normal["classification"], "PLAUSIBLE")

        # 2. Implausible high-power session for Type 0 (> 9.71 kW threshold)
        high_power_session = {
            "charger_type": 0,
            "demand_kwh": 20.0,
            "duration_hours": 1.0,  # 20 kW on AC charger!
            "charger_id": 101,
            "start_time": "2022-06-01 12:00",
            "end_time": "2022-06-01 13:00",
        }
        res_hp = screen_session_plausibility(high_power_session)
        self.assertTrue(res_hp["flagged"])
        self.assertTrue(any("exceeds Type 0 threshold" in r for r in res_hp["reasons"]))

        # 3. Truncated short duration with significant energy (< 5 min, > 1 kWh)
        short_session = {
            "charger_type": 1,
            "demand_kwh": 10.0,
            "duration_minutes": 2.0,  # 2 minutes
            "charger_id": 202,
            "start_time": "2022-06-01 14:00",
            "end_time": "2022-06-01 14:02",
        }
        res_short = screen_session_plausibility(short_session)
        self.assertTrue(res_short["flagged"])
        self.assertTrue(any("Suspicious short duration" in r for r in res_short["reasons"]))

        # 4. Duplicate session detection
        seen_signatures = {("202", "2022-06-01 14:00", "2022-06-01 14:30")}
        dup_session = {
            "charger_type": 1,
            "demand_kwh": 15.0,
            "duration_minutes": 30.0,
            "charger_id": 202,
            "start_time": "2022-06-01 14:00",
            "end_time": "2022-06-01 14:30",
        }
        res_dup = screen_session_plausibility(dup_session, historical_signatures=seen_signatures)
        self.assertTrue(res_dup["flagged"])
        self.assertTrue(any("Duplicate session detected" in r for r in res_dup["reasons"]))

    def test_history_buffer(self):
        """Test rolling history buffer seeding and forecast generation."""
        buffer = NetworkHistoryBuffer(seed_csv_path=self.csv_15min, max_len=800)
        self.assertGreaterEqual(len(buffer.series), 672)

        forecast = buffer.get_latest_forecast(self.artifacts)
        self.assertTrue(forecast["available"])
        self.assertIn("forecast_power_kw", forecast)
        self.assertIn("interval_90", forecast)
        self.assertGreater(forecast["forecast_power_kw"], 0.0)


if __name__ == "__main__":
    unittest.main()
