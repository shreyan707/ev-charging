"""API Integration tests for FastAPI endpoints, ensuring backwards compatibility and Phase 4 features."""

import unittest
from fastapi.testclient import TestClient
from app import app


class TestAPIEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_root_endpoint(self):
        resp = self.client.get("/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "VoltNet AI Service Online")
        self.assertTrue(data["phase4_hybrid_model_loaded"])

    def test_predict_demand_backwards_compatibility(self):
        """Must strictly preserve all existing fields consumed by Node backend and React frontend."""
        resp = self.client.get("/predict-demand?station_id=2&hour=10&day_of_week=1")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Legacy fields verified
        self.assertIn("station_id", data)
        self.assertEqual(data["station_id"], 2)
        self.assertIn("hour", data)
        self.assertEqual(data["hour"], 10)
        self.assertIn("day_of_week", data)
        self.assertEqual(data["day_of_week"], 1)
        self.assertIn("predicted_occupancy_ratio", data)
        self.assertIsInstance(data["predicted_occupancy_ratio"], float)
        self.assertIn("recommendation", data)
        self.assertIsInstance(data["recommendation"], str)

        # Additive Phase 4 fields verified
        self.assertIn("network_power_kw", data)
        self.assertIsNotNone(data["network_power_kw"])
        self.assertIn("network_interval_90", data)
        self.assertIsNotNone(data["network_interval_90"])
        self.assertIn("lower_kw", data["network_interval_90"])
        self.assertIn("upper_kw", data["network_interval_90"])

    def test_forecast_network_endpoint(self):
        resp = self.client.get("/forecast-network")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["available"])
        self.assertIn("forecast_power_kw", data)
        self.assertIn("interval_90", data)
        self.assertGreater(data["interval_90"]["upper_kw"], data["interval_90"]["lower_kw"])

    def test_screen_session_endpoint(self):
        # Normal plausible session
        clean_resp = self.client.post(
            "/screen-session",
            json={
                "chargerType": 0,
                "demandKwh": 6.5,
                "durationHours": 1.0,
                "chargerId": "CH_101",
                "startTime": "2026-10-23T10:00:00",
                "endTime": "2026-10-23T11:00:00",
            },
        )
        self.assertEqual(clean_resp.status_code, 200)
        clean_data = clean_resp.json()
        self.assertFalse(clean_data["flagged"])
        self.assertEqual(clean_data["classification"], "PLAUSIBLE")

        # Implausible session: 25 kWh on Type 0 (AC) in 1 hour -> 25 kW > 9.71 kW
        flag_resp = self.client.post(
            "/screen-session",
            json={
                "chargerType": 0,
                "demandKwh": 25.0,
                "durationHours": 1.0,
                "chargerId": "CH_102",
                "startTime": "2026-10-23T11:00:00",
                "endTime": "2026-10-23T12:00:00",
            },
        )
        self.assertEqual(flag_resp.status_code, 200)
        flag_data = flag_resp.json()
        self.assertTrue(flag_data["flagged"])
        self.assertEqual(flag_data["classification"], "REVIEW_FLAGGED")


if __name__ == "__main__":
    unittest.main()
