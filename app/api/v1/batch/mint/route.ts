import { NextRequest, NextResponse } from 'next/server';
import { generateBatchId, calculateCarbonCredits, calculateGoodTokens } from '@/lib/solana';
import { generateGS1DigitalLink } from '@/lib/gs1-parser';

/**
 * POST /api/v1/batch/mint
 * 
 * Mints a new batch as a compressed NFT (cNFT) on Solana
 * 
 * Body:
 * - gtin: string (GS1 GTIN)
 * - expiryDate: string (ISO date)
 * - batchNumber: string
 * - weightKg: number
 * - itemCount: number
 * - manufacturerWallet: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { gtin, expiryDate, batchNumber, weightKg, itemCount, manufacturerWallet } = body;

    if (!gtin || !expiryDate || !batchNumber || !weightKg || !itemCount) {
      return NextResponse.json(
        { error: 'Missing required fields: gtin, expiryDate, batchNumber, weightKg, itemCount' },
        { status: 400 }
      );
    }

    // Validate GTIN format
    if (!/^\d{8,14}$/.test(gtin)) {
      return NextResponse.json(
        { error: 'Invalid GTIN format. Must be 8-14 digits.' },
        { status: 400 }
      );
    }

    // Generate batch ID
    const batchId = generateBatchId(gtin, batchNumber);

    // Generate GS1 Digital Link URL
    const gs1Url = generateGS1DigitalLink({
      baseUrl: 'https://eco.link',
      gtin,
      expiryDate: new Date(expiryDate),
      batchNumber,
    });

    // In production, this would:
    // 1. Connect to Solana via RPC
    // 2. Create Merkle tree instruction via Bubblegum
    // 3. Mint cNFT with metadata
    // 4. Return transaction signature

    // Mock transaction signature for demo
    const txSignature = Array.from({ length: 64 }, () =>
      '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]
    ).join('');

    // Calculate potential token rewards
    const potentialRewards = {
      carbonTokens: calculateCarbonCredits(weightKg),
      goodTokens: calculateGoodTokens(itemCount),
    };

    return NextResponse.json({
      success: true,
      data: {
        batchId,
        gs1Url,
        txSignature,
        network: 'devnet',
        metadata: {
          gtin,
          expiryDate,
          batchNumber,
          weightKg,
          itemCount,
          manufacturer: manufacturerWallet || 'Anonymous',
          status: 'MANUFACTURED',
          mintedAt: new Date().toISOString(),
        },
        potentialRewards,
        explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
      },
    });
  } catch (error) {
    console.error('Mint error:', error);
    return NextResponse.json(
      { error: 'Failed to mint batch', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/v1/batch/mint',
    description: 'Mint a new batch as a compressed NFT on Solana',
    requiredFields: {
      gtin: 'string (8-14 digit barcode)',
      expiryDate: 'string (ISO date)',
      batchNumber: 'string',
      weightKg: 'number',
      itemCount: 'number',
    },
    optionalFields: {
      manufacturerWallet: 'string (Solana public key)',
    },
    example: {
      gtin: '09506000134352',
      expiryDate: '2026-05-30',
      batchNumber: 'A1',
      weightKg: 25,
      itemCount: 50,
      manufacturerWallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    },
  });
}
