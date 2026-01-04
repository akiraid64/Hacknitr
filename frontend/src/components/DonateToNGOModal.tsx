'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, QrCode, CheckCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface NGO {
    id: number;
    name: string;
    email: string;
    city: string;
    is_verified: boolean;
}

interface InventoryItem {
    id: number;
    product_id: number;
    batch_id: string;
    product_name: string;
    quantity_in_stock: number;
    days_to_expiry: number;
    expiry_date: string;
}

interface DonationResult {
    donation_id: number;
    qr_code_image: string;
    qr_code_url: string;
    ngo: {
        name: string;
        email: string;
    };
    product: {
        name: string;
        quantity: number;
    };
}

export default function DonateToNGOModal({ isOpen, onClose, inventory }: {
    isOpen: boolean;
    onClose: () => void;
    inventory: InventoryItem[];
}) {
    const router = useRouter();
    const [ngos, setNgos] = useState<NGO[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
    const [selectedNGO, setSelectedNGO] = useState<number | null>(null);
    const [quantity, setQuantity] = useState('');
    const [loading, setLoading] = useState(false);
    const [donationResult, setDonationResult] = useState<DonationResult | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchNGOs();
        }
    }, [isOpen]);

    const fetchNGOs = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/retailer/available-ngos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch NGOs');
            const data = await res.json();
            setNgos(data.ngos);
        } catch (err) {
            console.error(err);
            alert('Failed to load NGOs');
        }
    };

    const handleCreateDonation = async () => {
        if (!selectedProduct || !selectedNGO || !quantity) {
            alert('Please fill all fields');
            return;
        }

        const product = inventory.find(p => p.product_id === selectedProduct);
        if (!product) return;

        const qty = parseInt(quantity);
        if (qty <= 0 || qty > product.quantity_in_stock) {
            alert(`Invalid quantity. Max: ${product.quantity_in_stock}`);
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/retailer/create-donation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    product_id: selectedProduct,
                    batch_id: product.batch_id,
                    ngo_id: selectedNGO,
                    quantity: qty
                })
            });

            if (!res.ok) throw new Error('Failed to create donation');

            const data = await res.json();
            setDonationResult(data);

        } catch (err: any) {
            alert(err.message || 'Failed to create donation');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setDonationResult(null);
        setSelectedProduct(null);
        setSelectedNGO(null);
        setQuantity('');
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <motion.div
                className="bg-white border-4 border-black max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                {/* Header */}
                <div className="bg-yellow-400 border-b-4 border-black p-6 flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <Gift size={32} className="text-black" />
                        <h2 className="text-3xl font-black text-black">DONATE TO NGO</h2>
                    </div>
                    <button onClick={handleClose} className="text-black hover:scale-110 transition-transform">
                        <X size={32} />
                    </button>
                </div>

                <div className="p-6">
                    {!donationResult ? (
                        <div className="space-y-6">
                            {/* Select Product */}
                            <div>
                                <label className="block font-black text-xl mb-3">1. SELECT PRODUCT TO DONATE</label>
                                <select
                                    value={selectedProduct || ''}
                                    onChange={(e) => setSelectedProduct(Number(e.target.value))}
                                    className="w-full border-4 border-black p-3 font-bold text-lg"
                                >
                                    <option value="">-- Choose Product --</option>
                                    {inventory
                                        .filter(item => item.days_to_expiry <= 7) // Only show expiring items
                                        .map(item => (
                                            <option key={item.product_id} value={item.product_id}>
                                                {item.product_name} | Stock: {item.quantity_in_stock} | Expires in {item.days_to_expiry} days
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Select NGO */}
                            <div>
                                <label className="block font-black text-xl mb-3">2. SELECT NGO</label>
                                <div className="space-y-3 max-h-64 overflow-y-auto border-4 border-black p-4">
                                    {ngos.map(ngo => (
                                        <div
                                            key={ngo.id}
                                            onClick={() => setSelectedNGO(ngo.id)}
                                            className={`p-4 border-4 cursor-pointer transition-all ${selectedNGO === ngo.id
                                                ? 'border-green-500 bg-green-100'
                                                : 'border-black bg-gray-50 hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-black text-lg">{ngo.name}</p>
                                                    <p className="text-sm text-gray-600">{ngo.email}</p>
                                                    {ngo.city && <p className="text-sm">📍 {ngo.city}</p>}
                                                </div>
                                                <div>
                                                    {ngo.email === 'test@ngo.org' && (
                                                        <span className="bg-orange-500 text-white px-2 py-1 text-xs font-black">
                                                            🧪 TEST
                                                        </span>
                                                    )}
                                                    {ngo.is_verified && ngo.email !== 'test@ngo.org' && (
                                                        <span className="bg-green-500 text-white px-2 py-1 text-xs font-black">
                                                            ✅ VERIFIED
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="block font-black text-xl mb-3">3. QUANTITY TO DONATE</label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="w-full border-4 border-black p-3 font-bold text-lg text-center"
                                    placeholder="Enter quantity"
                                    min="1"
                                />
                                {selectedProduct && (
                                    <p className="text-sm text-gray-600 mt-2">
                                        Max available: {inventory.find(i => i.product_id === selectedProduct)?.quantity_in_stock || 0}
                                    </p>
                                )}
                            </div>

                            {/* Create Button */}
                            <button
                                onClick={handleCreateDonation}
                                disabled={loading || !selectedProduct || !selectedNGO || !quantity}
                                className="w-full bg-green-500 text-white border-4 border-black p-4 font-black text-xl hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                            >
                                {loading ? '⏳ CREATING...' : 'CREATE DONATION →'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Success Message */}
                            <div className="text-center">
                                <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
                                <h3 className="text-3xl font-black mb-2">DONATION CREATED!</h3>
                                <p className="text-lg font-bold">Donation ID: #{donationResult.donation_id}</p>
                            </div>

                            {/* Details */}
                            <div className="bg-gray-100 border-4 border-black p-4">
                                <p className="font-bold mb-2">📦 Product: {donationResult.product.name}</p>
                                <p className="font-bold mb-2">🎁 Quantity: {donationResult.product.quantity}</p>
                                <p className="font-bold mb-2">🏥 NGO: {donationResult.ngo.name}</p>
                                <p className="font-bold">📧 {donationResult.ngo.email}</p>
                            </div>

                            {/* QR Code */}
                            <div className="border-4 border-black p-6 bg-white text-center">
                                <QrCode size={32} className="mx-auto mb-2" />
                                <h4 className="text-xl font-black mb-4">QR CODE FOR NGO TO SCAN</h4>
                                <div className="bg-white inline-block p-4 border-4 border-black">
                                    {donationResult.qr_code_image && (
                                        <img
                                            src={donationResult.qr_code_image}
                                            alt="Donation QR Code"
                                            className="w-64 h-64"
                                            id="donation-qr-code"
                                        />
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 mt-4 font-bold">
                                    Share this QR code with the NGO. They scan it to confirm receipt.
                                </p>

                                {/* Download Button */}
                                <button
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = donationResult.qr_code_image;
                                        link.download = `donation-${donationResult.donation_id}-qr.png`;
                                        link.click();
                                    }}
                                    className="mt-4 bg-blue-500 text-white border-4 border-black px-6 py-3 font-black hover:bg-blue-600 w-full"
                                >
                                    ⬇️ DOWNLOAD QR CODE
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={handleReset}
                                    className="bg-blue-500 text-white border-4 border-black p-3 font-black hover:bg-blue-600"
                                >
                                    CREATE ANOTHER
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="bg-black text-white border-4 border-black p-3 font-black hover:bg-gray-800"
                                >
                                    CLOSE
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
