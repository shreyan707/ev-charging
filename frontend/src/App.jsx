import React, { useState, useEffect, useCallback, useRef } from "react";
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
  X, 
  Shield, 
  Sliders, 
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gauge,
  CreditCard,
  Check,
  Radio
} from "lucide-react";
import "./App.css";
import MiniMap from "./MiniMap";

// Import deployed contract address and ABI
import deployedContracts from "../../hardhat/deployed_contracts.json";

const API_BASE_URL = "http://localhost:5000/api";

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState("0.000");
  const [chainId, setChainId] = useState(null);
  
  const [stations, setStations] = useState([]);
  const [userSessions, setUserSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [forecasts, setForecasts] = useState({});
  const [batteryHealth, setBatteryHealth] = useState(null);
  const [spotlightStationId, setSpotlightStationId] = useState(1);
  
  const carouselRef = useRef(null);

  // Modals / Inputs
  const [selectedStation, setSelectedStation] = useState(null);
  const [bookingTime, setBookingTime] = useState("");
  const [bookingDuration, setBookingDuration] = useState("60"); // in minutes
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [estimatedRate, setEstimatedRate] = useState(null);
  const [estimatedTotal, setEstimatedTotal] = useState(null);

  // Role-Based Access Control State
  const [contractOwner, setContractOwner] = useState("");
  const [activeTab, setActiveTab] = useState("driver"); // "driver" | "admin"
  const [adminInputs, setAdminInputs] = useState({}); // stationId -> { demand, renewable }

  const isAdmin = Boolean(
    walletAddress && (
      (contractOwner && walletAddress.toLowerCase() === contractOwner.toLowerCase()) ||
      stations.some(s => s.owner && s.owner.toLowerCase() === walletAddress.toLowerCase())
    )
  );

  // Carousel horizontal scroll helper
  const scrollStations = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -260 : 260;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Fetch ETH balance
  const updateBalance = async (addr, prov) => {
    if (!addr || !prov) return;
    try {
      const bal = await prov.getBalance(addr);
      setWalletBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
    } catch (e) {
      console.warn("Could not fetch balance:", e);
    }
  };

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
      
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const activeSigner = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(activeSigner);
      setWalletAddress(accounts[0]);
      setChainId(network.chainId);

      await updateBalance(accounts[0], browserProvider);

      if (Number(network.chainId) !== 1337 && Number(network.chainId) !== 31337) {
        setStatusMessage("Wrong network! Prompting switch to Localhost 8545...");
        await switchToLocalNetwork();
      }

      if (deployedContracts && deployedContracts.address) {
        const evContract = new ethers.Contract(
          deployedContracts.address,
          deployedContracts.abi,
          activeSigner
        );
        setContract(evContract);
        try {
          const ownerAddr = await evContract.owner();
          setContractOwner(ownerAddr);
        } catch (e) {
          console.warn("Could not query contract owner:", e);
        }
        setStatusMessage("Wallet connected successfully!");
      } else {
        setStatusMessage("Contract data missing. Deploy contract first.");
      }
    } catch (err) {
      console.error("Connection error:", err);
      setStatusMessage("Failed to connect wallet.");
    } finally {
      setIsLoading(false);
    }
  };

  // Switch MetaMask Network to Localhost 8545
  const switchToLocalNetwork = async () => {
    if (!window.ethereum) return;
    const targetChainIdHex = "0x539"; // 1337
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainIdHex }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: targetChainIdHex,
                chainName: "Localhost 8545",
                rpcUrls: ["http://127.0.0.1:8545"],
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add local network:", addError);
        }
      } else {
        console.error("Failed to switch to local network:", switchError);
      }
    }
  };

  // Disconnect MetaMask Wallet session
  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setContract(null);
    setWalletAddress("");
    setChainId(null);
    setContractOwner("");
    setActiveTab("driver");
    setStatusMessage("Wallet disconnected.");
  };

  // Force MetaMask account switcher
  const switchAccount = async () => {
    if (!window.ethereum) return;
    try {
      setIsLoading(true);
      setStatusMessage("Requesting account switch...");
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch (err) {
      console.error("Failed to switch account:", err);
      setStatusMessage("Failed to switch account.");
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
          setContractOwner("");
          setActiveTab("driver");
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
        // Default spotlight to first station if not yet set
        setSpotlightStationId(prev => (prev ? prev : (data[0]?.stationId || 1)));
        setAdminInputs(prev => {
          const updated = { ...prev };
          data.forEach(s => {
            if (!updated[s.stationId]) {
              updated[s.stationId] = {
                demand: s.demandLevel || 0,
                renewable: s.renewableRatio || 0
              };
            }
          });
          return updated;
        });
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
    
    const pollInterval = setInterval(() => {
      fetchStations();
      if (walletAddress) {
        fetchUserSessions();
        fetchBatteryHealth();
        if (provider) updateBalance(walletAddress, provider);
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [walletAddress, provider, fetchStations, fetchUserSessions, fetchBatteryHealth]);

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
      
      const tx = await contract.bookSlot(
        selectedStation.stationId,
        startTimeUnix,
        durationSeconds
      );
      
      setStatusMessage("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      
      setStatusMessage("Booking confirmed on-chain!");
      setSelectedStation(null);
      fetchStations();
      fetchUserSessions();
      if (provider) updateBalance(walletAddress, provider);
    } catch (err) {
      console.error("Booking error:", err);
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
      
      setStatusMessage("Charging started successfully! IoT simulator telemetry activated.");
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
      setStatusMessage("Processing contract payment on blockchain...");
      await tx.wait();
      
      setStatusMessage("Invoice paid and settled on-chain!");
      fetchUserSessions();
      if (provider) updateBalance(walletAddress, provider);
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment failed. Please verify your MetaMask balance.");
    } finally {
      setIsLoading(false);
    }
  };

  // Update Station pricing parameters on-chain (Owner only)
  const handleUpdatePricing = async (stationId, demandOverride, renewableOverride) => {
    if (!contract) return;
    const current = adminInputs[stationId] || {};
    const dVal = demandOverride !== undefined ? demandOverride : (current.demand || 0);
    const rVal = renewableOverride !== undefined ? renewableOverride : (current.renewable || 0);

    try {
      setIsLoading(true);
      setStatusMessage(`Updating pricing config for station #${stationId} on-chain...`);
      
      const tx = await contract.updateStationPricing(
        stationId,
        parseInt(dVal),
        parseInt(rVal)
      );
      setStatusMessage("Awaiting on-chain pricing confirmation...");
      await tx.wait();
      
      setStatusMessage(`Station #${stationId} pricing successfully updated!`);
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

      const averageWh = 25000n;
      const totalWei = rateWei * averageWh;
      setEstimatedTotal(totalWei.toString());
    } catch (err) {
      console.error("Error calculating rate estimate:", err);
      setEstimatedRate(null);
      setEstimatedTotal(null);
    }
  }, [contract, selectedStation, bookingTime]);

  useEffect(() => {
    updatePriceEstimate();
  }, [bookingTime, selectedStation, contract, updatePriceEstimate]);

  // Convert Wei to Eth for readable bills
  const formatWeiToEth = (weiString) => {
    try {
      if (!weiString) return "0";
      const val = ethers.formatEther(weiString.toString());
      const num = parseFloat(val);
      if (num === 0) return "0";
      if (num < 0.00001) return num.toFixed(8);
      if (num < 0.01) return num.toFixed(6);
      return num.toFixed(4);
    } catch (e) {
      return "0";
    }
  };

  // Determine which session to display in right telemetry card:
  // Prioritize selectedSessionId if user chose one, else actively Charging, else Booked, else Completed, else first
  const activeSession = selectedSessionId
    ? userSessions.find(s => s.sessionId === selectedSessionId)
    : userSessions.find(s => s.status === "Charging") || 
      userSessions.find(s => s.status === "Booked") || 
      userSessions.find(s => s.status === "Completed") ||
      (userSessions.length > 0 ? userSessions[0] : null);

  const lastTelemetry = activeSession && activeSession.telemetry && activeSession.telemetry.length > 0 
    ? activeSession.telemetry[activeSession.telemetry.length - 1] 
    : null;

  // Selected spotlight station data (from real stations list)
  const currentSpotlightStation = stations.find(s => s.stationId === spotlightStationId) || stations[0] || {
    stationId: 1,
    name: "VIT Main Gate Charger",
    coordinates: "12.9692° N, 79.1559° E",
    basePricePerWh: "620000000000",
    demandLevel: 0,
    renewableRatio: 25,
    active: true,
    status: "Available",
    queue: []
  };

  const spotlightForecast = forecasts[currentSpotlightStation.stationId];
  const unpaidSession = userSessions.find(s => s.status === "Completed");

  return (
    <div className="app-container">
      {/* Header section matching exact mockup layout */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon-circle">
            <Zap size={22} fill="var(--lime-bright)" color="var(--lime-bright)" />
          </div>
          <div className="brand-text-col">
            <h1 className="brand-title">VoltNet</h1>
            <span className="brand-subtitle">CAMPUS ENERGY BOARD</span>
          </div>
          <div className="network-pill">
            <span className={`network-dot ${Number(chainId) === 1337 || Number(chainId) === 31337 ? "" : "offline"}`}></span>
            {Number(chainId) === 1337 || Number(chainId) === 31337 ? "Localhost 1337" : walletAddress ? `Chain ${chainId}` : "Localhost 1337"}
          </div>
        </div>

        <div className="header-right-actions">
          {walletAddress ? (
            <>
              <div className="role-pill" id="role-display-pill">
                <Zap size={14} fill="var(--brand-coral)" color="var(--brand-coral)" />
                <span>{isAdmin ? "Admin" : "EV driver"}</span>
              </div>

              <div 
                className="account-pill" 
                onClick={switchAccount}
                title="Click to switch MetaMask account"
                id="account-pill-btn"
              >
                <span>{walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}</span>
                <ChevronDown size={14} />
              </div>

              <button 
                className={`btn-admin-toggle ${activeTab === "admin" ? "active" : ""}`}
                onClick={() => {
                  if (!isAdmin) {
                    alert("Admin access requires the contract owner account (e.g. 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266). Switch account in MetaMask.");
                    return;
                  }
                  setActiveTab(activeTab === "admin" ? "driver" : "admin");
                }}
                id="btn-admin-view-toggle"
              >
                Admin view
              </button>
            </>
          ) : (
            <button 
              className="btn-connect-wallet" 
              onClick={connectWallet} 
              disabled={isLoading}
              id="btn-meta-connect"
            >
              <Wallet size={16} />
              Connect Wallet
            </button>
          )}

          {walletAddress && Number(chainId) !== 1337 && Number(chainId) !== 31337 && (
            <button 
              className="btn-network-switch-warning"
              onClick={switchToLocalNetwork}
              title="Click to switch MetaMask to Localhost 8545"
            >
              ⚠️ Switch Network
            </button>
          )}
        </div>
      </header>

      {/* Main Status bar for feedback operations */}
      {statusMessage && (
        <div className="status-banner" id="status-bar">
          <Activity size={16} color="var(--lime-dark)" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Admin Pricing Console Tab */}
      {isAdmin && activeTab === "admin" ? (
        <section className="admin-console-section" id="admin-pricing-console">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2 style={{ margin: "0 0 0.35rem 0", fontSize: "1.4rem", fontWeight: "800", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sliders size={22} color="var(--brand-coral)" />
                Station Pricing & Dynamic Grid Management
              </h2>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Station Owner / Admin Account: <code style={{ color: "var(--brand-coral)", background: "rgba(240, 89, 65, 0.2)", padding: "0.2rem 0.5rem", borderRadius: "6px", fontWeight: "600", border: "1px solid rgba(240, 89, 65, 0.3)" }}>{walletAddress}</code>
              </span>
            </div>
            <button 
              className="btn-admin-toggle"
              onClick={() => setActiveTab("driver")}
            >
              Back to Driver View
            </button>
          </div>

          <div className="admin-console-grid">
            {stations.map((st) => {
              const currentVals = adminInputs[st.stationId] || { demand: st.demandLevel, renewable: st.renewableRatio };
              const isOwner = walletAddress.toLowerCase() === st.owner.toLowerCase() || (contractOwner && walletAddress.toLowerCase() === contractOwner.toLowerCase());

              return (
                <div key={st.stationId} className="admin-console-card" id={`admin-card-${st.stationId}`}>
                  <div className="admin-console-header">
                    <div>
                      <div className="admin-station-title">Station #{st.stationId}: {st.name}</div>
                      <div className="admin-station-coords">
                        <MapPin size={12} /> {st.coordinates}
                      </div>
                    </div>
                    <span className="spotlight-status-pill">
                      {st.status}
                    </span>
                  </div>

                  <div className="admin-input-card">
                    <div className="admin-input-header">
                      <span>Demand Markup %</span>
                      <span className="admin-input-val">+{currentVals.demand}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="200" 
                      step="5"
                      value={currentVals.demand}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAdminInputs(prev => ({
                          ...prev,
                          [st.stationId]: { ...(prev[st.stationId] || {}), demand: val }
                        }));
                      }}
                      className="admin-range-slider"
                      id={`slider-demand-${st.stationId}`}
                    />
                  </div>

                  <div className="admin-input-card">
                    <div className="admin-input-header">
                      <span>Solar / Renewable Ratio %</span>
                      <span className="admin-input-val">{currentVals.renewable}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="5"
                      value={currentVals.renewable}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAdminInputs(prev => ({
                          ...prev,
                          [st.stationId]: { ...(prev[st.stationId] || {}), renewable: val }
                        }));
                      }}
                      className="admin-range-slider"
                      id={`slider-renewable-${st.stationId}`}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Queue: {st.queue ? st.queue.length : 0} bookings
                    </span>
                    <button 
                      className="btn-admin-save" 
                      onClick={() => handleUpdatePricing(st.stationId)}
                      disabled={isLoading || !isOwner}
                      id={`btn-apply-pricing-${st.stationId}`}
                    >
                      {isLoading ? "Saving..." : "Apply to Chain"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        /* Driver Main Dashboard Layout */
        <div className="dashboard-grid-layout">
          {/* Left Column: Campus stations carousel + Spotlight Station */}
          <div className="left-dashboard-col">
            {/* Campus stations top container */}
            <div className="campus-stations-container">
              <div className="campus-stations-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <h2 className="campus-stations-title">Campus stations</h2>
                  <span className="campus-stations-badge-info">
                    {stations.filter(s => s.status === "Available").length} available · {stations.length} stations
                  </span>
                </div>

                {/* Horizontal Navigation Arrow Buttons */}
                <div className="carousel-nav-buttons">
                  <button 
                    className="btn-carousel-nav" 
                    onClick={() => scrollStations("left")} 
                    title="Scroll Left"
                    id="btn-scroll-left"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    className="btn-carousel-nav" 
                    onClick={() => scrollStations("right")} 
                    title="Scroll Right"
                    id="btn-scroll-right"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Horizontal Scroll Row with ALL real campus stations */}
              <div className="stations-carousel-row" ref={carouselRef} id="stations-carousel">
                {stations.map((st) => {
                  const isSelected = currentSpotlightStation.stationId === st.stationId;
                  const isAvailable = st.status === "Available";
                  const dotColor = isAvailable ? "#16a34a" : "#f59e0b";

                  return (
                    <div 
                      key={st.stationId}
                      className={`station-pill-card ${isSelected ? "active" : ""}`}
                      onClick={() => setSpotlightStationId(st.stationId)}
                      id={`station-pill-${st.stationId}`}
                    >
                      <div className="station-pill-card-top">
                        <span className="station-pill-code" title={st.name}>
                          #{st.stationId} {st.name.replace(" Charger", "").replace(" Charging Point", "").replace(" Hub", "")}
                        </span>
                        <span className="station-pill-dot" style={{ background: dotColor }}></span>
                      </div>
                      <span className="station-pill-rate">
                        {formatWeiToEth(st.basePricePerWh.toString())} ETH/Wh
                      </span>
                      <span className="station-pill-tag">
                        {st.status} {st.renewableRatio > 0 ? `· ${st.renewableRatio}% Solar` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Station Spotlight Hero Card */}
            <div className="spotlight-station-card" id="spotlight-station-card">
              <div className="spotlight-header-row">
                <div className="spotlight-title-group">
                  <div className="spotlight-title-line">
                    <h2 className="spotlight-name">
                      Station #{currentSpotlightStation.stationId} · {currentSpotlightStation.name}
                    </h2>
                    <span className="spotlight-status-pill">
                      <span 
                        className="station-pill-dot" 
                        style={{ background: currentSpotlightStation.status === "Available" ? "#16a34a" : "#f59e0b" }}
                      ></span>
                      {currentSpotlightStation.queue && currentSpotlightStation.queue.length > 0
                        ? `Queue active (${currentSpotlightStation.queue.length} in line)`
                        : currentSpotlightStation.status}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <MapPin size={13} /> {currentSpotlightStation.coordinates}
                  </div>

                  <p className="spotlight-desc">
                    {spotlightForecast 
                      ? `AI expects ${spotlightForecast.predicted_occupancy_ratio}% occupancy. ${spotlightForecast.recommendation || ""}`
                      : `Dynamic demand and renewable pricing are synchronized for Station #${currentSpotlightStation.stationId}.`}
                    {currentSpotlightStation.waitEstimateMinutes > 0 
                      ? ` Current estimated wait is ~${currentSpotlightStation.waitEstimateMinutes} min.` 
                      : " Ready for immediate slot booking."}
                  </p>
                </div>

                <button 
                  className="btn-book-slot-hero"
                  onClick={() => setSelectedStation(currentSpotlightStation)}
                  id="btn-spotlight-book"
                >
                  <Calendar size={18} />
                  Book slot
                </button>
              </div>

              {/* 4 Stat Metric Tiles */}
              <div className="spotlight-metrics-row">
                {/* Tile 1: Base Rate */}
                <div className="metric-tile tile-light">
                  <span className="metric-tile-lbl">BASE RATE</span>
                  <div className="metric-tile-val">
                    {formatWeiToEth(currentSpotlightStation.basePricePerWh.toString())}
                  </div>
                  <span className="metric-tile-sub">ETH per Wh</span>
                </div>

                {/* Tile 2: Demand */}
                <div className="metric-tile tile-warm">
                  <span className="metric-tile-lbl">DEMAND</span>
                  <div className="metric-tile-val">
                    +{currentSpotlightStation.demandLevel || 0}%
                  </div>
                  <span className="metric-tile-sub">dynamic markup</span>
                </div>

                {/* Tile 3: Solar Mix */}
                <div className="metric-tile tile-lime">
                  <span className="metric-tile-lbl">SOLAR MIX</span>
                  <div className="metric-tile-val">
                    {currentSpotlightStation.renewableRatio || 0}%
                  </div>
                  <span className="metric-tile-sub">renewable energy</span>
                </div>

                {/* Tile 4: AI Forecast (Dark Tile) */}
                <div className="metric-tile tile-dark">
                  <span className="metric-tile-lbl">FORECAST</span>
                  <div className="metric-tile-val">
                    {spotlightForecast ? spotlightForecast.predicted_occupancy_ratio : 0}%
                  </div>
                  <span className="metric-tile-sub">occupancy in 2h</span>
                </div>
              </div>

              {/* Sliders / Gauge Rows */}
              <div className="spotlight-bars-group">
                <div className="gauge-bar-row">
                  <span className="gauge-bar-label">QUEUE DEPTH</span>
                  <div className="gauge-bar-track">
                    <div 
                      className="gauge-bar-fill" 
                      style={{ 
                        width: `${Math.min(100, (((currentSpotlightStation.queue ? currentSpotlightStation.queue.length : 0) / 5) * 100))}%`,
                        background: "var(--lime-bright)"
                      }}
                    ></div>
                  </div>
                  <span className="gauge-bar-val">
                    {currentSpotlightStation.queue ? currentSpotlightStation.queue.length : 0}/5
                  </span>
                </div>

                <div className="gauge-bar-row">
                  <span className="gauge-bar-label">GRID LOAD</span>
                  <div className="gauge-bar-track">
                    <div 
                      className="gauge-bar-fill" 
                      style={{ 
                        width: `${spotlightForecast ? spotlightForecast.predicted_occupancy_ratio : 35}%`,
                        background: "var(--lime-mid)"
                      }}
                    ></div>
                  </div>
                  <span className="gauge-bar-val">
                    {spotlightForecast ? spotlightForecast.predicted_occupancy_ratio : 35}%
                  </span>
                </div>
              </div>

              {/* Scheduled Bookings Queue List if any exists */}
              {currentSpotlightStation.queue && currentSpotlightStation.queue.length > 0 && (
                <div className="spotlight-queue-box">
                  <span className="spotlight-queue-title">
                    <Clock size={13} /> Scheduled Queue ({currentSpotlightStation.queue.length})
                  </span>
                  <div className="spotlight-queue-items">
                    {currentSpotlightStation.queue.map((q, idx) => (
                      <div key={idx} className="spotlight-queue-item">
                        <span>{new Date(q.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({Math.floor(q.duration / 60)} min)</span>
                        <span style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>{q.userAddress.substring(0, 6)}...</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Telemetry + Battery Health + Wallet Settle */}
          <div className="right-dashboard-col">
            {/* Card 1: Dynamic Live Telemetry / Session Manager */}
            <div className="telemetry-card-container" id="live-telemetry-card">
              <div className="telemetry-card-header">
                <h3 className="telemetry-title">Live telemetry</h3>
                {activeSession ? (
                  <span className="telemetry-session-badge">
                    <span 
                      className="station-pill-dot" 
                      style={{ 
                        background: activeSession.status === "Charging" ? "#16a34a" : activeSession.status === "Booked" ? "#f59e0b" : "#64748b" 
                      }}
                    ></span>
                    Session #{activeSession.sessionId} · {activeSession.status}
                  </span>
                ) : (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>
                    Idle
                  </span>
                )}
              </div>

              {/* Session switcher tabs if user has multiple sessions */}
              {userSessions.length > 1 && (
                <div className="session-tabs-row">
                  {userSessions.map((s) => (
                    <button 
                      key={s.sessionId}
                      className={`session-tab-pill ${(activeSession && activeSession.sessionId === s.sessionId) ? "active" : ""}`}
                      onClick={() => setSelectedSessionId(s.sessionId)}
                    >
                      #{s.sessionId} ({s.status})
                    </button>
                  ))}
                </div>
              )}

              {/* State A: Wallet Not Connected */}
              {!walletAddress ? (
                <div className="telemetry-empty-box">
                  <div className="telemetry-empty-icon">
                    <Zap size={24} />
                  </div>
                  <h4 style={{ margin: 0, fontWeight: "800", color: "var(--dark-neutral)" }}>Wallet Not Connected</h4>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Connect MetaMask to monitor live telemetry, activate bookings, and settle invoices.
                  </p>
                  <button 
                    className="btn-primary" 
                    onClick={connectWallet}
                    style={{ marginTop: "0.5rem" }}
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : !activeSession ? (
                /* State B: Connected, but No Active or Booked Sessions */
                <div className="telemetry-empty-box">
                  <div className="telemetry-empty-icon">
                    <BatteryCharging size={24} />
                  </div>
                  <h4 style={{ margin: 0, fontWeight: "800", color: "var(--dark-neutral)" }}>No Active Charging Session</h4>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Select a station from the campus board and click <strong>Book slot</strong> to schedule charging. Live telemetry will stream automatically once your session starts.
                  </p>
                </div>
              ) : activeSession.status === "Booked" ? (
                /* State C: Session is Booked (Ready to Start) */
                <div className="session-booked-hero">
                  <div className="session-booked-header">
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "1rem", color: "var(--dark-neutral)" }}>
                        Station #{activeSession.stationId}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.15rem" }}>
                        <Clock size={12} /> {new Date(activeSession.startTime).toLocaleString()}
                      </div>
                    </div>
                    <span className="session-booked-badge">Ready to Start</span>
                  </div>

                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Duration: {Math.floor(activeSession.duration / 60)} minutes · Advance on-chain reservation
                  </div>

                  <button 
                    className="btn-telemetry-main btn-start"
                    onClick={() => handleStartCharging(activeSession.sessionId)}
                    disabled={isLoading}
                    id={`btn-start-${activeSession.sessionId}`}
                    style={{ marginTop: "0.25rem" }}
                  >
                    <Zap size={16} />
                    Start Charging Now
                  </button>
                </div>
              ) : activeSession.status === "Charging" ? (
                /* State D: Session is Actively Charging (LIVE MQTT TELEMETRY) */
                <>
                  <div className="telemetry-2x2-grid">
                    <div className="telemetry-box-tile">
                      <div className="telemetry-box-top">
                        <span className="telemetry-box-lbl">CURRENT</span>
                        <Activity size={14} />
                      </div>
                      <div className="telemetry-box-num">
                        {lastTelemetry ? lastTelemetry.current.toFixed(1) : "0.0"} <span style={{ fontSize: "0.9rem" }}>A</span>
                      </div>
                    </div>

                    <div className="telemetry-box-tile">
                      <div className="telemetry-box-top">
                        <span className="telemetry-box-lbl">VOLTAGE</span>
                        <Gauge size={14} />
                      </div>
                      <div className="telemetry-box-num">
                        {lastTelemetry ? lastTelemetry.voltage.toFixed(0) : "0"} <span style={{ fontSize: "0.9rem" }}>V</span>
                      </div>
                    </div>

                    <div className="telemetry-box-tile">
                      <div className="telemetry-box-top">
                        <span className="telemetry-box-lbl">POWER</span>
                        <Zap size={14} />
                      </div>
                      <div className="telemetry-box-num">
                        {lastTelemetry ? (lastTelemetry.power / 1000).toFixed(2) : "0.00"} <span style={{ fontSize: "0.9rem" }}>kW</span>
                      </div>
                    </div>

                    <div className="telemetry-box-tile">
                      <div className="telemetry-box-top">
                        <span className="telemetry-box-lbl">ENERGY</span>
                        <BatteryCharging size={14} />
                      </div>
                      <div className="telemetry-box-num">
                        {activeSession.energyConsumedWh || 0} <span style={{ fontSize: "0.9rem" }}>Wh</span>
                      </div>
                    </div>
                  </div>

                  {/* Energy delivered Progress Bar */}
                  <div className="telemetry-progress-block">
                    <div className="telemetry-progress-header">
                      <span>Energy delivered</span>
                      <span>{activeSession.energyConsumedWh || 0} Wh</span>
                    </div>
                    <div className="telemetry-progress-track">
                      <div 
                        className="telemetry-progress-fill"
                        style={{ 
                          width: `${Math.min(100, ((activeSession.energyConsumedWh || 0) / 25000) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="telemetry-progress-footer">
                      <span>{lastTelemetry ? (lastTelemetry.power / 1000).toFixed(2) : "0.00"} kW active</span>
                      <span style={{ color: "#15803d", fontWeight: "700" }}>MQTT Stream Live</span>
                    </div>
                  </div>

                  <div className="telemetry-btn-row">
                    <button 
                      className="btn-telemetry-main"
                      onClick={() => alert("Charging session is monitored automatically via IoT Simulator. Telemetry is streaming live!")}
                      id="btn-telemetry-stop"
                    >
                      Stop Charging
                    </button>
                  </div>
                </>
              ) : activeSession.status === "Completed" ? (
                /* State E: Session Completed (Ready for on-chain payment) */
                <div className="session-completed-hero">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "1.05rem", color: "var(--dark-neutral)" }}>
                        Session #{activeSession.sessionId} Finished
                      </div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Energy: {activeSession.energyConsumedWh} Wh
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "#15803d" }}>
                        {formatWeiToEth(activeSession.totalBill)} ETH
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Total Due</span>
                    </div>
                  </div>

                  {/* AI Fraud Validation Status */}
                  {activeSession.fraudFlag ? (
                    <div className="fraud-badge-alert">
                      <AlertTriangle size={14} />
                      <span><strong>AI Fraud Alert:</strong> {activeSession.fraudReason}</span>
                    </div>
                  ) : (
                    <div className="fraud-badge-clean">
                      <CheckCircle size={14} />
                      <span>AI Fraud Verification: Normal consumption verified</span>
                    </div>
                  )}

                  <button 
                    className="btn-settle-onchain"
                    onClick={() => handlePayBill(activeSession.sessionId, activeSession.totalBill)}
                    disabled={isLoading}
                    id={`btn-pay-${activeSession.sessionId}`}
                    style={{ width: "100%", marginTop: "0.25rem" }}
                  >
                    <CreditCard size={16} />
                    Pay & Settle Invoice on-chain
                  </button>
                </div>
              ) : (
                /* State F: Session Paid */
                <div className="telemetry-empty-box" style={{ background: "#f0fdf4", borderColor: "rgba(34, 197, 94, 0.3)" }}>
                  <CheckCircle size={32} color="#15803d" />
                  <h4 style={{ margin: 0, fontWeight: "800", color: "#15803d" }}>
                    Session #{activeSession.sessionId} Settled
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Bill of {formatWeiToEth(activeSession.totalBill)} ETH was paid on blockchain.
                  </p>
                </div>
              )}
            </div>

            {/* Card 2: AI Battery health widget */}
            <div className="battery-health-pill-card" id="battery-health-card">
              <div className="battery-circle-score">
                {batteryHealth ? batteryHealth.battery_health : 94}
              </div>
              <div className="battery-text-col">
                <span className="battery-status-title">
                  <Zap size={15} fill="var(--dark-neutral)" />
                  Battery health · {batteryHealth ? batteryHealth.status : "Good"}
                </span>
                <span className="battery-status-desc">
                  {batteryHealth ? batteryHealth.advice : "Charging speed is steady. No degradation flags detected."}
                </span>
              </div>
            </div>

            {/* Card 3: Dark Wallet Balance & Settle on-chain */}
            <div className="wallet-settle-card" id="wallet-settle-card">
              <div className="wallet-balance-row">
                <div className="wallet-lbl-col">
                  <span className="wallet-sub-lbl">WALLET BALANCE</span>
                  <span className="wallet-sub-val">
                    {unpaidSession ? "Pending Invoice" : "Account Status"}
                  </span>
                </div>
                <div className="wallet-eth-col">
                  <span className="wallet-eth-num">{walletBalance} ETH</span>
                  <span className="wallet-est-num">
                    {unpaidSession ? `${formatWeiToEth(unpaidSession.totalBill)} ETH` : "All Settled"}
                  </span>
                </div>
              </div>

              <button 
                className="btn-settle-onchain"
                onClick={() => {
                  if (unpaidSession) {
                    handlePayBill(unpaidSession.sessionId, unpaidSession.totalBill);
                  } else if (activeSession && activeSession.status === "Charging") {
                    alert("Your session is currently charging. Invoices settle on-chain upon session completion.");
                  } else if (activeSession && activeSession.status === "Booked") {
                    handleStartCharging(activeSession.sessionId);
                  } else if (walletAddress) {
                    alert(`Wallet balance verified: ${walletBalance} ETH on Localhost (1337). All active transactions are settled!`);
                  } else {
                    connectWallet();
                  }
                }}
                id="btn-settle-onchain"
              >
                {unpaidSession 
                  ? `✉ Settle Session #${unpaidSession.sessionId} on-chain` 
                  : `✉ Settle on-chain`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Dialogue Modal Overlay */}
      {selectedStation && (
        <div className="booking-overlay">
          <div className="booking-modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "800", color: "var(--dark-neutral)" }}>
                Book Charging Slot
              </h3>
              <button 
                className="btn-secondary" 
                style={{ padding: "0.25rem 0.5rem", borderRadius: "50%" }} 
                onClick={() => setSelectedStation(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.25rem", lineHeight: "1.5" }}>
              <strong>Station:</strong> #{selectedStation.stationId} {selectedStation.name} <br/>
              <strong>Location:</strong> {selectedStation.coordinates} <br/>
              <strong>Base Price:</strong> {formatWeiToEth(selectedStation.basePricePerWh.toString())} ETH/Wh <br/>
              <strong>Demand Adjustment:</strong> +{selectedStation.demandLevel || 0}%
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
                  <span style={{ fontWeight: "700", color: "var(--brand-coral)" }}>Dynamic Price Estimate (Contract View)</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginTop: "0.25rem" }}>
                    <div>Estimated Rate: <strong>{formatWeiToEth(estimatedRate)} ETH/Wh</strong></div>
                    <div>Estimated total cost (at 25 kWh): <strong>{formatWeiToEth(estimatedTotal)} ETH</strong></div>
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

      {/* Floating Bottom-Right Campus Stations Mini Map */}
      <MiniMap 
        stations={stations}
        spotlightStationId={spotlightStationId}
        onSelectStation={(id) => setSpotlightStationId(id)}
        onBookStation={(station) => setSelectedStation(station)}
        activeSession={activeSession}
      />
    </div>
  );
}

export default App;
