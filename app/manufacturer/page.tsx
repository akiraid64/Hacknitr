'use client';

import { useState } from 'react';
import Link from 'next/link';
import { generateGS1DigitalLink } from '@/lib/gs1-parser';
import { generateBatchId, calculateCarbonCredits, calculateGoodTokens } from '@/lib/solana';

interface MintFormData {
  gtin: string;
  batchNumber: string;
  expiryDate: string;
  itemCount: number;
  weightKg: number;
  productName: string;
}

interface MintedBatch {
  id: string;
  qrUrl: string;
  txSignature: string;
  timestamp: number;
}

export default function ManufacturerPage() {
  const [formData, setFormData] = useState<MintFormData>({
    gtin: '',
    batchNumber: '',
    expiryDate: '',
    itemCount: 50,
    weightKg: 25,
    productName: '',
  });
  const [mintedBatches, setMintedBatches] = useState<MintedBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const generateQRCode = async (url: string): Promise<string> => {
    // Use a QR code API for simplicity
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Generate GS1 Digital Link URL
      const gs1Url = generateGS1DigitalLink({
        baseUrl: 'https://eco.link',
        gtin: formData.gtin,
        expiryDate: new Date(formData.expiryDate),
        batchNumber: formData.batchNumber,
      });

      // Generate batch ID
      const batchId = generateBatchId(formData.gtin, formData.batchNumber);

      // Generate QR code
      const qrUrl = await generateQRCode(gs1Url);
      setQrCodeUrl(qrUrl);

      // Mock transaction signature
      const txSignature = Array.from({ length: 64 }, () => 
        '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]
      ).join('');

      // Add to minted batches
      const newBatch: MintedBatch = {
        id: batchId,
        qrUrl: gs1Url,
        txSignature,
        timestamp: Date.now(),
      };

      setMintedBatches(prev => [newBatch, ...prev]);

      // Show success (in production, this would trigger actual blockchain transaction)
      alert(`✅ Batch ${batchId} minted successfully!\n\nGS1 URL: ${gs1Url}\n\nTx: ${txSignature.slice(0, 20)}...`);

    } catch (error) {
      console.error('Mint error:', error);
      alert('Failed to mint batch. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const estimatedTokens = {
    carbon: calculateCarbonCredits(formData.weightKg),
    good: calculateGoodTokens(formData.itemCount),
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ 
        padding: 'var(--space-4) 0', 
        borderBottom: '1px solid var(--glass-border)',
        background: 'rgba(0,0,0,0.3)'
      }}>
        <div className="container">
          <div className="flex justify-between items-center">
            <div className="flex items-center" style={{ gap: 'var(--space-4)' }}>
              <Link href="/" className="flex items-center" style={{ gap: 'var(--space-2)', textDecoration: 'none' }}>
                <span style={{ fontSize: '1.5rem' }}>🔗</span>
                <span className="text-gradient" style={{ fontWeight: 700 }}>EcoLink</span>
              </Link>
              <span style={{ color: 'var(--neutral-600)' }}>|</span>
              <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                <span style={{ fontSize: '1.25rem' }}>🏭</span>
                <span style={{ fontWeight: 600 }}>Manufacturer Portal</span>
              </div>
            </div>
            <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
              <span className="badge badge-success">Devnet</span>
              <button className="btn btn-secondary">Connect Wallet</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: 'var(--space-8) 0' }}>
        <div className="container">
          <div className="grid" style={{ gridTemplateColumns: '1fr 400px', gap: 'var(--space-8)' }}>
            
            {/* Mint Form */}
            <div className="glass-card">
              <h2 style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  📦
                </span>
                Mint New Batch
              </h2>

              <form onSubmit={handleMint}>
                <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 'var(--space-4)' }}>
                  <div>
                    <label className="label">Product Name</label>
                    <input
                      type="text"
                      name="productName"
                      value={formData.productName}
                      onChange={handleInputChange}
                      placeholder="e.g., Organic Milk 1L"
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">GTIN (Barcode)</label>
                    <input
                      type="text"
                      name="gtin"
                      value={formData.gtin}
                      onChange={handleInputChange}
                      placeholder="09506000134352"
                      className="input"
                      pattern="\d{8,14}"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 'var(--space-4)' }}>
                  <div>
                    <label className="label">Batch Number</label>
                    <input
                      type="text"
                      name="batchNumber"
                      value={formData.batchNumber}
                      onChange={handleInputChange}
                      placeholder="A1"
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Expiry Date</label>
                    <input
                      type="date"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleInputChange}
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 'var(--space-6)' }}>
                  <div>
                    <label className="label">Item Count</label>
                    <input
                      type="number"
                      name="itemCount"
                      value={formData.itemCount}
                      onChange={handleInputChange}
                      min="1"
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Total Weight (kg)</label>
                    <input
                      type="number"
                      name="weightKg"
                      value={formData.weightKg}
                      onChange={handleInputChange}
                      min="0.1"
                      step="0.1"
                      className="input"
                      required
                    />
                  </div>
                </div>

                {/* Token Estimate */}
                <div 
                  style={{ 
                    padding: 'var(--space-4)', 
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    marginBottom: 'var(--space-6)'
                  }}
                >
                  <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-2)' }}>
                    Estimated rewards if donated:
                  </div>
                  <div className="flex" style={{ gap: 'var(--space-6)' }}>
                    <div>
                      <span style={{ color: 'var(--primary-400)', fontWeight: 700, fontSize: '1.25rem' }}>
                        {estimatedTokens.carbon}
                      </span>
                      <span className="text-muted text-sm"> $CARBON</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--accent-400)', fontWeight: 700, fontSize: '1.25rem' }}>
                        {estimatedTokens.good}
                      </span>
                      <span className="text-muted text-sm"> $GOOD</span>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>⏳ Minting on Solana...</>
                  ) : (
                    <>🪙 Mint Batch as cNFT</>
                  )}
                </button>
              </form>
            </div>

            {/* QR Code Preview & Recent Mints */}
            <div className="flex flex-col gap-6">
              {/* QR Preview */}
              <div className="glass-card text-center">
                <h3 style={{ marginBottom: 'var(--space-4)' }}>GS1 Digital Link QR</h3>
                <div 
                  style={{ 
                    width: '200px',
                    height: '200px',
                    margin: '0 auto var(--space-4)',
                    background: 'white',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <div className="text-muted text-sm">
                      QR code will appear<br />after minting
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted">
                  Print this on your packaging.<br />
                  Encodes GTIN, expiry, and batch in one scan.
                </p>
              </div>

              {/* Recent Mints */}
              <div className="glass-card">
                <h3 style={{ marginBottom: 'var(--space-4)' }}>Recent Mints</h3>
                {mintedBatches.length === 0 ? (
                  <p className="text-muted text-sm">No batches minted yet</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {mintedBatches.slice(0, 5).map((batch, i) => (
                      <div 
                        key={batch.id}
                        style={{ 
                          padding: 'var(--space-3)',
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: 'var(--radius-md)'
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                            {batch.id}
                          </span>
                          <span className="badge badge-success">Minted</span>
                        </div>
                        <div className="text-xs text-muted" style={{ marginTop: 'var(--space-1)' }}>
                          {new Date(batch.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
