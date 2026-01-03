import { NextRequest, NextResponse } from 'next/server';
import { parseGS1DigitalLink } from '@/lib/gs1-parser';

/**
 * POST /api/v1/batch/claim
 * 
 * Claims a batch for a retailer (transfers cNFT ownership)
 * 
 * Body:
 * - batchId: string
 * - retailerWallet: string
 * - gs1Url: string (optional, for verification)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { batchId, retailerWallet, gs1Url } = body;

    if (!batchId || !retailerWallet) {
      return NextResponse.json(
        { error: 'Missing required fields: batchId, retailerWallet' },
        { status: 400 }
      );
    }

    // If GS1 URL provided, parse and validate
    let parsedGS1 = null;
    if (gs1Url) {
      parsedGS1 = parseGS1DigitalLink(gs1Url);
      if (!parsedGS1.isValid) {
        return NextResponse.json(
          { error: 'Invalid GS1 Digital Link URL', errors: parsedGS1.errors },
          { status: 400 }
        );
      }
    }

    // In production, this would:
    // 1. Verify the batchId exists on-chain
    // 2. Verify the current owner is a manufacturer
    // 3. Transfer cNFT ownership to retailer wallet
    // 4. Update metadata status to IN_RETAIL_INVENTORY

    // Mock transaction signature
    const txSignature = Array.from({ length: 64 }, () =>
      '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]
    ).join('');

    return NextResponse.json({
      success: true,
      data: {
        batchId,
        previousOwner: '(manufacturer wallet)',
        newOwner: retailerWallet,
        status: 'IN_RETAIL_INVENTORY',
        claimedAt: new Date().toISOString(),
        txSignature,
        network: 'devnet',
        parsedGS1: parsedGS1 ? {
          gtin: parsedGS1.gtin,
          expiryDate: parsedGS1.expiryDate?.toISOString(),
          batchNumber: parsedGS1.batchNumber,
        } : null,
        explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
      },
    });
  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json(
      { error: 'Failed to claim batch', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
