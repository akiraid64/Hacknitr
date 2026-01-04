import { motion, AnimatePresence } from 'framer-motion';

interface AIRecommendationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    recommendations: any;
}

export default function AIRecommendationsModal({ isOpen, onClose, recommendations }: AIRecommendationsModalProps) {
    if (!isOpen) return null;

    const recs = recommendations?.recommendations || {};
    const context = recommendations?.context_data;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white border-8 border-black max-w-4xl w-full max-h-[80vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 border-b-4 border-black">
                        <h2 className="text-3xl font-black text-white">🤖 AI INSIGHTS & RECOMMENDATIONS</h2>
                        <p className="text-white/90 mt-1">Powered by Gemini 2.0 with real-time Google Search</p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Weather & Festival Context Banner */}
                        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-4 border-blue-500 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">🌍</span>
                                <h3 className="text-xl font-black">LIVE MARKET CONTEXT</h3>
                            </div>

                            {/* Show actual context data if available */}
                            {context ? (
                                <div className="space-y-3">
                                    <div className="grid md:grid-cols-2 gap-3 text-sm font-bold">
                                        <div className="bg-white border-2 border-blue-400 p-3 rounded">
                                            <div className="text-blue-600 mb-1 flex items-center gap-1">
                                                <span>🌤️</span> CURRENT WEATHER
                                            </div>
                                            <div className="text-gray-800">{context.weather || 'Checking weather...'}</div>
                                        </div>
                                        <div className="bg-white border-2 border-blue-400 p-3 rounded">
                                            <div className="text-blue-600 mb-1 flex items-center gap-1">
                                                <span>🎉</span> UPCOMING FESTIVALS
                                            </div>
                                            <div className="text-gray-800 text-xs space-y-1">
                                                {context.festivals?.length > 0 ? (
                                                    context.festivals.map((f: string, i: number) => (
                                                        <div key={i}>• {f}</div>
                                                    ))
                                                ) : (
                                                    <div>Checking upcoming events...</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {context.stock_suggestions && (
                                        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-orange-400 p-3 rounded">
                                            <div className="text-orange-700 font-black mb-1 flex items-center gap-1">
                                                <span>💡</span> SMART STOCKING ADVICE
                                            </div>
                                            <div className="text-sm font-bold text-gray-800">{context.stock_suggestions}</div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-gray-600 font-bold">
                                    🔄 Analyzing weather and festivals with Google Search...
                                </div>
                            )}

                            <p className="text-xs mt-3 text-gray-600 font-bold">
                                ✨ AI uses real-time Google Search grounding for weather, festivals, and trends
                            </p>
                        </div>

                        {/* Discounts */}
                        {recs.discounts?.length > 0 && (
                            <div>
                                <h3 className="text-2xl font-black mb-4 flex items-center gap-2">
                                    💰 DISCOUNT RECOMMENDATIONS
                                </h3>
                                <div className="space-y-3">
                                    {recs.discounts.map((d: any, idx: number) => (
                                        <div key={idx} className="border-4 border-black p-4 bg-yellow-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-black text-lg">{d.product_name}</h4>
                                                <span className="bg-red-500 text-white px-4 py-2 font-black border-2 border-black">
                                                    {d.discount_percentage}% OFF
                                                </span>
                                            </div>
                                            <p className="text-sm mb-2 font-bold leading-relaxed whitespace-pre-wrap">{d.reason}</p>
                                            <div className="flex gap-2 items-center">
                                                <span className="inline-block bg-black text-white px-3 py-1 text-xs font-bold uppercase">
                                                    {d.context || 'RECOMMENDATION'}
                                                </span>
                                                {d.product_id && (
                                                    <span className="text-xs text-gray-600">Product ID: {d.product_id}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bundles */}
                        {recs.bundles?.length > 0 && (
                            <div>
                                <h3 className="text-2xl font-black mb-4 flex items-center gap-2">
                                    📦 BUNDLE SUGGESTIONS
                                </h3>
                                <div className="space-y-3">
                                    {recs.bundles.map((b: any, idx: number) => (
                                        <div key={idx} className="border-4 border-black p-4 bg-blue-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-black text-lg">{b.bundle_name}</h4>
                                                <span className="bg-green-500 text-white px-4 py-2 font-black border-2 border-black">
                                                    {b.discount_percentage}% OFF
                                                </span>
                                            </div>
                                            <p className="text-sm mb-2 font-bold leading-relaxed whitespace-pre-wrap">{b.reason}</p>
                                            <div className="flex gap-2 flex-wrap mt-2">
                                                {b.products?.map((p: any, i: number) => (
                                                    <span key={i} className="bg-white border-2 border-black px-2 py-1 text-xs font-bold">
                                                        {p.name}
                                                    </span>
                                                ))}
                                            </div>
                                            <span className="inline-block bg-black text-white px-3 py-1 text-xs font-bold mt-2 uppercase">
                                                {b.context || 'BUNDLE'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* No recommendations */}
                        {(!recs.discounts || recs.discounts.length === 0) &&
                            (!recs.bundles || recs.bundles.length === 0) && (
                                <div className="text-center py-8 border-4 border-dashed border-gray-300">
                                    <p className="text-xl font-bold text-gray-500">✨ No specific recommendations right now</p>
                                    <p className="text-sm text-gray-400 mt-2 font-bold">AI will suggest actions based on inventory, weather, and upcoming events</p>
                                </div>
                            )}

                        <button
                            onClick={onClose}
                            className="w-full bg-black text-white py-3 font-black hover:bg-gray-800 border-4 border-black"
                        >
                            CLOSE
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
