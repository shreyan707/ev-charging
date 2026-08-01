const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const API_BASE_URL = "http://localhost:5000/api";

async function runSimulation() {
  console.log("Starting End-to-End Blockchain & IoT Simulation Flow...");

  // 1. Connect to local provider and load contract info
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Hardhat Account #1 will act as our EV User
  const userPrivateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const userWallet = new ethers.Wallet(userPrivateKey, provider);

  const deployedContractsPath = path.join(__dirname, "../../hardhat/deployed_contracts.json");
  if (!fs.existsSync(deployedContractsPath)) {
    console.error("Error: deployed_contracts.json not found. Deploy contract first.");
    return;
  }
  const deployedContracts = JSON.parse(fs.readFileSync(deployedContractsPath, "utf8"));
  
  const contract = new ethers.Contract(deployedContracts.address, deployedContracts.abi, userWallet);

  // 2. Book a charging slot for Station ID 2
  const stationId = 2;
  const startTime = Math.floor(Date.now() / 1000) + 10; // start 10 seconds from now
  const duration = 1800; // 30 minutes
  
  console.log(`\nStep 1: Booking a slot on Station #${stationId} for user ${userWallet.address}...`);
  const bookTx = await contract.bookSlot(stationId, startTime, duration);
  const receipt = await bookTx.wait();
  
  // Find SlotBooked event to extract the sessionId
  const event = receipt.logs
    .map(log => {
      try { return contract.interface.parseLog(log); } catch (e) { return null; }
    })
    .find(parsedLog => parsedLog && parsedLog.name === "SlotBooked");

  if (!event) {
    console.error("Failed to parse SlotBooked event.");
    return;
  }

  const sessionId = Number(event.args.sessionId);
  console.log(`Booking confirmed! Session ID allocated: ${sessionId}`);

  // 3. Start Charging on-chain
  console.log(`\nStep 2: Starting charging on-chain for Session ID ${sessionId}...`);
  // Wait 2 seconds to make sure booking timestamp is within range
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const startTx = await contract.startCharging(sessionId);
  await startTx.wait();
  console.log("Charging started successfully on-chain!");
  console.log("The Python IoT simulator should now detect this active session and begin publishing telemetry...");

  // 4. Poll backend session status until Completed
  console.log("\nStep 3: Monitoring IoT telemetry feed and charging progress...");
  let isCompleted = false;
  let sessionData = null;

  for (let attempt = 1; attempt <= 60; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/active/${sessionId}`);
      sessionData = await response.json();
      
      console.log(`[Status Poll] Status: ${sessionData.status} | Consumed: ${sessionData.energyConsumedWh} Wh | Telemetry logs count: ${sessionData.telemetry ? sessionData.telemetry.length : 0}`);
      
      if (sessionData.status === "Completed") {
        isCompleted = true;
        break;
      }
    } catch (e) {
      console.log(`Polling status error: ${e.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 3000)); // poll every 3 seconds (aligns with simulator loop)
  }

  if (!isCompleted) {
    console.error("\nError: Simulator did not complete charging in time. Test timed out.");
    return;
  }

  console.log(`\nCharging Completed! Total Energy: ${sessionData.energyConsumedWh} Wh. Total Bill: ${sessionData.totalBill} Wei`);

  // 5. Pay the bill on-chain
  console.log(`\nStep 4: Submitting bill payment for Session ID ${sessionId}...`);
  const payTx = await contract.payBill(sessionId, {
    value: sessionData.totalBill
  });
  await payTx.wait();
  console.log("Payment confirmed on-chain! Session completed and fully paid.");

  console.log("\n=======================================================");
  console.log("SUCCESS: End-to-End integration flow verified successfully!");
  console.log("=======================================================");
}

runSimulation().catch(console.error);
