/**
 * EVM Blockchain Utilities
 * 
 * ethers.js integration for Polygon/Arbitrum Layer 2 chains
 */

import { ethers, BrowserProvider, Contract, JsonRpcProvider } from 'ethers';

// Network configurations
export const NETWORKS = {
  // ============ PRIMARY: SEPOLIA (Ethereum Testnet) ============
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
    currency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
  },
  
  // ============ TESTNETS ============
  polygon_amoy: {
    chainId: 80002,
    name: 'Polygon Amoy',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorer: 'https://amoy.polygonscan.com',
    currency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
  localhost: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    explorer: 'http://localhost:8545',
    currency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  },
};

// Default network - SEPOLIA (Free testnet with easy faucets)
export const DEFAULT_NETWORK = NETWORKS.sepolia;

// Contract addresses (update after deployment)
export const CONTRACTS = {
  SUPPLY_CHAIN_BATCH: process.env.NEXT_PUBLIC_BATCH_CONTRACT || '0x0000000000000000000000000000000000000000',
  GOODWILL_TOKEN: process.env.NEXT_PUBLIC_GOODWILL_TOKEN || '0x0000000000000000000000000000000000000000',
  ESG_SOULBOUND: process.env.NEXT_PUBLIC_ESG_CONTRACT || '0x0000000000000000000000000000000000000000',
  DONATION_VERIFIER: process.env.NEXT_PUBLIC_VERIFIER_CONTRACT || '0x0000000000000000000000000000000000000000',
  EXPIRY_KEEPER: process.env.NEXT_PUBLIC_KEEPER_CONTRACT || '0x0000000000000000000000000000000000000000',
};

// Contract ABIs (simplified for key functions)
export const ABIS = {
  SUPPLY_CHAIN_BATCH: [
    'function registerBatch(uint256 _expiry, uint256 _quantity, bytes32 _gs1Hash, uint256 _weightKg) external returns (uint256)',
    'function claimBatch(uint256 _batchId) external',
    'function markForDonation(uint256 _batchId) external',
    'function getBatch(uint256 _batchId) external view returns (uint256 expiry, uint256 quantity, address manufacturer, address currentOwner, uint8 status, uint256 weightKg)',
    'function isNearExpiry(uint256 _batchId) external view returns (bool)',
    'function daysUntilExpiry(uint256 _batchId) external view returns (int256)',
    'event BatchRegistered(uint256 indexed batchId, address indexed manufacturer, uint256 expiry, uint256 quantity)',
  ],
  GOODWILL_TOKEN: [
    'function balanceOf(address account) external view returns (uint256)',
    'function burnForTax(uint256 _amount) external',
    'function stake(uint256 _amount) external',
    'function unstake() external',
    'function getVisibilityBoost(address _user) external view returns (uint256)',
    'function getTaxReceipts(address _user) external view returns (tuple(address burner, uint256 amount, uint256 timestamp, bytes32 receiptHash)[])',
  ],
  DONATION_VERIFIER: [
    'function getDonationHash(uint256 _batchId, address _retailer, address _ngo) external pure returns (bytes32)',
    'function initiateDonation(uint256 _batchId, address _ngo, bytes calldata _signature) external',
    'function confirmDonation(uint256 _batchId, address _retailer, bytes calldata _signature) external',
    'function getDonation(uint256 _id) external view returns (uint256 batchId, address retailer, address ngo, uint256 quantity, uint256 carbonCredits, uint256 goodwillTokens, uint256 verifiedAt)',
  ],
};

// ============ WALLET CONNECTION ============

/**
 * Connect to MetaMask or other browser wallet
 */
export async function connectWallet(): Promise<{ address: string; provider: BrowserProvider }> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet found. Please install MetaMask.');
  }

  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  
  if (accounts.length === 0) {
    throw new Error('No accounts found');
  }

  return { address: accounts[0], provider };
}

/**
 * Switch to the correct network
 */
export async function switchNetwork(network = DEFAULT_NETWORK): Promise<void> {
  if (!window.ethereum) throw new Error('No wallet found');

  const chainIdHex = `0x${network.chainId.toString(16)}`;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (error: any) {
    // Chain not added, add it
    if (error.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chainIdHex,
          chainName: network.name,
          nativeCurrency: network.currency,
          rpcUrls: [network.rpcUrl],
          blockExplorerUrls: [network.explorer],
        }],
      });
    } else {
      throw error;
    }
  }
}

/**
 * Get read-only provider
 */
export function getReadProvider(network = DEFAULT_NETWORK): JsonRpcProvider {
  return new JsonRpcProvider(network.rpcUrl);
}

// ============ CONTRACT INTERACTIONS ============

/**
 * Register a new batch (Manufacturer)
 */
export async function registerBatch(params: {
  expiryTimestamp: number;
  quantity: number;
  gs1Hash: string;
  weightKg: number;
}): Promise<{ txHash: string; batchId: number }> {
  const { provider } = await connectWallet();
  const signer = await provider.getSigner();
  
  const contract = new Contract(
    CONTRACTS.SUPPLY_CHAIN_BATCH,
    ABIS.SUPPLY_CHAIN_BATCH,
    signer
  );

  // Convert gs1Hash to bytes32
  const gs1HashBytes = ethers.keccak256(ethers.toUtf8Bytes(params.gs1Hash));

  const tx = await contract.registerBatch(
    params.expiryTimestamp,
    params.quantity,
    gs1HashBytes,
    params.weightKg
  );

  const receipt = await tx.wait();
  
  // Extract batchId from event
  const event = receipt.logs.find(
    (log: any) => log.fragment?.name === 'BatchRegistered'
  );
  const batchId = event?.args?.[0] || 0;

  return { txHash: tx.hash, batchId: Number(batchId) };
}

/**
 * Claim a batch (Retailer)
 */
export async function claimBatch(batchId: number): Promise<string> {
  const { provider } = await connectWallet();
  const signer = await provider.getSigner();
  
  const contract = new Contract(
    CONTRACTS.SUPPLY_CHAIN_BATCH,
    ABIS.SUPPLY_CHAIN_BATCH,
    signer
  );

  const tx = await contract.claimBatch(batchId);
  await tx.wait();
  
  return tx.hash;
}

/**
 * Mark batch for donation (Retailer)
 */
export async function markForDonation(batchId: number): Promise<string> {
  const { provider } = await connectWallet();
  const signer = await provider.getSigner();
  
  const contract = new Contract(
    CONTRACTS.SUPPLY_CHAIN_BATCH,
    ABIS.SUPPLY_CHAIN_BATCH,
    signer
  );

  const tx = await contract.markForDonation(batchId);
  await tx.wait();
  
  return tx.hash;
}

/**
 * Get batch details
 */
export async function getBatchDetails(batchId: number): Promise<{
  expiry: number;
  quantity: number;
  manufacturer: string;
  currentOwner: string;
  status: number;
  weightKg: number;
}> {
  const provider = getReadProvider();
  const contract = new Contract(
    CONTRACTS.SUPPLY_CHAIN_BATCH,
    ABIS.SUPPLY_CHAIN_BATCH,
    provider
  );

  const result = await contract.getBatch(batchId);
  
  return {
    expiry: Number(result[0]),
    quantity: Number(result[1]),
    manufacturer: result[2],
    currentOwner: result[3],
    status: Number(result[4]),
    weightKg: Number(result[5]),
  };
}

/**
 * Sign donation message (for double handshake)
 */
export async function signDonationMessage(
  batchId: number,
  retailer: string,
  ngo: string
): Promise<string> {
  const { provider } = await connectWallet();
  const signer = await provider.getSigner();
  
  const message = ethers.solidityPackedKeccak256(
    ['string', 'uint256', 'address', 'address'],
    ['ECOLINK_DONATION', batchId, retailer, ngo]
  );

  return await signer.signMessage(ethers.getBytes(message));
}

/**
 * Get $GOOD token balance
 */
export async function getGoodwillBalance(address: string): Promise<string> {
  const provider = getReadProvider();
  const contract = new Contract(
    CONTRACTS.GOODWILL_TOKEN,
    ABIS.GOODWILL_TOKEN,
    provider
  );

  const balance = await contract.balanceOf(address);
  return ethers.formatUnits(balance, 18);
}

// ============ UTILITIES ============

/**
 * Shorten address for display
 */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Get explorer URL
 */
export function getExplorerUrl(
  type: 'tx' | 'address' | 'token',
  value: string,
  network = DEFAULT_NETWORK
): string {
  return `${network.explorer}/${type}/${value}`;
}

/**
 * Calculate carbon credits from weight
 */
export function calculateCarbonCredits(weightKg: number): number {
  // 2.5 kg CO2 saved per kg of food waste prevented
  return Math.floor(weightKg * 2.5);
}

/**
 * Calculate goodwill tokens from quantity
 */
export function calculateGoodwillTokens(quantity: number): number {
  // 1 token per item
  return quantity;
}

// Status enum mapping
export const BatchStatus = {
  0: 'Manufactured',
  1: 'In Retail',
  2: 'Near Expiry',
  3: 'Ready for Donation',
  4: 'Donated',
  5: 'Expired',
} as const;

// TypeScript type augmentation for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
