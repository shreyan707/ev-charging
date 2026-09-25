import React from "react";
import { Activity, Gauge, Zap, BatteryCharging } from "lucide-react";

export default function Telemetry({
  telemetry = [],
  currentTelemetry = null,
  energyConsumedWh = 0,
  maxEnergyWh = 25000
}) {
  const current = currentTelemetry ? currentTelemetry.current.toFixed(1) : "0.0";
  const voltage = currentTelemetry ? currentTelemetry.voltage.toFixed(0) : "0";
  const powerKw = currentTelemetry ? (currentTelemetry.power / 1000).toFixed(2) : "0.00";
  const percentEnergy = Math.min(100, Math.round((energyConsumedWh / (maxEnergyWh || 25000)) * 100));

  // Build points for sparkline SVG from recent telemetry history
  const recentPoints = telemetry.slice(-15);
  const svgWidth = 280;
  const svgHeight = 50;

  let sparklinePoints = "";
  if (recentPoints.length > 1) {
    const maxP = Math.max(...recentPoints.map(p => p.power || 0), 1000);
    const minP = Math.min(...recentPoints.map(p => p.power || 0), 0);
    const range = maxP - minP || 1;

    sparklinePoints = recentPoints
      .map((p, i) => {
        const x = (i / (recentPoints.length - 1)) * svgWidth;
        const y = svgHeight - ((p.power - minP) / range) * (svgHeight - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <div className="telemetry-block" id="live-telemetry-block">
      {/* 4-Cell Telemetry Grid (Section 13) */}
      <div className="telemetry-grid">
        <div className="telemetry-cell">
          <span className="t-lbl">
            CURRENT <Activity size={12} />
          </span>
          <div className="t-val">
            {current} <span className="t-unit">A</span>
          </div>
        </div>

        <div className="telemetry-cell">
          <span className="t-lbl">
            VOLTAGE <Gauge size={12} />
          </span>
          <div className="t-val">
            {voltage} <span className="t-unit">V</span>
          </div>
        </div>

        <div className="telemetry-cell">
          <span className="t-lbl">
            POWER <Zap size={12} />
          </span>
          <div className="t-val">
            {powerKw} <span className="t-unit">kW</span>
          </div>
        </div>

        <div className="telemetry-cell">
          <span className="t-lbl">
            ENERGY <BatteryCharging size={12} />
          </span>
          <div className="t-val">
            {energyConsumedWh} <span className="t-unit">Wh</span>
          </div>
        </div>
      </div>

      {/* Brutalist ASCII-style Progress Blocks */}
      <div className="session-progress-module">
        <div className="progress-module-head">
          <span>DELIVERED ENERGY</span>
          <span className="mono">{energyConsumedWh} Wh ({percentEnergy}%)</span>
        </div>
        <div className="progress-blocks-track">
          {Array.from({ length: 20 }).map((_, idx) => {
            const blockThreshold = (idx + 1) * 5;
            const isFilled = percentEnergy >= blockThreshold;
            const isCurrent = percentEnergy >= blockThreshold - 5 && percentEnergy < blockThreshold;
            return (
              <div 
                key={idx} 
                className={`progress-block-unit ${isFilled ? "filled" : ""} ${isCurrent ? "active-accent" : ""}`}
              />
            );
          })}
        </div>
      </div>

      {/* Industrial Monochrome Telemetry Chart */}
      <div className="telemetry-chart-box">
        <div className="chart-header">
          <span>POWER TELEMETRY STREAM</span>
          <span className="text-success">● MQTT ACTIVE (3s)</span>
        </div>
        <svg className="sparkline-svg" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          <line x1="0" y1="12" x2={svgWidth} y2="12" className="sparkline-grid-line" />
          <line x1="0" y1="25" x2={svgWidth} y2="25" className="sparkline-grid-line" />
          <line x1="0" y1="38" x2={svgWidth} y2="38" className="sparkline-grid-line" />
          {sparklinePoints ? (
            <polyline
              points={sparklinePoints}
              className="sparkline-path"
            />
          ) : (
            <line x1="0" y1="25" x2={svgWidth} y2="25" className="sparkline-path" />
          )}
        </svg>
      </div>
    </div>
  );
}
