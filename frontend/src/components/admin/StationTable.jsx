import React from "react";
import StationStatus from "../stations/StationStatus";

export default function StationTable({
  stations = [],
  onSelectStation,
  onBookSlot,
  formatWeiToEth
}) {
  return (
    <div className="admin-station-table-container" style={{ marginBottom: "24px" }}>
      <div className="brutalist-section-head">
        <div className="section-head-left">
          <span className="section-num mono">01</span>
          <h2 className="section-title">ADMIN STATION OVERVIEW</h2>
        </div>
        <span className="section-tag mono">FLEET TELEMETRY</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="brutalist-table" id="admin-overview-table">
          <thead>
            <tr>
              <th>STATION</th>
              <th>NAME / COORDS</th>
              <th>STATUS</th>
              <th>BASE RATE</th>
              <th>DEMAND</th>
              <th>SOLAR</th>
              <th>QUEUE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((st) => {
              const queueCount = st.queue ? st.queue.length : 0;
              const stationNumStr = String(st.stationId).padStart(2, "0");

              return (
                <tr 
                  key={st.stationId}
                  onClick={() => onSelectStation && onSelectStation(st.stationId)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="mono" style={{ fontWeight: "800" }}>
                    #{stationNumStr}
                  </td>
                  <td>
                    <div style={{ fontWeight: "700" }}>{st.name}</div>
                    <div className="mono text-muted" style={{ fontSize: "0.7rem" }}>
                      {st.coordinates}
                    </div>
                  </td>
                  <td>
                    <StationStatus status={st.status} queueCount={queueCount} />
                  </td>
                  <td className="mono">
                    {formatWeiToEth(st.basePricePerWh)} ETH/Wh
                  </td>
                  <td className="mono text-warning">
                    +{st.demandLevel || 0}%
                  </td>
                  <td className="mono text-success">
                    {st.renewableRatio || 0}%
                  </td>
                  <td className="mono">
                    {String(queueCount).padStart(2, "0")}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookSlot(st);
                      }}
                    >
                      BOOK
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
