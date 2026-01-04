'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Package, MapPin, Award, CheckCircle2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface ScannedProduct {
    product_id: number;
    product_name: string;
    batch_id: string;
    expiry_date: string;
    quantity_available: number;
    retailer_name: string;
    retailer_location: string;
}

interface DonationResult {
    donation_id: number;
    status: string;
    calculation: {
        market_price_per_unit: number;
        quantity: number;
        total_value_inr: number;
        goodwill_tokens_earned: number;
    };
    retailer_new_balance: number;
    timestamp: string;
}

export default function NGOPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [scanUrl, setScanUrl] = useState('');
    const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
    const [quantityReceived, setQuantityReceived] = useState('');
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState('');
    const [donationResult, setDonationResult] = useState<DonationResult | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token) {
            router.push('/auth');
        } else if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);

            // Check if NGO role
            if (parsedUser.role !== 'ngo') {
                alert('Access denied: NGO account required');
                router.push('/');
            }
        }
    }, [router]);

    const handleScanQR = async () => {
        if (!scanUrl.trim()) return;

        setLoading(true);
        setScannedProduct(null);
        setDonationResult(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/ngo/scan-donation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    scanned_url: scanUrl,
                    ngo_gps: { lat: 19.0760, lng: 72.8777 } // Demo GPS
                })
            });

            if (!res.ok) {
                if (res.status === 401) {
                    localStorage.clear();
                    router.push('/auth');
                    return;
                }
                throw new Error('Failed to scan donation');
            }

            const data = await res.json();
            setScannedProduct({
                product_id: data.product.id,
                product_name: data.product.name,
                batch_id: data.product.batch_id,
                expiry_date: data.product.expiry_date,
                quantity_available: data.product.quantity_available,
                retailer_name: data.retailer.name,
                retailer_location: data.retailer.location
            });
        } catch (err: any) {
            alert(err.message || 'Scan failed');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDonation = async () => {
        if (!scannedProduct || !quantityReceived) return;

        const qty = parseInt(quantityReceived);
        if (qty <= 0 || qty > scannedProduct.quantity_available) {
            alert(`Invalid quantity. Must be between 1 and ${scannedProduct.quantity_available}`);
            return;
        }

        setProcessing(true);
        setDonationResult(null);

        try {
            const token = localStorage.getItem('token');

            // Step 1: Scanning
            setProcessingStep('🔍 Scanning QR code...');
            await new Promise(resolve => setTimeout(resolve, 800));

            // Step 2: Product identified
            setProcessingStep(`✅ Product identified: ${scannedProduct.product_name}`);
            await new Promise(resolve => setTimeout(resolve, 800));

            // Step 3: Verifying NGO
            setProcessingStep('📍 Verifying NGO location...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 4: Market price lookup
            setProcessingStep('💰 Checking market price via Gemini...');
            await new Promise(resolve => setTimeout(resolve, 1200));

            // Step 5: Confirm donation API call
            setProcessingStep('🧮 Calculating GOODWILL tokens...');

            const res = await fetch(`${API_URL}/ngo/confirm-donation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    product_id: scannedProduct.product_id,
                    batch_id: scannedProduct.batch_id,
                    quantity_received: qty,
                    ngo_signature: 'demo_signature',
                    retailer_id: 2 // Will come from scanned data
                })
            });

            if (!res.ok) throw new Error('Donation confirmation failed');

            const result = await res.json();

            setProcessingStep('✅ DONATION CONFIRMED!');
            await new Promise(resolve => setTimeout(resolve, 1000));

            setDonationResult(result);

            // Reset form
            setScanUrl('');
            setScannedProduct(null);
            setQuantityReceived('');

        } catch (err: any) {
            alert(err.message || 'Confirmation failed');
        } finally {
            setProcessing(false);
            setProcessingStep('');
        }
    };

    const isDummyNGO = user?.email === 'test@ngo.org';

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
                        🏥 NGO PORTAL
                    </h1>
                    {user && (
                        <div className="flex items-center gap-2">
                            <span className="font-bold">{user.name}</span>
                            {isDummyNGO ? (
                                <span className="bg-orange-500 text-white px-2 py-1 text-xs font-black border-2 border-black">
                                    🧪 TEST MODE
                                </span>
                            ) : user.is_verified ? (
                                <span className="bg-green-500 text-white px-2 py-1 text-xs font-black border-2 border-black">
                                    ✅ VERIFIED
                                </span>
                            ) : (
                                <span className="bg-yellow-400 text-black px-2 py-1 text-xs font-black border-2 border-black">
                                    ⏳ PENDING
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => {
                        localStorage.clear();
                        router.push('/');
                    }}
                    className="brutalist-btn brutalist-btn-dark"
                >
                    EXIT →
                </button>
            </motion.header>

            <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-8">
                {/* QR Scanner Section */}
                <motion.div
                    className="brutalist-card p-8"
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <QrCode size={32} />
                        <h2 className="brutalist-title text-2xl">SCAN DONATION QR CODE</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block font-black mb-2">PASTE QR CODE URL</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={scanUrl}
                                    onChange={(e) => setScanUrl(e.target.value)}
                                    className="brutalist-input flex-1 mb-0"
                                    placeholder="https://toolinc.id/01/..."
                                    disabled={loading || processing}
                                />
                                <button
                                    onClick={handleScanQR}
                                    disabled={loading || processing || !scanUrl.trim()}
                                    className="brutalist-btn brutalist-btn-primary"
                                >
                                    {loading ? '⏳' : 'SCAN'}
                                </button>
                            </div>
                        </div>

                        {/* Camera placeholder */}
                        <div className="border-4 border-black bg-black text-white p-8 text-center">
                            <QrCode size={64} className="mx-auto mb-2 opacity-50" />
                            <p className="font-bold">Camera Scanner (To be implemented)</p>
                            <p className="text-sm opacity-75 mt-1">Use paste URL for now</p>
                        </div>
                    </div>
                </motion.div>

                {/* Scanned Product Details */}
                <AnimatePresence>
                    {scannedProduct && !donationResult && (
                        <motion.div
                            className="brutalist-card p-8 border-4 border-green-500"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="bg-green-500 text-white px-4 py-2 inline-block font-black mb-6">
                                ✅ PRODUCT SCANNED
                            </div>

                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h3 className="font-black text-xl mb-4">PRODUCT DETAILS</h3>
                                    <div className="space-y-2 font-mono text-sm">
                                        <p><span className="opacity-50">Name:</span> <strong>{scannedProduct.product_name}</strong></p>
                                        <p><span className="opacity-50">Batch ID:</span> {scannedProduct.batch_id}</p>
                                        <p><span className="opacity-50">Expiry:</span> {scannedProduct.expiry_date}</p>
                                        <p><span className="opacity-50">Available:</span> <strong>{scannedProduct.quantity_available} units</strong></p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-black text-xl mb-4">RETAILER INFO</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Package size={20} />
                                            <span className="font-bold">{scannedProduct.retailer_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={20} />
                                            <span>{scannedProduct.retailer_location}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quantity Input */}
                            <div className="border-t-4 border-black pt-6">
                                <label className="block font-black text-xl mb-3">HOW MANY UNITS DID YOU RECEIVE?</label>
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            value={quantityReceived}
                                            onChange={(e) => setQuantityReceived(e.target.value)}
                                            className="brutalist-input mb-0 text-2xl font-black text-center"
                                            placeholder="0"
                                            min="1"
                                            max={scannedProduct.quantity_available}
                                            disabled={processing}
                                        />
                                        <p className="text-sm mt-2 text-center opacity-75">
                                            Max: {scannedProduct.quantity_available} units
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleConfirmDonation}
                                        disabled={processing || !quantityReceived || parseInt(quantityReceived) <= 0}
                                        className="brutalist-btn brutalist-btn-primary text-xl px-8 py-4"
                                    >
                                        {processing ? '⏳ PROCESSING...' : 'CONFIRM DONATION →'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Processing Animation */}
                <AnimatePresence>
                    {processing && processingStep && (
                        <motion.div
                            className="brutalist-card p-8 bg-purple-500 border-4 border-black text-white text-center"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="text-3xl font-black mb-4 animate-pulse">
                                {processingStep}
                            </div>
                            <div className="h-2 bg-white bg-opacity-30 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-yellow-400"
                                    initial={{ width: '0%' }}
                                    animate={{ width: '100%' }}
                                    transition={{ duration: 2, ease: 'linear' }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Donation Result */}
                <AnimatePresence>
                    {donationResult && (
                        <motion.div
                            className="brutalist-card p-8 bg-yellow-400 border-4 border-black"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                        >
                            <div className="text-center mb-8">
                                <CheckCircle2 size={64} className="mx-auto mb-4 text-green-600" />
                                <h2 className="text-4xl font-black mb-2">DONATION CONFIRMED!</h2>
                                <p className="text-xl font-bold">Transaction ID: #{donationResult.donation_id}</p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-white border-4 border-black p-4 text-center">
                                    <p className="text-sm font-bold opacity-75">MARKET PRICE</p>
                                    <p className="text-3xl font-black">₹{donationResult.calculation.market_price_per_unit}</p>
                                    <p className="text-xs">per unit</p>
                                </div>
                                <div className="bg-white border-4 border-black p-4 text-center">
                                    <p className="text-sm font-bold opacity-75">TOTAL VALUE</p>
                                    <p className="text-3xl font-black">₹{donationResult.calculation.total_value_inr}</p>
                                    <p className="text-xs">{donationResult.calculation.quantity} units</p>
                                </div>
                                <div className="bg-green-500 border-4 border-black p-4 text-center text-white">
                                    <p className="text-sm font-bold">GOODWILL EARNED</p>
                                    <p className="text-3xl font-black">{donationResult.calculation.goodwill_tokens_earned}</p>
                                    <p className="text-xs">tokens</p>
                                </div>
                            </div>

                            <div className="bg-black text-white p-4 border-4 border-black text-center">
                                <p className="text-sm opacity-75">Retailer's New Balance</p>
                                <p className="text-2xl font-black">{donationResult.retailer_new_balance} GOODWILL</p>
                            </div>

                            {isDummyNGO && (
                                <div className="mt-4 bg-orange-500 text-white p-4 border-4 border-black text-center">
                                    <p className="font-black">🧪 TEST MODE - Tokens are simulated</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
