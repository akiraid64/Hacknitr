'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface ScanResult {
    gtin: string;
    batch: string;
    expiry_date: string;
    days_remaining: number;
}

interface InventoryItem {
    product_id: number;
    product_name: string;
    gtin: string;
    batch_id: string;
    expiry_date: string;
    days_remaining: number;
}

interface AIRecommendation {
    discounts: Array<{
        product_id: number;
        product_name: string;
        discount_percentage: number;
        reason: string;
        context: string;
    }>;
    bundles: Array<{
        bundle_name: string;
        product_ids: number[];
        products: Array<{ name: string; gtin: string }>;
        discount_percentage: number;
        reason: string;
    }>;
}

export default function RetailerDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [manualUrl, setManualUrl] = useState('');
    const [scanResult, setScanResult] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (!token) {
            router.push('/auth');
        } else if (userData) {
            setUser(JSON.parse(userData));
            fetchInventory();
        }
    }, [router]);

    const fetchInventory = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/v1/retailer/inventory', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setInventory(data.inventory || []);
            }
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
        }
    };

    const getAIRecommendations = async () => {
        setIsLoadingAI(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/v1/retailer/get-ai-recommendations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setAiRecommendations(data.recommendations?.recommendations || null);
            } else {
                alert('Failed to get AI recommendations');
            }
        } catch (error) {
            console.error('AI recommendations error:', error);
            alert('Error getting recommendations');
        } finally {
            setIsLoadingAI(false);
        }
    };

    const scanUrl = async (url: string) => {
        setLoading(true);
        setScanResult(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/retailer/scan-item`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ scanned_url: url })
            });

            if (!res.ok) {
                if (res.status === 401) {
                    localStorage.clear();
                    router.push('/auth');
                    return;
                }
                throw new Error('Scan failed');
            }

            const data = await res.json();
            setScanResult(data);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleManualScan = () => {
        if (manualUrl.trim()) {
            scanUrl(manualUrl);
        }
    };

    const addToInventory = () => {
        if (scanResult) {
            setInventory(prev => [
                {
                    name: `GTIN: ${scanResult.gtin.slice(0, 8)}...`,
                    qty: 1,
                    daysLeft: scanResult.days_remaining
                },
                ...prev
            ]);
            setScanResult(null);
            setManualUrl('');
        }
    };

    // Handle QR image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('http://localhost:8000/retailer/scan-qr-image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(errorData.detail || 'Failed to scan QR code');
            }

            const data = await res.json();
            setScanResult(data);
            alert(`✅ QR Scanned!\nProduct: ${data.gtin}\nBatch: ${data.batch}\nExpiry: ${data.expiry_date}\nDays Left: ${data.days_remaining}`);
        } catch (error) {
            console.error('Upload error:', error);
            alert('❌ Failed to scan QR code from image');
        } finally {
            setIsUploading(false);
        }
    };

    const logout = () => {
        localStorage.clear();
        router.push('/');
    };

    const getStatusColor = (days: number) => {
        if (days < 0) return { bg: '#FF0000', text: 'EXPIRED' };
        if (days <= 2) return { bg: 'var(--brutalist-yellow)', text: 'DONATE NOW' };
        if (days <= 7) return { bg: '#FFA500', text: 'WARNING' };
        return { bg: '#00FF00', text: 'GOOD' };
    };

    return (
        <main className="min-h-screen" style={{ background: 'var(--brutalist-cream)' }}>
            {/* Header */}
            <motion.header
                className="flex justify-between items-center p-6 border-b-4 border-black"
                initial={{ y: -50 }}
                animate={{ y: 0 }}
            >
                <div className="flex items-center gap-4">
                    <h1 className="brutalist-title text-3xl md:text-4xl" style={{ background: 'var(--brutalist-yellow)', padding: '0.25rem 0.5rem' }}>
                        🛒 RETAIL OPS
                    </h1>
                    {user && <span className="font-bold hidden md:inline">Welcome, {user.name}</span>}
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push('/retailer/dashboard')}
                        className="brutalist-btn"
                    >
                        📊 DASHBOARD
                    </button>
                    <button onClick={logout} className="brutalist-btn brutalist-btn-dark">
                        EXIT →
                    </button>
                </div>
            </motion.header>

            <div className="p-6 md:p-12 max-w-7xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8">

                    {/* Scanner Section */}
                    <motion.div
                        className="brutalist-card p-8"
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2 className="brutalist-title text-2xl mb-6" style={{ background: 'black', color: 'white', display: 'inline-block', padding: '0.25rem 0.5rem' }}>
                            SCAN INCOMING
                        </h2>

                        {/* QR Image Upload */}
                        <div className="mt-6 aspect-square bg-yellow-400 border-4 border-black flex items-center justify-center">
                            <div className="text-center p-8">
                                <div className="text-6xl mb-4">📤</div>
                                <label
                                    htmlFor="qr-upload"
                                    className={`brutalist-btn brutalist-btn-dark text-lg cursor-pointer inline-block ${isUploading ? 'opacity-50' : ''}`}
                                >
                                    {isUploading ? '⏳ UPLOADING...' : 'UPLOAD QR IMAGE'}
                                </label>
                                <input
                                    id="qr-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={isUploading}
                                    className="hidden"
                                />
                                <p className="text-sm mt-4 font-mono">Upload PNG/JPG of QR code</p>
                            </div>
                        </div>

                        {/* Manual Entry */}
                        <div className="mt-6">
                            <label className="block font-black mb-2">OR PASTE URL</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualUrl}
                                    onChange={(e) => setManualUrl(e.target.value)}
                                    className="brutalist-input flex-1 mb-0"
                                    placeholder="https://id.yourdomain.com/01/..."
                                />
                                <button
                                    onClick={handleManualScan}
                                    disabled={loading}
                                    className="brutalist-btn brutalist-btn-primary"
                                >
                                    {loading ? '⏳' : 'GO'}
                                </button>
                            </div>
                        </div>

                        {/* Scan Result */}
                        <AnimatePresence>
                            {scanResult && (
                                <motion.div
                                    className="mt-6 p-6 border-4 border-black"
                                    style={{ background: 'black', color: 'white' }}
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                >
                                    <div className="inline-block px-2 py-1 font-black mb-4" style={{ background: 'var(--brutalist-yellow)', color: 'black' }}>
                                        ✅ SCAN SUCCESS
                                    </div>

                                    <div className="space-y-2 font-mono">
                                        <p><span className="opacity-50">GTIN:</span> {scanResult.gtin}</p>
                                        <p><span className="opacity-50">BATCH:</span> {scanResult.batch}</p>
                                        <p><span className="opacity-50">EXPIRY:</span> {scanResult.expiry_date}</p>
                                    </div>

                                    <div
                                        className="mt-4 p-4 text-center font-black text-xl border-4"
                                        style={{
                                            background: getStatusColor(scanResult.days_remaining).bg,
                                            color: scanResult.days_remaining <= 2 ? 'black' : 'white',
                                            borderColor: 'white'
                                        }}
                                    >
                                        {scanResult.days_remaining < 0
                                            ? `EXPIRED ${Math.abs(scanResult.days_remaining)} DAYS AGO`
                                            : `${scanResult.days_remaining} DAYS REMAINING`
                                        }
                                    </div>

                                    <button
                                        onClick={addToInventory}
                                        className="brutalist-btn brutalist-btn-secondary w-full mt-4"
                                    >
                                        ADD TO INVENTORY →
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Inventory Section */}
                    <motion.div
                        className="brutalist-card p-8"
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h2 className="brutalist-title text-2xl mb-6" style={{ background: 'var(--brutalist-red)', color: 'white', display: 'inline-block', padding: '0.25rem 0.5rem' }}>
                            LIVE INVENTORY
                        </h2>

                        <div className="mt-6 border-4 border-black max-h-[500px] overflow-y-auto">
                            {inventory.map((item, idx) => {
                                const status = getStatusColor(item.days_remaining);
                                return (
                                    <motion.div
                                        key={idx}
                                        className="p-4 border-b-4 border-black last:border-b-0 flex justify-between items-center"
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: idx * 0.1 }}
                                    >
                                        <div>
                                            <div className="font-black">{item.product_name}</div>
                                            <div className="text-sm opacity-75">Batch: {item.batch_id}</div>
                                        </div>
                                        <div
                                            className="px-3 py-1 font-black text-sm border-2 border-black"
                                            style={{ background: status.bg, color: item.days_remaining <= 2 ? 'black' : 'white' }}
                                        >
                                            {item.days_remaining}D
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Quick Stats */}
                        <div className="mt-8 grid grid-cols-3 gap-4">
                            <div className="text-center p-4 border-4 border-black" style={{ background: 'var(--brutalist-yellow)' }}>
                                <div className="text-2xl font-black">{inventory.length}</div>
                                <div className="text-xs font-bold">PRODUCTS</div>
                            </div>
                            <div className="text-center p-4 border-4 border-black" style={{ background: 'var(--brutalist-red)', color: 'white' }}>
                                <div className="text-2xl font-black">
                                    {inventory.filter(i => i.days_remaining <= 2).length}
                                </div>
                                <div className="text-xs font-bold">CRITICAL</div>
                            </div>
                            <div className="text-center p-4 border-4 border-black bg-black text-white">
                                <div className="text-2xl font-black">
                                    {inventory.length}
                                </div>
                                <div className="text-xs font-bold">TOTAL QTY</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
