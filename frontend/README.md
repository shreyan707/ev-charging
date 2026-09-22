# VoltNet Web3 Frontend

This is the decentralized frontend dashboard for the **VoltNet** Smart EV Charging Network, built with React 19, Vite, and Ethers.js v6.

For the full architectural breakdown, component guides, and lifecycle workflows, see the complete summary:
👉 **[FRONTEND_SUMMARY.md](file:///d:/ev%20charging/frontend/FRONTEND_SUMMARY.md)**

---

## Quick Start

```powershell
# Install dependencies
npm install

# Start Vite development server
npm run dev
# Dashboard opens at http://localhost:5173

# Build for production
npm run build
```

## Key Features
* **Role-Based Access Control (RBAC):** Automatic separation between Station Admins (Account #0) and EV Drivers (Account #1).
* **Live IoT Telemetry:** Real-time gauges for voltage, current, kilowatts, and cumulative energy streamed via MQTT.
* **On-Chain Settlement:** Ethers.js v6 integration for slot bookings and peer-to-peer bill settlement.
* **AI Integration:** Live demand prediction badges and battery health (SOH%) degradation tracking.

