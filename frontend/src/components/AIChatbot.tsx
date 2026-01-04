'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AIChatbotProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AIChatbot({ isOpen, onClose }: AIChatbotProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'नमस्ते! मैं आपकी इन्वेंटरी के बारे में सवालों के जवाब दे सकता हूं। (Hello! I can answer questions about your inventory.)' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');

        const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
        setMessages(newMessages);
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/retailer/ai-chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userMessage,
                    history: messages.slice(-5)
                })
            });

            if (!res.ok) {
                throw new Error(`Error: ${res.status}`);
            }

            const data = await res.json();

            setMessages([...newMessages, {
                role: 'assistant',
                content: data.response
            }]);

        } catch (err: any) {
            console.error('Chat error:', err);
            setMessages([...newMessages, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white border-8 border-black w-full max-w-2xl h-[600px] flex flex-col"
                >
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 border-b-4 border-black flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Bot className="w-8 h-8 text-white" />
                            <h2 className="text-2xl font-black text-white">AI CHATBOT</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-white p-2 border-2 border-black hover:bg-red-500 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] p-4 border-4 border-black font-bold ${msg.role === 'user'
                                            ? 'bg-blue-400 text-white'
                                            : 'bg-white'
                                        }`}
                                >
                                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                                        {msg.content}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-4 border-4 border-black">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" />
                                        <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce delay-100" />
                                        <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce delay-200" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t-4 border-black bg-white">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Ask in Hindi or English..."
                                className="flex-1 px-4 py-3 border-4 border-black font-bold text-lg focus:outline-none focus:ring-4 focus:ring-purple-500"
                                disabled={loading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={loading || !input.trim()}
                                className="bg-purple-500 text-white px-6 py-3 border-4 border-black font-black hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Send className="w-5 h-5" />
                                SEND
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 font-bold">
                            💡 Ask: "क्या मुझे कुछ donate करना चाहिए?" or "What should I discount?"
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
