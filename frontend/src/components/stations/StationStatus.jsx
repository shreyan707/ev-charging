import React from "react";

export default function StationStatus({ status, queueCount = 0 }) {
  const normStatus = (status || "").toLowerCase();

  if (normStatus === "charging") {
    return (
      <span className="status-indicator status-charging">
        ■ CHARGING
      </span>
    );
  }

  if (queueCount > 0 || normStatus === "queued") {
    return (
      <span className="status-indicator status-queued">
        ▲ QUEUED ({queueCount})
      </span>
    );
  }

  if (normStatus === "offline") {
    return (
      <span className="status-indicator status-offline">
        × OFFLINE
      </span>
    );
  }

  return (
    <span className="status-indicator status-available">
      ● AVAILABLE
    </span>
  );
}
