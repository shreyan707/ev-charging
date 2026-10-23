require("dotenv").config();
// Server configured for local Hardhat node & EV Charging services
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const Station = require("./models/Station");
const Session = require("./models/Session");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/evcharging";

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch(err => console.error("MongoDB connection error:", err));

// Load contract ABI & Address
let deployedContracts = null;
const deployedContractsPath = path.join(__dirname, "../hardhat/deployed_contracts.json");

if (fs.existsSync(deployedContractsPath)) {
  deployedContracts = JSON.parse(fs.readFileSync(deployedContractsPath, "utf8"));
  console.log(`Loaded deployed contract info at: ${deployedContracts.address}`);
} else {
  console.warn("WARNING: deployed_contracts.json not found! Place it in hardhat folder or run deployment script first.");
}

// Setup MQTT client to receive live telemetry
const mqtt = require("mqtt");
let mqttClient = null;

function setupMqttListener() {
  const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://127.0.0.1:1883";
  console.log(`Connecting to MQTT Broker at ${brokerUrl}...`);
  
  mqttClient = mqtt.connect(brokerUrl);

  mqttClient.on("connect", () => {
    console.log("Connected to MQTT Broker successfully");
    mqttClient.subscribe("voltnet/session/+/telemetry", (err) => {
      if (err) console.error("MQTT subscription error:", err);
      else console.log("Subscribed to MQTT topic: voltnet/session/+/telemetry");
    });
  });

  mqttClient.on("error", (err) => {
    console.error("MQTT connection error:", err.message);
  });

  mqttClient.on("message", async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      const { sessionId, current, voltage, power, energyConsumedWh } = payload;
      
      const sId = Number(sessionId);
      if (!sId) return;

      const session = await Session.findOne({ sessionId: sId });
      if (session && session.status === "Charging") {
        session.telemetry.push({
          current: Number(current),
          voltage: Number(voltage),
          power: Number(power),
          energyConsumedWh: Number(energyConsumedWh)
        });
        session.energyConsumedWh = Number(energyConsumedWh);
        await session.save();
        console.log(`[MQTT Telemetry] Logged Session ${sId}: ${energyConsumedWh} Wh`);
      }
    } catch (err) {
      console.error("Error logging MQTT telemetry:", err.message);
    }
  });
}

setupMqttListener();

// Setup ethers provider and listener
let provider;
let contract;

function setupBlockchainListeners() {
  if (!deployedContracts) return;
  
  try {
    provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || "http://127.0.0.1:8545",
      undefined,
      { polling: true, pollingInterval: 2000 }
    );
    contract = new ethers.Contract(deployedContracts.address, deployedContracts.abi, provider);

    // 1. StationRegistered Event Listener
    contract.on("StationRegistered", async (stationId, ownerAddress, name, coordinates) => {
      console.log(`[Blockchain Event] StationRegistered: ID ${stationId}, Name: ${name}`);
      try {
        const id = Number(stationId);
        const existing = await Station.findOne({ stationId: id });
        if (!existing) {
          // Fetch base price directly from contract
          const blockchainStation = await contract.stations(stationId);
          const newStation = new Station({
            stationId: id,
            owner: ownerAddress,
            name: name,
            coordinates: coordinates,
            basePricePerWh: Number(blockchainStation.basePricePerWh),
            demandLevel: Number(blockchainStation.demandLevel),
            renewableRatio: Number(blockchainStation.renewableRatio),
            active: blockchainStation.active,
            status: "available",
            queue: []
          });
          await newStation.save();
          console.log(`Synced Station ID ${id} to MongoDB`);
        }
      } catch (err) {
        console.error("Error syncing StationRegistered event:", err);
      }
    });

    // 2. StationPricingUpdated Event Listener
    contract.on("StationPricingUpdated", async (stationId, demandLevel, renewableRatio) => {
      console.log(`[Blockchain Event] StationPricingUpdated: ID ${stationId}`);
      try {
        const id = Number(stationId);
        await Station.findOneAndUpdate(
          { stationId: id },
          { 
            demandLevel: Number(demandLevel), 
            renewableRatio: Number(renewableRatio) 
          }
        );
        console.log(`Updated pricing parameters in MongoDB for Station ID ${id}`);
      } catch (err) {
        console.error("Error syncing StationPricingUpdated event:", err);
      }
    });

    // 3. SlotBooked Event Listener
    contract.on("SlotBooked", async (sessionId, stationId, user, startTime, duration) => {
      console.log(`[Blockchain Event] SlotBooked: Session ${sessionId}, Station ${stationId}`);
      try {
        const sId = Number(sessionId);
        const statId = Number(stationId);
        const start = new Date(Number(startTime) * 1000);
        const dur = Number(duration);

        // Save session using upsert to avoid race conditions with out-of-order events
        await Session.findOneAndUpdate(
          { sessionId: sId },
          {
            $set: {
              userAddress: user,
              stationId: statId,
              startTime: start,
              duration: dur
            },
            $setOnInsert: {
              status: "Booked"
            }
          },
          { upsert: true, new: true }
        );

        // Add to station queue
        await Station.findOneAndUpdate(
          { stationId: statId },
          { 
            $push: { 
              queue: { 
                userAddress: user, 
                sessionId: sId, 
                startTime: start, 
                duration: dur 
              } 
            } 
          }
        );

        // Recalculate wait time estimation
        await updateWaitEstimate(statId);
        console.log(`Synced SlotBooked for Session ID ${sId}`);
      } catch (err) {
        console.error("Error syncing SlotBooked event:", err);
      }
    });

    // 4. ChargingStarted Event Listener
    contract.on("ChargingStarted", async (sessionId, startTimestamp) => {
      console.log(`[Blockchain Event] ChargingStarted: Session ${sessionId}`);
      try {
        const sId = Number(sessionId);
        const session = await Session.findOneAndUpdate(
          { sessionId: sId },
          { 
            $set: {
              status: "Charging", 
              startTimestamp: new Date(Number(startTimestamp) * 1000) 
            }
          },
          { upsert: true, new: true }
        );

        if (session) {
          await Station.findOneAndUpdate(
            { stationId: session.stationId },
            { status: "occupied" }
          );
        }
        console.log(`Synced ChargingStarted for Session ID ${sId}`);
      } catch (err) {
        console.error("Error syncing ChargingStarted event:", err);
      }
    });

    // 5. ChargingEnded Event Listener
    contract.on("ChargingEnded", async (sessionId, endTimestamp, energyConsumedWh, totalBill) => {
      console.log(`[Blockchain Event] ChargingEnded: Session ${sessionId}`);
      try {
        const sId = Number(sessionId);
        const session = await Session.findOneAndUpdate(
          { sessionId: sId },
          {
            status: "Completed",
            endTimestamp: new Date(Number(endTimestamp) * 1000),
            energyConsumedWh: Number(energyConsumedWh),
            totalBill: totalBill.toString()
          },
          { new: true }
        );

        if (session) {
          // Remove from station queue
          await Station.findOneAndUpdate(
            { stationId: session.stationId },
            { 
              status: "available",
              $pull: { queue: { sessionId: sId } } 
            }
          );
          await updateWaitEstimate(session.stationId);

          // Asynchronously trigger the AI fraud detection microservice
          triggerAiFraudDetection(session);
        }
        console.log(`Synced ChargingEnded for Session ID ${sId}`);
      } catch (err) {
        console.error("Error syncing ChargingEnded event:", err);
      }
    });

// Helper function to call the AI fraud detection FastAPI service
async function triggerAiFraudDetection(session) {
  try {
    const duration = session.startTimestamp && session.endTimestamp 
      ? Math.floor((session.endTimestamp - session.startTimestamp) / 1000)
      : 0;

    const payload = {
      sessionId: session.sessionId,
      durationSeconds: duration,
      telemetry: session.telemetry.map(t => ({
        current: t.current,
        voltage: t.voltage,
        power: t.power,
        energyConsumedWh: t.energyConsumedWh
      }))
    };

    console.log(`Triggering AI fraud check for Session ${session.sessionId}...`);
    const response = await fetch("http://127.0.0.1:8000/detect-fraud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`[AI Fraud Result] Session ${session.sessionId}: flag=${result.fraud_flag}, reason="${result.reason}"`);
      
      await Session.findOneAndUpdate(
        { sessionId: session.sessionId },
        { 
          fraudFlag: result.fraud_flag, 
          fraudReason: result.reason 
        }
      );
    } else {
      console.error(`AI fraud detection API returned error status: ${response.status}`);
    }
  } catch (err) {
    console.error("Error communicating with AI fraud service:", err.message);
  }
}

    // 6. BillPaid Event Listener
    contract.on("BillPaid", async (sessionId, user, amountPaid) => {
      console.log(`[Blockchain Event] BillPaid: Session ${sessionId}`);
      try {
        const sId = Number(sessionId);
        await Session.findOneAndUpdate(
          { sessionId: sId },
          { status: "Paid" }
        );
        console.log(`Synced BillPaid for Session ${sId}`);
      } catch (err) {
        console.error("Error syncing BillPaid event:", err);
      }
    });

    // 7. SessionCancelled Event Listener
    contract.on("SessionCancelled", async (sessionId) => {
      console.log(`[Blockchain Event] SessionCancelled: Session ${sessionId}`);
      try {
        const sId = Number(sessionId);
        const session = await Session.findOneAndUpdate(
          { sessionId: sId },
          { status: "Cancelled" },
          { new: true }
        );

        if (session) {
          // Remove from station queue
          await Station.findOneAndUpdate(
            { stationId: session.stationId },
            { 
              $pull: { queue: { sessionId: sId } } 
            }
          );
          await updateWaitEstimate(session.stationId);
        }
        console.log(`Synced SessionCancelled for Session ID ${sId}`);
      } catch (err) {
        console.error("Error syncing SessionCancelled event:", err);
      }
    });

  } catch (err) {
    console.error("Error initializing blockchain listeners:", err.message);
  }
}

// Dynamic wait time estimator helper
async function updateWaitEstimate(stationId) {
  try {
    const station = await Station.findOne({ stationId });
    if (!station) return;

    let estimate = 0;
    // If occupied, add standard 30 minutes for current charger + sum up booked durations in queue
    if (station.status === "occupied") {
      estimate += 30;
    }
    
    // Sum duration of all bookings in the queue
    if (station.queue && station.queue.length > 0) {
      station.queue.forEach(item => {
        estimate += Math.ceil(item.duration / 60);
      });
    }

    station.waitEstimateMinutes = estimate;
    await station.save();
  } catch (err) {
    console.error("Error calculating wait estimate:", err);
  }
}

// Automatic reconciliation of on-chain sessions to MongoDB
const STATUS_MAP = ["Booked", "Charging", "Completed", "Paid", "Cancelled"];

async function syncSessionsFromBlockchain() {
  if (!contract) return;
  try {
    const count = await contract.sessionCount();
    const total = Number(count);
    for (let id = 1; id <= total; id++) {
      const s = await contract.sessions(id);
      const userAddr = s.user;
      if (!userAddr || userAddr === ethers.ZeroAddress) continue;

      const statId = Number(s.stationId);
      const startTime = new Date(Number(s.startTime) * 1000);
      const duration = Number(s.duration);
      const statusCode = Number(s.status);
      const statusStr = STATUS_MAP[statusCode] || "Booked";

      const existing = await Session.findOne({ sessionId: id });
      if (!existing) {
        await Session.create({
          sessionId: id,
          userAddress: userAddr,
          stationId: statId,
          startTime: startTime,
          duration: duration,
          status: statusStr,
          energyConsumedWh: Number(s.energyConsumedWh || 0),
          totalBill: s.totalBill ? s.totalBill.toString() : "0"
        });

        if (statusStr === "Booked") {
          await Station.findOneAndUpdate(
            { stationId: statId },
            {
              $push: {
                queue: {
                  userAddress: userAddr,
                  sessionId: id,
                  startTime: startTime,
                  duration: duration
                }
              }
            }
          );
          await updateWaitEstimate(statId);
        }
        console.log(`[Auto-Sync] Restored session ${id} (${statusStr}) from blockchain into MongoDB.`);
      } else {
        if (existing.status !== statusStr) {
          existing.status = statusStr;
          if (s.totalBill) existing.totalBill = s.totalBill.toString();
          await existing.save();
        }
      }
    }
  } catch (err) {
    console.error("Error syncing sessions from blockchain:", err.message);
  }
}

// Start listeners and sync past sessions
setupBlockchainListeners();
syncSessionsFromBlockchain();

// -------------------------------------------------------------
// EXPRESS ROUTES
// -------------------------------------------------------------

// Basic sanity check route
app.get("/", (req, res) => {
  res.json({ message: "EV Charging Network API is running" });
});

// Sync on-demand route
app.get("/api/sessions/sync", async (req, res) => {
  await syncSessionsFromBlockchain();
  const all = await Session.find({});
  res.json({ message: "Synced with blockchain", sessions: all });
});

// GET all stations
app.get("/api/stations", async (req, res) => {
  try {
    const stations = await Station.find({});
    res.json(stations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single station details
app.get("/api/stations/:id", async (req, res) => {
  try {
    const station = await Station.findOne({ stationId: Number(req.params.id) });
    if (!station) return res.status(404).json({ message: "Station not found" });
    res.json(station);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET session history for a specific user
app.get("/api/sessions/user/:userAddress", async (req, res) => {
  try {
    await syncSessionsFromBlockchain();
    const userAddress = req.params.userAddress.toLowerCase();
    // Case-insensitive search on userAddress
    const sessions = await Session.find({ 
      userAddress: { $regex: new RegExp(`^${userAddress}$`, "i") } 
    }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET active session details (including real-time telemetry logs)
app.get("/api/sessions/active/:sessionId", async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: Number(req.params.sessionId) });
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST to insert dynamic telemetry payload (from IoT simulator)
app.post("/api/sessions/telemetry", async (req, res) => {
  const { sessionId, current, voltage, power, energyConsumedWh } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    const session = await Session.findOne({ sessionId: Number(sessionId) });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.status !== "Charging") {
      return res.status(400).json({ error: "Session is not in Charging state" });
    }

    // Append telemetry reading
    session.telemetry.push({
      current: Number(current),
      voltage: Number(voltage),
      power: Number(power),
      energyConsumedWh: Number(energyConsumedWh)
    });

    // Update cumulative energy
    session.energyConsumedWh = Number(energyConsumedWh);
    await session.save();

    res.json({ message: "Telemetry logged successfully", session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all active charging sessions (called by IoT simulator to discover what stations are charging)
app.get("/api/sessions/charging", async (req, res) => {
  try {
    const activeSessions = await Session.find({ status: "Charging" });
    res.json(activeSessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST endpoint to trigger the backend submitting the endCharging blockchain transaction.
// (Called by the IoT simulator when charging finishes)
app.post("/api/sessions/end", async (req, res) => {
  const { sessionId, energyConsumedWh } = req.body;
  if (!sessionId || energyConsumedWh === undefined) {
    return res.status(400).json({ error: "sessionId and energyConsumedWh are required" });
  }

  try {
    const session = await Session.findOne({ sessionId: Number(sessionId) });
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.status !== "Charging") return res.status(400).json({ error: "Session not in Charging state" });

    // 1. Submit transaction to smart contract using operator signer
    if (contract && process.env.OPERATOR_PRIVATE_KEY) {
      const providerWithSigner = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
      const signer = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, providerWithSigner);
      const contractWithSigner = new ethers.Contract(deployedContracts.address, deployedContracts.abi, signer);

      console.log(`Submitting endCharging tx on-chain for Session ID ${sessionId} with energy ${energyConsumedWh} Wh...`);
      const tx = await contractWithSigner.endCharging(Number(sessionId), Number(energyConsumedWh));
      await tx.wait();
      console.log(`On-chain endCharging tx confirmed: ${tx.hash}`);

      // The blockchain event listener will automatically catch the ChargingEnded event 
      // and update MongoDB. We can return success.
      return res.json({ message: "Charging session ended and submitted to blockchain successfully", txHash: tx.hash });
    } else {
      console.warn("OPERATOR_PRIVATE_KEY or contract config missing. Simulating database update only.");
      // Fallback: update database directly (useful for running offline without hardhat)
      session.status = "Completed";
      session.endTimestamp = new Date();
      session.energyConsumedWh = Number(energyConsumedWh);
      
      // Calculate dynamic price mock offline if contract is offline
      const station = await Station.findOne({ stationId: session.stationId });
      const rate = station ? station.basePricePerWh : 1000000000;
      session.totalBill = (Number(energyConsumedWh) * rate).toString();
      await session.save();

      await Station.findOneAndUpdate(
        { stationId: session.stationId },
        { status: "available", $pull: { queue: { sessionId: Number(sessionId) } } }
      );
      await updateWaitEstimate(session.stationId);

      return res.json({ message: "Charging session ended offline (no blockchain connection)", session });
    }
  } catch (err) {
    console.error("Error ending charging session:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET demand prediction from AI microservice
app.get("/api/ai/forecast/:stationId", async (req, res) => {
  try {
    const stationId = Number(req.params.stationId);
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = (now.getDay() + 6) % 7; // Convert JS 0-6 (Sun-Sat) to Python 0-6 (Mon-Sun)

    const response = await fetch(
      `http://127.0.0.1:8000/predict-demand?station_id=${stationId}&hour=${hour}&day_of_week=${dayOfWeek}`
    );
    
    if (response.ok) {
      const forecast = await response.json();
      res.json(forecast);
    } else {
      res.status(500).json({ error: "AI service demand prediction failed" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET battery health analysis for a specific user based on historical charge cycles
app.get("/api/ai/battery-health/:userAddress", async (req, res) => {
  try {
    const userAddress = req.params.userAddress.toLowerCase();
    
    // Find all completed/paid sessions for this user
    const historicalSessions = await Session.find({
      userAddress: { $regex: new RegExp(`^${userAddress}$`, "i") },
      status: { $in: ["Completed", "Paid"] }
    }).sort({ createdAt: 1 }); // chronologically

    if (historicalSessions.length < 2) {
      return res.json({
        battery_health: 100.0,
        status: "Healthy (Optimal)",
        advice: "Complete at least 2 charging sessions to enable automated health degradation tracking."
      });
    }

    // Format for AI service
    const chargingHistory = historicalSessions.map(s => {
      const start = s.startTimestamp ? new Date(s.startTimestamp) : null;
      const end = s.endTimestamp ? new Date(s.endTimestamp) : null;
      const durationMin = start && end ? Math.max(1, (end - start) / 60000) : 30; // default 30 min if error
      
      return {
        sessionId: s.sessionId,
        durationMinutes: Number(durationMin),
        energyConsumedWh: Number(s.energyConsumedWh)
      };
    });

    const response = await fetch("http://127.0.0.1:8000/battery-health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chargingHistory })
    });

    if (response.ok) {
      const healthAnalysis = await response.json();
      res.json(healthAnalysis);
    } else {
      res.status(500).json({ error: "AI service battery health estimation failed" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET 1-step ahead network aggregate power forecast from AI microservice
app.get("/api/ai/network-forecast", async (req, res) => {
  try {
    const response = await fetch("http://127.0.0.1:8000/forecast-network");
    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      const err = await response.json().catch(() => ({}));
      res.status(response.status).json(err);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST screen session plausibility (Rule 2 statistical screen)
app.post("/api/ai/screen-session", async (req, res) => {
  try {
    const response = await fetch("http://127.0.0.1:8000/screen-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});
