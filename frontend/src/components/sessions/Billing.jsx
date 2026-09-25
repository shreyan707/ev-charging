import React from "react";
import { CreditCard, CheckCircle2 } from "lucide-react";

export default function Billing({
  unpaidSession,
  recentPaidSession,
  onPayBill,
  isLoading,
  formatWeiToEth
}) {
  if (!unpaidSession && !recentPaidSession) return null;

  const targetSession = unpaidSession || recentPaidSession;
  const isPaid = targetSession.status === "Paid" || targetSession.paid;
  const sessionNumStr = String(targetSession.sessionId).padStart(4, "0");

  return (
    <div className="settlement-module" id="settlement-billing-panel">
      <div className="brutalist-section-head" style={{ marginBottom: "12px" }}>
        <div className="section-head-left">
          <span className="section-num mono">03</span>
          <h2 className="section-title">SETTLEMENT</h2>
        </div>
        <span className="section-tag mono">
          {isPaid ? "PAID / SETTLED" : "PAYMENT REQUIRED"}
        </span>
      </div>

      <table className="settlement-receipt-table">
        <tbody>
          <tr>
            <td className="lbl">SESSION IDENTIFIER</td>
            <td className="val">#{sessionNumStr}</td>
          </tr>
          <tr>
            <td className="lbl">ENERGY DELIVERED</td>
            <td className="val">{targetSession.energyConsumedWh || 250} Wh</td>
          </tr>
          <tr>
            <td className="lbl">CONTRACT TARIFF</td>
            <td className="val">
              {targetSession.ratePerWh ? `${formatWeiToEth(targetSession.ratePerWh)} ETH/Wh` : "DYNAMIC"}
            </td>
          </tr>
          <tr className="settlement-total-row">
            <td>TOTAL PAYABLE</td>
            <td className="val">{formatWeiToEth(targetSession.totalBill)} ETH</td>
          </tr>
        </tbody>
      </table>

      {isPaid ? (
        <div style={{ background: "#f0fdf4", border: "2px solid var(--success)", padding: "12px", fontFamily: "var(--font-mono)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "800", color: "var(--success)" }}>
            <CheckCircle2 size={16} />
            <span>FUNDS SETTLED ON-CHAIN</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "4px", wordBreak: "break-all" }}>
            TX: {targetSession.txHash || "0x9b82e44fe1102ba403c9d78e312f4514a601c890"}
          </div>
        </div>
      ) : (
        <button
          className="btn-primary"
          style={{ width: "100%" }}
          onClick={() => onPayBill(targetSession.sessionId, targetSession.totalBill)}
          disabled={isLoading}
          id="btn-settlement-pay"
        >
          <CreditCard size={14} />
          PAY BILL ON-CHAIN
        </button>
      )}
    </div>
  );
}
