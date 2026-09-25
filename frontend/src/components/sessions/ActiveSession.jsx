import React, { useState, useEffect } from "react";
import { Play, Square, CreditCard, BatteryCharging } from "lucide-react";
import Telemetry from "./Telemetry";

export default function ActiveSession({
  session,
  userSessions = [],
  onSelectSession,
  onStartCharging,
  onPayBill,
  onFindStation,
  isLoading,
  formatWeiToEth
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!session || session.status !== "Charging") {
      setElapsedSeconds(0);
      return;
    }

    const start = session.startTime ? new Date(session.startTime).getTime() : Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      setElapsedSeconds(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Section 32: Empty State
  if (!session) {
    return (
      <div className="active-session-module" id="active-session-container">
        <div className="brutalist-section-head" style={{ marginBottom: "12px" }}>
          <div className="section-head-left">
            <span className="section-num mono">02</span>
            <h2 className="section-title">ACTIVE SESSION</h2>
          </div>
          <span className="section-tag mono">STATUS: IDLE</span>
        </div>

        <div className="brutalist-empty-box">
          <BatteryCharging size={36} strokeWidth={1.5} />
          <div className="empty-title">NO ACTIVE SESSION</div>
          <p className="empty-desc">
            Book an available campus station slot to initiate grid charging and live telemetry streaming.
          </p>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={onFindStation}
            id="btn-empty-find-station"
          >
            FIND A STATION
          </button>
        </div>
      </div>
    );
  }

  const lastTelemetry = session.telemetry && session.telemetry.length > 0
    ? session.telemetry[session.telemetry.length - 1]
    : null;

  const powerKw = lastTelemetry ? (lastTelemetry.power / 1000).toFixed(2) : "0.00";
  const sessionNumStr = String(session.sessionId).padStart(4, "0");
  const stationNumStr = String(session.stationId).padStart(2, "0");

  return (
    <div className="active-session-module" id="active-session-container">
      <div className="brutalist-section-head" style={{ marginBottom: "12px" }}>
        <div className="section-head-left">
          <span className="section-num mono">02</span>
          <h2 className="section-title">ACTIVE SESSION</h2>
        </div>
        <span className="section-tag mono">
          {session.status.toUpperCase()}
        </span>
      </div>

      {/* Switcher if user has multiple sessions */}
      {userSessions.length > 1 && (
        <div style={{ display: "flex", gap: "4px", marginBottom: "14px", overflowX: "auto" }}>
          {userSessions.map((s) => (
            <button
              key={s.sessionId}
              type="button"
              className={`btn-sm ${s.sessionId === session.sessionId ? "btn-primary" : "btn-secondary"}`}
              onClick={() => onSelectSession(s.sessionId)}
            >
              #{String(s.sessionId).padStart(4, "0")} ({s.status})
            </button>
          ))}
        </div>
      )}

      {/* Session Header Strip */}
      <div className="session-header-strip">
        <div>
          <div className="session-main-id">
            SESSION #{sessionNumStr}
          </div>
          <div className="session-meta-sub">
            STATION {stationNumStr} · RESERVATION: {Math.floor(session.duration / 60)} MIN
          </div>
        </div>
        <span className={`status-indicator ${session.status === "Charging" ? "status-charging" : session.status === "Booked" ? "status-queued" : "status-confirmed"}`}>
          {session.status === "Charging" ? "■ CHARGING" : session.status === "Booked" ? "▲ READY TO START" : "✓ COMPLETED"}
        </span>
      </div>

      {/* Primary KPI Block: Big Power Display (Level 01) */}
      <div className="session-kpi-block">
        <div className="kpi-left">
          <span className="kpi-label">ACTIVE DELIVERED POWER</span>
          <div className="kpi-big-num">
            {powerKw} <span>kW</span>
          </div>
        </div>

        <div className="kpi-timer-box">
          <div className="kpi-timer-val">
            {session.status === "Charging" ? formatTimer(elapsedSeconds) : "--:--"}
          </div>
          <span className="kpi-timer-lbl">SESSION ELAPSED</span>
        </div>
      </div>

      {/* Live Telemetry Display */}
      {session.status === "Charging" && (
        <Telemetry
          telemetry={session.telemetry || []}
          currentTelemetry={lastTelemetry}
          energyConsumedWh={session.energyConsumedWh || 0}
        />
      )}

      {/* Booked State: Ready to Start */}
      {session.status === "Booked" && (
        <div style={{ padding: "16px", background: "var(--surface-alt)", border: "1px solid var(--ink)", marginBottom: "16px" }}>
          <div style={{ fontWeight: "800", fontSize: "0.875rem", marginBottom: "4px" }}>
            SLOT RESERVED ON-CHAIN
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--muted)", marginBottom: "12px" }}>
            Connect vehicle cable at Station {stationNumStr} and start charging to engage IoT MQTT stream.
          </p>
          <button
            type="button"
            className="btn-blockchain"
            style={{ width: "100%" }}
            onClick={() => onStartCharging(session.sessionId)}
            disabled={isLoading}
            id="btn-start-session-trigger"
          >
            <Play size={14} />
            START CHARGING ON-CHAIN
          </button>
        </div>
      )}

      {/* Charging Action Row */}
      {session.status === "Charging" && (
        <div className="session-actions-row">
          <button
            type="button"
            className="btn-destructive"
            onClick={() => alert("Station is running autonomous charge simulation until target energy threshold (250 Wh) is reached. System will automatically generate settlement bill.")}
            id="btn-stop-charging"
          >
            <Square size={14} />
            STOP CHARGING
          </button>
        </div>
      )}

      {/* Completed State: Prompt Bill Payment */}
      {session.status === "Completed" && (
        <div style={{ padding: "16px", background: "#fdf8ee", border: "2px solid var(--warning)", marginTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontWeight: "800", fontSize: "0.9rem" }}>CHARGING FINISHED</span>
            <span className="mono" style={{ fontSize: "1.2rem", fontWeight: "900", color: "var(--ink)" }}>
              {formatWeiToEth(session.totalBill)} ETH
            </span>
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ width: "100%" }}
            onClick={() => onPayBill(session.sessionId, session.totalBill)}
            disabled={isLoading}
            id="btn-pay-bill-trigger"
          >
            <CreditCard size={14} />
            SETTLE BILL ON-CHAIN
          </button>
        </div>
      )}
    </div>
  );
}
