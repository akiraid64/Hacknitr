'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { parseGS1DigitalLink, getDaysUntilExpiry } from '@/lib/gs1-parser';
import { BatchStatus, formatDate, calculateCarbonCredits, calculateGoodTokens, getExplorerUrl } from '@/lib/solana';
import { MOCK_STORES, MOCK_DONATIONS, MOCK_NGOS, Batch } from '@/lib/mock-data';

interface PendingDonation {
  batch: Batch;
  storeName: string;
  storeId: string;
}

export default function NGOPage() {
  const [pendingDonations, setPendingDonations] = useState<PendingDonation[]>([]);
  const [completedDonations, setCompletedDonations] = useState(MOCK_DONATIONS);
  const [scanResult, setScanResult] = useState('');
  const [selectedDonation, setSelectedDonation] = useState<PendingDonation | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  // Stats
  const ngo = MOCK_NGOS[0];
  const totalStats = {
    totalDonations: completedDonations.length,
    totalCarbonTokens: completedDonations.reduce((sum, d) => sum + d.carbonTokens, 0),
    totalGoodTokens: completedDonations.reduce((sum, d) => sum + d.goodTokens, 0),
    totalWeight: 847, // Mock
  };

  useEffect(() => {
    // Get batches marked for donation
    const pending: PendingDonation[] = [];
    MOCK_STORES.forEach(store => {
      store.batches.forEach(batch => {
        if (batch.status === BatchStatus.READY_FOR_DONATION) {
          pending.push({
            batch,
            storeName: store.name,
            storeId: store.id,
          });
        }
      });
    });
    setPendingDonations(pending);
  }, []);

  const handleVerifyDonation = async (donation: PendingDonation) => {
    if (!walletConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setIsVerifying(true);
    setSelectedDonation(donation);

    // Simulate blockchain transaction
    await new Promise(resolve => setTimeout(resolve, 2000));

    const carbonTokens = calculateCarbonCredits(donation.batch.weightKg);
    const goodTokens = calculateGoodTokens(donation.batch.itemCount);

    // Create mock transaction signature
    const txSignature = Array.from({ length: 64 }, () =>
      '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]
    ).join('');

    // Add to completed donations
    setCompletedDonations(prev => [{
      id: `don-${Date.now()}`,
      batchId: donation.batch.id,
      storeId: donation.storeId,
      ngoId: ngo.id,
      carbonTokens,
      goodTokens,
      verifiedAt: Date.now(),
      txSignature,
    }, ...prev]);

    // Remove from pending
    setPendingDonations(prev => prev.filter(p => p.batch.id !== donation.batch.id));

    setIsVerifying(false);
    setSelectedDonation(null);

    alert(`✅ Donation verified!\n\n🪙 ${carbonTokens} $CARBON minted\n✨ ${goodTokens} $GOOD minted\n\nTx: ${txSignature.slice(0, 20)}...`);
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
                <span style={{ fontSize: '1.25rem' }}>🤝</span>
                <span style={{ fontWeight: 600 }}>NGO Partner Portal</span>
              </div>
            </div>
            <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
              {pendingDonations.length > 0 && (
                <span className="badge badge-warning">
                  📦 {pendingDonations.length} Pending Pickups
                </span>
              )}
              <button 
                className={`btn ${walletConnected ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setWalletConnected(!walletConnected)}
              >
                {walletConnected ? '✓ Wallet Connected' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ padding: 'var(--space-8) 0' }}>
        <div className="container">

          {/* NGO Info Card */}
          <div className="glass-card" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: 'var(--radius-xl)',
                  background: 'linear-gradient(135deg, var(--warning), #d97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem'
                }}>
                  🏛️
                </div>
                <div>
                  <h2 style={{ margin: 0 }}>{ngo.name}</h2>
                  <p className="text-muted text-sm" style={{ margin: 0 }}>{ngo.contactEmail}</p>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-400)' }}>
                    {totalStats.totalCarbonTokens.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted">$CARBON Earned</div>
                </div>
                <div className="text-center">
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-400)' }}>
                    {totalStats.totalGoodTokens.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted">$GOOD Earned</div>
                </div>
                <div className="text-center">
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                    {totalStats.totalDonations}
                  </div>
                  <div className="text-xs text-muted">Donations Verified</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 400px', gap: 'var(--space-6)' }}>

            {/* Pending Donations */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: 'var(--space-4) var(--space-6)',
                borderBottom: '1px solid var(--glass-border)',
                background: 'rgba(245, 158, 11, 0.1)'
              }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  📦 Pending Pickups
                </h3>
                <p className="text-sm text-muted" style={{ margin: 0 }}>
                  Batches ready for donation - scan QR to verify pickup
                </p>
              </div>

              {pendingDonations.length > 0 ? (
                <div className="flex flex-col">
                  {pendingDonations.map((donation, i) => {
                    const days = getDaysUntilExpiry(new Date(donation.batch.expiryDate));
                    const carbonEst = calculateCarbonCredits(donation.batch.weightKg);
                    const goodEst = calculateGoodTokens(donation.batch.itemCount);

                    return (
                      <div
                        key={donation.batch.id}
                        style={{
                          padding: 'var(--space-4) var(--space-6)',
                          borderBottom: i < pendingDonations.length - 1 ? '1px solid var(--glass-border)' : 'none',
                          background: isVerifying && selectedDonation?.batch.id === donation.batch.id
                            ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-2)' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                {donation.batch.id}
                              </span>
                              <span className={`badge ${days <= 1 ? 'badge-danger' : 'badge-warning'}`}>
                                {days <= 0 ? 'Expires today!' : `${days}d left`}
                              </span>
                            </div>
                            <div className="text-sm text-muted">
                              From: <strong>{donation.storeName}</strong>
                            </div>
                            <div className="text-sm">
                              {donation.batch.itemCount} items • {donation.batch.weightKg} kg
                            </div>
                            <div className="flex gap-4" style={{ marginTop: 'var(--space-2)' }}>
                              <span className="text-xs" style={{ color: 'var(--primary-400)' }}>
                                +{carbonEst} $CARBON
                              </span>
                              <span className="text-xs" style={{ color: 'var(--accent-400)' }}>
                                +{goodEst} $GOOD
                              </span>
                            </div>
                          </div>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleVerifyDonation(donation)}
                            disabled={isVerifying || !walletConnected}
                            style={{ minWidth: '140px' }}
                          >
                            {isVerifying && selectedDonation?.batch.id === donation.batch.id ? (
                              <>⏳ Verifying...</>
                            ) : (
                              <>✓ Verify Pickup</>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted" style={{ padding: 'var(--space-8)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>📭</div>
                  No pending donations at this time
                </div>
              )}
            </div>

            {/* QR Scanner & Recent Activity */}
            <div className="flex flex-col gap-4">

              {/* QR Scanner */}
              <div className="glass-card">
                <h4 style={{ marginBottom: 'var(--space-4)' }}>📱 Quick Scan</h4>
                <input
                  type="text"
                  value={scanResult}
                  onChange={(e) => setScanResult(e.target.value)}
                  placeholder="Scan or paste GS1 URL..."
                  className="input"
                  style={{ marginBottom: 'var(--space-3)' }}
                />
                <div
                  style={{
                    padding: 'var(--space-6)',
                    background: 'var(--neutral-800)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center',
                    border: '2px dashed var(--neutral-600)'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>📷</div>
                  <p className="text-xs text-muted">Point camera at carton QR code</p>
                </div>
              </div>

              {/* Recent Verifications */}
              <div className="glass-card" style={{ flex: 1 }}>
                <h4 style={{ marginBottom: 'var(--space-4)' }}>✅ Recent Verifications</h4>
                <div className="flex flex-col gap-3">
                  {completedDonations.slice(0, 5).map(donation => (
                    <div
                      key={donation.id}
                      style={{
                        padding: 'var(--space-3)',
                        background: 'rgba(34, 197, 94, 0.05)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(34, 197, 94, 0.2)'
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm" style={{ fontWeight: 500 }}>
                            {donation.batchId}
                          </div>
                          <div className="text-xs text-muted">
                            {formatDate(donation.verifiedAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs" style={{ color: 'var(--primary-400)' }}>
                            +{donation.carbonTokens} $CARBON
                          </div>
                          <div className="text-xs" style={{ color: 'var(--accent-400)' }}>
                            +{donation.goodTokens} $GOOD
                          </div>
                        </div>
                      </div>
                      <a
                        href={getExplorerUrl('tx', donation.txSignature)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs"
                        style={{ color: 'var(--neutral-400)' }}
                      >
                        View on Explorer →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="glass-card" style={{ marginTop: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 'var(--space-4)' }}>🔄 Double-Handshake Verification</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { step: '1', title: 'Notification', desc: 'Receive pickup alert from retailer', icon: '📲' },
                { step: '2', title: 'Arrive', desc: 'Go to store location', icon: '🚚' },
                { step: '3', title: 'Scan', desc: 'Scan carton QR code', icon: '📱' },
                { step: '4', title: 'Verify', desc: 'Both signatures burn cNFT, mint tokens', icon: '✅' },
              ].map(item => (
                <div key={item.step} className="text-center">
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    margin: '0 auto var(--space-3)'
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>{item.title}</div>
                  <div className="text-xs text-muted">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
