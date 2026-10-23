import React from "react";
import { TrendingUp, Activity } from "lucide-react";

export default function DemandForecast({ forecast, stationName = "CAMPUS GRID" }) {
  const occupancy = forecast?.predicted_occupancy_ratio || 45;
  const demandLevel = occupancy > 70 ? "HIGH DEMAND" : occupancy > 40 ? "MODERATE DEMAND" : "LOW DEMAND";
  const recommendation = forecast?.recommendation || (occupancy > 70 ? "EXPECT QUEUE FORMATION" : "IMMEDIATE SLOTS OPEN");
  const networkPower = forecast?.network_power_kw;
  const interval = forecast?.network_interval_90;

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

      {networkPower != null && (
        <div className="ai-battery-grid" style={{ marginBottom: "8px" }}>
          <div className="ai-battery-kpi">
            <span className="ai-kpi-lbl">
              <Activity size={10} style={{ display: "inline", marginRight: "4px" }} />
              NETWORK 15M POWER
            </span>
            <div className="ai-kpi-val" style={{ fontSize: "1.2rem" }}>
              {networkPower} <span style={{ fontSize: "0.75rem", fontWeight: "700" }}>kW</span>
            </div>
          </div>

          <div className="ai-battery-kpi">
            <span className="ai-kpi-lbl">90% CONFORMAL INTERVAL</span>
            <div className="mono" style={{ fontWeight: "800", marginTop: "6px", fontSize: "0.82rem" }}>
              {interval ? `${interval.lower_kw} – ${interval.upper_kw} kW` : "N/A"}
            </div>
          </div>
        </div>
      )}

      <div className="ai-diagnostic-note">
        <strong>OPERATIONAL RECOMMENDATION:</strong> {recommendation}
      </div>
    </div>
  );
}
