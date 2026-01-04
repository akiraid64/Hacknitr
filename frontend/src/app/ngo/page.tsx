'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package, Award, Calendar } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface PendingDonation {
    donation_id: number;
    product: {
        name: string;
        batch_id: string;
        expiry_date: string;
    };
    quantity_donated: number;
    retailer: {
        name: string;
    };
    donation_date: string;
}

export default function NGOPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [pendingDonations, setPendingDonations] = useState<PendingDonation[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState<number | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token) {
            router.push('/auth');
            return;
        }

        if (userData && userData !== 'undefined') {
            try {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);

                // Check if NGO role
                if (parsedUser.role !== 'ngo') {
                    alert('Access denied: NGO account required');
                    router.push('/');
                }
            } catch (error) {
                console.error('Failed to parse user data:', error);
                localStorage.clear();
                router.push('/auth');
            }
        } else {
            localStorage.clear();
            router.push('/auth');
        }
    }, [router]);

    useEffect(() => {
        if (user) {
            fetchPendingDonations();
        }
    }, [user]);

    const fetchPendingDonations = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/ngo/pending-donations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setPendingDonations(data.pending_donations || []);
            }
        } catch (error) {
            console.error('Failed to fetch donations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyDonation = async (donationId: number, quantity: number) => {
        if (!confirm('Confirm that you received this donation?')) return;

        setVerifying(donationId);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/ngo/verify-donation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    donation_id: donationId,
                    actual_quantity_received: quantity,
                    notes: 'Verified and received'
                })
            });

            if (res.ok) {
                const data = await res.json();
                alert(`✅ ${data.message}\n\n💰 ${data.tokens_awarded_to_retailer} tokens awarded to retailer!`);
                fetchPendingDonations(); // Refresh list
            } else {
                const error = await res.json();
                alert('Failed: ' + (error.detail || 'Unknown error'));
            }
        } catch (error) {
            alert('Error: ' + error);
        } finally {
            setVerifying(null);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        router.push('/auth');
    };

    if (!user) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                                <Package className="text-green-600" />
                                {user.name}
                            </h1>
                            <p className="text-gray-600">NGO Portal - Pending Donations</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold"
                        >
                            EXIT →
                        </button>
                    </div>
                </div>

                {/* Pending Donations */}
                {loading ? (
                    <div className="bg-white p-8 rounded-lg shadow text-center">
                        <p className="text-gray-500">Loading donations...</p>
                    </div>
                ) : pendingDonations.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-12 rounded-lg shadow-lg text-center"
                    >
                        <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-xl text-gray-500 font-semibold">No pending donations</p>
                        <p className="text-gray-400 mt-2">Donations from retailers will appear here</p>
                    </motion.div>
                ) : (
                    <div className="grid gap-6">
                        {pendingDonations.map((donation, index) => (
                            <motion.div
                                key={donation.donation_id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-green-100 p-3 rounded-lg">
                                                <Package className="w-6 h-6 text-green-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                                                    {donation.product.name}
                                                </h3>
                                                <div className="grid md:grid-cols-2 gap-3 text-sm">
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <span className="font-semibold">From:</span>
                                                        {donation.retailer.name}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <span className="font-semibold">Batch:</span>
                                                        {donation.product.batch_id}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <span className="font-semibold">Quantity:</span>
                                                        <span className="text-lg font-bold text-green-600">
                                                            {donation.quantity_donated} units
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <Calendar className="w-4 h-4" />
                                                        {new Date(donation.donation_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="mt-3 text-xs text-gray-500">
                                                    Expiry: {new Date(donation.product.expiry_date).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleVerifyDonation(donation.donation_id, donation.quantity_donated)}
                                        disabled={verifying === donation.donation_id}
                                        className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                                    >
                                        {verifying === donation.donation_id ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Award className="w-5 h-5" />
                                                ✓ VERIFY & COMPLETE
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
