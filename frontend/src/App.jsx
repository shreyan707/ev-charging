import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

// Layout components
import Header from "./components/layout/Header";
import StatusStrip from "./components/layout/StatusStrip";

// Stations components
import StationGrid from "./components/stations/StationGrid";
import BookingPanel from "./components/stations/BookingPanel";

// Sessions components
import ActiveSession from "./components/sessions/ActiveSession";
import Billing from "./components/sessions/Billing";
import SessionHistory from "./components/sessions/SessionHistory";

// AI components
import BatteryHealth from "./components/ai/BatteryHealth";
import DemandForecast from "./components/ai/DemandForecast";
import FraudAlert from "./components/ai/FraudAlert";

// Admin components
import PricingConsole from "./components/admin/PricingConsole";
import StationTable from "./components/admin/StationTable";

// Web3 components
import TransactionStatus from "./components/web3/TransactionStatus";

// MiniMap component
import MiniMap from "./MiniMap";

// Smart contract deployment artifact
import deployedContracts from "../../hardhat/deployed_contracts.json";

const API_BASE_URL = "http://localhost:5000/api";

const DEFAULT_STATIONS = [
  { stationId: 1, name: "VIT Main Gate Charger", coordinates: "12.9682,79.1561", basePricePerWh: "1000000000", demandLevel: 20, renewableRatio: 10, status: "Available", queue: [] },
  { stationId: 2, name: "SJT Building Hub", coordinates: "12.9710,79.1637", basePricePerWh: "1200000000", demandLevel: 40, renewableRatio: 0, status: "Charging", queue: [] },
  { stationId: 3, name: "TT Building Parking", coordinates: "12.9702,79.1595", basePricePerWh: "1100000000", demandLevel: 30, renewableRatio: 20, status: "Available", queue: [] },
  { stationId: 4, name: "G.D. Naidu Block Charger", coordinates: "12.9691,79.1559", basePricePerWh: "900000000", demandLevel: 10, renewableRatio: 30, status: "Available", queue: [] },
  { stationId: 5, name: "SMV Block Solar Station", coordinates: "12.9723,79.1601", basePricePerWh: "1000000000", demandLevel: 15, renewableRatio: 90, status: "Available", queue: [] },
  { stationId: 6, name: "MB Block Charging Point", coordinates: "12.9695,79.1615", basePricePerWh: "1100000000", demandLevel: 25, renewableRatio: 15, status: "Available", queue: [] },
  { stationId: 7, name: "Mens Hostel Q-Block Hub", coordinates: "12.9750,79.1585", basePricePerWh: "1300000000", demandLevel: 60, renewableRatio: 5, status: "Queued", queue: [] },
  { stationId: 8, name: "Ladies Hostel Annex Charger", coordinates: "12.9780,79.1560", basePricePerWh: "1300000000", demandLevel: 50, renewableRatio: 10, status: "Available", queue: [] }
];

export default function App() {
  // Web3 Provider & Signer State
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState("0.000");
  const [chainId, setChainId] = useState(null);
  const [contractOwner, setContractOwner] = useState("");

  // Navigation & Role State
  const [activeNav, setActiveNav] = useState("overview"); // "overview" | "stations" | "sessions" | "ai" | "admin"
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Stations & Session Data State
  const [stations, setStations] = useState(DEFAULT_STATIONS);
  const [selectedStationId, setSelectedStationId] = useState(1);
  const [userSessions, setUserSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [forecasts, setForecasts] = useState({});
  const [batteryHealth, setBatteryHealth] = useState(null);
  const [dismissedFraudAlert, setDismissedFraudAlert] = useState(false);

  // Admin Inputs State
  const [adminInputs, setAdminInputs] = useState({});

  // Booking Modal State
  const [bookingStation, setBookingStation] = useState(null);
  const [bookingTime, setBookingTime] = useState("");
  const [bookingDuration, setBookingDuration] = useState("60");
  const [estimatedRate, setEstimatedRate] = useState(null);
  const [estimatedTotal, setEstimatedTotal] = useState(null);

  // Explicit Transaction State (Section 11)
  const [txState, setTxState] = useState({
    status: "idle", // "idle" | "waiting_wallet" | "submitted" | "confirmed" | "failed"
    actionName: "",
    hash: "",
    blockNumber: null,
    error: ""
  });

  const isAdmin = Boolean(
    walletAddress && (
      (contractOwner && walletAddress.toLowerCase() === contractOwner.toLowerCase()) ||
      stations.some(s => s.owner && s.owner.toLowerCase() === walletAddress.toLowerCase()) ||
      walletAddress.toLowerCase() === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    )
  );

  // Format Wei to ETH
  const formatWeiToEth = (weiString) => {
    try {
      if (!weiString) return "0";
      const val = ethers.formatEther(weiString.toString());
      const num = parseFloat(val);
      if (num === 0) return "0";
      if (num < 0.00001) return num.toFixed(8);
      if (num < 0.01) return num.toFixed(6);
      return num.toFixed(4);
    } catch {
      return "0";
    }
  };

  // Fetch ETH balance
  const updateBalance = async (addr, prov) => {
    if (!addr || !prov) return;
    try {
      const bal = await prov.getBalance(addr);
      setWalletBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
    } catch (err) {
      console.warn("Could not fetch balance:", err);
    }
  };

  // Connect MetaMask Wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed! Please install MetaMask to interact with the VoltNet grid.");
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage("REQUESTING METAMASK AUTHORIZATION...");
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const activeSigner = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setWalletAddress(accounts[0]);
      setChainId(network.chainId);

      await updateBalance(accounts[0], browserProvider);

      if (Number(network.chainId) !== 1337 && Number(network.chainId) !== 31337) {
        setStatusMessage("NETWORK MISMATCH: SWITCH TO LOCALHOST 8545");
      } else {
        setStatusMessage("CONNECTED TO LOCALHOST:8545");
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
        } catch (err) {
          console.warn("Could not query contract owner:", err);
        }
      }
    } catch (err) {
      console.error("Wallet connection error:", err);
      setStatusMessage("CONNECTION REJECTED BY USER");
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
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add local network:", addError);
        }
      }
    }
  };

  // Disconnect Wallet Session
  const disconnectWallet = () => {
    setProvider(null);
    setContract(null);
    setWalletAddress("");
    setWalletBalance("0.000");
    setChainId(null);
    setContractOwner("");
    setActiveNav("overview");
    setStatusMessage("WALLET DISCONNECTED");
  };

  // Switch Account in MetaMask
  const switchAccount = async () => {
    if (!window.ethereum) return;
    try {
      setIsLoading(true);
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch (err) {
      console.error("Failed to switch account:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Account & Chain listeners
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          connectWallet();
        } else {
          disconnectWallet();
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  // Fetch Stations from backend
  const fetchStations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stations`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setStations(data);
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
      }
    } catch {
      // Backend may be offline; DEFAULT_STATIONS serves as fallback
    }
  }, []);

  // Fetch User Sessions
  const fetchUserSessions = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/user/${walletAddress}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setUserSessions(data);
        }
      }
    } catch (err) {
      console.warn("Could not fetch user sessions:", err.message);
    }
  }, [walletAddress]);

  // Fetch AI Occupancy Forecasts
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
    } catch {
      // FastAPI may be offline
    }
  }, [stations]);

  // Fetch AI Battery Health
  const fetchBatteryHealth = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/ai/battery-health/${walletAddress}`);
      if (resp.ok) {
        const data = await resp.json();
        setBatteryHealth(data);
      }
    } catch {
      // FastAPI may be offline
    }
  }, [walletAddress]);

  // Periodic Polling
  useEffect(() => {
    fetchStations();
    const interval = setInterval(() => {
      fetchStations();
      if (walletAddress) {
        fetchUserSessions();
        fetchBatteryHealth();
        if (provider) updateBalance(walletAddress, provider);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [walletAddress, provider, fetchStations, fetchUserSessions, fetchBatteryHealth]);

  useEffect(() => {
    if (stations.length > 0 && Object.keys(forecasts).length === 0) {
      fetchForecasts();
    }
  }, [stations, fetchForecasts, forecasts]);

  // Dynamic Price Preview
  const updatePriceEstimate = useCallback(async () => {
    if (!contract || !bookingStation || !bookingTime) {
      setEstimatedRate(null);
      setEstimatedTotal(null);
      return;
    }

    try {
      const timestamp = Math.floor(new Date(bookingTime).getTime() / 1000);
      const rateWei = await contract.calculateRatePerWh(bookingStation.stationId, timestamp);
      setEstimatedRate(rateWei.toString());

      const standardWh = 25000n;
      const totalWei = rateWei * standardWh;
      setEstimatedTotal(totalWei.toString());
    } catch (err) {
      console.warn("Error calculating rate estimate:", err);
      setEstimatedRate(null);
      setEstimatedTotal(null);
    }
  }, [contract, bookingStation, bookingTime]);

  useEffect(() => {
    updatePriceEstimate();
  }, [bookingTime, bookingStation, contract, updatePriceEstimate]);

  // Smart Contract Action: bookSlot
  const handleBookSlot = async (e) => {
    e.preventDefault();
    if (!contract) {
      alert("Please connect your MetaMask wallet first.");
      return;
    }

    try {
      setIsLoading(true);
      setTxState({
        status: "waiting_wallet",
        actionName: `BOOK STATION #${bookingStation.stationId}`,
        hash: "",
        blockNumber: null,
        error: ""
      });

      const startTimeUnix = Math.floor(new Date(bookingTime).getTime() / 1000);
      const durationSeconds = parseInt(bookingDuration) * 60;

      const tx = await contract.bookSlot(
        bookingStation.stationId,
        startTimeUnix,
        durationSeconds
      );

      setTxState(prev => ({
        ...prev,
        status: "submitted",
        hash: tx.hash
      }));

      const receipt = await tx.wait();

      setTxState(prev => ({
        ...prev,
        status: "confirmed",
        blockNumber: receipt.blockNumber
      }));

      setStatusMessage(`SLOT BOOKED CONFIRMED (BLOCK #${receipt.blockNumber})`);
      setBookingStation(null);
      fetchStations();
      fetchUserSessions();
      if (provider) updateBalance(walletAddress, provider);
    } catch (err) {
      console.error("Booking failed:", err);
      let errMsg = err.reason || err.message || "Execution reverted";
      setTxState({
        status: "failed",
        actionName: "BOOK SLOT",
        hash: "",
        blockNumber: null,
        error: errMsg
      });
      alert(`Booking Error: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Smart Contract Action: startCharging
  const handleStartCharging = async (sessionId) => {
    if (!contract) return;
    try {
      setIsLoading(true);
      setTxState({
        status: "waiting_wallet",
        actionName: `START CHARGING (SESSION #${sessionId})`,
        hash: "",
        blockNumber: null,
        error: ""
      });

      const tx = await contract.startCharging(sessionId);
      setTxState(prev => ({ ...prev, status: "submitted", hash: tx.hash }));

      const receipt = await tx.wait();
      setTxState(prev => ({ ...prev, status: "confirmed", blockNumber: receipt.blockNumber }));
      setStatusMessage(`CHARGING STARTED (TX: ${tx.hash.substring(0, 10)}...)`);

      fetchUserSessions();
      fetchStations();
    } catch (err) {
      console.error("Start charging error:", err);
      setTxState({
        status: "failed",
        actionName: "START CHARGING",
        hash: "",
        blockNumber: null,
        error: err.reason || err.message
      });
      alert("Failed to start session on-chain. Confirm your scheduled time slot window.");
    } finally {
      setIsLoading(false);
    }
  };

  // Smart Contract Action: payBill
  const handlePayBill = async (sessionId, totalBillWei) => {
    if (!contract) return;
    try {
      setIsLoading(true);
      setTxState({
        status: "waiting_wallet",
        actionName: `PAY INVOICE #${sessionId}`,
        hash: "",
        blockNumber: null,
        error: ""
      });

      const tx = await contract.payBill(sessionId, { value: totalBillWei });
      setTxState(prev => ({ ...prev, status: "submitted", hash: tx.hash }));

      const receipt = await tx.wait();
      setTxState(prev => ({ ...prev, status: "confirmed", blockNumber: receipt.blockNumber }));
      setStatusMessage(`INVOICE SETTLED (BLOCK #${receipt.blockNumber})`);

      fetchUserSessions();
      if (provider) updateBalance(walletAddress, provider);
    } catch (err) {
      console.error("Payment error:", err);
      setTxState({
        status: "failed",
        actionName: "PAY BILL",
        hash: "",
        blockNumber: null,
        error: err.reason || err.message
      });
      alert("Invoice payment failed. Please check your ETH balance.");
    } finally {
      setIsLoading(false);
    }
  };

  // Smart Contract Action: updateStationPricing
  const handleUpdatePricing = async (stationId) => {
    if (!contract) return;
    const current = adminInputs[stationId] || {};
    const dVal = current.demand || 0;
    const rVal = current.renewable || 0;

    try {
      setIsLoading(true);
      setTxState({
        status: "waiting_wallet",
        actionName: `UPDATE PRICING (STATION #${stationId})`,
        hash: "",
        blockNumber: null,
        error: ""
      });

      const tx = await contract.updateStationPricing(stationId, parseInt(dVal), parseInt(rVal));
      setTxState(prev => ({ ...prev, status: "submitted", hash: tx.hash }));

      const receipt = await tx.wait();
      setTxState(prev => ({ ...prev, status: "confirmed", blockNumber: receipt.blockNumber }));
      setStatusMessage(`STATION #${stationId} PRICING UPDATED ON-CHAIN`);

      fetchStations();
    } catch (err) {
      console.error("Pricing update error:", err);
      setTxState({
        status: "failed",
        actionName: "UPDATE PRICING",
        hash: "",
        blockNumber: null,
        error: err.reason || err.message
      });
      alert("Only the designated contract or station owner can update pricing.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Determine Active Session
  const activeSession = selectedSessionId
    ? userSessions.find(s => s.sessionId === selectedSessionId)
    : userSessions.find(s => s.status === "Charging") ||
      userSessions.find(s => s.status === "Booked") ||
      userSessions.find(s => s.status === "Completed") ||
      (userSessions.length > 0 ? userSessions[0] : null);

  const unpaidSession = userSessions.find(s => s.status === "Completed");
  const recentPaidSession = userSessions.find(s => s.status === "Paid");
  const fraudSession = userSessions.find(s => s.fraudFlag && !dismissedFraudAlert);

  const currentSelectedStation = stations.find(s => s.stationId === selectedStationId) || stations[0];

  return (
    <div className="app-shell">
      {/* 5. Header (Section 5) */}
      <Header
        walletAddress={walletAddress}
        walletBalance={walletBalance}
        chainId={chainId}
        isAdmin={isAdmin}
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
        onSwitchAccount={switchAccount}
        onSwitchNetwork={switchToLocalNetwork}
        isLoading={isLoading}
        activeNav={activeNav}
        onSelectNav={setActiveNav}
      />

      {/* 7. System Status Strip (Section 7) */}
      <StatusStrip
        stations={stations}
        userSessions={userSessions}
        chainId={chainId}
        hasFraudAlert={Boolean(fraudSession)}
      />

      {/* Main Workspace (Section 4) */}
      <main className="main-workspace">
        {/* Operational System Feedback Strip */}
        {statusMessage && (
          <div className="operational-feedback-strip active">
            <span>SYSTEM LOG: {statusMessage}</span>
            <button
              type="button"
              className="btn-sm btn-secondary"
              onClick={() => setStatusMessage("")}
            >
              CLEAR
            </button>
          </div>
        )}

        {/* Web3 Transaction Monitor Banner (Section 11 & 35) */}
        {txState.status !== "idle" && (
          <TransactionStatus
            actionName={txState.actionName}
            walletAddress={walletAddress}
            networkName={Number(chainId) === 1337 ? "LOCALHOST:8545" : `CHAIN ID ${chainId}`}
            status={txState.status.toUpperCase()}
            txHash={txState.hash}
            blockNumber={txState.blockNumber}
            errorMessage={txState.error}
            onClose={() => setTxState({ status: "idle", actionName: "", hash: "", blockNumber: null, error: "" })}
          />
        )}

        {/* 16. Fraud / Anomaly Interrupt Banner (Section 16) */}
        {fraudSession && (
          <FraudAlert
            fraudSession={fraudSession}
            onDismiss={() => setDismissedFraudAlert(true)}
          />
        )}

        {/* ADMIN VIEW: Station Table + Pricing Console */}
        {activeNav === "admin" && isAdmin ? (
          <div>
            <StationTable
              stations={stations}
              onSelectStation={(id) => setSelectedStationId(id)}
              onBookSlot={(st) => {
                setBookingStation(st);
                setBookingTime(new Date(Date.now() + 15 * 60000).toISOString().slice(0, 16));
              }}
              formatWeiToEth={formatWeiToEth}
            />

            <PricingConsole
              stations={stations}
              adminInputs={adminInputs}
              setAdminInputs={setAdminInputs}
              onUpdatePricing={handleUpdatePricing}
              isLoading={isLoading}
              formatWeiToEth={formatWeiToEth}
            />
          </div>
        ) : activeNav === "stations" ? (
          /* STATIONS VIEW ONLY */
          <StationGrid
            stations={stations}
            selectedStationId={selectedStationId}
            forecasts={forecasts}
            onSelectStation={(id) => setSelectedStationId(id)}
            onBookSlot={(st) => {
              setBookingStation(st);
              setBookingTime(new Date(Date.now() + 15 * 60000).toISOString().slice(0, 16));
            }}
            formatWeiToEth={formatWeiToEth}
          />
        ) : activeNav === "sessions" ? (
          /* SESSIONS VIEW ONLY */
          <div>
            <ActiveSession
              session={activeSession}
              userSessions={userSessions}
              onSelectSession={(id) => setSelectedSessionId(id)}
              onStartCharging={handleStartCharging}
              onPayBill={handlePayBill}
              onFindStation={() => setActiveNav("stations")}
              isLoading={isLoading}
              formatWeiToEth={formatWeiToEth}
            />

            <SessionHistory
              sessions={userSessions}
              onSelectSession={(id) => setSelectedSessionId(id)}
              formatWeiToEth={formatWeiToEth}
            />
          </div>
        ) : activeNav === "ai" ? (
          /* AI VIEW ONLY */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <BatteryHealth batteryHealth={batteryHealth} />
            <DemandForecast
              forecast={forecasts[selectedStationId]}
              stationName={currentSelectedStation?.name || "CAMPUS GRID"}
            />
          </div>
        ) : (
          /* OVERVIEW (Default Dashboard Grid: 7fr Station Grid, 5fr Sessions & AI) */
          <div className="dashboard-grid">
            {/* Left 7 Columns: Charging Stations Grid & Past History */}
            <div className="grid-col-left">
              <StationGrid
                stations={stations}
                selectedStationId={selectedStationId}
                forecasts={forecasts}
                onSelectStation={(id) => setSelectedStationId(id)}
                onBookSlot={(st) => {
                  setBookingStation(st);
                  setBookingTime(new Date(Date.now() + 15 * 60000).toISOString().slice(0, 16));
                }}
                formatWeiToEth={formatWeiToEth}
              />

              <SessionHistory
                sessions={userSessions}
                onSelectSession={(id) => setSelectedSessionId(id)}
                formatWeiToEth={formatWeiToEth}
              />
            </div>

            {/* Right 5 Columns: Active Session, Settlement, AI Battery, AI Forecast */}
            <div className="grid-col-right">
              {/* 12. Active Charging Session Module */}
              <ActiveSession
                session={activeSession}
                userSessions={userSessions}
                onSelectSession={(id) => setSelectedSessionId(id)}
                onStartCharging={handleStartCharging}
                onPayBill={handlePayBill}
                onFindStation={() => setActiveNav("stations")}
                isLoading={isLoading}
                formatWeiToEth={formatWeiToEth}
              />

              {/* 17. Settlement / Billing Module (if invoice pending or recently paid) */}
              {(unpaidSession || recentPaidSession) && (
                <Billing
                  unpaidSession={unpaidSession}
                  recentPaidSession={recentPaidSession}
                  onPayBill={handlePayBill}
                  isLoading={isLoading}
                  formatWeiToEth={formatWeiToEth}
                />
              )}

              {/* 14. Battery Health Module */}
              <BatteryHealth batteryHealth={batteryHealth} />

              {/* 15. AI Demand Forecast Module */}
              <DemandForecast
                forecast={forecasts[selectedStationId]}
                stationName={currentSelectedStation?.name || "CAMPUS GRID"}
              />
            </div>
          </div>
        )}
      </main>

      {/* 10. Booking Terminal Modal (Section 10) */}
      {bookingStation && (
        <BookingPanel
          station={bookingStation}
          bookingTime={bookingTime}
          setBookingTime={setBookingTime}
          bookingDuration={bookingDuration}
          setBookingDuration={setBookingDuration}
          estimatedRate={estimatedRate}
          estimatedTotal={estimatedTotal}
          isLoading={isLoading}
          txState={txState}
          onClose={() => setBookingStation(null)}
          onSubmitBooking={handleBookSlot}
          formatWeiToEth={formatWeiToEth}
        />
      )}

      {/* Industrial Campus MiniMap */}
      <MiniMap
        stations={stations}
        spotlightStationId={selectedStationId}
        onSelectStation={(id) => setSelectedStationId(id)}
        onBookStation={(st) => {
          setBookingStation(st);
          setBookingTime(new Date(Date.now() + 15 * 60000).toISOString().slice(0, 16));
        }}
        activeSession={activeSession}
      />
    </div>
  );
}
