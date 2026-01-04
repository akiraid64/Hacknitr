'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Package, ShoppingCart, Users, Clock } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface LiveStats {
    users: {
        manufacturers: number;
        retailers: number;
        ngos: number;
        total: number;
    };
    products: {
        total_batches: number;
        total_items: number;
    };
    sales: {
        total_transactions: number;
        total_revenue: number;
    };
    donations: {
        total_donations: number;
        total_items_donated: number;
    };
    alerts: {
        expiring_soon: number;
    };
    last_updated: string;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<LiveStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLiveStats = async () => {
        try {
            const res = await fetch(`${API_URL}/dashboard/live-stats`);
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setStats(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLiveStats();
        // Auto-refresh every 5 seconds
        const interval = setInterval(fetchLiveStats, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-yellow-400 text-2xl font-black">LOADING DASHBOARD...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="bg-red-500 border-4 border-black p-8">
                    <h2 className="text-2xl font-black mb-2">ERROR</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            {/* Header */}
            <div className="mb-8 border-4 border-yellow-400 bg-yellow-400 p-6 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
                <h1 className="text-5xl font-black text-black">TOOL Inc LIVE DASHBOARD</h1>
                <p className="text-black font-bold mt-2">
                    Last Updated: {stats ? new Date(stats.last_updated).toLocaleTimeString() : '-'}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Users Stats */}
                <StatCard
                    icon={<Users size={40} />}
                    title="TOTAL USERS"
                    value={stats?.users.total || 0}
                    subtitle={`${stats?.users.manufacturers || 0} Manufacturers | ${stats?.users.retailers || 0} Retailers | ${stats?.users.ngos || 0} NGOs`}
                    color="bg-blue-500"
                />

                {/* Products Stats */}
                <StatCard
                    icon={<Package size={40} />}
                    title="TOTAL BATCHES"
                    value={stats?.products.total_batches || 0}
                    subtitle={`${stats?.products.total_items || 0} total items`}
                    color="bg-green-500"
                />

                {/* Sales Stats */}
                <StatCard
                    icon={<ShoppingCart size={40} />}
                    title="TOTAL SALES"
                    value={stats?.sales.total_transactions || 0}
                    subtitle={`₹${(stats?.sales.total_revenue || 0).toLocaleString()} revenue`}
                    color="bg-purple-500"
                />

                {/* Donations Stats */}
                <StatCard
                    icon={<TrendingUp size={40} />}
                    title="DONATIONS"
                    value={stats?.donations.total_donations || 0}
                    subtitle={`${stats?.donations.total_items_donated || 0} items donated`}
                    color="bg-yellow-400"
                    textColor="text-black"
                />

                {/* Alerts Stats */}
                <StatCard
                    icon={<AlertTriangle size={40} />}
                    title="EXPIRING SOON"
                    value={stats?.alerts.expiring_soon || 0}
                    subtitle="Items need attention"
                    color="bg-red-500"
                    pulse={stats ? stats.alerts.expiring_soon > 0 : false}
                />

                {/* Live Indicator */}
                <div className="border-4 border-white bg-black p-6 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center">
                    <div className="text-center">
                        <Clock size={40} className="mx-auto mb-2 text-yellow-400 animate-pulse" />
                        <h3 className="text-2xl font-black text-yellow-400">LIVE</h3>
                        <p className="text-sm text-gray-400 mt-2">Auto-updates every 5s</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="border-4 border-yellow-400 bg-yellow-400 p-6 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
                <h2 className="text-3xl font-black text-black mb-4">QUICK ACCESS</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickButton href="/manufacturer" label="MANUFACTURER" />
                    <QuickButton href="/retailer" label="RETAILER" />
                    <QuickButton href="/auth" label="LOGIN" />
                    <QuickButton href="http://localhost:8000/docs" label="API DOCS" external />
                </div>
            </div>
        </div>
    );
}

function StatCard({
    icon,
    title,
    value,
    subtitle,
    color,
    textColor = 'text-white',
    pulse = false,
}: {
    icon: React.ReactNode;
    title: string;
    value: number;
    subtitle: string;
    color: string;
    textColor?: string;
    pulse?: boolean;
}) {
    return (
        <div
            className={`border-4 border-black ${color} p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${pulse ? 'animate-pulse' : ''
                }`}
        >
            <div className={`flex items-center gap-4 mb-2 ${textColor}`}>
                {icon}
                <h3 className="text-sm font-black">{title}</h3>
            </div>
            <div className={`text-5xl font-black mb-2 ${textColor}`}>{value}</div>
            <p className={`text-sm font-bold ${textColor} opacity-90`}>{subtitle}</p>
        </div>
    );
}

function QuickButton({ href, label, external = false }: { href: string; label: string; external?: boolean }) {
    if (external) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black text-yellow-400 border-4 border-black p-4 text-center font-black hover:bg-white hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
                {label}
            </a>
        );
    }

    return (
        <a
            href={href}
            className="bg-black text-yellow-400 border-4 border-black p-4 text-center font-black hover:bg-white hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
            {label}
        </a>
    );
}
