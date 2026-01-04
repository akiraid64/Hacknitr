'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown, Package, Calendar } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface Alert {
    type: string;
    severity: string;
    product: {
        id: number;
        name: string;
        batch_id: string;
    };
    details: {
        quantity: number;
        expiry_date?: string;
        days_remaining?: number;
    };
    message: string;
    recommended_action: string;
    token_opportunity: boolean;
    timestamp: string;
}

interface AlertsResponse {
    retailer_id: number;
    total_alerts: number;
    critical_count: number;
    alerts: Alert[];
    last_updated: string;
    auto_refresh_interval_seconds: number;
}

export default function InventoryAlertsWidget() {
    const [alertsData, setAlertsData] = useState<AlertsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAlerts = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Not authenticated');
                return;
            }

            const res = await fetch(`${API_URL}/ai/inventory-alerts`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error('Failed to fetch alerts');
            const data = await res.json();
            setAlertsData(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
        // Auto-refresh based on API recommendation (default 60s)
        const interval = setInterval(fetchAlerts, (alertsData?.auto_refresh_interval_seconds || 60) * 1000);
        return () => clearInterval(interval);
    }, [alertsData?.auto_refresh_interval_seconds]);

    if (loading) {
        return (
            <div className="border-4 border-black bg-yellow-400 p-6 animate-pulse">
                <h3 className="text-2xl font-black">LOADING ALERTS...</h3>
            </div>
        );
    }

    if (error) {
        return (
            <div className="border-4 border-black bg-red-500 p-6 text-white">
                <h3 className="text-2xl font-black mb-2">ERROR</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="border-4 border-black bg-red-500 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={32} className="animate-pulse" />
                        <div>
                            <h2 className="text-3xl font-black">INVENTORY ALERTS</h2>
                            <p className="text-sm font-bold">
                                {alertsData?.total_alerts || 0} Total | {alertsData?.critical_count || 0} Critical
                            </p>
                        </div>
                    </div>
                    <div className="text-right text-sm">
                        <p className="font-bold">LIVE</p>
                        <p className="opacity-80">Updates every 60s</p>
                    </div>
                </div>
            </div>

            {/* Alerts List */}
            {alertsData && alertsData.alerts.length > 0 ? (
                <div className="space-y-3">
                    {alertsData.alerts.map((alert, index) => (
                        <AlertCard key={index} alert={alert} />
                    ))}
                </div>
            ) : (
                <div className="border-4 border-black bg-green-500 p-8 text-center text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <Package size={48} className="mx-auto mb-2" />
                    <h3 className="text-2xl font-black">ALL CLEAR!</h3>
                    <p className="font-bold mt-2">No inventory alerts at this time</p>
                </div>
            )}
        </div>
    );
}

function AlertCard({ alert }: { alert: Alert }) {
    const getSeverityColor = () => {
        switch (alert.severity) {
            case 'CRITICAL':
                return 'bg-red-500 border-red-700';
            case 'EXPIRED':
                return 'bg-black border-red-500';
            case 'WARNING':
                return 'bg-yellow-400 border-yellow-600 text-black';
            case 'HIGH':
                return 'bg-orange-500 border-orange-700';
            default:
                return 'bg-gray-500 border-gray-700';
        }
    };

    const getActionIcon = () => {
        switch (alert.recommended_action) {
            case 'DONATE_NOW':
                return <TrendingDown size={24} />;
            case 'REMOVE_FROM_SHELF':
                return <AlertTriangle size={24} />;
            default:
                return <Calendar size={24} />;
        }
    };

    return (
        <div className={`border-4 border-black ${getSeverityColor()} p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    {/* Product Info */}
                    <div className="flex items-center gap-2 mb-2">
                        {getActionIcon()}
                        <h3 className="text-xl font-black">{alert.product.name}</h3>
                        {alert.token_opportunity && (
                            <span className="bg-yellow-400 text-black px-2 py-1 text-xs font-black border-2 border-black">
                                🪙 TOKEN OPPORTUNITY
                            </span>
                        )}
                    </div>

                    {/* Alert Message */}
                    <p className="font-bold mb-2">{alert.message}</p>

                    {/* Details */}
                    <div className="flex gap-4 text-sm font-bold opacity-90">
                        <span>Batch: {alert.product.batch_id}</span>
                        <span>Qty: {alert.details.quantity}</span>
                        {alert.details.expiry_date && <span>Expires: {alert.details.expiry_date}</span>}
                    </div>
                </div>

                {/* Action Badge */}
                <div className="bg-black text-white px-4 py-2 border-2 border-white text-center min-w-[120px]">
                    <p className="text-xs font-bold opacity-70">ACTION</p>
                    <p className="font-black text-sm mt-1">{alert.recommended_action.replace(/_/g, ' ')}</p>
                </div>
            </div>

            {/* Severity Badge */}
            <div className="mt-3 flex justify-between items-center">
                <span className="text-xs font-bold opacity-70">
                    {new Date(alert.timestamp).toLocaleString()}
                </span>
                <span className="bg-black text-white px-3 py-1 text-xs font-black border-2 border-white">
                    {alert.severity}
                </span>
            </div>
        </div>
    );
}
