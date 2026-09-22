require("dotenv").config();
const mongoose = require("mongoose");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const Station = require("../models/Station");
const Session = require("../models/Session");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/evcharging";

const mockStations = [
  { name: "VIT Main Gate Charger", coords: "12.9682,79.1561", basePrice: 1000000000n, demand: 20, renewable: 10 },
  { name: "SJT Building Hub", coords: "12.9710,79.1637", basePrice: 1200000000n, demand: 40, renewable: 0 },
  { name: "TT Building Parking", coords: "12.9702,79.1595", basePrice: 1100000000n, demand: 30, renewable: 20 },
  { name: "G.D. Naidu Block Charger", coords: "12.9691,79.1559", basePrice: 900000000n, demand: 10, renewable: 30 },
  { name: "SMV Block Solar Station", coords: "12.9723,79.1601", basePrice: 1000000000n, demand: 15, renewable: 90 },
  { name: "MB Block Charging Point", coords: "12.9695,79.1615", basePrice: 1100000000n, demand: 25, renewable: 15 },
  { name: "Mens Hostel Q-Block Hub", coords: "12.9750,79.1585", basePrice: 1300000000n, demand: 60, renewable: 5 },
  { name: "Ladies Hostel Annex Charger", coords: "12.9780,79.1560", basePrice: 1300000000n, demand: 50, renewable: 10 }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB.");

  // Clear existing database collections
  await Station.deleteMany({});
  await Session.deleteMany({});
  console.log("Cleared old data from MongoDB.");

  // Load contract ABI & Address
  let deployedContracts = null;
  const deployedContractsPath = path.join(__dirname, "../../hardhat/deployed_contracts.json");

  if (fs.existsSync(deployedContractsPath)) {
    deployedContracts = JSON.parse(fs.readFileSync(deployedContractsPath, "utf8"));
  }

  if (deployedContracts) {
    try {
      console.log("Connecting to Blockchain...");
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");

      // Use local private key of Hardhat Account #0 as the default operator
      const privateKey = process.env.OPERATOR_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(deployedContracts.address, deployedContracts.abi, wallet);

      console.log("Registering stations on-chain and syncing to MongoDB...");
      let nonce = await provider.getTransactionCount(wallet.address);
      const isLocal = (process.env.RPC_URL || "").includes("127.0.0.1") || (process.env.RPC_URL || "").includes("localhost") || !process.env.RPC_URL;
      const delay = isLocal ? 300 : 4000;

      for (let i = 0; i < mockStations.length; i++) {
        const item = mockStations[i];
        console.log(`Registering ${item.name} on-chain with nonce ${nonce}...`);
        const tx = await contract.registerStation(item.name, item.coords, item.basePrice, { nonce: nonce++ });
        const receipt = await tx.wait();

        await sleep(delay);

        // Find StationRegistered event to get the allocated station ID
        const event = receipt.logs
          .map(log => {
            try { return contract.interface.parseLog(log); } catch (e) { return null; }
          })
          .find(parsedLog => parsedLog && parsedLog.name === "StationRegistered");

        const stationId = event ? Number(event.args.stationId) : (i + 1);
        console.log(`Station ${item.name} registered on-chain with ID ${stationId}`);

        // Set dynamic pricing parameters
        console.log(`Updating pricing parameters for station ${stationId} (demand: ${item.demand}%, renewable: ${item.renewable}%) with nonce ${nonce}...`);
        const priceTx = await contract.updateStationPricing(stationId, item.demand, item.renewable, { nonce: nonce++ });
        await priceTx.wait();

        await sleep(delay);

        // Upsert directly into MongoDB so frontend immediately has data
        await Station.findOneAndUpdate(
          { stationId: stationId },
          {
            stationId: stationId,
            owner: wallet.address,
            name: item.name,
            coordinates: item.coords,
            basePricePerWh: Number(item.basePrice),
            demandLevel: item.demand,
            renewableRatio: item.renewable,
            active: true,
            status: "available",
            queue: [],
            waitEstimateMinutes: 0
          },
          { upsert: true, new: true }
        );
        console.log(`Synced ${item.name} (ID: ${stationId}) into MongoDB.`);
      }

      console.log("Blockchain and MongoDB seeding complete.");
      await sleep(1000);

    } catch (err) {
      console.error("Blockchain seeding failed. Falling back to MongoDB direct injection.", err.message);
      // Fallback
      await seedDirectlyToMongo();
    }
  } else {
    console.warn("No deployed_contracts.json found. Seeding directly to MongoDB.");
    await seedDirectlyToMongo();
  }

  console.log("Seeding complete. Current MongoDB Stations:");
  const stations = await Station.find({});
  console.log(stations.map(s => `${s.stationId}: ${s.name} (${s.coordinates}) - status: ${s.status}`));

  await mongoose.disconnect();
}

async function seedDirectlyToMongo() {
  console.log("Seeding directly to MongoDB...");
  const stationsToSave = mockStations.map((item, idx) => ({
    stationId: idx + 1,
    owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    name: item.name,
    coordinates: item.coords,
    basePricePerWh: Number(item.basePrice),
    demandLevel: item.demand,
    renewableRatio: item.renewable,
    active: true,
    status: "available",
    queue: [],
    waitEstimateMinutes: 0
  }));

  await Station.insertMany(stationsToSave);
  console.log("MongoDB direct injection complete.");
}

seed().catch(err => {
  console.error("Seeding error:", err);
  process.exit(1);
});
