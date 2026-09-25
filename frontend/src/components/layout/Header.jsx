import React from "react";
import { Zap, Wallet, ChevronDown, LogOut } from "lucide-react";

export default function Header({
  walletAddress,
  walletBalance,
  chainId,
  isAdmin,
  onConnectWallet,
  onDisconnectWallet,
  onSwitchAccount,
  onSwitchNetwork,
  isLoading,
  activeNav,
  onSelectNav
}) {
  const isLocalChain = Number(chainId) === 1337 || Number(chainId) === 31337;

  return (
    <header className="header-bar">
      <div className="header-left">
        <div 
          className="header-logo-group" 
          onClick={() => onSelectNav("overview")}
          title="VoltNet Operational Terminal"
        >
          <div className="header-logo-icon">
            <Zap size={20} strokeWidth={2.5} />
          </div>
          <div className="header-logo-text">
            <span className="brand-main">VOLTNET</span>
            <span className="brand-sub">SMART EV GRID</span>
          </div>
        </div>

        {/* Text-based Navigation (Section 6) */}
        <nav className="nav-strip" aria-label="Main Navigation">
          <button 
            type="button"
            className={`nav-link ${activeNav === "overview" ? "active" : ""}`}
            onClick={() => onSelectNav("overview")}
          >
            {activeNav === "overview" ? "[ OVERVIEW ]" : "OVERVIEW"}
          </button>
          <button 
            type="button"
            className={`nav-link ${activeNav === "stations" ? "active" : ""}`}
            onClick={() => onSelectNav("stations")}
          >
            {activeNav === "stations" ? "[ STATIONS ]" : "STATIONS"}
          </button>
          <button 
            type="button"
            className={`nav-link ${activeNav === "sessions" ? "active" : ""}`}
            onClick={() => onSelectNav("sessions")}
          >
            {activeNav === "sessions" ? "[ SESSIONS ]" : "SESSIONS"}
          </button>
          <button 
            type="button"
            className={`nav-link ${activeNav === "ai" ? "active" : ""}`}
            onClick={() => onSelectNav("ai")}
          >
            {activeNav === "ai" ? "[ AI / BATTERY ]" : "AI"}
          </button>
          {isAdmin && (
            <button 
              type="button"
              className={`nav-link ${activeNav === "admin" ? "active" : ""}`}
              onClick={() => onSelectNav("admin")}
              id="nav-link-admin"
            >
              {activeNav === "admin" ? "[ ADMIN ]" : "ADMIN"}
            </button>
          )}
        </nav>
      </div>

      <div className="header-right">
        {/* Network Status Badge */}
        <div className="meta-network-tag" title="Connected Blockchain RPC">
          <span className={`network-live-dot ${isLocalChain ? "" : walletAddress ? "warn" : ""}`} />
          <span>{isLocalChain ? "LOCALHOST:8545" : walletAddress ? `CHAIN: ${chainId}` : "OFFLINE"}</span>
        </div>

        {walletAddress ? (
          <>
            {/* Balance Badge */}
            {walletBalance && (
              <span className="meta-network-tag mono">
                {walletBalance} ETH
              </span>
            )}

            {/* Role Badge */}
            <span className={`meta-role-tag ${isAdmin ? "admin" : ""}`}>
              {isAdmin ? "STATION ADMIN" : "EV DRIVER"}
            </span>

            {/* Truncated Monospace Wallet Address */}
            <div 
              className="meta-wallet-tag mono"
              onClick={onSwitchAccount}
              title="Click to switch MetaMask account"
              id="header-wallet-pill"
            >
              <span>
                {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
              </span>
              <ChevronDown size={14} />
            </div>

            {/* Disconnect Button */}
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={onDisconnectWallet}
              title="Disconnect Wallet"
              style={{ padding: "6px" }}
            >
              <LogOut size={13} />
            </button>

            {/* Network switch prompt if mismatched */}
            {!isLocalChain && (
              <button 
                type="button"
                className="btn-destructive btn-sm"
                onClick={onSwitchNetwork}
                title="Switch network to Localhost 8545"
              >
                SWITCH NETWORK
              </button>
            )}
          </>
        ) : (
          <button 
            type="button"
            className="btn-primary btn-sm" 
            onClick={onConnectWallet}
            disabled={isLoading}
            id="btn-header-connect"
          >
            <Wallet size={14} />
            CONNECT WALLET
          </button>
        )}
      </div>
    </header>
  );
}
