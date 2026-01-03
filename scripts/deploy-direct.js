// Direct deployment script using ethers.js v6
// Bypasses Hardhat compatibility issues with Node.js v22

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🚀 Direct Deployment to Sepolia...\n");

  // Connect to Sepolia
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  const privateKey = process.env.PRIVATE_KEY.startsWith("0x") ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`;
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deployer:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  // Read compiled artifacts
  const artifactsPath = path.join(__dirname, "../artifacts/contracts");
  
  async function deployContract(name, args = []) {
    const artifact = JSON.parse(
      fs.readFileSync(path.join(artifactsPath, `${name}.sol/${name}.json`), "utf8")
    );
    
    console.log(`Deploying ${name}...`);
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const contract = await factory.deploy(...args);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`✅ ${name}: ${address}\n`);
    return { contract, address };
  }

  try {
    // 1. Deploy SupplyChainBatch
    const batch = await deployContract("SupplyChainBatch");
    
    // 2. Deploy GoodwillToken (ERC-20)
    const goodwill = await deployContract("GoodwillToken");
    
    // 3. Deploy ESGSoulbound
    const esg = await deployContract("ESGSoulbound");
    
    // 4. Deploy DonationVerifier
    const verifier = await deployContract("DonationVerifier", [
      batch.address,
      goodwill.address,
      esg.address
    ]);
    
    // 5. Deploy ExpiryKeeper
    const keeper = await deployContract("ExpiryKeeper", [batch.address]);

    console.log("\n🎉 All contracts deployed!\n");
    console.log("=".repeat(50));
    console.log("CONTRACT ADDRESSES:");
    console.log("=".repeat(50));
    console.log(`SupplyChainBatch: ${batch.address}`);
    console.log(`GoodwillToken:    ${goodwill.address}`);
    console.log(`ESGSoulbound:     ${esg.address}`);
    console.log(`DonationVerifier: ${verifier.address}`);
    console.log(`ExpiryKeeper:     ${keeper.address}`);
    console.log("=".repeat(50));
    
    // Save addresses
    const addresses = {
      network: "sepolia",
      chainId: 11155111,
      contracts: {
        SupplyChainBatch: batch.address,
        GoodwillToken: goodwill.address,
        ESGSoulbound: esg.address,
        DonationVerifier: verifier.address,
        ExpiryKeeper: keeper.address
      }
    };
    
    fs.writeFileSync(
      path.join(__dirname, "../deployments/sepolia.json"),
      JSON.stringify(addresses, null, 2)
    );
    console.log("\n📁 Addresses saved to deployments/sepolia.json");
    
  } catch (error) {
    console.error("Deployment failed:", error.message);
    throw error;
  }
}

main().catch(console.error);
