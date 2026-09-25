# VoltNet Web3 Frontend: Architecture & System Summary

**Application:** VoltNet Smart EV Charging Network  
**Design System:** Brutalist Minimal Industrial Control Terminal (Implemented from [`design.md`](file:///d:/ev%20charging/design.md))  
**Technology Stack:** React 19, Vite, Ethers.js v6, Lucide Icons, Modular Vanilla CSS (Strict Brutalism)  
**Target URL:** `http://localhost:5173`  
**Smart Contract:** [`EVCharging.sol`](file:///d:/ev%20charging/hardhat/contracts/EVCharging.sol) deployed at `0x5FbDB2315678afecb367f032d93F642f64180aa3`

---

## 1. Executive Overview

The **VoltNet Frontend** is an industrial control terminal for smart EV charging microgrids (modeled after VIT Vellore campus). Following [`design.md`](file:///d:/ev%20charging/design.md), all previous glassmorphism, blurs, and soft glowing gradients have been completely replaced with a **Brutalist Minimal Design System**:

- **Physical Infrastructure Feel:** Solid surfaces (`#ffffff`, `#f4f3ee`, `#e9e8e2`), 1px/2px hard black borders (`#111111`), 0px border radii everywhere, and high-contrast brutalist offset shadows (`box-shadow: 4px 4px 0 #111`).
- **Operational Information Hierarchy:**
  - **Level 01 (Critical):** Big typography for delivered power (e.g. `7.38 kW`), availability status, energy consumed, and total settlement bill.
  - **Level 02 (Operational):** Queue depth, dynamic tariffs, ToU markups, and solar renewable ratios.
  - **Level 03 (Supporting):** Monospace technical values, transaction hashes, timestamps, and coordinates (`IBM Plex Mono`).
- **On-Chain Trust & Web3 States:** Explicit MetaMask statuses (`WAITING FOR WALLET`, `TRANSACTION SUBMITTED`, `CONFIRMED`, `FAILED`).
- **AI Operational Signals:** Factual occupancy forecasts, battery state-of-health (SOH%) degradation diagnostics, and anomaly interruption banners.

---

## 2. Component & Modular CSS Architecture (Section 38)

The frontend follows the exact modular structure specified in Section 38 of [`design.md`](file:///d:/ev%20charging/design.md):

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── Header.jsx           # Rigid 64px bar, square Zap logo, text navigation, network & wallet status
│   │   └── StatusStrip.jsx      # Brutalist operations console status strip (stations online, active, queued)
│   │
│   ├── stations/
│   │   ├── StationGrid.jsx      # 7-column rigid dashboard grid for campus stations
│   │   ├── StationCard.jsx      # Dense rectangular station module (power cap, rate, demand, solar, queue)
│   │   ├── StationStatus.jsx    # Accessible text + symbol status badges (● AVAILABLE, ■ CHARGING, ▲ QUEUED)
│   │   └── BookingPanel.jsx     # Machine-style transaction terminal with dynamic rate breakdown & estimation
│   │
│   ├── sessions/
│   │   ├── ActiveSession.jsx    # Live charging centerpiece with big power KPI, elapsed timer, & actions
│   │   ├── Telemetry.jsx        # 4-cell numeric grid, segmented progress bar, & monochrome line chart
│   │   ├── SessionHistory.jsx   # Tabular historical session log with status indicators
│   │   └── Billing.jsx          # Transaction-oriented settlement receipt table & on-chain settlement confirmation
│   │
│   ├── ai/
│   │   ├── BatteryHealth.jsx    # SOH% KPI, brutalist progress bar, trend (-0.8%/100 sessions), diagnostic care
│   │   ├── DemandForecast.jsx   # Factual operational forecast, occupancy %, and congestion warnings
│   │   └── FraudAlert.jsx       # Critical anomaly interruption banner with red border and telemetry inspection
│   │
│   ├── admin/
│   │   ├── StationTable.jsx     # High-density operator comparison table (Section 19 & 24)
│   │   └── PricingConsole.jsx   # Mechanical demand/solar sliders with explicit "APPLY TO CHAIN" lifecycle
│   │
│   └── web3/
│       └── TransactionStatus.jsx# Dedicated Web3 monitor showing action, wallet, network, and block number
│
├── styles/
│   ├── tokens.css               # Exact design tokens: colors (--bg, --ink, --accent), fonts, spaces
│   ├── globals.css              # Strict 0px radius, brutalist buttons, machine inputs, tables, scrollbars
│   ├── layout.css               # Rigid 64px header, status console strip, 12-column dashboard layout (7fr/5fr)
│   ├── components.css           # Styling for all station modules, session modules, terminals, and AI panels
│   └── responsive.css           # Responsive breakpoints for Desktop (≥1200px), Tablet, and Mobile (<768px)
│
├── MiniMap.jsx                  # Docked campus radar mini-map with brutalist high-contrast pin markers
└── MiniMap.css                  # Industrial radar drawer with 2px borders, 0 radius, and offset shadow
```

---

## 3. Role-Based Access Control (RBAC)

1. **EV Driver View:**
   - **Access:** Any standard wallet or visitor.
   - **Priority:** Find stations $\rightarrow$ Check availability $\rightarrow$ Preview dynamic rate $\rightarrow$ Book slot $\rightarrow$ Start charging $\rightarrow$ Monitor live telemetry $\rightarrow$ Pay & settle bill on-chain.
2. **Station Admin / Grid Operator View:**
   - **Access:** Account #0 (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`) or station owner.
   - **Priority:** High-density Fleet Overview Table $\rightarrow$ Mechanical Pricing Console $\rightarrow$ On-Chain Updates $\rightarrow$ Anomaly Alerts.

---

## 4. End-to-End Smart Contract & System Lifecycle

```
[Connect Wallet]
       │
       ▼
[Select Station & Book Slot] ──> calculateRatePerWh() ──> bookSlot() ──> [Booked Slot]
                                                                                │
                                                                                ▼
[Start Charging] <───────────────────────────────────────────────── startCharging()
       │
       ├──> Live Telemetry Stream (V, A, kW, Wh via MQTT / Backend Cache)
       ├──> AI Predictive Monitoring (Fraud Detection & Battery Health)
       │
       ▼ (Target Energy Reached: 250 Wh)
[Session Completed]
       │
       ▼
[Pay Bill] ──> payBill({ value: totalBillWei }) ──> [Funds Settled to Station Owner]
```

---

## 5. Verification & Validation

- **Lint:** `oxlint` reports **0 errors and 0 warnings** across all 20 files.
- **Build:** `npm run build` succeeds cleanly in under 450ms.
- **Dev Server:** Accessible locally on `http://localhost:5173`.
