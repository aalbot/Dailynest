import React, { useState, useRef, useEffect } from 'react';
import Navbar from "@/components/Navbar";
import { Send, Upload, User, Sparkles, Mic, Image, StopCircle, RefreshCcw, Copy, ThumbsUp, ThumbsDown, Key, Settings2 } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

    // API Key State
    const [apiKey, setApiKey] = useState('AIzaSyCMWnTTKmMXMeti3QSrb8gCYrN2AXz6dnk');
    const [showKeyModal, setShowKeyModal] = useState(false);

    useEffect(() => {
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) setApiKey(storedKey);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim()) return;

        if (!apiKey) {
            setShowKeyModal(true);
            return;
        }

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
            const genAI = new GoogleGenerativeAI(apiKey);
            let model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            // Helper to clean history
            const getHistory = () => messages.filter(m => m.id !== '1').map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }));

            try {
                const chat = model.startChat({ history: getHistory() });
                const result = await chat.sendMessage(userMsg.content);
                const response = await result.response;
                const text = response.text();

                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'ai',
                    content: text,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMsg]);
            } catch (firstError: any) {
                console.warn("Primary model failed, attempting fallback...", firstError);
                // Fallback to gemini-pro if flash fails (e.g. 404)
                if (firstError.message?.includes('404') || firstError.message?.includes('not found')) {
                    model = genAI.getGenerativeModel({ model: "gemini-pro" });
                    const chat = model.startChat({ history: getHistory() });
                    const result = await chat.sendMessage(userMsg.content);
                    const response = await result.response;
                    const text = response.text();

                    const aiMsg: Message = {
                        id: (Date.now() + 1).toString(),
                        role: 'ai',
                        content: text,
                        timestamp: new Date()
                    };
                    setMessages(prev => [...prev, aiMsg]);
                } else {
                    throw firstError;
                }
            }

        } catch (error: any) {
            console.error("AI Error:", error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: `Sorry, I encountered an error. Please check your API Key or try again. (${error.message || 'Unknown error'})`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
            if (error.message?.includes('API key') || error.toString().includes('403')) {
                setShowKeyModal(true);
            }
        } finally {
            setIsTyping(false);
        }
    };

    const handleSaveKey = (key: string) => {
        localStorage.setItem('gemini_api_key', key);
        setApiKey(key);
        setShowKeyModal(false);
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

            <Dialog open={showKeyModal} onOpenChange={setShowKeyModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enter Gemini API Key</DialogTitle>
                        <DialogDescription>
                            To use the AI features, please enter your free Google Gemini API Key.
                            You can get one at <a href="https://makersuite.google.com/app/apikey" target="_blank" className="text-blue-600 hover:underline">makersuite.google.com</a>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Input
                            placeholder="AIzaSy..."
                            type="password"
                            onChange={(e) => setApiKey(e.target.value)}
                            defaultValue={apiKey}
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={() => handleSaveKey(apiKey)}>Save Key</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex-1 flex flex-col pt-16 max-w-5xl mx-auto w-full relative">
                {/* API Key settings button */}
                <button
                    onClick={() => setShowKeyModal(true)}
                    className="absolute top-20 right-4 p-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors z-10"
                    title="Configure API Key"
                >
                    <Settings2 size={16} />
                </button>

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
