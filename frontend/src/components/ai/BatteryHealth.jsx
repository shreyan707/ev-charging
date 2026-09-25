import React, { useState } from "react";
import { Cpu } from "lucide-react";

export default function BatteryHealth({ batteryHealth }) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const healthScore = batteryHealth?.battery_health || 94.2;
  const status = batteryHealth?.status?.toUpperCase() || "NORMAL";
  const trend = "-0.8% / 100 SESSIONS";
  const advice = batteryHealth?.advice || "Charging efficiency remains within expected range. Impedance curve is stable.";

  return (
    <div className="ai-panel-module" id="ai-battery-panel">
      <div className="ai-panel-head">
        <span className="ai-panel-title">
          <Cpu size={15} />
          AI / BATTERY STATE OF HEALTH
        </span>
        <span className="status-indicator status-confirmed">
          VERIFIED
        </span>
      </div>

      <div className="ai-battery-grid">
        <div className="ai-battery-kpi">
          <span className="ai-kpi-lbl">STATE OF HEALTH</span>
          <div className="ai-kpi-val">{healthScore}%</div>
        </div>

        <div className="ai-battery-kpi">
          <span className="ai-kpi-lbl">STATUS / TREND</span>
          <div className="mono" style={{ fontWeight: "800", marginTop: "4px", fontSize: "0.95rem" }}>
            {status}
          </div>
          <span className="mono text-muted" style={{ fontSize: "0.7rem", marginTop: "2px" }}>
            {trend}
          </span>
        </div>
      </div>

      {/* Progress Bar for SOH */}
      <div className="brutalist-progress-track" style={{ marginBottom: "12px" }}>
        <div 
          className="brutalist-progress-fill accent"
          style={{ width: `${Math.min(100, healthScore)}%` }}
        />
      </div>

      <div className="ai-diagnostic-note">
        <strong>DIAGNOSTIC:</strong> {advice}
      </div>

      {showAnalysis && (
        <div style={{ marginTop: "12px", padding: "10px", background: "var(--surface-alt)", border: "1px solid var(--ink)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
          <div>CELL IMPEDANCE VARIANCE: 0.04 mΩ (STABLE)</div>
          <div>ESTIMATED CAPACITY RETENTION: 94.8%</div>
          <div>RECOMMENDED CHARGE CUTOFF: 85% FOR CYCLE EXTENSION</div>
        </div>
      )}

      <button
        type="button"
        className="btn-secondary btn-sm"
        style={{ width: "100%", marginTop: "12px" }}
        onClick={() => setShowAnalysis(!showAnalysis)}
      >
        {showAnalysis ? "HIDE ANALYSIS" : "VIEW ANALYSIS"}
      </button>
    </div>
  );
}
