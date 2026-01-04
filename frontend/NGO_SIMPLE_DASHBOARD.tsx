// Add this to the NGO page - Simple Pending Donations Section

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

export default function NGODashboard() {
    const router = useRouter();
    const [pendingDonations, setPendingDonations] = useState<PendingDonation[]>([]);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState<number | null>(null);

    useEffect(() => {
        fetchPendingDonations();
    }, []);

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
        }
    };

    const handleVerifyDonation = async (donationId: number, quantity: number) => {
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
                alert(`✅ ${data.message}\nTokens awarded to retailer: ${data.tokens_awarded_to_retailer}`);
                fetchPendingDonations(); // Refresh list
            } else {
                alert('Failed to verify donation');
            }
        } catch (error) {
            alert('Error: ' + error);
        } finally {
            setVerifying(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">NGO Dashboard - Pending Donations</h1>

                {pendingDonations.length === 0 ? (
                    <div className="bg-white p-8 rounded-lg shadow text-center">
                        <p className="text-gray-500">No pending donations</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingDonations.map((donation) => (
                            <div key={donation.donation_id} className="bg-white p-6 rounded-lg shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold">{donation.product.name}</h3>
                                        <p className="text-gray-600">Batch: {donation.product.batch_id}</p>
                                        <p className="text-gray-600">From: {donation.retailer.name}</p>
                                        <p className="text-gray-600">Quantity: {donation.quantity_donated} units</p>
                                        <p className="text-sm text-gray-500">
                                            Date: {new Date(donation.donation_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleVerifyDonation(donation.donation_id, donation.quantity_donated)}
                                        disabled={verifying === donation.donation_id}
                                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold disabled:opacity-50"
                                    >
                                        {verifying === donation.donation_id ? 'Processing...' : '✓ VERIFY & COMPLETE'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
