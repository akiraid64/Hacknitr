'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Package, ShoppingBag, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface Suggestion {
    product: {
        id: number;
        name: string;
        gtin: string;
        batch_id: string;
    };
    current_status: {
        stock_level: number;
        days_to_expiry: number;
        expiry_date: string;
    };
    sales_analysis: {
        daily_velocity: number;
        days_of_stock_remaining: number;
        last_7_days_sold: number;
        transaction_count: number;
    };
    recommendation: {
        action: string;
        urgency: string;
        recommended_quantity: number;
        target_stock_days: number;
        reason: string;
    };
    timestamp: string;
}

interface SuggestionsResponse {
    retailer_id: number;
    total_suggestions: number;
    critical_count: number;
    suggestions: Suggestion[];
    last_updated: string;
    auto_refresh_interval_seconds: number;
}

export default function ReorderSuggestionsWidget() {
    const [data, setData] = useState<SuggestionsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSuggestions = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Not authenticated');
                return;
            }

            const res = await fetch(`${API_URL}/ai/reorder-suggestions`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error('Failed to fetch suggestions');
            const responseData = await res.json();
            setData(responseData);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuggestions();
        // Auto-refresh based on API recommendation (default 300s = 5min)
        const interval = setInterval(fetchSuggestions, (data?.auto_refresh_interval_seconds || 300) * 1000);
        return () => clearInterval(interval);
    }, [data?.auto_refresh_interval_seconds]);

    if (loading) {
        return (
            <div className="border-4 border-black bg-purple-500 p-6 animate-pulse text-white">
                <h3 className="text-2xl font-black">ANALYZING INVENTORY...</h3>
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
            <div className="border-4 border-black bg-purple-500 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ShoppingBag size={32} />
                        <div>
                            <h2 className="text-3xl font-black">AI REORDER SUGGESTIONS</h2>
                            <p className="text-sm font-bold">
                                {data?.total_suggestions || 0} Products | {data?.critical_count || 0} Critical
                            </p>
                        </div>
                    </div>
                    <div className="text-right text-sm">
                        <p className="font-bold">LIVE AI</p>
                        <p className="opacity-80">Updates every 5min</p>
                    </div>
                </div>
            </div>

            {/* Suggestions List */}
            {data && data.suggestions.length > 0 ? (
                <div className="space-y-3">
                    {data.suggestions.map((suggestion, index) => (
                        <SuggestionCard key={index} suggestion={suggestion} />
                    ))}
                </div>
            ) : (
                <div className="border-4 border-black bg-green-500 p-8 text-center text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <Package size={48} className="mx-auto mb-2" />
                    <h3 className="text-2xl font-black">INVENTORY OPTIMAL!</h3>
                    <p className="font-bold mt-2">No reorder suggestions at this time</p>
                </div>
            )}
        </div>
    );
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
    const getUrgencyColor = () => {
        switch (suggestion.recommendation.urgency) {
            case 'OUT_OF_STOCK':
            case 'CRITICAL':
                return 'bg-red-500 border-red-700 text-white';
            case 'HIGH':
                return 'bg-orange-500 border-orange-700 text-white';
            case 'NORMAL':
                return 'bg-blue-500 border-blue-700 text-white';
            default:
                return 'bg-gray-500 border-gray-700 text-white';
        }
    };

    const getUrgencyIcon = () => {
        switch (suggestion.recommendation.urgency) {
            case 'OUT_OF_STOCK':
            case 'CRITICAL':
                return <AlertCircle size={24} className="animate-pulse" />;
            case 'HIGH':
                return <TrendingUp size={24} />;
            default:
                return <Package size={24} />;
        }
    };

    return (
        <div className={`border-4 border-black ${getUrgencyColor()} p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    {/* Product Info */}
                    <div className="flex items-center gap-2 mb-3">
                        {getUrgencyIcon()}
                        <h3 className="text-xl font-black">{suggestion.product.name}</h3>
                    </div>

                    {/* Sales Analysis */}
                    <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                        <div className="bg-black bg-opacity-30 p-2 border-2 border-white">
                            <p className="text-xs font-bold opacity-70">CURRENT STOCK</p>
                            <p className="text-2xl font-black">{suggestion.current_status.stock_level}</p>
                        </div>
                        <div className="bg-black bg-opacity-30 p-2 border-2 border-white">
                            <p className="text-xs font-bold opacity-70">DAYS LEFT</p>
                            <p className="text-2xl font-black">
                                {suggestion.sales_analysis.days_of_stock_remaining.toFixed(1)}
                            </p>
                        </div>
                        <div className="bg-black bg-opacity-30 p-2 border-2 border-white">
                            <p className="text-xs font-bold opacity-70">DAILY VELOCITY</p>
                            <p className="text-2xl font-black">{suggestion.sales_analysis.daily_velocity.toFixed(1)}</p>
                        </div>
                        <div className="bg-black bg-opacity-30 p-2 border-2 border-white">
                            <p className="text-xs font-bold opacity-70">LAST 7 DAYS</p>
                            <p className="text-2xl font-black">{suggestion.sales_analysis.last_7_days_sold}</p>
                        </div>
                    </div>

                    {/* AI Reason */}
                    <p className="text-sm font-bold opacity-90 mb-2">💡 {suggestion.recommendation.reason}</p>
                </div>

                {/* Recommendation */}
                <div className="bg-yellow-400 text-black px-4 py-3 border-4 border-black text-center min-w-[140px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="text-xs font-bold">ORDER NOW</p>
                    <p className="text-4xl font-black my-2">{suggestion.recommendation.recommended_quantity}</p>
                    <p className="text-xs font-bold">UNITS</p>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-3 flex justify-between items-center text-sm">
                <span className="font-bold opacity-70">
                    Target: {suggestion.recommendation.target_stock_days} days stock
                </span>
                <span className="bg-black text-white px-3 py-1 text-xs font-black border-2 border-white">
                    {suggestion.recommendation.urgency}
                </span>
            </div>
        </div>
    );
}
