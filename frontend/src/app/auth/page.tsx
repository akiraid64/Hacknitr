'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'manufacturer' | 'retailer' | 'ngo';

interface FormData {
    email: string;
    password: string;
    name: string;
    company: string;
    wallet_address: string;
    role: Role;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function AuthPage() {
    const router = useRouter();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<FormData>({
        email: '',
        password: '',
        name: '',
        company: '',
        wallet_address: '',
        role: 'manufacturer'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const selectRole = (role: Role) => {
        setFormData({ ...formData, role });
    };

    const connectWallet = async () => {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
            try {
                const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
                setFormData({ ...formData, wallet_address: accounts[0] });
            } catch (err) {
                setError('Wallet connection failed');
            }
        } else {
            setError('MetaMask not installed');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup';
        const body = mode === 'login'
            ? { email: formData.email, password: formData.password }
            : formData;

        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.detail || 'Authentication failed');

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));

            // Redirect based on role
            if (data.role === 'manufacturer') router.push('/manufacturer');
            else if (data.role === 'retailer') router.push('/retailer');
            else setError('Dashboard for ' + data.role + ' coming soon!');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const roles: { id: Role; label: string; icon: string }[] = [
        { id: 'manufacturer', label: 'FACTORY', icon: '🏭' },
        { id: 'retailer', label: 'RETAIL', icon: '🛒' },
        { id: 'ngo', label: 'NGO', icon: '🏛️' }
    ];

    return (
        <main className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--brutalist-yellow)' }}>
            <div className="absolute inset-0 grid-pattern pointer-events-none" />

            <motion.div
                className="brutalist-card p-8 md:p-12 w-full max-w-lg relative z-10"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* Tabs */}
                <div className="flex border-4 border-black mb-8">
                    <button
                        onClick={() => setMode('login')}
                        className={`flex-1 py-4 font-black text-xl transition-all ${mode === 'login' ? 'bg-black text-white' : 'bg-white text-black'
                            }`}
                    >
                        LOGIN
                    </button>
                    <button
                        onClick={() => setMode('signup')}
                        className={`flex-1 py-4 font-black text-xl transition-all ${mode === 'signup' ? 'bg-black text-white' : 'bg-white text-black'
                            }`}
                    >
                        SIGNUP
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Role Selection (Signup only) */}
                    {mode === 'signup' && (
                        <motion.div
                            className="mb-6"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                        >
                            <label className="block font-black mb-2 text-lg">SELECT ROLE</label>
                            <div className="grid grid-cols-3 gap-2">
                                {roles.map((role) => (
                                    <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => selectRole(role.id)}
                                        className={`p-4 border-4 border-black font-bold transition-all ${formData.role === role.id
                                            ? 'bg-black text-white'
                                            : 'bg-white hover:bg-gray-100'
                                            }`}
                                    >
                                        <div className="text-2xl mb-1">{role.icon}</div>
                                        <div className="text-sm">{role.label}</div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Name & Company (Signup only) */}
                    {mode === 'signup' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                        >
                            <label className="block font-black mb-2">FULL NAME</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="brutalist-input mb-4"
                                required
                            />

                            <label className="block font-black mb-2">COMPANY</label>
                            <input
                                type="text"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                className="brutalist-input mb-4"
                            />
                        </motion.div>
                    )}

                    {/* Email */}
                    <label className="block font-black mb-2">EMAIL</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="brutalist-input mb-4"
                        required
                    />

                    {/* Password */}
                    <label className="block font-black mb-2">PASSWORD</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="brutalist-input mb-4"
                        required
                    />

                    {/* Wallet (Signup only) */}
                    {mode === 'signup' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="mb-6"
                        >
                            <label className="block font-black mb-2">WALLET ADDRESS</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    name="wallet_address"
                                    value={formData.wallet_address}
                                    onChange={handleChange}
                                    className="brutalist-input mb-0 flex-1"
                                    placeholder="Connect MetaMask →"
                                    readOnly
                                />
                                <button
                                    type="button"
                                    onClick={connectWallet}
                                    className="brutalist-btn brutalist-btn-secondary px-6"
                                >
                                    🦊
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Error */}
                    {error && (
                        <motion.div
                            className="bg-red-500 text-white p-4 mb-4 font-bold border-4 border-black"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                        >
                            ⚠️ {error}
                        </motion.div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="brutalist-btn brutalist-btn-primary w-full text-xl"
                    >
                        {loading ? '⏳ PROCESSING...' : mode === 'login' ? 'ENTER SYSTEM →' : 'CREATE ACCOUNT →'}
                    </button>
                </form>

                {/* Back to home */}
                <div className="mt-6 text-center">
                    <a href="/" className="font-bold underline hover:no-underline">← BACK TO HOME</a>
                </div>
            </motion.div>
        </main>
    );
}
