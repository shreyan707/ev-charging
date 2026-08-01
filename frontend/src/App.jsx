import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { 
  Zap, 
  MapPin, 
  Clock, 
  Calendar, 
  Wallet, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle, 
  Activity, 
  BatteryCharging, 
  X 
} from "lucide-react";
import "./App.css";

// Import deployed contract address and ABI
import deployedContracts from "../../hardhat/deployed_contracts.json";

const API_BASE_URL = "http://localhost:5000/api";

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [chainId, setChainId] = useState(null);
  
  const [stations, setStations] = useState([]);
  const [userSessions, setUserSessions] = useState([]);
  const [forecasts, setForecasts] = useState({});
  const [batteryHealth, setBatteryHealth] = useState(null);
  
  // Modals / Inputs
  const [selectedStation, setSelectedStation] = useState(null);
  const [bookingTime, setBookingTime] = useState("");
  const [bookingDuration, setBookingDuration] = useState("60"); // in minutes
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [estimatedRate, setEstimatedRate] = useState(null);
  const [estimatedTotal, setEstimatedTotal] = useState(null);

  // Connect MetaMask Wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed! Please install MetaMask to interact with this application.");
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage("Connecting to MetaMask...");
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const activeSigner = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(activeSigner);
      setWalletAddress(accounts[0]);
      setChainId(network.chainId);

      // Create contract instance
      if (deployedContracts && deployedContracts.address) {
        const evContract = new ethers.Contract(
          deployedContracts.address,
          deployedContracts.abi,
          activeSigner
        );
        setContract(evContract);
        setStatusMessage("Wallet connected successfully!");
      } else {
        console.error("Contract info not loaded.");
        setStatusMessage("Contract data missing. Deploy contract first.");
      }
    } catch (err) {
      console.error("Connection error:", err);
      setStatusMessage("Failed to connect wallet.");
    } finally {
      setIsLoading(false);
    }
  };

  // Switch network listener / account listener
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          connectWallet();
        } else {
          setWalletAddress("");
          setSigner(null);
          setContract(null);
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  // Fetch stations off-chain database cache
  const fetchStations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stations`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setStations(data);
      }
    } catch (err) {
      console.error("Error fetching stations:", err);
    }
  }, []);

  // Fetch user sessions history
  const fetchUserSessions = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/user/${walletAddress}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setUserSessions(data);
      }
    } catch (err) {
      console.error("Error fetching user sessions:", err);
    }
  }, [walletAddress]);

  // Fetch occupancy forecasts from backend (calls AI FastAPI service)
  const fetchForecasts = useCallback(async () => {
    if (stations.length === 0) return;
    try {
      const newForecasts = {};
      for (const station of stations) {
        const resp = await fetch(`${API_BASE_URL}/ai/forecast/${station.stationId}`);
        if (resp.ok) {
          newForecasts[station.stationId] = await resp.json();
        }
      }
      setForecasts(newForecasts);
    } catch (err) {
      console.error("Error fetching AI occupancy forecasts:", err);
    }
  }, [stations]);

  // Fetch battery health diagnostics from backend (calls AI FastAPI service)
  const fetchBatteryHealth = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/ai/battery-health/${walletAddress}`);
      if (resp.ok) {
        const data = await resp.json();
        setBatteryHealth(data);
      }
    } catch (err) {
      console.error("Error fetching battery health diagnostics:", err);
    }
  }, [walletAddress]);

  // Fetch forecasts when stations load
  useEffect(() => {
    if (stations.length > 0 && Object.keys(forecasts).length === 0) {
      fetchForecasts();
    }
  }, [stations, fetchForecasts, forecasts]);

  // Initial and Polling Loads
  useEffect(() => {
    fetchStations();
    
    // Set up polling (every 5 seconds) as requested for maximum simplicity & reliability
    const pollInterval = setInterval(() => {
      fetchStations();
      if (walletAddress) {
        fetchUserSessions();
        fetchBatteryHealth();
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [walletAddress, fetchStations, fetchUserSessions, fetchBatteryHealth]);

  useEffect(() => {
    if (walletAddress) {
      fetchUserSessions();
      fetchBatteryHealth();
    }
  }, [walletAddress, fetchUserSessions, fetchBatteryHealth]);

  // Book a charging slot on-chain
  const handleBookSlot = async (e) => {
    e.preventDefault();
    if (!contract) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage("Initiating booking transaction on blockchain...");
      
      const startTimeUnix = Math.floor(new Date(bookingTime).getTime() / 1000);
      const durationSeconds = parseInt(bookingDuration) * 60;
      
      console.log(`Booking Station: ${selectedStation.stationId}, Start: ${startTimeUnix}, Dur: ${durationSeconds}`);
      
      // Call bookSlot on smart contract
      const tx = await contract.bookSlot(
        selectedStation.stationId,
        startTimeUnix,
        durationSeconds
      );
      
      setStatusMessage("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      
      setStatusMessage("Booking confirmed on-chain!");
      setSelectedStation(null); // Close modal
      fetchStations();
      fetchUserSessions();
    } catch (err) {
      console.error("Booking error:", err);
      // Try parsing contract error
      let errMsg = "Transaction failed.";
      if (err.message.includes("Time slot already booked")) {
        errMsg = "Overlapping slot: This time range is already booked!";
      } else if (err.message.includes("Booking time cannot be in the past")) {
        errMsg = "Time slot cannot be in the past!";
      }
      alert(errMsg);
      setStatusMessage(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Start Charging session on-chain
  const handleStartCharging = async (sessionId) => {
    if (!contract) return;
    try {
      setIsLoading(true);
      setStatusMessage("Starting charging session on-chain...");
      
      const tx = await contract.startCharging(sessionId);
      setStatusMessage("Confirming start on-chain...");
      await tx.wait();
      
      setStatusMessage("Charging started successfully!");
      fetchUserSessions();
      fetchStations();
    } catch (err) {
      console.error("Start charging error:", err);
      alert("Failed to start session. Make sure you are within your booked slot's starting window!");
    } finally {
      setIsLoading(false);
    }
  };

  // Pay Billing invoice on-chain
  const handlePayBill = async (sessionId, totalBillWei) => {
    if (!contract) return;
    try {
      setIsLoading(true);
      setStatusMessage("Paying charging invoice via contract...");
      
      const tx = await contract.payBill(sessionId, {
        value: totalBillWei
      });
      setStatusMessage("Processing contract payment...");
      await tx.wait();
      
      setStatusMessage("Invoice paid successfully!");
      fetchUserSessions();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment failed. Please verify your MetaMask balance.");
    } finally {
      setIsLoading(false);
    }
  };

  // Update Station pricing parameters on-chain (Owner only)
  const handleUpdatePricing = async (stationId, demandLevel, renewableRatio) => {
    if (!contract) return;
    try {
      setIsLoading(true);
      setStatusMessage(`Updating pricing config for station #${stationId} on-chain...`);
      
      const tx = await contract.updateStationPricing(
        stationId,
        parseInt(demandLevel),
        parseInt(renewableRatio)
      );
      setStatusMessage("Awaiting on-chain pricing confirmation...");
      await tx.wait();
      
      setStatusMessage("Pricing parameters successfully updated!");
      fetchStations();
    } catch (err) {
      console.error("Pricing update error:", err);
      alert("Failed to update pricing on-chain. Make sure you are the station owner.");
    } finally {
      setIsLoading(false);
    }
  };

  // Estimate booking rate and cost dynamically from contract view call
  const updatePriceEstimate = useCallback(async () => {
    if (!contract || !selectedStation || !bookingTime) {
      setEstimatedRate(null);
      setEstimatedTotal(null);
      return;
    }

    try {
      const timestamp = Math.floor(new Date(bookingTime).getTime() / 1000);
      const rateWei = await contract.calculateRatePerWh(selectedStation.stationId, timestamp);
      setEstimatedRate(rateWei.toString());

      // Estimate session total at average 25 kWh (25000 Wh) consumption
      const averageWh = 25000n;
      const totalWei = rateWei * averageWh;
      setEstimatedTotal(totalWei.toString());
    } catch (err) {
      console.error("Error calculating rate estimate:", err);
      setEstimatedRate(null);
      setEstimatedTotal(null);
    }
  }, [contract, selectedStation, bookingTime]);

  // Hook to update price estimate on form values change
  useEffect(() => {
    updatePriceEstimate();
  }, [bookingTime, selectedStation, contract, updatePriceEstimate]);

  // Convert Wei to Eth for readable bills
  const formatWeiToEth = (weiString) => {
    try {
      const val = ethers.formatEther(weiString);
      return parseFloat(val).toFixed(6);
    } catch (e) {
      return "0";
    }
  };

  return (
    <div className="app-container">
      {/* Header section */}
      <header className="app-header">
        <div className="logo-section">
          <Zap className="logo-icon" size={32} />
          <h1 className="app-title">VoltNet Dashboard</h1>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {walletAddress ? (
            <div className="wallet-address" id="wallet-display">
              {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
            </div>
          ) : (
            <button 
              className="btn-connect" 
              onClick={connectWallet} 
              disabled={isLoading}
              id="btn-meta-connect"
            >
              <Wallet size={18} />
              Connect Wallet
            </button>
          )}

          <div className="network-badge">
            <span className={`network-dot ${contract ? "online" : "offline"}`}></span>
            {chainId === 1337n || chainId === 31337n ? "Localhost Node" : chainId === 80002n ? "Amoy Testnet" : chainId === 11155111n ? "Sepolia Testnet" : contract ? "Connected" : "Disconnected"}
          </div>
        </div>
      </header>

      {/* Main Status bar for operations */}
      {statusMessage && (
        <div className="info-alert" id="status-bar">
          <Activity size={18} className="charging-bolt" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Grid container */}
      <div className="dashboard-grid">
        {/* Left Side: Stations list */}
        <section className="glass-panel">
          <h2 className="section-title">
            <MapPin size={20} />
            Charging Stations (VIT Vellore)
          </h2>
          
          <div className="station-list">
            {stations.length === 0 ? (
              <div className="empty-state">No stations registered yet. Compile contracts and run backend seed script!</div>
            ) : (
              stations.map((station) => (
                <div key={station.stationId} className="station-card" id={`station-card-${station.stationId}`} style={{ flexDirection: "column", alignItems: "stretch", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <div className="station-details">
                      <span className="station-name">{station.name}</span>
                      <span className="station-sub">
                        <MapPin size={12} /> {station.coordinates}
                      </span>
                      
                      <div className="station-metrics">
                        <div className="metric-pill">
                          Base: {formatWeiToEth(station.basePricePerWh.toString())} ETH/Wh
                        </div>
                        <div className="metric-pill">
                          Demand: +{station.demandLevel}%
                        </div>
                        {station.renewableRatio > 0 && (
                          <div className="metric-pill green">
                            Solar: {station.renewableRatio}%
                          </div>
                        )}
                        {station.waitEstimateMinutes > 0 && (
                          <div className="metric-pill">
                            <Clock size={12} /> Est Wait: {station.waitEstimateMinutes}m
                          </div>
                        )}
                      </div>
                      
                      {forecasts[station.stationId] && (
                        <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#60a5fa", display: "flex", flexDirection: "column", gap: "0.15rem" }} id={`ai-forecast-${station.stationId}`}>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontWeight: "600" }}>
                            <TrendingUp size={12} />
                            AI Forecast: {forecasts[station.stationId].predicted_occupancy_ratio}% Occupancy
                          </span>
                          <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "0.75rem" }}>
                            {forecasts[station.stationId].recommendation}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="station-actions">
                      <span className={`status-badge ${station.status}`}>
                        {station.status}
                      </span>
                      
                      {station.active && (
                        <button
                          className="btn-primary"
                          onClick={() => setSelectedStation(station)}
                          id={`btn-book-${station.stationId}`}
                        >
                          Book Slot
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scheduled Bookings list */}
                  {station.queue && station.queue.length > 0 && (
                    <div className="station-queue-section">
                      <span className="queue-title">Scheduled Bookings / Queue ({station.queue.length}):</span>
                      <div className="queue-list">
                        {station.queue.map((q, idx) => (
                          <div key={idx} className="queue-item">
                            <Clock size={10} />
                            <span>
                              {new Date(q.startTime).toLocaleString()} for {Math.floor(q.duration / 60)} mins
                            </span>
                            <span className="queue-user">({q.userAddress.substring(0, 6)}...)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Owner Pricing Admin Panel */}
                  {walletAddress && walletAddress.toLowerCase() === station.owner.toLowerCase() && (
                    <div className="admin-pricing-panel">
                      <h4>Pricing Configuration (Owner Admin)</h4>
                      <div className="admin-inputs">
                        <div className="input-group">
                          <label>Demand Markup %</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="200" 
                            defaultValue={station.demandLevel}
                            id={`input-demand-${station.stationId}`}
                          />
                        </div>
                        <div className="input-group">
                          <label>Solar/Renewable %</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            defaultValue={station.renewableRatio}
                            id={`input-renewable-${station.stationId}`}
                          />
                        </div>
                        <button 
                          className="btn-admin-save"
                          onClick={(e) => {
                            const dVal = document.getElementById(`input-demand-${station.stationId}`).value;
                            const rVal = document.getElementById(`input-renewable-${station.stationId}`).value;
                            handleUpdatePricing(station.stationId, dVal, rVal);
                          }}
                          id={`btn-admin-save-${station.stationId}`}
                        >
                          Apply to Chain
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Side: Active sessions & Billing */}
        <section className="glass-panel">
          <h2 className="section-title">
            <BatteryCharging size={20} />
            My Charging Sessions
          </h2>

          {batteryHealth && (
            <div className="battery-health-box" style={{ 
              background: "rgba(16, 185, 129, 0.05)", 
              border: "1px solid rgba(16, 185, 129, 0.15)", 
              borderRadius: "0.5rem", 
              padding: "1rem", 
              marginBottom: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem"
            }} id="battery-health-widget">
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#34d399", fontWeight: "700", letterSpacing: "0.05em" }}>AI Battery Health Profile</span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
                <span style={{ fontSize: "1.2rem", fontWeight: "800", color: "#f1f5f9" }}>{batteryHealth.battery_health}% SOH</span>
                <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", padding: "0.15rem 0.5rem", borderRadius: "9999px" }}>
                  {batteryHealth.status}
                </span>
              </div>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic", marginTop: "0.25rem" }}>
                {batteryHealth.advice}
              </span>
            </div>
          )}

          <div className="sessions-list">
            {!walletAddress ? (
              <div className="empty-state">Connect your MetaMask wallet to view sessions and billing status.</div>
            ) : userSessions.length === 0 ? (
              <div className="empty-state">No active bookings or historical sessions found for your address.</div>
            ) : (
              userSessions.map((session) => (
                <div key={session.sessionId} className="session-card" id={`session-card-${session.sessionId}`}>
                  <div className="session-header">
                    <span>Session ID: {session.sessionId}</span>
                    <span>{session.status}</span>
                  </div>

                  <div className="session-station-name">
                    Station #{session.stationId} (VIT Campus)
                  </div>

                  <div className="session-time">
                    <Calendar size={14} />
                    {new Date(session.startTime).toLocaleString()}
                  </div>
                  
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>
                    Duration: {Math.floor(session.duration / 60)} minutes
                  </div>

                  {session.fraudFlag && (
                    <div style={{ 
                      marginTop: "0.75rem", 
                      padding: "0.5rem 0.75rem", 
                      background: "rgba(239, 68, 68, 0.08)", 
                      border: "1px solid rgba(239, 68, 68, 0.2)", 
                      borderRadius: "0.375rem", 
                      color: "#f87171",
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem"
                    }} id={`fraud-alert-${session.sessionId}`}>
                      <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                      <span><strong>AI Fraud Alert:</strong> {session.fraudReason}</span>
                    </div>
                  )}

                  {/* Telemetry panel for active charging session */}
                  {session.status === "Charging" && (
                    <div className="telemetry-panel" id={`telemetry-${session.sessionId}`}>
                      <div className="telemetry-header">Live Telemetry Feed (MQTT)</div>
                      <div className="telemetry-grid">
                        <div className="telemetry-box">
                          <div className="telemetry-val">{session.telemetry && session.telemetry.length > 0 ? session.telemetry[session.telemetry.length - 1].current.toFixed(1) : "0.0"}A</div>
                          <div className="telemetry-lbl">Current</div>
                        </div>
                        <div className="telemetry-box">
                          <div className="telemetry-val">{session.telemetry && session.telemetry.length > 0 ? session.telemetry[session.telemetry.length - 1].voltage.toFixed(0) : "0"}V</div>
                          <div className="telemetry-lbl">Voltage</div>
                        </div>
                        <div className="telemetry-box">
                          <div className="telemetry-val">{session.telemetry && session.telemetry.length > 0 ? (session.telemetry[session.telemetry.length - 1].power / 1000).toFixed(2) : "0.0"}kW</div>
                          <div className="telemetry-lbl">Power</div>
                        </div>
                      </div>
                      <div className="telemetry-header" style={{ marginBottom: "0.25rem" }}>Total Consumed: {session.energyConsumedWh} Wh</div>
                      
                      {/* Pulse active bar */}
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar-fill"
                          style={{ width: `${Math.min(100, (session.energyConsumedWh / 20000) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Session actions based on state */}
                  <div className="session-footer">
                    {session.status === "Booked" && (
                      <>
                        <span className="charging-indicator" style={{ color: "#f59e0b" }}>
                          Ready to Charge
                        </span>
                        <button
                          className="btn-primary"
                          onClick={() => handleStartCharging(session.sessionId)}
                          disabled={isLoading}
                          id={`btn-start-${session.sessionId}`}
                        >
                          Start Charging
                        </button>
                      </>
                    )}

                    {session.status === "Charging" && (
                      <div className="charging-indicator">
                        <Zap size={14} className="charging-bolt" />
                        <span>Charging in progress...</span>
                      </div>
                    )}

                    {session.status === "Completed" && (
                      <>
                        <div className="text-completed">
                          Bill: {formatWeiToEth(session.totalBill)} ETH
                        </div>
                        <button
                          className="btn-primary"
                          onClick={() => handlePayBill(session.sessionId, session.totalBill)}
                          disabled={isLoading}
                          style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                          id={`btn-pay-${session.sessionId}`}
                        >
                          Pay Bill
                        </button>
                      </>
                    )}

                    {session.status === "Paid" && (
                      <div className="text-paid">
                        <CheckCircle size={14} />
                        <span>Bill Paid ({formatWeiToEth(session.totalBill)} ETH)</span>
                      </div>
                    )}

                    {session.status === "Cancelled" && (
                      <div className="text-cancelled">
                        Session Cancelled
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Booking Dialogue Modal Overlay */}
      {selectedStation && (
        <div className="booking-overlay">
          <div className="booking-modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>Book Charging Slot</h3>
              <button className="btn-secondary" style={{ padding: "0.25rem", borderRadius: "50%" }} onClick={() => setSelectedStation(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              <strong>Station:</strong> {selectedStation.name} <br/>
              <strong>Base Price:</strong> {formatWeiToEth(selectedStation.basePricePerWh.toString())} ETH/Wh
            </div>

            <form onSubmit={handleBookSlot}>
              <div className="form-group">
                <label>Select Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  id="input-booking-time"
                />
              </div>

              <div className="form-group">
                <label>Charging Duration (Minutes)</label>
                <input
                  type="number"
                  min="15"
                  max="240"
                  required
                  value={bookingDuration}
                  onChange={(e) => setBookingDuration(e.target.value)}
                  id="input-booking-duration"
                />
              </div>

              {estimatedRate && (
                <div className="price-estimator-box" id="price-estimator">
                  <span className="estimator-title">Dynamic Price Estimate (Contract View)</span>
                  <div className="estimator-details">
                    <div>Estimated Rate: <span className="estimator-highlight">{formatWeiToEth(estimatedRate)} ETH/Wh</span></div>
                    <div>Estimated total cost (at 25 kWh): <span className="estimator-highlight">{formatWeiToEth(estimatedTotal)} ETH</span></div>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setSelectedStation(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isLoading}
                  id="btn-confirm-booking"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
