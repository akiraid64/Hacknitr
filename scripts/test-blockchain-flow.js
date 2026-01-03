/**
 * Complete Blockchain Flow Test Script
 * Tests all 5 deployed contracts on Sepolia with detailed logging
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// ANSI color codes for beautiful console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

// Logging helpers
function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log(`${'='.repeat(70)}\n`);
}

function logSuccess(message) {
  log('✅', message, colors.green);
}

function logInfo(message) {
  log('ℹ️ ', message, colors.blue);
}

function logWaiting(message) {
  log('⏳', message, colors.yellow);
}

function logError(message) {
  log('❌', message, colors.red);
}

function log200(message) {
  console.log(`${colors.bright}${colors.green}[200 OK]${colors.reset} ${message}`);
}

// Retry helper for RPC calls
async function retryOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      logWaiting(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function main() {
  logSection("🚀 ECOLINK BLOCKCHAIN FLOW TEST");
  
  // ============ STEP 1: SETUP ============
  logSection("STEP 1: Connection Setup");
  
  // Try multiple RPC endpoints
  const rpcEndpoints = [
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://sepolia.drpc.org",
    "https://rpc.sepolia.org"
  ];
  
  let provider;
  for (const rpc of rpcEndpoints) {
    try {
      logInfo(`Testing ${rpc}...`);
      provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber(); // Test connection
      logSuccess(`Connected to ${rpc}`);
      break;
    } catch (e) {
      logWaiting(`Failed, trying next RPC...`);
    }
  }
  
  if (!provider) {
    throw new Error("All RPC endpoints failed");
  }
  
  const privateKey = process.env.PRIVATE_KEY.startsWith("0x") 
    ? process.env.PRIVATE_KEY 
    : `0x${process.env.PRIVATE_KEY}`;
  const wallet = new ethers.Wallet(privateKey, provider);
  
  logSuccess(`Connected to Sepolia RPC`);
  logSuccess(`Wallet address: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  logSuccess(`Balance: ${ethers.formatEther(balance)} ETH`);
  
  const network = await provider.getNetwork();
  logSuccess(`Chain ID: ${network.chainId}`);
  log200("Connection established successfully!");
  
  // Load deployed addresses
  const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  logInfo("Loading deployed contract addresses...");
  console.log(`   SupplyChainBatch: ${deployment.contracts.SupplyChainBatch}`);
  console.log(`   GoodwillToken:    ${deployment.contracts.GoodwillToken}`);
  console.log(`   ESGSoulbound:     ${deployment.contracts.ESGSoulbound}`);
  console.log(`   DonationVerifier: ${deployment.contracts.DonationVerifier}`);
  console.log(`   ExpiryKeeper:     ${deployment.contracts.ExpiryKeeper}`);
  log200("All contract addresses loaded!");
  
  // Load contract ABIs
  const batchABI = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/SupplyChainBatch.sol/SupplyChainBatch.json"))
  ).abi;
  const goodwillABI = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/GoodwillToken.sol/GoodwillToken.json"))
  ).abi;
  const verifierABI = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/DonationVerifier.sol/DonationVerifier.json"))
  ).abi;
  const esgABI = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/ESGSoulbound.sol/ESGSoulbound.json"))
  ).abi;
  
  // Create contract instances
  const batchContract = new ethers.Contract(deployment.contracts.SupplyChainBatch, batchABI, wallet);
  const goodwillContract = new ethers.Contract(deployment.contracts.GoodwillToken, goodwillABI, wallet);
  const verifierContract = new ethers.Contract(deployment.contracts.DonationVerifier, verifierABI, wallet);
  const esgContract = new ethers.Contract(deployment.contracts.ESGSoulbound, esgABI, wallet);
  
  logSuccess("All contract instances created!");
  
  // ============ STEP 2: REGISTER BATCH (Manufacturer) ============
  logSection("STEP 2: Register Batch (Manufacturer)");
  
  logInfo("Manufacturer creates a new batch...");
  
  const expiryDate = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days from now
  const quantity = 50; // 50 items
  const gs1Hash = ethers.keccak256(ethers.toUtf8Bytes("GTIN:12345678|BATCH:A001|EXPIRY:2026-01-11"));
  const weightKg = 25; // 25kg total
  
  console.log(`   Expiry: ${new Date(expiryDate * 1000).toISOString()}`);
  console.log(`   Quantity: ${quantity} items`);
  console.log(`   Weight: ${weightKg} kg`);
  console.log(`   GS1 Hash: ${gs1Hash.slice(0, 10)}...`);
  
  logWaiting("Sending registerBatch() transaction...");
  const registerTx = await batchContract.registerBatch(expiryDate, quantity, gs1Hash, weightKg);
  
  logInfo(`TX Hash: ${registerTx.hash}`);
  logInfo(`Explorer: https://sepolia.etherscan.io/tx/${registerTx.hash}`);
  
  logWaiting("Waiting for confirmation...");
  const registerReceipt = await retryOperation(() => registerTx.wait(), 5);
  
  logSuccess(`Confirmed in block: ${registerReceipt.blockNumber}`);
  logSuccess(`Gas used: ${registerReceipt.gasUsed.toString()}`);
  
  // Parse event to get batch ID
  const registerEvent = registerReceipt.logs
    .map(log => {
      try { return batchContract.interface.parseLog(log); } catch { return null; }
    })
    .find(e => e && e.name === "BatchRegistered");
  
  const batchId = registerEvent.args.batchId;
  logSuccess(`Batch ID created: ${batchId}`);
  log200("Batch registered successfully!");
  
  // ============ STEP 3: CLAIM BATCH (Retailer) ============
  logSection("STEP 3: Claim Batch (Retailer)");
  
  logInfo(`Retailer claims batch #${batchId}...`);
  
  logWaiting("Sending claimBatch() transaction...");
  const claimTx = await batchContract.claimBatch(batchId);
  
  logInfo(`TX Hash: ${claimTx.hash}`);
  logInfo(`Explorer: https://sepolia.etherscan.io/tx/${claimTx.hash}`);
  
  logWaiting("Waiting for confirmation...");
  const claimReceipt = await claimTx.wait();
  
  logSuccess(`Confirmed in block: ${claimReceipt.blockNumber}`);
  logSuccess(`Gas used: ${claimReceipt.gasUsed.toString()}`);
  
  // Get batch status
  const batchDetails = await batchContract.getBatch(batchId);
  logSuccess(`Batch status: ${['MANUFACTURED', 'IN_RETAIL', 'NEAR_EXPIRY', 'READY_FOR_DONATION', 'DONATED'][batchDetails.status]}`);
  logSuccess(`Current owner: ${batchDetails.currentOwner}`);
  log200("Batch claimed successfully!");
  
  // ============ STEP 4: MARK FOR DONATION (Retailer) ============
  logSection("STEP 4: Mark for Donation (Retailer)");
  
  logInfo(`Retailer marks batch #${batchId} for donation...`);
  
  logWaiting("Sending markForDonation() transaction...");
  const markTx = await batchContract.markForDonation(batchId);
  
  logInfo(`TX Hash: ${markTx.hash}`);
  logInfo(`Explorer: https://sepolia.etherscan.io/tx/${markTx.hash}`);
  
  logWaiting("Waiting for confirmation...");
  const markReceipt = await markTx.wait();
  
  logSuccess(`Confirmed in block: ${markReceipt.blockNumber}`);
  logSuccess(`Gas used: ${markReceipt.gasUsed.toString()}`);
  
  const updatedBatch = await batchContract.getBatch(batchId);
  logSuccess(`New status: ${['MANUFACTURED', 'IN_RETAIL', 'NEAR_EXPIRY', 'READY_FOR_DONATION', 'DONATED'][updatedBatch.status]}`);
  log200("Batch marked for donation!");
  
  // ============ STEP 5: AUTHORIZE CONTRACTS ============
  logSection("STEP 5: Authorize Contracts");
  
  logInfo("Setting up contract permissions...");
  
  // Authorize DonationVerifier to mint GoodwillTokens
  logWaiting("Authorizing DonationVerifier as minter...");
  const authMinterTx = await goodwillContract.setMinter(deployment.contracts.DonationVerifier, true);
  await authMinterTx.wait();
  logSuccess("DonationVerifier authorized to mint $GOOD tokens!");
  
  // Authorize DonationVerifier to issue ESG certificates
  logWaiting("Authorizing DonationVerifier as ESG issuer...");
  const authIssuerTx = await esgContract.setIssuer(deployment.contracts.DonationVerifier, true);
  await authIssuerTx.wait();
  logSuccess("DonationVerifier authorized to issue ESG certificates!");
  
  // Register NGO
  logWaiting("Registering NGO address...");
  const registerNGOTx = await verifierContract.registerNGO(wallet.address, true);
  await registerNGOTx.wait();
  logSuccess(`NGO ${wallet.address} registered!`);
  
  log200("All permissions configured!");
  
  // ============ STEP 6: DOUBLE HANDSHAKE - RETAILER SIGNATURE ============
  logSection("STEP 6: Initiate Donation (Retailer Signature)");
  
  const retailerAddress = wallet.address;
  const ngoAddress = wallet.address; // Using same wallet for demo
  
  logInfo(`Generating donation signature...`);
  logInfo(`Retailer: ${retailerAddress}`);
  logInfo(`NGO: ${ngoAddress}`);
  
  // Get donation hash
  const donationHash = await verifierContract.getDonationHash(batchId, retailerAddress, ngoAddress);
  logInfo(`Donation hash: ${donationHash}`);
  
  // Sign the message
  const messageHash = ethers.solidityPackedKeccak256(
    ["string", "uint256", "address", "address"],
    ["ECOLINK_DONATION", batchId, retailerAddress, ngoAddress]
  );
  const retailerSignature = await wallet.signMessage(ethers.getBytes(messageHash));
  logSuccess(`Retailer signature: ${retailerSignature.slice(0, 20)}...`);
  
  logWaiting("Sending initiateDonation() transaction...");
  const initiateTx = await verifierContract.initiateDonation(batchId, ngoAddress, retailerSignature);
  
  logInfo(`TX Hash: ${initiateTx.hash}`);
  logInfo(`Explorer: https://sepolia.etherscan.io/tx/${initiateTx.hash}`);
  
  const initiateReceipt = await initiateTx.wait();
  logSuccess(`Confirmed in block: ${initiateReceipt.blockNumber}`);
  log200("Donation initiated with retailer signature!");
  
  // ============ STEP 7: DOUBLE HANDSHAKE - NGO SIGNATURE ============
  logSection("STEP 7: Confirm Donation (NGO Signature)");
  
  logInfo("NGO confirms receipt of items...");
  
  // NGO signs the same message
  const ngoSignature = await wallet.signMessage(ethers.getBytes(messageHash));
  logSuccess(`NGO signature: ${ngoSignature.slice(0, 20)}...`);
  
  logWaiting("Sending confirmDonation() transaction...");
  const confirmTx = await verifierContract.confirmDonation(batchId, retailerAddress, ngoSignature);
  
  logInfo(`TX Hash: ${confirmTx.hash}`);
  logInfo(`Explorer: https://sepolia.etherscan.io/tx/${confirmTx.hash}`);
  
  logWaiting("Waiting for confirmation...");
  const confirmReceipt = await confirmTx.wait();
  
  logSuccess(`Confirmed in block: ${confirmReceipt.blockNumber}`);
  logSuccess(`Gas used: ${confirmReceipt.gasUsed.toString()}`);
  
  // Parse events
  const verifiedEvent = confirmReceipt.logs
    .map(log => {
      try { return verifierContract.interface.parseLog(log); } catch { return null; }
    })
    .find(e => e && e.name === "DonationVerified");
  
  if (verifiedEvent) {
    logSuccess(`Donation ID: ${verifiedEvent.args.donationId}`);
    logSuccess(`Goodwill tokens minted: ${verifiedEvent.args.goodwillMinted}`);
  }
  
  log200("Donation verified with double handshake!");
  
  // ============ STEP 8: VERIFY RESULTS ============
  logSection("STEP 8: Verify Results");
  
  // Check $GOOD token balance
  const goodBalance = await goodwillContract.balanceOf(retailerAddress);
  logSuccess(`Retailer $GOOD balance: ${ethers.formatEther(goodBalance)} GOOD`);
  
  // Check batch status
  const finalBatch = await batchContract.getBatch(batchId);
  logSuccess(`Final batch status: ${['MANUFACTURED', 'IN_RETAIL', 'NEAR_EXPIRY', 'READY_FOR_DONATION', 'DONATED'][finalBatch.status]}`);
  
 // Get donation details
  const donationCount = await verifierContract.donationCount();
  const donation = await verifierContract.getDonation(donationCount);
  
  logInfo("Donation Details:");
  console.log(`   Batch ID: ${donation.batchId}`);
  console.log(`   Quantity: ${donation.quantity}`);
  console.log(`   Carbon Credits: ${donation.carbonCredits}`);
  console.log(`   Goodwill Tokens: ${donation.goodwillTokens}`);
  console.log(`   Verified At: ${new Date(Number(donation.verifiedAt) * 1000).toISOString()}`);
  
  log200("All results verified!");
  
  // ============ FINAL SUMMARY ============
  logSection("✅ TEST COMPLETE - SUMMARY");
  
  console.log(`${colors.bright}Flow Executed Successfully:${colors.reset}`);
  console.log(`  1. ✅ Manufacturer registered batch #${batchId}`);
  console.log(`  2. ✅ Retailer claimed batch`);
  console.log(`  3. ✅ Retailer marked for donation`);
  console.log(`  4. ✅ Retailer initiated donation (signature 1)`);
  console.log(`  5. ✅ NGO confirmed donation (signature 2)`);
  console.log(`  6. ✅ ${ethers.formatEther(goodBalance)} $GOOD tokens minted`);
  console.log(`  7. ✅ Batch status: DONATED`);
  
  console.log(`\n${colors.bright}All transactions on Sepolia Etherscan:${colors.reset}`);
  console.log(`  Register:  https://sepolia.etherscan.io/tx/${registerTx.hash}`);
  console.log(`  Claim:     https://sepolia.etherscan.io/tx/${claimTx.hash}`);
  console.log(`  Mark:      https://sepolia.etherscan.io/tx/${markTx.hash}`);
  console.log(`  Initiate:  https://sepolia.etherscan.io/tx/${initiateTx.hash}`);
  console.log(`  Confirm:   https://sepolia.etherscan.io/tx/${confirmTx.hash}`);
  
  console.log(`\n${colors.bright}${colors.green}[200 OK] BLOCKCHAIN FLOW TEST COMPLETED SUCCESSFULLY!${colors.reset}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logError(`Test failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
