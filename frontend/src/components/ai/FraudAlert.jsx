import React, { useState } from "react";
import { AlertOctagon } from "lucide-react";

export default function FraudAlert({
  fraudSession,
  onDismiss
}) {
  const [showTelemetryDetails, setShowTelemetryDetails] = useState(false);

  if (!fraudSession || !fraudSession.fraudFlag) return null;

  const sessionNumStr = String(fraudSession.sessionId).padStart(4, "0");

  return (
    <aside className="anomaly-interrupt-banner" role="alert" id="fraud-anomaly-banner">
      <div className="anomaly-head">
        <span className="anomaly-title">
          <AlertOctagon size={18} />
          ALERT / TELEMETRY ANOMALY
        </span>
        <span className="status-indicator status-offline">
          CRITICAL INTERRUPT
        </span>
      </div>

      <div className="anomaly-reason">
        NON-MONOTONIC ENERGY READING DETECTED — Session #{sessionNumStr}
      </div>

      <p style={{ fontSize: "0.8125rem", color: "var(--ink)", marginBottom: "12px" }}>
        {fraudSession.fraudReason || "Energy reading decreased between successive telemetry samples without contract termination."}
      </p>

      {showTelemetryDetails && (
        <div style={{ background: "#ffffff", border: "1px solid var(--danger)", padding: "10px", marginBottom: "12px", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
          <div>ANOMALY VECTOR: Sample delta &lt; 0.00 Wh</div>
          <div>INSPECTION STATUS: Suspicious meter reset detected</div>
          <div>REPORTED BY: Python AI Fraud Microservice (Isolation Forest)</div>
        </div>
      )}

      <div className="anomaly-actions">
        <button
          type="button"
          className="btn-destructive btn-sm"
          onClick={() => setShowTelemetryDetails(!showTelemetryDetails)}
        >
          {showTelemetryDetails ? "HIDE TELEMETRY" : "VIEW TELEMETRY"}
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={onDismiss}
        >
          DISMISS
        </button>
      </div>
    </aside>
  );
}
