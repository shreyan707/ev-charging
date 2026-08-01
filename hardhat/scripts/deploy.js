const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying EVCharging contract...");

  const EVChargingFactory = await hre.ethers.getContractFactory("EVCharging");
  const evCharging = await EVChargingFactory.deploy();
  await evCharging.waitForDeployment();

  const address = await evCharging.getAddress();
  console.log(`EVCharging contract successfully deployed to: ${address}`);

  // Path to contract artifact to extract the ABI
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/EVCharging.sol/EVCharging.json"
  );
  
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const deploymentInfo = {
      address: address,
      abi: artifact.abi,
    };

    const outputPath = path.join(__dirname, "../deployed_contracts.json");
    fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2), "utf8");
    console.log(`Deployment info saved to ${outputPath}`);
  } else {
    console.log("Artifact file not found. Make sure to compile first.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
