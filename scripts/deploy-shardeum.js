/**
 * Deploy EcoLink Contracts to Shardeum Sphinx Testnet
 * Modified from deploy-direct.js for Shardeum
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// ANSI colors for console
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

async function main() {
  console.log(`\n${colors.blue}🔷 Deploying to Shardeum EVM Mezame Testnet...${colors.reset}\n`);
  
  // Connect to Shardeum Mezame
  const provider = new ethers.JsonRpcProvider("https://api-mezame.shardeum.org");
  const privateKey = process.env.PRIVATE_KEY.startsWith("0x") 
    ? process.env.PRIVATE_KEY 
    : `0x${process.env.PRIVATE_KEY}`;
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`${colors.green}✅ Deployer:${colors.reset} ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`${colors.green}✅ Balance:${colors.reset} ${ethers.formatEther(balance)} SHM\n`);

  if (balance === 0n) {
    console.log(`${colors.yellow}⚠️  No SHM tokens! Get some from:${colors.reset}`);
    console.log(`   https://faucet-sphinx.shardeum.org\n`);
    process.exit(1);
  }

  // Read compiled artifacts
  const artifactsPath = path.join(__dirname, "../artifacts/contracts");
  
  async function deployContract(name, args = []) {
    const artifact = JSON.parse(
      fs.readFileSync(path.join(artifactsPath, `${name}.sol/${name}.json`), "utf8")
    );
    
    console.log(`${colors.blue}→${colors.reset} Deploying ${name}...`);
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const contract = await factory.deploy(...args);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    console.log(`${colors.green}✅ ${name}:${colors.reset} ${address}\n`);
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

    console.log(`\n${colors.green}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.green}🎉 ALL CONTRACTS DEPLOYED TO SHARDEUM!${colors.reset}`);
    console.log(`${colors.green}${'='.repeat(60)}${colors.reset}\n`);
    console.log(`SupplyChainBatch: ${batch.address}`);
    console.log(`GoodwillToken:    ${goodwill.address}`);
    console.log(`ESGSoulbound:     ${esg.address}`);
    console.log(`DonationVerifier: ${verifier.address}`);
    console.log(`ExpiryKeeper:     ${keeper.address}`);
    console.log(`${colors.green}${'='.repeat(60)}${colors.reset}\n`);
    
    // Save addresses
    const deploymentDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }
    
    const addresses = {
      network: "shardeum-mezame",
      chainId: 8119,
      deployedAt: new Date().toISOString(),
      contracts: {
        SupplyChainBatch: batch.address,
        GoodwillToken: goodwill.address,
        ESGSoulbound: esg.address,
        DonationVerifier: verifier.address,
        ExpiryKeeper: keeper.address
      }
    };
    
    fs.writeFileSync(
      path.join(deploymentDir, "shardeum.json"),
      JSON.stringify(addresses, null, 2)
    );
    console.log(`${colors.green}📁 Addresses saved to deployments/shardeum.json${colors.reset}\n`);
    
    console.log(`${colors.blue}🔍 View on Explorer:${colors.reset}`);
    console.log(`   https://explorer-sphinx.shardeum.org/address/${batch.address}\n`);
    
    console.log(`${colors.yellow}💡 Next Steps:${colors.reset}`);
    console.log(`   1. Update .env with these addresses`);
    console.log(`   2. Run: node scripts/test-blockchain-flow.js`);
    console.log(`   3. Compare gas costs with Sepolia! 🚀\n`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Deployment failed:${colors.reset}`, error.message);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
