import React from "react";

export default function TransactionStatus({
  actionName = "ON-CHAIN ACTION",
  walletAddress = "",
  networkName = "LOCALHOST:8545",
  status = "IDLE", // "WAITING" | "SUBMITTED" | "CONFIRMED" | "FAILED"
  txHash = "",
  blockNumber = "",
  errorMessage = "",
  onClose
}) {
  if (status === "IDLE") return null;

  return (
    <div 
      style={{
        border: "2px solid var(--ink)",
        background: "var(--surface)",
        padding: "16px",
        marginBottom: "16px",
        boxShadow: "var(--shadow-hard-sm)",
        fontFamily: "var(--font-mono)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid var(--line)" }}>
        <span style={{ fontWeight: "800", textTransform: "uppercase" }}>
          WEB3 TRANSACTION MONITOR
        </span>
        <span className={`status-indicator ${status === "CONFIRMED" ? "status-confirmed" : status === "FAILED" ? "status-offline" : "status-charging"}`}>
          {status}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.75rem", marginBottom: "12px" }}>
        <div>
          <span className="text-muted">ACTION:</span>
          <div style={{ fontWeight: "700" }}>{actionName}</div>
        </div>
        <div>
          <span className="text-muted">NETWORK:</span>
          <div style={{ fontWeight: "700" }}>{networkName}</div>
        </div>
        <div>
          <span className="text-muted">WALLET:</span>
          <div>{walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : "STANDBY"}</div>
        </div>
        <div>
          <span className="text-muted">BLOCK:</span>
          <div>{blockNumber ? `#${blockNumber}` : "PENDING..."}</div>
        </div>
      </div>

      {txHash && (
        <div style={{ background: "var(--surface-alt)", padding: "8px", border: "1px solid var(--line-soft)", fontSize: "0.7rem", wordBreak: "break-all", marginBottom: "10px" }}>
          <span className="text-muted">TX HASH: </span>
          <span>{txHash}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ color: "var(--danger)", fontSize: "0.75rem", fontWeight: "700", marginBottom: "8px" }}>
          ERROR: {errorMessage}
        </div>
      )}

      {onClose && (
        <button 
          type="button" 
          className="btn-secondary btn-sm" 
          onClick={onClose}
          style={{ width: "100%" }}
        >
          DISMISS MONITOR
        </button>
      )}
    </div>
  );
}
