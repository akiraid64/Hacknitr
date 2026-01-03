'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { parseGS1DigitalLink, getDaysUntilExpiry, getExpiryStatus } from '@/lib/gs1-parser';
import { BatchStatus, formatDate, formatRelativeTime } from '@/lib/solana';
import { MOCK_STORES, Batch } from '@/lib/mock-data';

export default function RetailerPage() {
  const [scanResult, setScanResult] = useState<string>('');
  const [parsedData, setParsedData] = useState<ReturnType<typeof parseGS1DigitalLink> | null>(null);
  const [inventory, setInventory] = useState<(Batch & { storeName?: string })[]>([]);
  const [activeTab, setActiveTab] = useState<'scan' | 'inventory'>('inventory');

  // Load mock inventory
  useEffect(() => {
    const allBatches = MOCK_STORES.flatMap(store =>
      store.batches.map(batch => ({ ...batch, storeName: store.name }))
    );
    setInventory(allBatches);
  }, []);

  const handleScanInput = (url: string) => {
    setScanResult(url);
    if (url.includes('/01/')) {
      const parsed = parseGS1DigitalLink(url);
      setParsedData(parsed);
    } else {
      setParsedData(null);
    }
  };

  const handleClaimBatch = () => {
    if (!parsedData || !parsedData.isValid) return;

    // Mock: Add to inventory
    const newBatch: Batch & { storeName?: string } = {
      id: `BATCH-${Date.now().toString(16).toUpperCase()}`,
      gtin: parsedData.gtin,
      batchNumber: parsedData.batchNumber || 'N/A',
      expiryDate: parsedData.expiryDate?.getTime() || Date.now(),
      itemCount: 50,
      weightKg: 25,
      manufacturer: 'Scanned Manufacturer',
      status: BatchStatus.IN_RETAIL_INVENTORY,
      location: 'Receiving Dock',
      createdAt: Date.now(),
      claimedAt: Date.now(),
      storeName: 'My Store',
    };

    setInventory(prev => [newBatch, ...prev]);
    setScanResult('');
    setParsedData(null);
    alert(`✅ Batch claimed! ${newBatch.itemCount} items added to inventory.`);
  };

  const markForDonation = (batchId: string) => {
    setInventory(prev =>
      prev.map(b =>
        b.id === batchId ? { ...b, status: BatchStatus.READY_FOR_DONATION } : b
      )
    );
  };

  const criticalBatches = inventory.filter(b => {
    const days = b.expiryDate ? getDaysUntilExpiry(new Date(b.expiryDate)) : 999;
    return days <= 3 && b.status !== BatchStatus.DONATED;
  });

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
                <span style={{ fontSize: '1.25rem' }}>🏪</span>
                <span style={{ fontWeight: 600 }}>Retailer Portal</span>
              </div>
            </div>
            <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
              {criticalBatches.length > 0 && (
                <span className="badge badge-danger">
                  ⚠️ {criticalBatches.length} Critical
                </span>
              )}
              <span className="badge badge-success">Devnet</span>
              <button className="btn btn-secondary">Connect Wallet</button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--glass-border)' }}>
        <div className="container">
          <div className="flex" style={{ gap: 'var(--space-1)' }}>
            {[
              { id: 'inventory', label: '📦 Inventory', count: inventory.length },
              { id: 'scan', label: '📱 Scan QR', count: null },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'scan' | 'inventory')}
                style={{
                  padding: 'var(--space-4) var(--space-6)',
                  background: activeTab === tab.id ? 'var(--glass-bg)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--primary-500)' : '2px solid transparent',
                  color: activeTab === tab.id ? 'var(--neutral-100)' : 'var(--neutral-400)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                {tab.label}
                {tab.count !== null && (
                  <span style={{
                    background: 'var(--glass-bg)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem'
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ padding: 'var(--space-8) 0' }}>
        <div className="container">
          {activeTab === 'scan' ? (
            /* Scan Tab */
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
              <div className="glass-card">
                <h2 style={{ marginBottom: 'var(--space-4)' }}>📱 Scan GS1 Digital Link</h2>
                <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>
                  Scan the QR code on the carton or paste the URL below.
                </p>
                
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="label">GS1 Digital Link URL</label>
                  <input
                    type="text"
                    value={scanResult}
                    onChange={(e) => handleScanInput(e.target.value)}
                    placeholder="https://eco.link/01/09506000134352/17/260530/10/BATCH_A1"
                    className="input"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                  />
                </div>

                <div 
                  style={{ 
                    padding: 'var(--space-8)',
                    background: 'var(--neutral-800)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center',
                    border: '2px dashed var(--neutral-600)'
                  }}
                >
                  <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>📷</div>
                  <p className="text-muted">Camera scanner would appear here</p>
                  <p className="text-xs text-muted">(Requires HTTPS in production)</p>
                </div>
              </div>

              {/* Parsed Result */}
              <div className="glass-card">
                <h2 style={{ marginBottom: 'var(--space-4)' }}>Parsed Data</h2>
                
                {parsedData ? (
                  <div>
                    <div 
                      style={{
                        padding: 'var(--space-4)',
                        background: parsedData.isValid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 'var(--radius-lg)',
                        border: `1px solid ${parsedData.isValid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        marginBottom: 'var(--space-4)'
                      }}
                    >
                      <span className={`badge ${parsedData.isValid ? 'badge-success' : 'badge-danger'}`}>
                        {parsedData.isValid ? '✓ Valid GS1' : '✗ Invalid'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <div className="text-xs text-muted">GTIN</div>
                        <div style={{ fontFamily: 'var(--font-mono)' }}>{parsedData.gtin || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted">Batch Number</div>
                        <div>{parsedData.batchNumber || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted">Expiry Date</div>
                        <div className="flex items-center gap-2">
                          {parsedData.expiryDate ? (
                            <>
                              {formatDate(parsedData.expiryDate.getTime())}
                              <span 
                                className="badge"
                                style={{
                                  background: `${getExpiryStatus(parsedData.expiryDate).color}22`,
                                  color: getExpiryStatus(parsedData.expiryDate).color,
                                  border: `1px solid ${getExpiryStatus(parsedData.expiryDate).color}44`
                                }}
                              >
                                {getExpiryStatus(parsedData.expiryDate).label}
                              </span>
                            </>
                          ) : '-'}
                        </div>
                      </div>
                    </div>

                    {parsedData.isValid && (
                      <button 
                        onClick={handleClaimBatch}
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%', marginTop: 'var(--space-6)' }}
                      >
                        ✓ Claim Batch to Inventory
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted" style={{ padding: 'var(--space-8)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>🔍</div>
                    Scan or paste a GS1 URL to see details
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Inventory Tab */
            <div>
              {/* Alerts for critical items */}
              {criticalBatches.length > 0 && (
                <div 
                  className="glass-card"
                  style={{ 
                    marginBottom: 'var(--space-6)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                      <div>
                        <strong>{criticalBatches.length} batches</strong> expiring within 3 days
                        <p className="text-sm text-muted" style={{ margin: 0 }}>
                          Consider marking for donation or applying flash discounts
                        </p>
                      </div>
                    </div>
                    <button className="btn btn-primary">
                      Mark All for Donation
                    </button>
                  </div>
                </div>
              )}

              {/* Inventory Table */}
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      {['Batch ID', 'Product', 'Items', 'Expiry', 'Status', 'Actions'].map(header => (
                        <th 
                          key={header}
                          style={{
                            padding: 'var(--space-4)',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: 'var(--neutral-300)',
                            fontSize: '0.875rem',
                            background: 'rgba(0,0,0,0.2)'
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((batch, index) => {
                      const expiryStatus = getExpiryStatus(new Date(batch.expiryDate));
                      const daysLeft = getDaysUntilExpiry(new Date(batch.expiryDate));
                      
                      return (
                        <tr 
                          key={batch.id}
                          style={{ 
                            borderBottom: index < inventory.length - 1 ? '1px solid var(--glass-border)' : 'none',
                            background: expiryStatus.status === 'critical' ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: 'var(--space-4)' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                              {batch.id}
                            </div>
                            <div className="text-xs text-muted">GTIN: {batch.gtin}</div>
                          </td>
                          <td style={{ padding: 'var(--space-4)' }}>
                            <div>{batch.manufacturer}</div>
                            <div className="text-xs text-muted">Batch: {batch.batchNumber}</div>
                          </td>
                          <td style={{ padding: 'var(--space-4)' }}>
                            <div style={{ fontWeight: 600 }}>{batch.itemCount}</div>
                            <div className="text-xs text-muted">{batch.weightKg} kg</div>
                          </td>
                          <td style={{ padding: 'var(--space-4)' }}>
                            <div>{formatDate(batch.expiryDate)}</div>
                            <span 
                              className="badge"
                              style={{
                                background: `${expiryStatus.color}22`,
                                color: expiryStatus.color,
                                border: `1px solid ${expiryStatus.color}44`
                              }}
                            >
                              {daysLeft < 0 ? 'Expired' : daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                            </span>
                          </td>
                          <td style={{ padding: 'var(--space-4)' }}>
                            <span className={`badge ${
                              batch.status === BatchStatus.READY_FOR_DONATION ? 'badge-warning' :
                              batch.status === BatchStatus.DONATED ? 'badge-success' : 'badge-info'
                            }`}>
                              {batch.status === BatchStatus.READY_FOR_DONATION ? '📦 Ready for Pickup' :
                               batch.status === BatchStatus.DONATED ? '✅ Donated' : '🏪 In Stock'}
                            </span>
                          </td>
                          <td style={{ padding: 'var(--space-4)' }}>
                            {batch.status === BatchStatus.IN_RETAIL_INVENTORY ? (
                              <button 
                                className="btn btn-secondary"
                                onClick={() => markForDonation(batch.id)}
                                style={{ padding: 'var(--space-2) var(--space-4)' }}
                              >
                                🎁 Mark for Donation
                              </button>
                            ) : batch.status === BatchStatus.READY_FOR_DONATION ? (
                              <span className="text-muted text-sm">Awaiting NGO pickup</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
