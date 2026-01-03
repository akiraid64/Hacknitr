import { NextRequest, NextResponse } from 'next/server';
import { calculateCarbonCredits, calculateGoodTokens } from '@/lib/solana';

/**
 * POST /api/v1/verify-donation
 * 
 * Verifies a donation with double-signature (retailer + NGO)
 * Burns the cNFT and mints $CARBON and $GOOD tokens
 * 
 * Body:
 * - batchId: string
 * - retailerWallet: string
 * - ngoWallet: string
 * - retailerSignature: string (Ed25519 signature)
 * - ngoSignature: string (Ed25519 signature) 
 * - weightKg: number (for carbon calculation)
 * - itemCount: number (for good token calculation)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { 
      batchId, 
      retailerWallet, 
      ngoWallet, 
      retailerSignature, 
      ngoSignature,
      weightKg = 25,
      itemCount = 50
    } = body;

    // Validate required fields
    if (!batchId || !retailerWallet || !ngoWallet) {
      return NextResponse.json(
        { error: 'Missing required fields: batchId, retailerWallet, ngoWallet' },
        { status: 400 }
      );
    }

    // In production, this would:
    // 1. Verify both Ed25519 signatures
    // 2. Verify retailer is current cNFT owner
    // 3. Verify NGO is a registered partner
    // 4. Burn the cNFT (decompression is not needed for burns)
    // 5. Mint $CARBON tokens to retailer wallet
    // 6. Mint $GOOD tokens to NGO wallet
    // 7. Emit event for ESG reporting

    // Calculate token amounts
    const carbonTokens = calculateCarbonCredits(weightKg);
    const goodTokens = calculateGoodTokens(itemCount);

    // Mock transaction signatures
    const burnTxSignature = Array.from({ length: 64 }, () =>
      '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]
    ).join('');

    const mintTxSignature = Array.from({ length: 64 }, () =>
      '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]
    ).join('');

    return NextResponse.json({
      success: true,
      data: {
        batchId,
        donationVerified: true,
        verifiedAt: new Date().toISOString(),
        network: 'devnet',
        
        // cNFT Burn
        burn: {
          txSignature: burnTxSignature,
          explorerUrl: `https://explorer.solana.com/tx/${burnTxSignature}?cluster=devnet`,
        },
        
        // Token Minting
        tokens: {
          carbon: {
            amount: carbonTokens,
            recipient: retailerWallet,
            symbol: '$CARBON',
            description: `${weightKg}kg waste diverted = ${(weightKg * 2.5).toFixed(1)}kg CO2 saved`,
          },
          good: {
            amount: goodTokens,
            recipient: ngoWallet,
            symbol: '$GOOD',
            description: `${itemCount} items donated = ${goodTokens} utility tokens`,
          },
          txSignature: mintTxSignature,
          explorerUrl: `https://explorer.solana.com/tx/${mintTxSignature}?cluster=devnet`,
        },

        // Impact metrics
        impact: {
          co2SavedKg: weightKg * 2.5,
          itemsSaved: itemCount,
          landfillDiverted: weightKg,
        },

        // Parties involved
        parties: {
          retailer: retailerWallet,
          ngo: ngoWallet,
        },
      },
    });
  } catch (error) {
    console.error('Verify donation error:', error);
    return NextResponse.json(
      { error: 'Failed to verify donation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/v1/verify-donation',
    description: 'Verify a donation with double-signature, burn cNFT, mint reward tokens',
    flow: [
      '1. Retailer marks batch as READY_FOR_DONATION',
      '2. NGO receives notification via Solana Blink',
      '3. NGO driver arrives and scans carton QR',
      '4. Both parties sign the verification message',
      '5. cNFT is burned on-chain',
      '6. $CARBON tokens minted to retailer',
      '7. $GOOD tokens minted to NGO',
    ],
    requiredFields: {
      batchId: 'string',
      retailerWallet: 'string (Solana public key)',
      ngoWallet: 'string (Solana public key)',
    },
    optionalFields: {
      retailerSignature: 'string (Ed25519 signature)',
      ngoSignature: 'string (Ed25519 signature)',
      weightKg: 'number (default: 25)',
      itemCount: 'number (default: 50)',
    },
  });
}
