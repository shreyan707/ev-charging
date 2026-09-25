import React from "react";

export default function SessionHistory({
  sessions = [],
  onSelectSession,
  formatWeiToEth
}) {
  if (sessions.length === 0) return null;

  return (
    <div className="session-history-container" style={{ marginTop: "24px" }}>
      <div className="brutalist-section-head">
        <div className="section-head-left">
          <span className="section-num mono">04</span>
          <h2 className="section-title">SESSION LOG</h2>
        </div>
        <span className="section-tag mono">HISTORICAL SETTLEMENTS</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="brutalist-table">
          <thead>
            <tr>
              <th>SESSION</th>
              <th>STATION</th>
              <th>START TIME</th>
              <th>DURATION</th>
              <th>ENERGY</th>
              <th>TOTAL BILL</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr 
                key={s.sessionId}
                onClick={() => onSelectSession && onSelectSession(s.sessionId)}
                style={{ cursor: "pointer" }}
              >
                <td className="mono" style={{ fontWeight: "800" }}>
                  #{String(s.sessionId).padStart(4, "0")}
                </td>
                <td className="mono">
                  STATION {String(s.stationId).padStart(2, "0")}
                </td>
                <td className="mono text-muted" style={{ fontSize: "0.75rem" }}>
                  {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                </td>
                <td className="mono">
                  {Math.floor((s.duration || 3600) / 60)} min
                </td>
                <td className="mono">
                  {s.energyConsumedWh || 0} Wh
                </td>
                <td className="mono">
                  {formatWeiToEth(s.totalBill)} ETH
                </td>
                <td>
                  <span className={`status-indicator ${s.status === "Paid" ? "status-confirmed" : s.status === "Charging" ? "status-charging" : s.status === "Booked" ? "status-queued" : "status-available"}`}>
                    {s.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
