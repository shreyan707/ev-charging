import React from "react";
import { TrendingUp } from "lucide-react";

export default function DemandForecast({ forecast, stationName = "CAMPUS GRID" }) {
  const occupancy = forecast?.predicted_occupancy_ratio || 45;
  const demandLevel = occupancy > 70 ? "HIGH DEMAND" : occupancy > 40 ? "MODERATE DEMAND" : "LOW DEMAND";
  const recommendation = forecast?.recommendation || (occupancy > 70 ? "EXPECT QUEUE FORMATION" : "IMMEDIATE SLOTS OPEN");

  return (
    <div className="ai-panel-module" id="ai-demand-forecast-panel">
      <div className="ai-panel-head">
        <span className="ai-panel-title">
          <TrendingUp size={15} />
          AI FORECAST — {stationName.toUpperCase()}
        </span>
        <span className={`status-indicator ${occupancy > 70 ? "status-queued" : "status-available"}`}>
          {occupancy}% LOAD
        </span>
      </div>

      <div className="ai-battery-grid" style={{ marginBottom: "8px" }}>
        <div className="ai-battery-kpi">
          <span className="ai-kpi-lbl">OCCUPANCY PROJECTION</span>
          <div className="ai-kpi-val">{occupancy}%</div>
        </div>

        <div className="ai-battery-kpi">
          <span className="ai-kpi-lbl">NEXT 30 MIN OUTLOOK</span>
          <div className="mono" style={{ fontWeight: "800", marginTop: "4px", fontSize: "0.95rem" }}>
            {demandLevel}
          </div>
        </div>
      </div>

      <div className="ai-diagnostic-note">
        <strong>OPERATIONAL RECOMMENDATION:</strong> {recommendation}
      </div>
    </div>
  );
}
