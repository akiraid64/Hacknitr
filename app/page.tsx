'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const roles = [
    {
      id: 'manufacturer',
      title: 'Manufacturer',
      description: 'Mint product batches as cNFTs with GS1 Digital Link QR codes',
      icon: '🏭',
      href: '/manufacturer',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      features: ['Mint Batch cNFTs', 'Generate QR Codes', 'Track Shipments'],
    },
    {
      id: 'retailer',
      title: 'Retailer',
      description: 'Scan, claim inventory, and manage expiring products',
      icon: '🏪',
      href: '/retailer',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      features: ['QR Scanner', 'Inventory Management', 'Donation Marking'],
    },
    {
      id: 'dashboard',
      title: 'Parent Company',
      description: 'Real-time heatmap dashboard for all franchise locations',
      icon: '📊',
      href: '/dashboard',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      features: ['Live Heatmap', 'Expiry Alerts', 'Flash Discounts'],
    },
    {
      id: 'ngo',
      title: 'NGO Partner',
      description: 'Verify donations and earn sustainability rewards',
      icon: '🤝',
      href: '/ngo',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      features: ['Pickup Verification', '$CARBON Rewards', 'Impact Reports'],
    },
  ];

  const stats = [
    { label: 'Items Tracked', value: '2.4M+', icon: '📦' },
    { label: 'Carbon Saved', value: '847 tons', icon: '🌱' },
    { label: 'Donations Made', value: '156K', icon: '❤️' },
    { label: 'Active Stores', value: '3,200', icon: '🏬' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <header style={{ padding: 'var(--space-6) 0' }}>
        <div className="container">
          <nav className="flex justify-between items-center" style={{ marginBottom: 'var(--space-16)' }}>
            <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
              <span style={{ fontSize: '2rem' }}>🔗</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                <span className="text-gradient">EcoLink</span>
              </span>
            </div>
            <div className="flex items-center" style={{ gap: 'var(--space-4)' }}>
              <span className="badge badge-success">Devnet</span>
              <button className="btn btn-secondary">Connect Wallet</button>
            </div>
          </nav>

          <div className="text-center" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h1 
              className={mounted ? 'animate-fade-in-up' : ''} 
              style={{ marginBottom: 'var(--space-6)' }}
            >
              Circular Supply Chain on{' '}
              <span className="text-gradient">Solana</span>
            </h1>
            <p 
              className={`text-muted ${mounted ? 'animate-fade-in-up' : ''}`}
              style={{ 
                fontSize: '1.25rem', 
                marginBottom: 'var(--space-8)',
                animationDelay: '0.1s'
              }}
            >
              Track millions of products using compressed NFTs. Automate expiry management 
              with GS1 Digital Link. Turn saved waste into <strong style={{ color: 'var(--primary-400)' }}>$CARBON</strong> tokens.
            </p>
            <div 
              className={`flex justify-center ${mounted ? 'animate-fade-in-up' : ''}`} 
              style={{ gap: 'var(--space-4)', animationDelay: '0.2s' }}
            >
              <Link href="/manufacturer" className="btn btn-primary btn-lg">
                Start Minting
              </Link>
              <Link href="/dashboard" className="btn btn-secondary btn-lg">
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section style={{ padding: 'var(--space-12) 0' }}>
        <div className="container">
          <div className="grid grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div 
                key={stat.label}
                className={`glass-card text-center ${mounted ? 'animate-fade-in-up' : ''}`}
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: 'var(--space-2)' }}>
                  {stat.icon}
                </span>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-400)' }}>
                  {stat.value}
                </div>
                <div className="text-muted text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Selection */}
      <section style={{ padding: 'var(--space-12) 0 var(--space-16)' }}>
        <div className="container">
          <h2 className="text-center" style={{ marginBottom: 'var(--space-3)' }}>
            Select Your Role
          </h2>
          <p className="text-center text-muted" style={{ marginBottom: 'var(--space-10)', maxWidth: '600px', margin: '0 auto var(--space-10)' }}>
            Each stakeholder has a specialized portal for their workflow
          </p>

          <div className="grid grid-cols-2 gap-8">
            {roles.map((role, index) => (
              <Link
                key={role.id}
                href={role.href}
                className={`glass-card ${mounted ? 'animate-fade-in-up' : ''}`}
                style={{ 
                  animationDelay: `${0.1 * index}s`,
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                }}
              >
                <div className="flex items-center" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                  <div 
                    style={{ 
                      width: '60px', 
                      height: '60px', 
                      borderRadius: 'var(--radius-xl)',
                      background: role.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.75rem',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
                    }}
                  >
                    {role.icon}
                  </div>
                  <div>
                    <h3 style={{ marginBottom: 'var(--space-1)' }}>{role.title}</h3>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>{role.description}</p>
                  </div>
                </div>
                <div className="flex" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {role.features.map((feature) => (
                    <span 
                      key={feature}
                      className="badge"
                      style={{ 
                        background: 'rgba(255,255,255,0.06)',
                        color: 'var(--neutral-300)',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section style={{ padding: 'var(--space-12) 0', background: 'rgba(0,0,0,0.2)' }}>
        <div className="container">
          <h2 className="text-center" style={{ marginBottom: 'var(--space-10)' }}>
            How It Works
          </h2>
          <div className="grid grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Mint', desc: 'Manufacturer creates cNFT with GS1 QR', icon: '🏭' },
              { step: '2', title: 'Scan', desc: 'Retailer scans to claim inventory', icon: '📱' },
              { step: '3', title: 'Monitor', desc: 'Dashboard shows expiry heatmap', icon: '🗺️' },
              { step: '4', title: 'Donate', desc: 'NGO verifies pickup, burns cNFT', icon: '🎁' },
            ].map((item, index) => (
              <div 
                key={item.step} 
                className="glass-card text-center"
                style={{ position: 'relative' }}
              >
                <div 
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '24px',
                    height: '24px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--primary-500)',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {item.step}
                </div>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 'var(--space-3)' }}>
                  {item.icon}
                </span>
                <h4 style={{ marginBottom: 'var(--space-2)' }}>{item.title}</h4>
                <p className="text-muted text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: 'var(--space-8) 0', borderTop: '1px solid var(--glass-border)' }}>
        <div className="container">
          <div className="flex justify-between items-center">
            <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
              <span>🔗</span>
              <span className="text-gradient" style={{ fontWeight: 600 }}>EcoLink</span>
              <span className="text-muted text-sm">| Built on Solana Devnet</span>
            </div>
            <div className="flex items-center" style={{ gap: 'var(--space-4)' }}>
              <span className="text-muted text-sm">Hackathon 2026</span>
              <span className="badge badge-info">v1.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
