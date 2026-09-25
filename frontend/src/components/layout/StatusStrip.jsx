import React from "react";
import { Activity } from "lucide-react";

export default function StatusStrip({
  stations = [],
  userSessions = [],
  chainId,
  hasFraudAlert
}) {
  const totalStations = stations.length || 8;
  const onlineStations = stations.filter(s => s.status !== "Offline").length || totalStations;
  const activeSessionsCount = userSessions.filter(s => s.status === "Charging").length;
  const queuedCount = stations.reduce((acc, st) => acc + (st.queue ? st.queue.length : 0), 0) +
    userSessions.filter(s => s.status === "Booked").length;

  return (
    <div className="system-status-strip" id="system-status-strip">
      <div className="status-strip-label">
        <Activity size={14} />
        <span>SYSTEM STATUS</span>
      </div>

      <div className="status-strip-metrics">
        <div className="status-metric-cell">
          <span className="metric-val">{String(onlineStations).padStart(2, "0")} / {String(totalStations).padStart(2, "0")}</span>
          <span className="metric-lbl">STATIONS ONLINE</span>
        </div>

        <div className="status-metric-cell">
          <span className="metric-val">{String(activeSessionsCount).padStart(2, "0")}</span>
          <span className="metric-lbl">ACTIVE SESSIONS</span>
        </div>

        <div className="status-metric-cell">
          <span className="metric-val">{String(queuedCount).padStart(2, "0")}</span>
          <span className="metric-lbl">QUEUED</span>
        </div>

        <div className="status-metric-cell">
          <span className={`metric-val ${hasFraudAlert ? "text-critical" : ""}`}>
            {hasFraudAlert ? "01 ALERT" : "00 CLEAN"}
          </span>
          <span className="metric-lbl">AI INTEGRITY</span>
        </div>

        <div className="status-metric-cell">
          <span className="metric-val">127.0.0.1:8545</span>
          <span className="metric-lbl">RPC NODE</span>
        </div>

        <div className="status-metric-cell">
          <span className="metric-val">{Number(chainId) === 1337 || Number(chainId) === 31337 ? "HARDHAT (1337)" : chainId ? `CHAIN (${chainId})` : "STANDBY"}</span>
          <span className="metric-lbl">CONSENSUS</span>
        </div>
      </div>
    </div>
  );
}
