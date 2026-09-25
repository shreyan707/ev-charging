import React from "react";
import { X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function BookingPanel({
  station,
  bookingTime,
  setBookingTime,
  bookingDuration,
  setBookingDuration,
  estimatedRate,
  estimatedTotal,
  isLoading,
  txState, // { status: "idle" | "waiting_wallet" | "submitted" | "confirmed" | "failed", hash?: string, blockNumber?: number, error?: string }
  onClose,
  onSubmitBooking,
  formatWeiToEth
}) {
  if (!station) return null;

  const stationNumStr = String(station.stationId).padStart(2, "0");
  const demandMarkup = station.demandLevel || 0;
  const solarDiscount = station.renewableRatio ? Math.round(station.renewableRatio * 0.2) : 0;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="terminal-modal" 
        onClick={(e) => e.stopPropagation()}
        id="booking-terminal-modal"
      >
        <div className="terminal-modal-head">
          <span className="terminal-modal-title">
            BOOKING TERMINAL — STATION {stationNumStr}
          </span>
          <button 
            type="button" 
            className="terminal-modal-close" 
            onClick={onClose}
            aria-label="Close Booking Terminal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="terminal-modal-body">
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "1rem", fontWeight: "800", textTransform: "uppercase" }}>
              {station.name}
            </div>
            <div className="mono text-muted" style={{ fontSize: "0.75rem", marginTop: "2px" }}>
              COORDS: {station.coordinates} · 7.2 kW CAP
            </div>
          </div>

          <div className="terminal-section-divider" />

          <form onSubmit={onSubmitBooking}>
            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="booking-time-input">START TIME & DATE</label>
              <input
                id="booking-time-input"
                type="datetime-local"
                required
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="booking-duration-select">DURATION</label>
              <select
                id="booking-duration-select"
                value={bookingDuration}
                onChange={(e) => setBookingDuration(e.target.value)}
              >
                <option value="15">15 MINUTES</option>
                <option value="30">30 MINUTES</option>
                <option value="45">45 MINUTES</option>
                <option value="60">60 MINUTES</option>
                <option value="90">90 MINUTES</option>
                <option value="120">120 MINUTES</option>
              </select>
            </div>

            {/* Dynamic Price Preview Terminal (Section 10) */}
            <div className="price-preview-terminal">
              <div className="price-line">
                <span className="text-muted">BASE RATE:</span>
                <span className="mono">{formatWeiToEth(station.basePricePerWh)} ETH/Wh</span>
              </div>
              <div className="price-line">
                <span className="text-muted">DEMAND MARKUP:</span>
                <span className="mono text-warning">+{demandMarkup}%</span>
              </div>
              <div className="price-line">
                <span className="text-muted">SOLAR DISCOUNT:</span>
                <span className="mono text-success">-{solarDiscount}%</span>
              </div>
              {estimatedRate && (
                <div className="price-line">
                  <span className="text-muted">ON-CHAIN RATE:</span>
                  <span className="mono">{formatWeiToEth(estimatedRate)} ETH/Wh</span>
                </div>
              )}
              <div className="price-line total">
                <span>ESTIMATED COST (AT 25 kWh):</span>
                <span className="mono">
                  {estimatedTotal ? `${formatWeiToEth(estimatedTotal)} ETH` : "CALCULATING..."}
                </span>
              </div>
              <div className="price-disclaimer">
                * ESTIMATE FOR PREVIEW. FINAL ON-CHAIN AMOUNT DETERMINED BY EXACT DELIVERED ENERGY.
              </div>
            </div>

            {/* Transaction States (Section 11) */}
            {txState && txState.status !== "idle" && (
              <div 
                style={{ 
                  padding: "10px 12px", 
                  border: "2px solid var(--ink)", 
                  background: txState.status === "failed" ? "#fff5f5" : "var(--accent-bg)",
                  marginBottom: "16px",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-mono)"
                }}
              >
                {txState.status === "waiting_wallet" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Loader2 size={16} className="animate-spin" />
                    <div>
                      <strong>WAITING FOR WALLET</strong>
                      <div className="text-muted">Confirm transaction in MetaMask.</div>
                    </div>
                  </div>
                )}
                {txState.status === "submitted" && (
                  <div>
                    <strong>TRANSACTION SUBMITTED</strong>
                    <div className="mono text-muted" style={{ wordBreak: "break-all" }}>
                      TX: {txState.hash}
                    </div>
                  </div>
                )}
                {txState.status === "confirmed" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle2 size={16} color="var(--success)" />
                    <div>
                      <strong>TRANSACTION CONFIRMED</strong>
                      <div className="text-muted">BLOCK #{txState.blockNumber || "128"}</div>
                    </div>
                  </div>
                )}
                {txState.status === "failed" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--danger)" }}>
                    <AlertCircle size={16} />
                    <div>
                      <strong>TRANSACTION FAILED</strong>
                      <div>{txState.error || "Execution reverted"}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="terminal-section-divider" />

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={onClose}
                disabled={isLoading}
              >
                CANCEL
              </button>
              <button 
                type="submit" 
                className="btn-blockchain" 
                disabled={isLoading}
                id="btn-confirm-terminal-booking"
              >
                {isLoading ? "PROCESSING..." : "CONFIRM BOOKING"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
