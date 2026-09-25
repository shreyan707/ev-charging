import React, { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function PricingConsole({
  stations = [],
  adminInputs = {},
  setAdminInputs,
  onUpdatePricing,
  isLoading,
  formatWeiToEth
}) {
  const [stationTxStatus, setStationTxStatus] = useState({}); // stationId -> "idle" | "updating" | "confirmed"

  const handleApply = async (stationId) => {
    setStationTxStatus(prev => ({ ...prev, [stationId]: "updating" }));
    try {
      await onUpdatePricing(stationId);
      setStationTxStatus(prev => ({ ...prev, [stationId]: "confirmed" }));
      setTimeout(() => {
        setStationTxStatus(prev => ({ ...prev, [stationId]: "idle" }));
      }, 4000);
    } catch (err) {
      console.warn("Pricing error:", err);
      setStationTxStatus(prev => ({ ...prev, [stationId]: "idle" }));
    }
  };

  return (
    <section className="admin-pricing-section" id="admin-pricing-section">
      <div className="brutalist-section-head">
        <div className="section-head-left">
          <span className="section-num mono">02</span>
          <h2 className="section-title">ADMIN / PRICING CONSOLE</h2>
        </div>
        <span className="section-tag mono">ON-CHAIN STATE</span>
      </div>

      <div className="admin-console-grid">
        {stations.map((st) => {
          const vals = adminInputs[st.stationId] || {
            demand: st.demandLevel || 0,
            renewable: st.renewableRatio || 0
          };
          const txState = stationTxStatus[st.stationId] || "idle";
          const stationNumStr = String(st.stationId).padStart(2, "0");

          return (
            <div key={st.stationId} className="admin-pricing-card" id={`pricing-card-${st.stationId}`}>
              <div className="admin-card-head">
                <div>
                  <div style={{ fontWeight: "800", textTransform: "uppercase" }}>
                    STATION {stationNumStr}
                  </div>
                  <div className="mono text-muted" style={{ fontSize: "0.7rem" }}>
                    {st.name}
                  </div>
                </div>
                <span className="mono" style={{ fontSize: "0.75rem", fontWeight: "700" }}>
                  {formatWeiToEth(st.basePricePerWh)} ETH/Wh
                </span>
              </div>

              {/* Demand Markup Slider (Section 23) */}
              <div className="admin-slider-group">
                <div className="slider-val-readout">
                  <label htmlFor={`slider-demand-${st.stationId}`}>DEMAND MARKUP</label>
                  <span className="text-warning">+{vals.demand}%</span>
                </div>
                <input
                  id={`slider-demand-${st.stationId}`}
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={vals.demand}
                  onChange={(e) => {
                    const demand = Number(e.target.value);
                    setAdminInputs(prev => ({
                      ...prev,
                      [st.stationId]: { ...(prev[st.stationId] || {}), demand }
                    }));
                  }}
                />
                <div className="mono text-muted" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem" }}>
                  <span>0%</span>
                  <span>100%</span>
                  <span>200%</span>
                </div>
              </div>

              {/* Solar Ratio Slider (Section 23) */}
              <div className="admin-slider-group">
                <div className="slider-val-readout">
                  <label htmlFor={`slider-solar-${st.stationId}`}>SOLAR / RENEWABLE RATIO</label>
                  <span className="text-success">{vals.renewable}%</span>
                </div>
                <input
                  id={`slider-solar-${st.stationId}`}
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={vals.renewable}
                  onChange={(e) => {
                    const renewable = Number(e.target.value);
                    setAdminInputs(prev => ({
                      ...prev,
                      [st.stationId]: { ...(prev[st.stationId] || {}), renewable }
                    }));
                  }}
                />
                <div className="mono text-muted" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem" }}>
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="admin-card-footer">
                {txState === "updating" ? (
                  <div className="mono text-muted" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem" }}>
                    <Loader2 size={14} className="animate-spin" />
                    <span>UPDATING SMART CONTRACT...</span>
                  </div>
                ) : txState === "confirmed" ? (
                  <div className="mono text-success" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", fontWeight: "700" }}>
                    <CheckCircle2 size={14} />
                    <span>ON-CHAIN UPDATE CONFIRMED</span>
                  </div>
                ) : (
                  <span className="mono text-muted" style={{ fontSize: "0.7rem" }}>
                    EVCharging.sol
                  </span>
                )}

                <button
                  type="button"
                  className="btn-blockchain btn-sm"
                  onClick={() => handleApply(st.stationId)}
                  disabled={isLoading || txState === "updating"}
                  id={`btn-apply-chain-${st.stationId}`}
                >
                  APPLY TO CHAIN
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
