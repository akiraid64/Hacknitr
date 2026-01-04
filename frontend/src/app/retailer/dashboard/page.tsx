'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DonateToNGOModal from '@/components/DonateToNGOModal';

interface InventoryItem {
    product_id: number;
    product_name: string;
    gtin: string;
    batch_id: string;
    expiry_date: string;
    days_remaining: number;
    quantity: number;
}

export default function RetailerDashboard() {
    const router = useRouter();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDonateModal, setShowDonateModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/auth');
        } else {
            fetchInventory();
        }
    }, []);

    const fetchInventory = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/v1/retailer/inventory', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setInventory(data.inventory || []);
            }
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (days: number) => {
        if (days < 0) return '#FF0000';
        if (days <= 7) return '#FFA500';
        if (days <= 30) return '#FFD700';
        return '#00FF00';
    };

    const handleDonate = (item: InventoryItem) => {
        setSelectedItem(item);
        setShowDonateModal(true);
    };

    return (
        <main className="min-h-screen p-8" style={{ background: 'var(--brutalist-cream)' }}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-black">📊 RETAILER DASHBOARD</h1>
                    <button
                        onClick={() => router.push('/retailer')}
                        className="brutalist-btn brutalist-btn-secondary"
                    >
                        ← BACK
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <motion.div
                        className="brutalist-card p-6 text-center"
                        style={{ background: 'var(--brutalist-yellow)' }}
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className="text-4xl font-black">{inventory.length}</div>
                        <div className="text-sm font-bold mt-2">PRODUCTS</div>
                    </motion.div>

                    <motion.div
                        className="brutalist-card p-6 text-center bg-white"
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className="text-4xl font-black">
                            {inventory.reduce((sum, item) => sum + item.quantity, 0)}
                        </div>
                        <div className="text-sm font-bold mt-2">TOTAL ITEMS</div>
                    </motion.div>

                    <motion.div
                        className="brutalist-card p-6 text-center"
                        style={{ background: 'var(--brutalist-red)', color: 'white' }}
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className="text-4xl font-black">
                            {inventory.filter(i => i.days_remaining <= 7).length}
                        </div>
                        <div className="text-sm font-bold mt-2">EXPIRING SOON</div>
                    </motion.div>
                </div>

                {/* Inventory Table */}
                <motion.div
                    className="brutalist-card p-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h2 className="text-2xl font-black mb-6">LIVE INVENTORY</h2>

                    {loading ? (
                        <div className="text-center py-12">Loading...</div>
                    ) : inventory.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-xl mb-4">No products scanned yet</p>
                            <button
                                onClick={() => router.push('/retailer')}
                                className="brutalist-btn"
                            >
                                SCAN QR CODE
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-4 border-black">
                                        <th className="text-left py-3 px-4 font-black">PRODUCT</th>
                                        <th className="text-left py-3 px-4 font-black">GTIN</th>
                                        <th className="text-left py-3 px-4 font-black">BATCH</th>
                                        <th className="text-left py-3 px-4 font-black">QUANTITY</th>
                                        <th className="text-left py-3 px-4 font-black">EXPIRY</th>
                                        <th className="text-left py-3 px-4 font-black">STATUS</th>
                                        <th className="text-left py-3 px-4 font-black">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventory.map((item, idx) => (
                                        <motion.tr
                                            key={idx}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="border-b-2 border-black hover:bg-yellow-50"
                                        >
                                            <td className="py-3 px-4 font-bold">{item.product_name}</td>
                                            <td className="py-3 px-4 font-mono text-sm">{item.gtin}</td>
                                            <td className="py-3 px-4">{item.batch_id}</td>
                                            <td className="py-3 px-4">
                                                <span className="px-3 py-1 bg-black text-white font-bold">
                                                    {item.quantity}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">{item.expiry_date}</td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className="px-3 py-1 font-bold text-white"
                                                    style={{ backgroundColor: getStatusColor(item.days_remaining) }}
                                                >
                                                    {item.days_remaining}D
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={() => handleDonate(item)}
                                                    className="bg-green-500 text-white px-4 py-2 font-bold border-2 border-black hover:bg-green-600"
                                                >
                                                    🎁 DONATE
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>

                {/* Auto-refresh notice */}
                <div className="text-center mt-4 text-sm opacity-75">
                    🔄 Dashboard updates in real-time when you scan products
                </div>
            </div>

            {/* Donation Modal */}
            <DonateToNGOModal
                isOpen={showDonateModal}
                onClose={() => {
                    setShowDonateModal(false);
                    setSelectedItem(null);
                    fetchInventory(); // Refresh after donation
                }}
                inventory={inventory}
            />
        </main>
    );
}
