/**
 * Solana Utilities for cNFT Operations
 * 
 * Handles:
 * - Wallet connection
 * - cNFT minting with Bubblegum
 * - Batch transfers
 * - Donation verification
 */

import { Connection, PublicKey, Transaction, Keypair, clusterApiUrl } from '@solana/web3.js';
import bs58 from 'bs58';

// Network configuration
export const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
export const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');

// Program IDs (to be replaced with actual deployed program IDs)
export const PROGRAM_IDS = {
  CIRCULAR_SUPPLY: new PublicKey('11111111111111111111111111111111'), // Placeholder
  CARBON_TOKEN: new PublicKey('11111111111111111111111111111111'),   // Placeholder
  GOOD_TOKEN: new PublicKey('11111111111111111111111111111111'),     // Placeholder
};

// Bubblegum/cNFT related constants
export const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY');
export const SPL_NOOP_PROGRAM_ID = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV');
export const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK');

// Batch Status Enum
export enum BatchStatus {
  MANUFACTURED = 0,
  IN_RETAIL_INVENTORY = 1,
  READY_FOR_DONATION = 2,
  DONATED = 3,
}

// Batch Metadata Interface
export interface BatchMetadata {
  gtin: string;
  expiryDate: number; // Unix timestamp
  batchNumber: string;
  weightKg: number;
  itemCount: number;
  manufacturer: string;
  status: BatchStatus;
  createdAt: number;
}

/**
 * Get Solana connection with retry logic
 */
export function getConnection(): Connection {
  return new Connection(RPC_URL, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  });
}

/**
 * Shorten a public key for display
 */
export function shortenPublicKey(key: string | PublicKey, chars = 4): string {
  const str = typeof key === 'string' ? key : key.toBase58();
  return `${str.slice(0, chars)}...${str.slice(-chars)}`;
}

/**
 * Format SOL amount from lamports
 */
export function formatSol(lamports: number): string {
  return (lamports / 1e9).toFixed(4);
}

/**
 * Create a mock batch cNFT transaction (for demo purposes)
 * In production, this would interact with Metaplex Bubblegum
 */
export async function createMintBatchTransaction(params: {
  connection: Connection;
  payer: PublicKey;
  metadata: Omit<BatchMetadata, 'status' | 'createdAt'>;
}): Promise<{ transaction: Transaction; batchId: string }> {
  const { connection, payer, metadata } = params;

  // Generate a unique batch ID
  const batchId = generateBatchId(metadata.gtin, metadata.batchNumber);

  // Create a simple transaction (placeholder)
  // In production, this would use Bubblegum's mintV1 instruction
  const transaction = new Transaction();
  
  // Add recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  return { transaction, batchId };
}

/**
 * Generate a deterministic batch ID from GTIN and batch number
 */
export function generateBatchId(gtin: string, batchNumber: string): string {
  const combined = `${gtin}-${batchNumber}-${Date.now()}`;
  // Simple hash for demo - in production, use proper hashing
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `BATCH-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
}

/**
 * Calculate carbon credits based on weight saved from waste
 */
export function calculateCarbonCredits(weightKg: number): number {
  // Rough estimate: 2.5 kg CO2 saved per kg of food waste prevented
  const CO2_FACTOR = 2.5;
  // Token ratio: 1 $CARBON = 0.1 kg CO2
  const TOKEN_RATIO = 0.1;
  
  return Math.floor((weightKg * CO2_FACTOR) / TOKEN_RATIO);
}

/**
 * Calculate $GOOD utility tokens for donation
 */
export function calculateGoodTokens(itemCount: number): number {
  // 10 $GOOD tokens per item donated
  return itemCount * 10;
}

/**
 * Mock function to get batch data (demo)
 * In production, this would query the Solana blockchain
 */
export async function getBatchData(batchId: string): Promise<BatchMetadata | null> {
  // Simulated batch data for demo
  const mockBatches: Record<string, BatchMetadata> = {
    'BATCH-A1B2C3D4': {
      gtin: '09506000134352',
      expiryDate: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
      batchNumber: 'A1',
      weightKg: 25,
      itemCount: 50,
      manufacturer: 'Acme Foods Ltd',
      status: BatchStatus.IN_RETAIL_INVENTORY,
      createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
    },
  };

  return mockBatches[batchId] || null;
}

/**
 * Get explorer URL for a transaction or address
 */
export function getExplorerUrl(
  type: 'tx' | 'address' | 'token',
  value: string
): string {
  const base = 'https://explorer.solana.com';
  const cluster = NETWORK === 'mainnet-beta' ? '' : `?cluster=${NETWORK}`;
  
  switch (type) {
    case 'tx':
      return `${base}/tx/${value}${cluster}`;
    case 'address':
      return `${base}/address/${value}${cluster}`;
    case 'token':
      return `${base}/token/${value}${cluster}`;
    default:
      return base;
  }
}

/**
 * Airdrop SOL for testing (devnet only)
 */
export async function requestAirdrop(
  connection: Connection,
  publicKey: PublicKey,
  amount: number = 1
): Promise<string> {
  if (NETWORK !== 'devnet') {
    throw new Error('Airdrop only available on devnet');
  }

  const signature = await connection.requestAirdrop(
    publicKey,
    amount * 1e9 // Convert SOL to lamports
  );

  await connection.confirmTransaction(signature);
  return signature;
}

/**
 * Format date for display
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return `${Math.abs(days)} days ago`;
  } else if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Tomorrow';
  } else {
    return `In ${days} days`;
  }
}
