import React from "react";
import StationCard from "./StationCard";

export default function StationGrid({
  stations = [],
  selectedStationId,
  forecasts = {},
  onSelectStation,
  onBookSlot,
  formatWeiToEth
}) {
  return (
    <section className="stations-section" id="stations-section">
      <div className="brutalist-section-head">
        <div className="section-head-left">
          <span className="section-num mono">01</span>
          <h2 className="section-title">CHARGING STATIONS</h2>
        </div>
        <span className="section-tag mono">
          SYS / GRID / {String(stations.length).padStart(3, "0")}
        </span>
      </div>

      <div className="station-grid-container">
        {stations.map((st) => (
          <StationCard
            key={st.stationId}
            station={st}
            isSelected={selectedStationId === st.stationId}
            forecast={forecasts[st.stationId]}
            onSelectStation={onSelectStation}
            onBookSlot={onBookSlot}
            formatWeiToEth={formatWeiToEth}
          />
        ))}
      </div>
    </section>
  );
}
