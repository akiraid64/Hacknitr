'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface FormData {
    product_name: string;
    gtin: string;
    gstin: string;
    batch_id: string;
    item_count: number;
    manufacturing_date: string;
    expiry_date: string;
    weight_kg: number;
}

export default function ManufacturerDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [qrResult, setQrResult] = useState<{ url: string; image: string } | null>(null);
    const [user, setUser] = useState<any>(null);

    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [formData, setFormData] = useState<FormData>({
        product_name: '',
        gtin: '09506000134352',
        gstin: '27AAACW5888R1Z2',
        batch_id: `LOT-${Math.floor(Math.random() * 10000)}`,
        item_count: 50,
        manufacturing_date: today,
        expiry_date: nextMonth,
        weight_kg: 2.5
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (!token) {
            router.push('/auth');
        } else if (userData) {
            setUser(JSON.parse(userData));
        }
    }, [router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'number' ? parseFloat(value) : value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:8000/manufacturer/generate-qr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                if (res.status === 401) {
                    localStorage.clear();
                    router.push('/auth');
                    return;
                }
                throw new Error('Failed to generate QR');
            }

            const data = await res.json();
            setQrResult({
                url: data.digital_link_url,
                image: data.qr_image_base64
            });

            // Reset batch ID for next creation
            setFormData(prev => ({
                ...prev,
                batch_id: `LOT-${Math.floor(Math.random() * 10000)}`
            }));

        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.clear();
        router.push('/');
    };

    const printQR = () => {
        if (!qrResult) return;
        const win = window.open('', '', 'width=600,height=600');
        win?.document.write(`
      <html>
        <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <img src="${qrResult.image}" style="max-width:100%;" />
        </body>
      </html>
    `);
        win?.print();
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
                    <h1 className="brutalist-title text-3xl md:text-4xl" style={{ background: 'var(--brutalist-red)', color: 'white', padding: '0.25rem 0.5rem' }}>
                        🏭 FACTORY OPS
                    </h1>
                    {user && <span className="font-bold hidden md:inline">Welcome, {user.name}</span>}
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push('/manufacturer/dashboard')}
                        className="brutalist-btn"
                    >
                        📊 ANALYTICS
                    </button>
                    <button onClick={logout} className="brutalist-btn brutalist-btn-dark">
                        EXIT →
                    </button>
                </div>
            </motion.header>

            <div className="p-6 md:p-12 max-w-7xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8">

                    {/* Form */}
                    <motion.div
                        className="brutalist-card p-8"
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2 className="brutalist-title text-2xl mb-6" style={{ background: 'black', color: 'white', display: 'inline-block', padding: '0.25rem 0.5rem' }}>
                            NEW BATCH
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                            <div>
                                <label className="block font-black mb-1">PRODUCT NAME</label>
                                <input
                                    type="text"
                                    name="product_name"
                                    value={formData.product_name}
                                    onChange={handleChange}
                                    className="brutalist-input"
                                    placeholder="E.g. BRITANNIA BREAD 400G"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-black mb-1">GTIN</label>
                                    <input
                                        type="text"
                                        name="gtin"
                                        value={formData.gtin}
                                        onChange={handleChange}
                                        className="brutalist-input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-black mb-1">GSTIN</label>
                                    <input
                                        type="text"
                                        name="gstin"
                                        value={formData.gstin}
                                        onChange={handleChange}
                                        className="brutalist-input"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-black mb-1">BATCH ID</label>
                                    <input
                                        type="text"
                                        name="batch_id"
                                        value={formData.batch_id}
                                        onChange={handleChange}
                                        className="brutalist-input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-black mb-1">QTY</label>
                                    <input
                                        type="number"
                                        name="item_count"
                                        value={formData.item_count}
                                        onChange={handleChange}
                                        className="brutalist-input"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-black mb-1">MFG DATE</label>
                                    <input
                                        type="date"
                                        name="manufacturing_date"
                                        value={formData.manufacturing_date}
                                        onChange={handleChange}
                                        className="brutalist-input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-black mb-1">EXPIRY DATE</label>
                                    <input
                                        type="date"
                                        name="expiry_date"
                                        value={formData.expiry_date}
                                        onChange={handleChange}
                                        className="brutalist-input"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-black mb-1">WEIGHT (KG)</label>
                                <input
                                    type="number"
                                    name="weight_kg"
                                    value={formData.weight_kg}
                                    onChange={handleChange}
                                    step="0.01"
                                    className="brutalist-input"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="brutalist-btn brutalist-btn-primary w-full text-xl mt-4"
                            >
                                {loading ? '⏳ GENERATING...' : 'GENERATE QR CODE →'}
                            </button>
                        </form>
                    </motion.div>

                    {/* QR Result */}
                    <div className="space-y-8">
                        {qrResult && (
                            <motion.div
                                className="brutalist-card p-8"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                            >
                                <h2 className="brutalist-title text-2xl mb-6" style={{ background: 'var(--brutalist-yellow)', display: 'inline-block', padding: '0.25rem 0.5rem' }}>
                                    ✅ BATCH CREATED
                                </h2>

                                <div className="mt-6 p-4 bg-white border-4 border-black flex justify-center">
                                    <img src={qrResult.image} alt="QR Code" className="w-64 h-64" />
                                </div>

                                <div className="mt-4 p-4 bg-gray-100 border-4 border-black font-mono text-sm break-all">
                                    {qrResult.url}
                                </div>

                                <button
                                    onClick={printQR}
                                    className="brutalist-btn brutalist-btn-secondary w-full mt-4"
                                >
                                    🖨️ PRINT LABEL
                                </button>
                            </motion.div>
                        )}

                        {/* Stats */}
                        <motion.div
                            className="brutalist-card p-8"
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <h2 className="brutalist-title text-xl mb-4">QUICK STATS</h2>
                            <div className="grid grid-cols-2 gap-4" style={{ marginTop: '1rem' }}>
                                <div className="text-center p-4" style={{ background: 'var(--brutalist-yellow)', border: '4px solid black' }}>
                                    <div className="text-4xl font-black">142</div>
                                    <div className="font-bold text-sm">BATCHES</div>
                                </div>
                                <div className="text-center p-4" style={{ background: 'var(--brutalist-red)', color: 'white', border: '4px solid black' }}>
                                    <div className="text-4xl font-black">12kg</div>
                                    <div className="font-bold text-sm">SAVED</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </main>
    );
}
