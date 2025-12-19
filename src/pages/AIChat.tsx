import React, { useState, useRef, useEffect } from 'react';
import Navbar from "@/components/Navbar";
import { Send, User, Sparkles, StopCircle, RefreshCcw, Copy, ThumbsUp, ThumbsDown, Database } from 'lucide-react';
import firebase from "firebase/compat/app";
import "firebase/compat/database";

// Firebase Config (Ensure this matches your other files)
const firebaseConfig = {
    apiKey: "AIzaSyCSH0uuKssWvkgvMOnWV_1u3zPO-1XNWPg",
    authDomain: "dailyclub11.firebaseapp.com",
    databaseURL: "https://dailyclub11-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dailyclub11",
    storageBucket: "dailyclub11.firebasestorage.app",
    messagingSenderId: "439424426599",
    appId: "1:439424426599:web:5ee8965e14990c57fdaac2",
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: Date;
}

const AIChat = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'ai',
            content: "Hello! I'm your DailyClub AI assistant. I can answer any questions you have. How can I help you today?",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const fetchContextData = async () => {
        try {
            const db = firebase.database();

            // 1. Fetch Orders (Limit to last 20 for brevity)
            const ordersSnap = await db.ref('root/order').orderByKey().limitToLast(20).once('value');
            const ordersVal = ordersSnap.val() || {};
            const orderList = Object.entries(ordersVal).map(([id, o]: [string, any]) =>
                `- Order #${id}: ${o.status || 'Pending'} (${o.name || 'Guest'}, ₹${o.total || 0})`
            ).join('\n');

            // 2. Fetch Products for names
            const prodsSnap = await db.ref('root/products').limitToFirst(100).once('value');
            const products = prodsSnap.val() || {};

            // 3. Fetch Stock (Simplified)
            const stockSnap = await db.ref('root/stock').limitToFirst(50).once('value');
            const stockVal = stockSnap.val() || {};

            const stockList: string[] = [];
            Object.keys(stockVal).forEach(pCode => {
                const product = products[pCode];
                const variants = stockVal[pCode];
                if (variants) {
                    Object.values(variants).forEach((v: any) => {
                        stockList.push(`- ${product?.name || pCode}: ${v.quantity} ${v.pkg}s (Price: ₹${v.offerPrice})`);
                    });
                }
            });

            return `\nCURRENT STORE DATA (Real-time):\n[Recent Orders]\n${orderList || 'No recent orders'}\n\n[Stock Samples]\n${stockList.slice(0, 30).join('\n') || 'No stock data'}`;
        } catch (e) {
            console.error("Error fetching context:", e);
            return "";
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            // Fetch live data context
            const liveContext = await fetchContextData();

            // Construct conversation history
            const recentMessages = messages.slice(-4);
            const history = [...recentMessages, userMsg]
                .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
                .join('\n');

            // Pollinations.ai accepts the prompt directly in the URL
            const systemPrompt = "System: You are an intelligent store assistant for DailyClub. You have access to real-time store data below. Use it to answer questions accurately. If asked about orders or stock, refer to this data. Be concise.";
            const fullPrompt = `${systemPrompt}\n${liveContext}\n\nCONVERSATION:\n${history}\nAssistant:`;

            // Use Pollinations.ai (Free, No Key required)
            const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}`);

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const text = await response.text();

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: text,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (error: any) {
            console.error("AI Error:", error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: "Sorry, I'm having trouble connecting to the free AI service right now. Please try again in a moment.",
                timestamp: new Date()
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

    return (
        <div className="flex h-screen bg-[#F0F4F9] dark:bg-[#131314] font-sans">
            <div className="fixed top-0 left-0 right-0 z-50">
                <Navbar />
            </div>

            <div className="flex-1 flex flex-col pt-16 max-w-5xl mx-auto w-full relative">

                {/* Chat Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar"
                >
                    <div className="space-y-8 pb-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>

                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'ai'
                                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}>
                                    {msg.role === 'ai' ? <Sparkles size={16} /> : <User size={16} />}
                                </div>

                                {/* Message Bubble */}
                                <div className={`flex flex-col max-w-[80%]`}>
                                    <div className={`text-sm font-medium mb-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                                        {msg.role === 'ai' ? 'DailyClub AI' : 'You'}
                                    </div>
                                    <div className={`rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user'
                                        ? 'bg-[#E7F0FE] dark:bg-[#2B3544] text-slate-900 dark:text-slate-100 rounded-tr-sm'
                                        : 'bg-white dark:bg-[#1E1F20] text-slate-800 dark:text-slate-200 rounded-tl-sm'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 text-white animate-pulse">
                                    <Sparkles size={16} />
                                </div>
                                <div className="bg-white dark:bg-[#1E1F20] rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-2">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}

                        {/* Spacer for bottom input */}
                        <div className="h-24" />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-transparent">
                    <div className="max-w-3xl mx-auto">
                        <div className="relative flex items-end gap-2 bg-white dark:bg-[#1E1F20] rounded-[26px] p-2 pr-2 shadow-lg hover:shadow-xl transition-shadow duration-300 ring-1 ring-slate-100 dark:ring-slate-800">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask me anything..."
                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none resize-none max-h-32 min-h-[48px] py-3 px-4 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-[15px] leading-relaxed custom-scrollbar"
                                rows={1}
                                style={{
                                    height: 'auto',
                                    minHeight: '48px'
                                }}
                            />

                            <button
                                onClick={handleSend}
                                disabled={!input.trim() && !isTyping}
                                className={`mb-1 w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 ${input.trim()
                                    ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:scale-105 active:scale-95'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600'
                                    }`}
                            >
                                {isTyping ? <StopCircle size={18} /> :
                                    <Send size={18} className={`transition-transform duration-300 ${input.trim() ? 'translate-x-[1px] -translate-y-[1px]' : ''}`} />
                                }
                            </button>
                        </div>
                        <p className="text-center text-[10px] text-slate-400/80 mt-3 font-medium">
                            AI may display inaccurate info, so double-check its responses.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIChat;
