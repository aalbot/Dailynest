import React, { useEffect, useState, useRef, useMemo } from "react";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import {
    Search,
    Volume2,
    VolumeX,
    Filter,
    ChevronDown,
    ChevronUp,
    Store,
    Package,
    Truck,
    CheckCircle,
    XCircle,
    ShoppingBag,
    User,
    MapPin,
    AlertTriangle,
    Bell
} from "lucide-react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { toast } from "sonner";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCSH0uuKssWvkgvMOnWV_1u3zPO-1XNWPg",
    authDomain: "dailyclub11.firebaseapp.com",
    databaseURL:
        "https://dailyclub11-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dailyclub11",
    storageBucket: "dailyclub11.firebasestorage.app",
    messagingSenderId: "439424426599",
    appId: "1:439424426599:web:5ee8965e14990c57fdaac2",
};

// Initialize Firebase only once
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const STATUS_OPTIONS = [
    "Order Placed",
    "Accepted by Store",
    "Packing Order",
    "Ready for Pickup",
];

const OrderManagement = () => {
    const [orders, setOrders] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isMuted, setIsMuted] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
    const [alertData, setAlertData] = useState<any>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const isAudioInitializedRef = useRef(false);
    const isInitialLoadRef = useRef(true);

    // Audio Logic
    const initAudio = () => {
        if (!audioContextRef.current) {
            const AudioContextCtor =
                window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextCtor();
            isAudioInitializedRef.current = true;
        } else if (audioContextRef.current.state === "suspended") {
            audioContextRef.current.resume();
        }
    };

    const playBeep = () => {
        if (!isAudioInitializedRef.current || isMuted || !audioContextRef.current) return;
        const ctx = audioContextRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = 500;
        gain.gain.value = 0.5;
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    };

    const playAlertSound = () => {
        if (!isAudioInitializedRef.current || isMuted || !audioContextRef.current) return;
        const ctx = audioContextRef.current;
        const t = ctx.currentTime;

        // First chirp
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(600, t);
        osc1.frequency.exponentialRampToValueAtTime(1000, t + 0.1);
        gain1.gain.setValueAtTime(0.5, t);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc1.start(t);
        osc1.stop(t + 0.1);

        // Second chirp
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(600, t + 0.15);
        osc2.frequency.exponentialRampToValueAtTime(1000, t + 0.25);
        gain2.gain.setValueAtTime(0.5, t + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc2.start(t + 0.15);
        osc2.stop(t + 0.25);
    };

    const toggleMute = () => {
        initAudio();
        setIsMuted(!isMuted);
    };

    useEffect(() => {
        const db = firebase.database();
        const ordersRef = db.ref("root/order");

        const onValueChange = (snapshot: any) => {
            const data = snapshot.val() || {};
            setOrders((prevOrders) => {
                // Check for new 'Order Placed'
                Object.keys(data).forEach((key) => {
                    const newOrder = data[key];
                    const oldOrder = prevOrders[key];

                    // Standard Beep for any update
                    if (oldOrder && JSON.stringify(oldOrder) !== JSON.stringify(newOrder)) {
                        playBeep();
                    }

                    // Alert for new "Order Placed"
                    if (newOrder.status === "Order Placed") {
                        if (!oldOrder) {
                            // Totally new order
                            if (!isInitialLoadRef.current) {
                                setAlertData({ id: key, ...newOrder });
                                playAlertSound();
                            }
                        } else if (oldOrder.status !== "Order Placed") {
                            // Status changed TO Order Placed (unlikely but possible)
                            if (!isInitialLoadRef.current) {
                                setAlertData({ id: key, ...newOrder });
                                playAlertSound();
                            }
                        }
                    }
                });

                if (isInitialLoadRef.current) isInitialLoadRef.current = false;
                return data;
            });
            setLoading(false);
        };

        ordersRef.on("value", onValueChange);
        return () => ordersRef.off("value", onValueChange);
    }, []);

    // Filter Logic
    const filteredOrders = useMemo(() => {
        if (!orders) return [];
        let list = Object.entries(orders).map(([id, data]) => ({ id, ...data }));

        // Sort: Always show newest orders first by ID, regardless of status.
        // This ensures orders don't jump around or disappear when status changes.
        list.sort((a, b) => b.id.localeCompare(a.id));

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            list = list.filter(
                (o) =>
                    o.id.toLowerCase().includes(lower) ||
                    (o.name && o.name.toLowerCase().includes(lower)) ||
                    (o.phnm && o.phnm.includes(lower))
            );
        }
        return list;
    }, [orders, searchTerm]);

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            await firebase.database().ref(`root/order/${orderId}`).update({
                status: newStatus,
                last_updated: new Date().toISOString()
            });
            toast.success(`Order #${orderId} updated to ${newStatus}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update status");
        }
    };

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedOrders);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedOrders(newSet);
    };

    const dismissAlert = () => {
        initAudio(); // Ensure context is running on interaction
        setAlertData(null);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Order Placed": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
            case "Accepted by Store": return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
            case "Packing Order": return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
            case "Ready for Pickup": return "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800";
            case "On the Way": return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
            case "Cancelled": return "bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
            case "Delivered": return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
            default: return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Order Placed": return <AlertTriangle size={14} />;
            case "Accepted by Store": return <CheckCircle size={14} />;
            case "Packing Order": return <Package size={14} />;
            case "Ready for Pickup": return <Store size={14} />;
            case "On the Way": return <Truck size={14} />;
            case "Cancelled": return <XCircle size={14} />;
            default: return <User size={14} />;
        }
    };

    return (
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300 overflow-hidden">
            <div className="shrink-0">
                <Navbar />
            </div>

            <main className="flex-1 flex flex-col max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-4 overflow-hidden">
                {/* Header */}
                <div className="shrink-0 flex flax-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 mb-6">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2">
                                <ShoppingBag className="text-blue-600 dark:text-blue-400" />
                                Order Management
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Track and manage store orders in real-time</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button onClick={toggleMute} className={`p-2.5 rounded-xl border transition-all ${isMuted ? 'bg-red-50 border-red-200 text-red-500 dark:bg-red-900/20 dark:border-red-800' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50'}`}>
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by ID, Name or Phone..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Orders List Container - Flex-1 to fill remaining height */}
                <div className="flex-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    {/* Table Header - Sticky */}
                    <div className="shrink-0 hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 backdrop-blur-sm z-10">
                        <div className="col-span-2">Order ID</div>
                        <div className="col-span-3">Customer</div>
                        <div className="col-span-2">Items</div>
                        <div className="col-span-1">Total</div>
                        <div className="col-span-3">Status</div>
                        <div className="col-span-1 text-center">Actions</div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filteredOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 h-full">
                                <ShoppingBag size={48} className="mb-4 opacity-20" />
                                <p>No orders found matching your criteria</p>
                            </div>
                        ) : (
                            filteredOrders.map((order) => {
                                const isExpanded = expandedOrders.has(order.id);
                                const isCancelled = order.status === "Cancelled";
                                const isDelivered = order.status === "Delivered";
                                const itemString = Object.keys(order).filter(k => k.startsWith('item') && order[k]).map(k => order[k]).join(', ');

                                return (
                                    <div key={order.id} className={`group border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${isExpanded ? 'bg-slate-50/80 dark:bg-slate-800/40' : ''}`}>
                                        {/* Desktop Row */}
                                        <div onClick={() => toggleExpand(order.id)} className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer">
                                            <div className="col-span-2 font-mono text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                                #{order.id}
                                            </div>
                                            <div className="col-span-3">
                                                <div className="font-semibold text-slate-900 dark:text-slate-100">{order.name || "Unknown"}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{order.phnm}</div>
                                            </div>
                                            <div className="col-span-2 text-sm text-slate-600 dark:text-slate-400 truncate pr-4" title={itemString}>
                                                {itemString || "No items"}
                                            </div>
                                            <div className="col-span-1 font-bold text-slate-900 dark:text-slate-100 text-sm">
                                                ₹{order.total}
                                            </div>
                                            <div className="col-span-3 pr-4">
                                                <div className={`relative ${isCancelled || isDelivered ? 'pointer-events-none' : ''}`} onClick={e => e.stopPropagation()}>
                                                    <select
                                                        value={order.status}
                                                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                        disabled={isCancelled || isDelivered}
                                                        className={`w-full appearance-none pl-9 pr-8 py-2 rounded-lg text-sm font-semibold border transition-all cursor-pointer focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900 outline-none ${getStatusColor(order.status)} disabled:opacity-80 disabled:cursor-not-allowed`}
                                                    >
                                                        {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        {/* Preserve Cancelled/Delivered if already set */}
                                                        {(order.status === 'Cancelled' || order.status === 'Delivered' || order.status === 'On the Way') && (
                                                            <option value={order.status}>{order.status}</option>
                                                        )}
                                                    </select>
                                                    <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isCancelled ? 'opacity-50' : 'opacity-70'}`}>
                                                        {getStatusIcon(order.status)}
                                                    </div>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" size={14} />
                                                </div>
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'}`}>
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mobile Card Layout */}
                                        <div onClick={() => toggleExpand(order.id)} className="md:hidden p-4 flex flex-col gap-3 cursor-pointer">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">#{order.id}</span>
                                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 mt-1">{order.name || "Guest"}</h3>
                                                </div>
                                                <div className="font-bold text-slate-900 dark:text-slate-100">₹{order.total}</div>
                                            </div>
                                            <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{itemString}</div>
                                            <div className={`text-xs font-semibold px-2 py-1 rounded inline-flex items-center gap-1 w-fit ${getStatusColor(order.status)}`}>
                                                {getStatusIcon(order.status)}
                                                {order.status}
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <div className="px-6 pb-6 pt-2 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="space-y-2">
                                                        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Customer Details</h4>
                                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm space-y-2">
                                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><User size={14} /> {order.name}</div>
                                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-mono"><AlertTriangle size={14} className="rotate-180" /> {order.phnm}</div>
                                                            <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300"><MapPin size={14} className="mt-0.5 shrink-0" /> {order.adrs || "No address provided"}</div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 md:col-span-2">
                                                        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Order Items</h4>
                                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm">
                                                            <ul className="space-y-1">
                                                                {Object.keys(order).filter(k => k.startsWith('item') && order[k]).map((key) => (
                                                                    <li key={key} className="flex items-center gap-2 text-slate-700 dark:text-slate-300 border-b border-slate-50 dark:border-slate-800 last:border-0 pb-1 last:pb-0">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                                                        {order[key]}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>

                                                    {/* Mobile Status Changer */}
                                                    <div className="md:hidden space-y-2">
                                                        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Update Status</h4>
                                                        <div className={`relative ${isCancelled || isDelivered ? 'pointer-events-none opacity-80' : ''}`} onClick={e => e.stopPropagation()}>
                                                            <select
                                                                value={order.status}
                                                                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                                disabled={isCancelled || isDelivered}
                                                                className={`w-full appearance-none pl-9 pr-8 py-3 rounded-xl text-sm font-semibold border transition-all ${getStatusColor(order.status)}`}
                                                            >
                                                                {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                            </select>
                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70">
                                                                {getStatusIcon(order.status)}
                                                            </div>
                                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" size={14} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex justify-end">
                                                    {!isCancelled && !isDelivered && (
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (confirm('Cancel this order?')) handleStatusChange(order.id, "Cancelled");
                                                            }}
                                                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
                                                        >
                                                            Cancel Order
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

            </main>

            {/* Alert Modal */}
            {alertData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 animate-pulse"></div>
                        <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/50 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                            <Bell size={40} className="text-rose-600 dark:text-rose-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">New Order!</h2>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mb-6 border border-slate-100 dark:border-slate-700">
                            <div className="font-bold text-lg">#{alertData.id}</div>
                            <div className="text-sm text-slate-500">Total: ₹{alertData.total}</div>
                        </div>
                        <button
                            onClick={dismissAlert}
                            className="w-full py-4 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-lg rounded-2xl shadow-xl active:scale-95 transition-all"
                        >
                            Acknowledge
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderManagement;
