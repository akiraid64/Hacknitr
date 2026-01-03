/**
 * Mock Data Store
 * 
 * In-memory storage for demo purposes.
 * In production, this would be replaced with:
 * - On-chain: Solana cNFT data via Merkle Trees
 * - Off-chain: Database (PostgreSQL/ClickHouse) for fast queries
 */

import { BatchStatus } from './solana';

export interface Store {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  walletAddress: string;
  batches: Batch[];
}

export interface Batch {
  id: string;
  gtin: string;
  batchNumber: string;
  expiryDate: number;
  itemCount: number;
  weightKg: number;
  manufacturer: string;
  status: BatchStatus;
  location: string;
  createdAt: number;
  claimedAt?: number;
  donatedAt?: number;
}

export interface Donation {
  id: string;
  batchId: string;
  storeId: string;
  ngoId: string;
  carbonTokens: number;
  goodTokens: number;
  verifiedAt: number;
  txSignature: string;
}

// Mock Stores with geographic spread
export const MOCK_STORES: Store[] = [
  {
    id: 'store-1',
    name: 'FreshMart Downtown',
    address: '123 Main St, San Francisco, CA',
    lat: 37.7749,
    lng: -122.4194,
    walletAddress: 'FreshMart11111111111111111111111111111111',
    batches: [
      {
        id: 'BATCH-001',
        gtin: '09506000134352',
        batchNumber: 'A1',
        expiryDate: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days
        itemCount: 48,
        weightKg: 24,
        manufacturer: 'Organic Farms Inc',
        status: BatchStatus.IN_RETAIL_INVENTORY,
        location: 'Aisle 3, Shelf B',
        createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        claimedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'BATCH-002',
        gtin: '09506000134369',
        batchNumber: 'B2',
        expiryDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        itemCount: 100,
        weightKg: 50,
        manufacturer: 'Valley Dairy Co',
        status: BatchStatus.IN_RETAIL_INVENTORY,
        location: 'Cooler 2',
        createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
        claimedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      },
    ],
  },
  {
    id: 'store-2',
    name: 'FreshMart Marina',
    address: '456 Bay Avenue, San Francisco, CA',
    lat: 37.8024,
    lng: -122.4058,
    walletAddress: 'Marina111111111111111111111111111111111',
    batches: [
      {
        id: 'BATCH-003',
        gtin: '09506000134376',
        batchNumber: 'C3',
        expiryDate: Date.now() + 1 * 24 * 60 * 60 * 1000, // 1 day - CRITICAL
        itemCount: 30,
        weightKg: 15,
        manufacturer: 'Sunrise Bakery',
        status: BatchStatus.READY_FOR_DONATION,
        location: 'Bakery Section',
        createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
        claimedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      },
    ],
  },
  {
    id: 'store-3',
    name: 'FreshMart SoMa',
    address: '789 Howard St, San Francisco, CA',
    lat: 37.7853,
    lng: -122.3989,
    walletAddress: 'SoMa11111111111111111111111111111111111',
    batches: [
      {
        id: 'BATCH-004',
        gtin: '09506000134383',
        batchNumber: 'D4',
        expiryDate: Date.now() + 4 * 24 * 60 * 60 * 1000, // 4 days - WARNING
        itemCount: 75,
        weightKg: 37.5,
        manufacturer: 'Green Produce Ltd',
        status: BatchStatus.IN_RETAIL_INVENTORY,
        location: 'Produce Section',
        createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
        claimedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'BATCH-005',
        gtin: '09506000134390',
        batchNumber: 'E5',
        expiryDate: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days - OK
        itemCount: 200,
        weightKg: 100,
        manufacturer: 'Pacific Cannery',
        status: BatchStatus.IN_RETAIL_INVENTORY,
        location: 'Aisle 7',
        createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
        claimedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      },
    ],
  },
  {
    id: 'store-4',
    name: 'FreshMart Mission',
    address: '1010 Mission St, San Francisco, CA',
    lat: 37.7583,
    lng: -122.4159,
    walletAddress: 'Mission1111111111111111111111111111111',
    batches: [
      {
        id: 'BATCH-006',
        gtin: '09506000134407',
        batchNumber: 'F6',
        expiryDate: Date.now() - 1 * 24 * 60 * 60 * 1000, // EXPIRED
        itemCount: 20,
        weightKg: 10,
        manufacturer: 'Fresh Juice Co',
        status: BatchStatus.READY_FOR_DONATION,
        location: 'Refrigerated Section',
        createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
        claimedAt: Date.now() - 9 * 24 * 60 * 60 * 1000,
      },
    ],
  },
];

// Mock NGOs
export const MOCK_NGOS = [
  {
    id: 'ngo-1',
    name: 'SF Food Bank',
    contactEmail: 'donations@sffoodbank.org',
    walletAddress: 'FoodBank1111111111111111111111111111111',
    totalDonationsReceived: 156,
    totalWeightKg: 4250,
  },
  {
    id: 'ngo-2',
    name: 'Meals on Wheels SF',
    contactEmail: 'pickup@mowsf.org',
    walletAddress: 'MealsOW11111111111111111111111111111111',
    totalDonationsReceived: 89,
    totalWeightKg: 2100,
  },
];

// Mock Recent Donations
export const MOCK_DONATIONS: Donation[] = [
  {
    id: 'don-1',
    batchId: 'BATCH-OLD-001',
    storeId: 'store-1',
    ngoId: 'ngo-1',
    carbonTokens: 625,
    goodTokens: 500,
    verifiedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    txSignature: '5pG2vb8bXZx9Q3Hq4vVhJrG8DkL2mN1pKjT6sYwU7xRf',
  },
  {
    id: 'don-2',
    batchId: 'BATCH-OLD-002',
    storeId: 'store-2',
    ngoId: 'ngo-2',
    carbonTokens: 375,
    goodTokens: 300,
    verifiedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    txSignature: '7rH3wc9cY4Ay0R4Iq5wIkT9FlM3oO2qLkU7tZxV8ySg',
  },
];

// Helper functions to query mock data
export function getAllStores(): Store[] {
  return MOCK_STORES;
}

export function getStoreById(id: string): Store | undefined {
  return MOCK_STORES.find(s => s.id === id);
}

export function getAllBatches(): Batch[] {
  return MOCK_STORES.flatMap(store => 
    store.batches.map(batch => ({
      ...batch,
      storeId: store.id,
      storeName: store.name,
    }))
  );
}

export function getBatchesByStatus(status: BatchStatus): Batch[] {
  return getAllBatches().filter(b => b.status === status);
}

export function getCriticalBatches(daysThreshold: number = 3): Batch[] {
  const now = Date.now();
  const threshold = now + daysThreshold * 24 * 60 * 60 * 1000;
  
  return getAllBatches()
    .filter(b => b.expiryDate <= threshold && b.status !== BatchStatus.DONATED)
    .sort((a, b) => a.expiryDate - b.expiryDate);
}

export function getStoreInventoryStats(storeId: string): {
  totalItems: number;
  totalWeight: number;
  criticalCount: number;
  warningCount: number;
  okCount: number;
} {
  const store = getStoreById(storeId);
  if (!store) {
    return { totalItems: 0, totalWeight: 0, criticalCount: 0, warningCount: 0, okCount: 0 };
  }

  const now = Date.now();
  const criticalThreshold = now + 2 * 24 * 60 * 60 * 1000;
  const warningThreshold = now + 5 * 24 * 60 * 60 * 1000;

  return store.batches.reduce((acc, batch) => {
    if (batch.status === BatchStatus.DONATED) return acc;

    acc.totalItems += batch.itemCount;
    acc.totalWeight += batch.weightKg;

    if (batch.expiryDate <= criticalThreshold) {
      acc.criticalCount++;
    } else if (batch.expiryDate <= warningThreshold) {
      acc.warningCount++;
    } else {
      acc.okCount++;
    }

    return acc;
  }, { totalItems: 0, totalWeight: 0, criticalCount: 0, warningCount: 0, okCount: 0 });
}

export function getNetworkStats() {
  const allBatches = getAllBatches();
  const donations = MOCK_DONATIONS;

  return {
    totalStores: MOCK_STORES.length,
    totalBatches: allBatches.length,
    totalItems: allBatches.reduce((sum, b) => sum + b.itemCount, 0),
    totalDonations: donations.length,
    totalCarbonTokens: donations.reduce((sum, d) => sum + d.carbonTokens, 0),
    totalGoodTokens: donations.reduce((sum, d) => sum + d.goodTokens, 0),
    criticalBatches: getCriticalBatches(2).length,
  };
}
