'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getDaysUntilExpiry, getExpiryStatus } from '@/lib/gs1-parser';
import { BatchStatus, formatDate } from '@/lib/solana';
import { MOCK_STORES, getAllBatches, getCriticalBatches, getNetworkStats } from '@/lib/mock-data';

// Dynamic import for Leaflet (no SSR)
const MapComponent = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => (
    <div style={{ 
      height: '400px', 
      background: 'var(--neutral-800)', 
      borderRadius: 'var(--radius-xl)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <span className="text-muted">Loading map...</span>
    </div>
  )
});

export default function DashboardPage() {
  const [stats, setStats] = useState<ReturnType<typeof getNetworkStats> | null>(null);
  const [criticalBatches, setCriticalBatches] = useState<ReturnType<typeof getCriticalBatches>>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  useEffect(() => {
    setStats(getNetworkStats());
    setCriticalBatches(getCriticalBatches(5));
  }, []);

  const storeData = MOCK_STORES.map(store => {
    const criticalCount = store.batches.filter(b => {
      const days = getDaysUntilExpiry(new Date(b.expiryDate));
      return days <= 2 && b.status !== BatchStatus.DONATED;
    }).length;
    const warningCount = store.batches.filter(b => {
      const days = getDaysUntilExpiry(new Date(b.expiryDate));
      return days > 2 && days <= 5 && b.status !== BatchStatus.DONATED;
    }).length;
    
    return {
      ...store,
      criticalCount,
      warningCount,
      status: criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'ok'
    };
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
                <span style={{ fontSize: '1.25rem' }}>📊</span>
                <span style={{ fontWeight: 600 }}>Parent Company Dashboard</span>
              </div>
            </div>
            <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
              <span className="badge badge-success">Live Data</span>
              <button className="btn btn-secondary">Export Report</button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ padding: 'var(--space-8) 0' }}>
        <div className="container">
          
          {/* Stats Overview */}
          <div className="grid grid-cols-4 gap-4" style={{ marginBottom: 'var(--space-8)' }}>
            {[
              { label: 'Active Stores', value: stats?.totalStores || 0, icon: '🏬', color: 'var(--accent-400)' },
              { label: 'Total Batches', value: stats?.totalBatches || 0, icon: '📦', color: 'var(--primary-400)' },
              { label: 'Critical Items', value: stats?.criticalBatches || 0, icon: '⚠️', color: 'var(--danger)' },
              { label: 'Donations Made', value: stats?.totalDonations || 0, icon: '❤️', color: 'var(--success)' },
            ].map(stat => (
              <div key={stat.label} className="glass-card">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-muted">{stat.label}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: stat.color }}>
                      {stat.value}
                    </div>
                  </div>
                  <span style={{ fontSize: '1.5rem' }}>{stat.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Main Grid */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 400px', gap: 'var(--space-6)' }}>
            
            {/* Map Section */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ 
                padding: 'var(--space-4) var(--space-6)', 
                borderBottom: '1px solid var(--glass-border)',
                background: 'rgba(0,0,0,0.2)'
              }}>
                <h3>Store Inventory Heatmap</h3>
                <p className="text-sm text-muted" style={{ margin: 0 }}>
                  🔴 Critical (≤2 days) | 🟡 Warning (3-5 days) | 🟢 Good
                </p>
              </div>
              <div style={{ height: '400px' }}>
                <MapComponent stores={storeData} onStoreClick={setSelectedStore} />
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="flex flex-col gap-4">
              
              {/* Token Stats */}
              <div className="glass-card">
                <h4 style={{ marginBottom: 'var(--space-4)' }}>🪙 Network Token Stats</h4>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span>$CARBON Minted</span>
                    <span style={{ color: 'var(--primary-400)', fontWeight: 600 }}>
                      {stats?.totalCarbonTokens?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>$GOOD Distributed</span>
                    <span style={{ color: 'var(--accent-400)', fontWeight: 600 }}>
                      {stats?.totalGoodTokens?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Store List */}
              <div className="glass-card" style={{ flex: 1 }}>
                <h4 style={{ marginBottom: 'var(--space-4)' }}>🏬 Store Status</h4>
                <div className="flex flex-col gap-2">
                  {storeData.map(store => (
                    <div
                      key={store.id}
                      onClick={() => setSelectedStore(store.id)}
                      style={{
                        padding: 'var(--space-3)',
                        background: selectedStore === store.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        border: `1px solid ${selectedStore === store.id ? 'var(--primary-500)' : 'transparent'}`,
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: store.status === 'critical' ? 'var(--danger)' :
                                        store.status === 'warning' ? 'var(--warning)' : 'var(--success)',
                            boxShadow: store.status === 'critical' 
                              ? '0 0 8px var(--danger)' 
                              : store.status === 'warning' 
                                ? '0 0 8px var(--warning)' 
                                : 'none'
                          }} />
                          <span style={{ fontWeight: 500 }}>{store.name}</span>
                        </div>
                        {store.criticalCount > 0 && (
                          <span className="badge badge-danger">{store.criticalCount}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted" style={{ marginLeft: '18px' }}>
                        {store.batches.length} batches
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Critical Batches Table */}
          <div className="glass-card" style={{ marginTop: 'var(--space-6)', padding: 0, overflow: 'hidden' }}>
            <div style={{ 
              padding: 'var(--space-4) var(--space-6)', 
              borderBottom: '1px solid var(--glass-border)',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  ⚠️ Critical Expiry Alert
                </h3>
                <p className="text-sm text-muted" style={{ margin: 0 }}>
                  Items expiring within 5 days across all stores
                </p>
              </div>
              <button className="btn btn-primary">
                Push Flash Discounts
              </button>
            </div>
            
            {criticalBatches.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    {['Batch', 'Store', 'Items', 'Expiry', 'Days Left', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: 'var(--space-3) var(--space-4)',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: 'var(--neutral-400)',
                        fontSize: '0.8rem',
                        background: 'rgba(0,0,0,0.2)'
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {criticalBatches.slice(0, 5).map((batch, i) => {
                    const days = getDaysUntilExpiry(new Date(batch.expiryDate));
                    const status = getExpiryStatus(new Date(batch.expiryDate));
                    
                    return (
                      <tr key={batch.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                            {batch.id}
                          </div>
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                          {batch.manufacturer}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                          {batch.itemCount}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                          {formatDate(batch.expiryDate)}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                          <span 
                            className="badge"
                            style={{
                              background: `${status.color}22`,
                              color: status.color,
                              border: `1px solid ${status.color}44`
                            }}
                          >
                            {days < 0 ? 'Expired!' : days === 0 ? 'Today!' : `${days}d`}
                          </span>
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                          <div className="flex gap-2">
                            <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                              💸 Discount
                            </button>
                            <button className="btn btn-accent" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                              🎁 Donate
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center text-muted" style={{ padding: 'var(--space-8)' }}>
                ✅ No critical items at this time
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
