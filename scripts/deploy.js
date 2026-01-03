const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying EcoLink Supply Chain Contracts...\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
  console.log("Network:", hre.network.name);
  console.log("");

  // ============ DEPLOY CONTRACTS ============

  // 1. Deploy SupplyChainBatch (ERC-1155)
  console.log("1️⃣ Deploying SupplyChainBatch (ERC-1155)...");
  const SupplyChainBatch = await hre.ethers.getContractFactory("SupplyChainBatch");
  const batchContract = await SupplyChainBatch.deploy();
  await batchContract.waitForDeployment();
  const batchAddress = await batchContract.getAddress();
  console.log("   ✅ SupplyChainBatch deployed to:", batchAddress);

  // 2. Deploy GoodwillToken (ERC-20)
  console.log("2️⃣ Deploying GoodwillToken (ERC-20)...");
  const GoodwillToken = await hre.ethers.getContractFactory("GoodwillToken");
  const goodwillToken = await GoodwillToken.deploy();
  await goodwillToken.waitForDeployment();
  const goodwillAddress = await goodwillToken.getAddress();
  console.log("   ✅ GoodwillToken deployed to:", goodwillAddress);

  // 3. Deploy ESGSoulbound (SBT)
  console.log("3️⃣ Deploying ESGSoulbound (SBT)...");
  const ESGSoulbound = await hre.ethers.getContractFactory("ESGSoulbound");
  const esgContract = await ESGSoulbound.deploy();
  await esgContract.waitForDeployment();
  const esgAddress = await esgContract.getAddress();
  console.log("   ✅ ESGSoulbound deployed to:", esgAddress);

  // 4. Deploy DonationVerifier
  console.log("4️⃣ Deploying DonationVerifier (Double Handshake)...");
  const DonationVerifier = await hre.ethers.getContractFactory("DonationVerifier");
  const verifier = await DonationVerifier.deploy(batchAddress, goodwillAddress, esgAddress);
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("   ✅ DonationVerifier deployed to:", verifierAddress);

  // 5. Deploy ExpiryKeeper
  console.log("5️⃣ Deploying ExpiryKeeper (Chainlink Automation)...");
  const ExpiryKeeper = await hre.ethers.getContractFactory("ExpiryKeeper");
  const keeper = await ExpiryKeeper.deploy(batchAddress);
  await keeper.waitForDeployment();
  const keeperAddress = await keeper.getAddress();
  console.log("   ✅ ExpiryKeeper deployed to:", keeperAddress);

  // ============ CONFIGURE PERMISSIONS ============
  
  console.log("\n🔐 Configuring permissions...");

  // Set DonationVerifier as authorized minter for GoodwillToken
  console.log("   Setting DonationVerifier as token minter...");
  await goodwillToken.setMinter(verifierAddress, true);
  
  // Set DonationVerifier as ESG certificate issuer
  console.log("   Setting DonationVerifier as ESG issuer...");
  await esgContract.setIssuer(verifierAddress, true);
  
  // Set ExpiryKeeper as authorized oracle
  console.log("   Setting ExpiryKeeper as oracle...");
  await batchContract.setOracle(keeperAddress, true);

  console.log("   ✅ Permissions configured!");

  // ============ SUMMARY ============
  
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("");
  console.log("Network:", hre.network.name);
  console.log("");
  console.log("Contract Addresses:");
  console.log("-------------------");
  console.log("SupplyChainBatch: ", batchAddress);
  console.log("GoodwillToken:    ", goodwillAddress);
  console.log("ESGSoulbound:     ", esgAddress);
  console.log("DonationVerifier: ", verifierAddress);
  console.log("ExpiryKeeper:     ", keeperAddress);
  console.log("");
  console.log("🎉 Deployment complete!");
  console.log("");
  
  // Save deployment addresses to file
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      SupplyChainBatch: batchAddress,
      GoodwillToken: goodwillAddress,
      ESGSoulbound: esgAddress,
      DonationVerifier: verifierAddress,
      ExpiryKeeper: keeperAddress,
    },
  };
  
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const filename = `${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`📄 Deployment info saved to: deployments/${filename}`);
  
  // Also save as latest for easy access
  fs.writeFileSync(
    path.join(deploymentsDir, `${hre.network.name}-latest.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // ============ VERIFICATION INSTRUCTIONS ============
  
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n📝 To verify contracts on explorer:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${batchAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${goodwillAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${esgAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${verifierAddress} ${batchAddress} ${goodwillAddress} ${esgAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${keeperAddress} ${batchAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
