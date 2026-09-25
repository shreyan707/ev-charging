import React from "react";
import { MapPin, Calendar } from "lucide-react";
import StationStatus from "./StationStatus";

export default function StationCard({
  station,
  isSelected,
  forecast,
  onBookSlot,
  formatWeiToEth
}) {
  const queueCount = station.queue ? station.queue.length : 0;
  const rateEth = formatWeiToEth(station.basePricePerWh);
  const stationNumStr = String(station.stationId).padStart(2, "0");

  return (
    <div 
      className={`station-module ${isSelected ? "selected" : ""}`}
      id={`station-module-${station.stationId}`}
    >
      <div className="station-module-header">
        <div className="station-code-group">
          <span className="station-code">STATION {stationNumStr}</span>
          <span className="station-location" title={station.name}>
            <MapPin size={11} />
            {station.name.replace(" Charger", "").replace(" Hub", "")}
          </span>
        </div>
        <StationStatus status={station.status} queueCount={queueCount} />
      </div>

      <div className="station-power-highlight">
        <span className="p-lbl">MAX CHARGE POWER</span>
        <span className="p-val">7.20 kW</span>
      </div>

      <div className="station-params-grid">
        <div className="param-box">
          <span className="lbl">BASE RATE</span>
          <span className="val mono">{rateEth} ETH/Wh</span>
        </div>

        <div className="param-box">
          <span className="lbl">DEMAND MARKUP</span>
          <span className="val mono text-warning">+{station.demandLevel || 0}%</span>
        </div>

        <div className="param-box">
          <span className="lbl">SOLAR MIX</span>
          <span className="val mono text-success">{station.renewableRatio || 0}%</span>
        </div>

        <div className="param-box">
          <span className="lbl">QUEUE DEPTH</span>
          <span className="val mono">{String(queueCount).padStart(2, "0")} VEHICLES</span>
        </div>
      </div>

      <div className="station-ai-forecast-bar">
        <span className="ai-lbl">AI DEMAND SIGNAL</span>
        <span className="mono">
          {forecast ? (
            `${forecast.predicted_occupancy_ratio}% OCCUPANCY · ${forecast.recommendation || "NORMAL DEMAND"}`
          ) : (
            "STEADY GRID STATE · NO CONGESTION"
          )}
        </span>
      </div>

      <div className="station-action-row">
        <button
          type="button"
          className="btn-primary"
          onClick={() => onBookSlot(station)}
          id={`btn-book-slot-${station.stationId}`}
        >
          <Calendar size={14} />
          BOOK SLOT
        </button>
      </div>
    </div>
  );
}
