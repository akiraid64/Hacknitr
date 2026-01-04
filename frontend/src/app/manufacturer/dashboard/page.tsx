'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProductDistribution {
    product: {
        product_id: number;
        product_name: string;
        gtin: string;
        batch_id: string;
        expiry_date: string;
    };
    retailers: Array<{
        retailer_id: number;
        retailer_name: string;
        retailer_email: string;
        company_name: string;
        current_quantity: number;
        total_scans: number;
    }>;
    total_retailers: number;
    total_inventory: number;
}

export default function ManufacturerDashboard() {
    const router = useRouter();
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/auth');
        } else {
            fetchAnalytics();
        }
    }, []);

    const fetchAnalytics = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/v1/manufacturer/product-analytics', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setAnalytics(data.analytics);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen p-8" style={{ background: 'var(--brutalist-cream)' }}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-black">📊 MANUFACTURER ANALYTICS</h1>
                    <button
                        onClick={() => router.push('/manufacturer')}
                        className="brutalist-btn brutalist-btn-secondary"
                    >
                        ← BACK
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-20">Loading...</div>
                ) : !analytics || analytics.total_products === 0 ? (
                    <div className="brutalist-card p-12 text-center">
                        <p className="text-2xl font-bold mb-4">No products created yet</p>
                        <button
                            onClick={() => router.push('/manufacturer')}
                            className="brutalist-btn"
                        >
                            CREATE PRODUCT
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <motion.div
                                className="brutalist-card p-6"
                                style={{ background: 'var(--brutalist-yellow)' }}
                            >
                                <div className="text-4xl font-black">{analytics.total_products}</div>
                                <div className="text-sm font-bold mt-2">PRODUCTS CREATED</div>
                            </motion.div>

                            <motion.div
                                className="brutalist-card p-6 bg-white"
                            >
                                <div className="text-4xl font-black">{analytics.total_retailers}</div>
                                <div className="text-sm font-bold mt-2">RETAILERS</div>
                            </motion.div>
                        </div>

                        {/* Product Distribution */}
                        <div className="space-y-6">
                            {analytics.product_distribution.map((pd: ProductDistribution, idx: number) => (
                                <motion.div
                                    key={idx}
                                    className="brutalist-card p-6"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    {/* Product Header */}
                                    <div className="flex justify-between items-start mb-4 pb-4 border-b-2 border-black">
                                        <div>
                                            <h3 className="text-2xl font-black">{pd.product.product_name}</h3>
                                            <p className="font-mono text-sm mt-1">GTIN: {pd.product.gtin}</p>
                                            <p className="text-sm">Batch: {pd.product.batch_id}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-black">{pd.total_inventory}</div>
                                            <div className="text-sm">units in market</div>
                                        </div>
                                    </div>

                                    {/* Retailers */}
                                    <div>
                                        <h4 className="font-black mb-3">RETAILERS ({pd.total_retailers})</h4>
                                        <div className="space-y-2">
                                            {pd.retailers.map((retailer, ridx) => (
                                                <div
                                                    key={ridx}
                                                    className="flex justify-between items-center p-3 border-2 border-black"
                                                >
                                                    <div>
                                                        <div className="font-bold">{retailer.retailer_name}</div>
                                                        <div className="text-sm">{retailer.retailer_email}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-2xl font-black">{retailer.current_quantity}</div>
                                                        <div className="text-xs">units in stock</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </>
                )}

                {/* Auto-refresh notice */}
                <div className="text-center mt-6 text-sm opacity-75">
                    🔄 Live data • Updates when retailers scan products
                </div>
            </div>
        </main>
    );
}
