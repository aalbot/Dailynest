import React, { useState, useRef, useEffect, useMemo } from 'react';
import Navbar from "@/components/Navbar";
import { useNavigate, useLocation } from "react-router-dom";
import { Send, User, Sparkles, StopCircle, Trash2, BarChart3, PieChart, Activity } from 'lucide-react';
import BackButton from "@/components/BackButton";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    ChartData
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';

// Register ChartJS
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCSH0uuKssWvkgvMOnWV_1u3zPO-1XNWPg",
    authDomain: "dailyclub11.firebaseapp.com",
    databaseURL: "https://dailyclub11-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dailyclub11",
    storageBucket: "dailyclub11.firebasestorage.app",
    messagingSenderId: "439424426599",
    appId: "1:439424426599:web:366ea0de36341a00fdaac2",
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: string;
}

const STORAGE_KEY = 'dailyclub_ai_chat_history';

// --- CHART COMPONENT ---
const ChatChart = ({ type, data }: { type: string, data: any }) => {
    const chartData = useMemo(() => {
        if (!data || !data.order) return null;

        const orders = Object.values(data.order || {});
        // Basic processing
        if (type === 'revenue' || type === 'sales') {
            // Group by date (last 7 days)
            const days: Record<string, number> = {};
            orders.forEach((o: any) => {
                // Check if valid order
                if (!o.status || o.status.toLowerCase().includes('cancel')) return;

                const ts = o.timestamp || o.createdAt || Date.now();
                const date = new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                let amt = 0;
                if (typeof o.total === 'string') {
                    amt = parseFloat(o.total.split('-')[0]) || 0;
                } else {
                    amt = parseFloat(o.total) || 0;
                }
                days[date] = (days[date] || 0) + amt;
            });

            // Sort by date (mock sort for keys)
            const sortedLabels = Object.keys(days).slice(-7);

            return {
                labels: sortedLabels,
                datasets: [{
                    label: 'Revenue (₹)',
                    data: sortedLabels.map(l => days[l]),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            };
        }

        if (type === 'status' || type === 'orders_status') {
            let completed = 0, pending = 0, cancelled = 0;
            orders.forEach((o: any) => {
                const s = (o.status || '').toLowerCase();
                if (s.includes('deliver') || s.includes('complete')) completed++;
                else if (s.includes('cancel')) cancelled++;
                else pending++;
            });

            return {
                labels: ['Delivered', 'Pending', 'Cancelled'],
                datasets: [{
                    data: [completed, pending, cancelled],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
                }]
            };
        }

        if (type === 'products' || type === 'top_products') {
            // Simple top products count
            const productCounts: Record<string, number> = {};
            orders.forEach((o: any) => {
                // Check item1...item5 fields
                for (let i = 1; i <= 5; i++) {
                    if (o[`item${i}`]) {
                        const name = o[`item${i}`];
                        productCounts[name] = (productCounts[name] || 0) + 1;
                    }
                }
                // Check items array if exists
                if (o.items && Array.isArray(o.items)) {
                    o.items.forEach((item: any) => {
                        const name = item.name || item.productName || 'Item';
                        productCounts[name] = (productCounts[name] || 0) + (item.quantity || 1);
                    });
                }
            });

            const top = Object.entries(productCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            return {
                labels: top.map(t => t[0].length > 15 ? t[0].substring(0, 15) + '...' : t[0]),
                datasets: [{
                    label: 'Units Sold',
                    data: top.map(t => t[1]),
                    backgroundColor: '#8884d8'
                }]
            };
        }

        return null;
    }, [type, data]);

    if (!data) return <div className="p-4 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 rounded animate-pulse">Loading Chart Data...</div>;
    if (!chartData) return <div className="p-4 text-xs text-slate-400">No data available for chart.</div>;

    return (
        <div className="my-3 p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-full max-w-full sm:max-w-sm mx-auto overflow-hidden">
            <h4 className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">{type.replace('_', ' ')} Chart</h4>
            <div className="h-40 sm:h-48 w-full flex justify-center">
                {(type === 'revenue' || type === 'sales') && <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />}
                {(type === 'status' || type === 'orders_status') && <Doughnut data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />}
                {(type === 'products' || type === 'top_products') && <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y' }} />}
            </div>
        </div>
    );
};


const AIChat = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // History
    const [messages, setMessages] = useState<Message[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [{
                id: '1',
                role: 'ai',
                content: "Hello! I'm your DailyClub assistant. I can show you charts regarding revenue, order status, or top products. Try asking 'Show me a revenue chart'!",
                timestamp: new Date().toISOString()
            }];
        } catch (e) {
            return [{
                id: '1',
                role: 'ai',
                content: "Hello! I'm your DailyClub assistant.",
                timestamp: new Date().toISOString()
            }];
        }
    });

    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Store Data State for Charts
    const [storeData, setStoreData] = useState<any>(null);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Save history
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Initial Data Fetch (Silently load data for charts)
    useEffect(() => {
        const fetchEssentialData = async () => {
            try {
                const db = firebase.database();
                // We fetch all orders for accurate charts. This might be heavy for very large stores, 
                // but necessary for "Total Revenue". LIMIT to last 500 for performance if needed.
                const ordersSnap = await db.ref('root/order').limitToLast(200).once('value');
                const productsSnap = await db.ref('root/products').limitToFirst(200).once('value');
                // const stockSnap = await db.ref('root/stock').limitToFirst(100).once('value');

                setStoreData({
                    order: ordersSnap.val() || {},
                    products: productsSnap.val() || {},
                    // stock: stockSnap.val() || {}
                });
            } catch (e) {
                console.error("Background data fetch failed", e);
            }
        };
        fetchEssentialData();
    }, []);

    // Handle Auto-Prompt from URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const autoPrompt = params.get('autoPrompt');

        if (autoPrompt && storeData) {
            // Wait for storeData to be ready before sending
            handleSend(autoPrompt);
            // Clear the param from URL
            navigate(location.pathname, { replace: true });
        }
    }, [location, storeData]);


    const handleClearChat = () => {
        if (confirm("Are you sure you want to clear the chat history?")) {
            const defaultMsg: Message = {
                id: Date.now().toString(),
                role: 'ai',
                content: "Chat history cleared. How can I help you now?",
                timestamp: new Date().toISOString()
            };
            setMessages([defaultMsg]);
            localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultMsg]));
        }
    };

    const fetchContextSummary = async () => {
        // Use local storeData if available, otherwise fetch minimal
        let orders = storeData?.order;
        let products = storeData?.products;

        if (!orders || !products) {
            const db = firebase.database();
            const oSnap = await db.ref('root/order').orderByKey().limitToLast(100).once('value');
            orders = oSnap.val();
            const pSnap = await db.ref('root/products').limitToFirst(50).once('value');
            products = pSnap.val();
        }

        // Calculate Totals (Excluding Cancelled)
        let totalRevenue = 0;
        let validOrderCount = 0;
        const allOrders = Object.entries(orders || {});

        allOrders.forEach(([_, o]: [string, any]) => {
            const status = (o.status || '').toLowerCase();
            if (!status.includes('cancel')) {
                let amt = 0;
                if (typeof o.total === 'string') {
                    amt = parseFloat(o.total.split('-')[0]) || 0;
                } else {
                    amt = parseFloat(o.total) || 0;
                }
                totalRevenue += amt;
                validOrderCount++;
            }
        });

        const orderList = allOrders.slice(-15).map(([id, o]: [string, any]) =>
            `- Order #${id}: ${o.status || 'Pending'} (${o.name || 'Guest'}, ₹${o.total || 0})`
        ).join('\n');

        return `\nCURRENT STORE DATA SNAPSHOT:\n[Summary Stats (Excluding Cancelled)]\nTotal Revenue: ₹${totalRevenue.toLocaleString()}\nTotal Valid Orders: ${validOrderCount}\n\n[Recent Orders]\n${orderList}\n\n[System Note]\nYou can display charts. If the user asks for a visualization, return one of these tags strictly:\n[CHART:revenue] - For sales/revenue trends\n[CHART:status] - For order status breakdown\n[CHART:products] - For top selling products\n`;
    };

    const handleSend = async (messageContent?: any) => {
        // Check if it's a React Event (from onClick)
        const isEvent = messageContent && typeof messageContent === 'object' && 'preventDefault' in messageContent;
        const textToSend = (typeof messageContent === 'string') ? messageContent : input;

        if (!textToSend.trim() || isEvent && !input.trim()) return;

        const finalContent = (typeof messageContent === 'string') ? messageContent : input;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: finalContent,
            timestamp: new Date().toISOString()
        };

        if (typeof messageContent !== 'string') setInput('');
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        try {
            const liveContext = await fetchContextSummary();
            const recentMessages = messages.slice(-6);
            const history = [...recentMessages, userMsg]
                .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
                .join('\n');

            const systemPrompt = "System: You are an intelligent store assistant for DailyClub. You have access to real-time store data. Use it to answer questions. \n\nIMPORTANT: \n1. When asked for TOTAL REVENUE or SALES, use the pre-calculated 'Total Revenue' provided in the summary stats. Do NOT sum up recent orders yourself as they are incomplete.\n2. Ignore 'Cancelled' orders for financial or count calculations.\n3. If the user asks for a chart or visualization, output the corresponding tag ONLY (e.g., [CHART:revenue]).\nTags available: [CHART:revenue], [CHART:status], [CHART:products].\nIf answering normally, use Markdown (bold, lists).";

            const fullPrompt = `${systemPrompt}\n${liveContext}\n\nCONVERSATION:\n${history}\nAssistant:`;

            const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}`);
            if (!response.ok) throw new Error("API Error");
            const text = await response.text();

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: text,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (error: any) {
            console.error("AI Error:", error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const renderMessageContent = (text: string) => {
        // 1. Check for CHART tags
        if (text.includes('[CHART:')) {
            const chartMatch = text.match(/\[CHART:(\w+)\]/);
            if (chartMatch) {
                const chartType = chartMatch[1];
                const preText = text.split('[CHART:')[0];
                return (
                    <div>
                        {preText && renderMessageContent(preText)}
                        <ChatChart type={chartType} data={storeData} />
                    </div>
                );
            }
        }

        // 2. Code blocks
        const parts = text.split(/(```[\s\S]*?```)/g);
        return parts.map((part, index) => {
            if (part.startsWith('```')) {
                const content = part.replace(/^```\w*\n?/, '').replace(/```$/, '');
                return (
                    <pre key={index} className="bg-slate-900 text-slate-50 p-3 rounded-lg my-2 overflow-x-auto text-xs font-mono border border-slate-700">
                        <code>{content}</code>
                    </pre>
                );
            }
            // 3. Bold/Markdown
            const boldParts = part.split(/(\*\*.*?\*\*)/g);
            return (
                <span key={index}>
                    {boldParts.map((subPart, subIndex) => {
                        if (subPart.startsWith('**') && subPart.endsWith('**')) {
                            return <strong key={subIndex} className="font-bold text-blue-600 dark:text-blue-400">{subPart.slice(2, -2)}</strong>;
                        }
                        return subPart.split('\n').map((line, lineIdx) => (
                            <React.Fragment key={lineIdx}>
                                {lineIdx > 0 && <br />}
                                {line}
                            </React.Fragment>
                        ));
                    })}
                </span>
            );
        });
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex h-screen bg-[#F0F4F9] dark:bg-[#131314] font-sans">
            <div className="fixed top-0 left-0 right-0 z-50">
                <Navbar />
            </div>

            <div className="flex-1 flex flex-col pt-16 max-w-5xl mx-auto w-full relative sm:px-4">

                {/* Mobile Header Overlay - Glass Effect */}
                <div className="sticky top-16 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-background/40 backdrop-blur-xl border-b border-border/50 xl:hidden">
                    <div className="flex items-center gap-2">
                        <BackButton />
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                        </div>
                        <span className="text-sm font-bold tracking-tight">DailyClub</span>
                    </div>
                    <button
                        onClick={handleClearChat}
                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        title="Clear History"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                {/* Desktop Clear History Button */}
                <div className="hidden xl:block absolute top-20 left-4 z-20">
                    <BackButton />
                </div>

                {/* Desktop Clear History Button */}
                <div className="hidden xl:block absolute top-20 right-4 z-20">
                    <button
                        onClick={handleClearChat}
                        className="p-2 bg-white dark:bg-[#1E1F20] text-slate-400 hover:text-red-500 rounded-full shadow-sm hover:shadow transition-all border border-slate-100 dark:border-slate-800"
                        title="Clear Chat History"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                {/* Chat Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar"
                >
                    <div className="space-y-6 pb-4 pt-4 sm:pt-8 lowercase-first-char">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-2 sm:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                                {/* Avatar */}
                                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 ${msg.role === 'ai'
                                    ? 'bg-white dark:bg-slate-800'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}>
                                    {msg.role === 'ai' ? (
                                        <img src="/bot.png" alt="AI" className="w-full h-full object-contain p-0.5" />
                                    ) : (
                                        <User size={15} className="sm:size-[18px]" />
                                    )}
                                </div>

                                {/* Message Bubble Container */}
                                <div className={`flex flex-col max-w-[92%] sm:max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-end gap-2 mb-1 opacity-70 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <span className="text-[10px] sm:text-xs font-semibold">
                                            {msg.role === 'ai' ? 'DailyClub' : 'You'}
                                        </span>
                                        <span className="text-[9px] sm:text-[10px] text-slate-400">
                                            {formatTime(msg.timestamp)}
                                        </span>
                                    </div>
                                    <div className={`rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3.5 text-sm sm:text-[15px] leading-relaxed shadow-sm w-full ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                        : 'bg-white dark:bg-[#1E1F20] text-slate-800 dark:text-slate-200 rounded-tl-sm'
                                        }`}>
                                        {renderMessageContent(msg.content)}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-2 sm:gap-4">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-sm ring-1 ring-slate-100 dark:ring-slate-700">
                                    <img src="/bot.png" alt="AI Typing" className="w-full h-full object-contain p-0.5 animate-pulse" />
                                </div>
                                <div className="bg-white dark:bg-[#1E1F20] rounded-2xl rounded-tl-sm px-4 py-3 sm:px-5 sm:py-4 shadow-sm flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-200 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}

                        {/* Spacer for bottom input */}
                        <div className="h-28" />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-3 sm:p-4 bg-transparent fixed bottom-0 left-0 right-0 max-w-5xl mx-auto z-30">
                    {/* Gradient fade above input */}
                    <div className="absolute bottom-full left-0 right-0 h-12 bg-gradient-to-t from-[#F0F4F9] dark:from-[#131314] to-transparent pointer-events-none" />

                    <div className="relative flex items-end gap-2 bg-white dark:bg-[#1E1F20] rounded-[24px] sm:rounded-[26px] p-1.5 sm:p-2 pr-2 shadow-2xl border border-slate-200 dark:border-slate-800/50">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask DailyClub AI..."
                            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none resize-none max-h-32 min-h-[44px] sm:min-h-[48px] py-2.5 sm:py-3 px-4 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm sm:text-[15px] leading-relaxed custom-scrollbar"
                            rows={1}
                            style={{
                                height: 'auto',
                                minHeight: '44px'
                            }}
                        />

                        <button
                            onClick={handleSend}
                            disabled={!input.trim() && !isTyping}
                            className={`mb-1 sm:mb-1.5 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full transition-all duration-300 relative group ${input.trim()
                                ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg active:scale-90'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 opacity-60'
                                }`}
                        >
                            <div className="relative z-10 flex items-center justify-center">
                                {isTyping ? (
                                    <StopCircle size={18} className="sm:size-[20px] animate-pulse" />
                                ) : (
                                    <Send
                                        size={18}
                                        className={`sm:size-[20px] transition-transform duration-300 ${input.trim() ? 'scale-105' : ''}`}
                                    />
                                )}
                            </div>
                        </button>
                    </div>
                    <p className="text-center text-[9px] sm:text-[11px] text-slate-400/80 mt-2 font-medium bg-background/50 backdrop-blur-sm rounded-full py-0.5 inline-block mx-auto w-full">
                        AI can make mistakes. Please verify important information.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AIChat;
