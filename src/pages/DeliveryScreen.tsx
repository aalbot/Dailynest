import React, { useState, useEffect, useRef } from "react";
import { firebase } from "@/lib/firebase";
import { CONFIG } from "@/config";
import {
    Bell,
    Truck,
    MapPin,
    Phone,
    User,
    ShoppingBag,
    Wallet,
    Navigation,
    ArrowRight,
    CheckCircle,
    Package,
    Clock,
    DollarSign,
    LogOut,
    Coffee,
    Radar,
    ChevronDown,
    X,
    Map as MapIcon
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useNavigate } from "react-router-dom";

// Types
interface FlowStatus {
    next: string | null;
    text: string;
    icon: any;
    colorClass: string;
    disabled: boolean;
    theme: string;
}

const STATUS_FLOW: Record<string, FlowStatus> = {
    "Ready for Pickup": {
        next: "On the Way",
        text: "Slide to Start Delivery",
        icon: Truck,
        theme: "emerald",
        colorClass: "bg-emerald-600",
        disabled: false,
    },
    "On the Way": {
        next: "Arrival",
        text: "Slide to Confirm Arrival",
        icon: MapPin,
        theme: "orange",
        colorClass: "bg-orange-500",
        disabled: false,
    },
    Arrival: {
        next: "Delivered",
        text: "Slide to Mark Delivered",
        icon: Package,
        theme: "emerald",
        colorClass: "bg-emerald-600",
        disabled: false,
    },
    Delivered: {
        next: null,
        text: "Order Completed",
        icon: CheckCircle,
        theme: "slate",
        colorClass: "bg-slate-600",
        disabled: true,
    },
    Cancelled: {
        next: null,
        text: "Order Cancelled",
        icon: CheckCircle,
        theme: "red",
        colorClass: "bg-red-600",
        disabled: true,
    },
    Unknown: {
        next: null,
        text: "Status Unknown",
        icon: CheckCircle,
        theme: "gray",
        colorClass: "bg-gray-400",
        disabled: true,
    },
};

const SLIDE_THRESHOLD = 0.8;

const DeliveryScreen = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [fetchedAddress, setFetchedAddress] = useState<string | null>(null);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
    const [alertData, setAlertData] = useState<{ id: string } | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [showConsignment, setShowConsignment] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);
    const [navigationInfo, setNavigationInfo] = useState<{ distance: string, duration: string } | null>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<HTMLDivElement>(null);

    // Status State
    const [isOnline, setIsOnline] = useState(false);
    const [employeeKey, setEmployeeKey] = useState<string | null>(null);

    // Slider State
    const trackRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);
    const [isSliding, setIsSliding] = useState(false);
    const [startX, setStartX] = useState(0);
    const [translateX, setTranslateX] = useState(0);

    // Audio Context
    const audioCtxRef = useRef<AudioContext | null>(null);
    const alertShownRef = useRef<Record<string, boolean>>({});

    // 1. Check Login
    useEffect(() => {
        const stored = sessionStorage.getItem("delivery_user");
        if (stored) {
            setUser(JSON.parse(stored));
        }
    }, []);

    // 2. Sync Online Status
    useEffect(() => {
        if (!user) return;
        const db = firebase.database();
        const empRef = db.ref("root/nexus_hr/employees");

        empRef.orderByChild("deliveryUserId").equalTo(user.id).on("value", snapshot => {
            if (snapshot.exists()) {
                const key = Object.keys(snapshot.val())[0];
                const val = snapshot.val()[key];
                setEmployeeKey(key);
                setIsOnline(val.status === 'Active');
            }
        });

        return () => empRef.off();
    }, [user]);

    // 3. Optimized User Order Sync
    useEffect(() => {
        if (!user) return;
        const db = firebase.database();
        const ordersRef = db.ref("root/order");

        // Only fetch the most recent assignments to save bandwidth
        const ordersQuery = ordersRef.orderByChild("delivery_partner_id").equalTo(user.id).limitToLast(10);

        const syncActiveOrder = () => {
            ordersQuery.once("value", (snapshot) => {
                const orders = snapshot.val() || {};
                let foundOrder: any = null;
                let foundId: string | null = null;

                // Priority finding of active task
                for (const id in orders) {
                    const status = orders[id].status;
                    if (status !== "Delivered" && status !== "Cancelled") {
                        foundOrder = orders[id];
                        foundId = id;
                        break;
                    }
                }

                setActiveOrder(foundOrder);
                setActiveOrderId(foundId);

                if (foundOrder && foundId && foundOrder.status === "Ready for Pickup") {
                    if (!alertShownRef.current[foundId]) {
                        triggerAlert(foundId);
                        alertShownRef.current[foundId] = true;
                    }
                }
            });
        };

        ordersQuery.on("child_added", syncActiveOrder);
        ordersQuery.on("child_changed", syncActiveOrder);

        return () => {
            ordersQuery.off("child_added", syncActiveOrder);
            ordersQuery.off("child_changed", syncActiveOrder);
        };
    }, [user]);

    // 4. Geocoding
    useEffect(() => {
        if (!activeOrder || activeOrder.adrsName || activeOrder.locationName) {
            setFetchedAddress(null);
            return;
        }

        let lat = null, lng = null;
        if (activeOrder.adrs && typeof activeOrder.adrs === 'string' && activeOrder.adrs.includes(',')) {
            const parts = activeOrder.adrs.split(',');
            lat = parseFloat(parts[0]);
            lng = parseFloat(parts[1]);
        } else if (activeOrder.adrs?.latitude && activeOrder.adrs?.longitude) {
            lat = activeOrder.adrs.latitude;
            lng = activeOrder.adrs.longitude;
        }

        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
            fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${CONFIG.GOOGLE_MAPS.apiKey}`)
                .then(res => res.json())
                .then(data => {
                    if (data.results?.[0]) setFetchedAddress(data.results[0].formatted_address);
                })
                .catch(err => console.error("Geocoding error:", err));
        }
    }, [activeOrder]);

    // Helpers
    const initAudio = () => {
        if (!audioCtxRef.current) {
            const Ctor = window.AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new Ctor();
        }
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    };

    const triggerAlert = (id: string) => {
        initAudio();
        if (audioCtxRef.current) {
            const osc = audioCtxRef.current.createOscillator();
            const gain = audioCtxRef.current.createGain();
            osc.connect(gain);
            gain.connect(audioCtxRef.current.destination);
            osc.type = "square";
            osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime);
            gain.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, audioCtxRef.current.currentTime + 0.05);
            gain.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.4);
            osc.start();
            osc.stop(audioCtxRef.current.currentTime + 0.4);
        }
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        setAlertData({ id });
    };

    const handleGoOnline = () => employeeKey && firebase.database().ref(`root/nexus_hr/employees/${employeeKey}`).update({ status: 'Active' });
    const handleGoOffline = () => employeeKey && firebase.database().ref(`root/nexus_hr/employees/${employeeKey}`).update({ status: 'Offline' });

    const updateStatus = async (newStatus: string) => {
        if (!activeOrderId) return;
        try {
            await firebase.database().ref(`root/order/${activeOrderId}`).update({
                status: newStatus,
                status_updated_at: new Date().toISOString()
            });
        } catch (err) { console.error(err); }
    };

    const getFlow = (status: string) => STATUS_FLOW[status] || Object.values(STATUS_FLOW).find(f => f.text.includes(status)) || STATUS_FLOW["Unknown"];
    const currentStatus = activeOrder?.status || "Unknown";
    const flow = getFlow(currentStatus);

    // Slider Touch/Mouse Handlers
    const handleSliderStart = (clientX: number) => {
        if (flow.disabled) return;
        setIsSliding(true);
        setStartX(clientX);
    };

    const handleSliderMove = (clientX: number) => {
        if (!isSliding || !trackRef.current) return;
        const width = trackRef.current.offsetWidth;
        const delta = clientX - startX;
        const progress = Math.max(0, Math.min(delta, width * 0.9));
        setTranslateX(progress);

        if (progress > width * SLIDE_THRESHOLD) {
            handleSliderEnd();
            if (flow.next) updateStatus(flow.next);
        }
    };

    const handleSliderEnd = () => {
        setIsSliding(false);
        setTranslateX(0);
    };

    const handleCallCustomer = () => {
        if (activeOrder?.phnm) window.location.href = `tel:${activeOrder.phnm}`;
    };

    const handleLogout = () => {
        handleGoOffline();
        sessionStorage.removeItem("delivery_user");
        setUser(null);
    };

    // Main Render Logic
    if (!user) {
        navigate("/");
        return null;
    }

    if (!isOnline) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="relative w-32 h-32 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-2xl border border-slate-100 dark:border-slate-800 mb-10">
                    <Truck className="w-16 h-16 text-slate-300" />
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-slate-300 animate-spin" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Ready for your shift?</h1>
                <p className="text-slate-500 mb-12">Going online lets the team assign you orders.</p>
                <div className="w-full max-w-xs space-y-4">
                    <button onClick={handleGoOnline} className="w-full py-5 bg-emerald-600 text-white font-black text-lg rounded-3xl shadow-2xl shadow-emerald-600/30 active:scale-95 transition-all">Go Online Now</button>
                    <button onClick={handleLogout} className="w-full py-4 text-slate-400 font-bold uppercase tracking-widest text-sm">Log Out</button>
                </div>
            </div>
        );
    }



    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden flex flex-col">
            {/* Header */}
            <header className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 p-4 sticky top-0 z-40">
                <div className="max-w-lg mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 flex items-center justify-center text-emerald-600">
                            <Truck size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Courier<span className="text-emerald-600">Hub</span></h1>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{user.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shadow-sm"
                    >
                        <User size={20} />
                    </button>
                </div>
            </header>

            {/* Profile Drawer Overlay */}
            {isProfileOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-900 shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-500">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Profile</h2>
                            <button onClick={() => setIsProfileOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><X size={20} /></button>
                        </div>

                        <div className="space-y-6 flex-1">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <div className="text-center mb-4">
                                    <div className="w-20 h-20 bg-emerald-600 rounded-full mx-auto flex items-center justify-center text-white mb-3 shadow-xl shadow-emerald-600/20">
                                        <User size={32} />
                                    </div>
                                    <h3 className="font-black text-slate-900 dark:text-white">{user.name}</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Delivery Lead</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl text-center shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Deliveries</p>
                                        <p className="font-black text-emerald-600">--</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl text-center shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Rating</p>
                                        <p className="font-black text-emerald-600">5.0</p>
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleGoOffline} className="w-full py-4 bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 rounded-2xl font-bold flex items-center justify-center gap-2">
                                <LogOut size={18} /> Take a Break (Offline)
                            </button>
                        </div>

                        <button onClick={handleLogout} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-xl shadow-red-600/20">Sign Out</button>
                    </div>
                </div>
            )}

            <main className="max-w-lg mx-auto w-full px-5 py-6 flex-1 overflow-y-auto custom-scrollbar">
                {!activeOrder ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-8 animate-in zoom-in duration-700">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500 rounded-full blur-3xl opacity-20 animate-pulse" />
                            <Radar size={80} className="text-emerald-600 animate-spin-slow relative z-10" />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Searching for Orders</h2>
                            <p className="text-slate-500 max-w-[200px] mx-auto text-sm">We'll alert you as soon as a new task is assigned to you.</p>
                        </div>
                        <button onClick={handleGoOffline} className="w-full max-w-[200px] py-4 bg-white dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-3xl font-black uppercase text-xs tracking-widest hover:text-red-500 transition-colors">Go Offline</button>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {/* Order Header */}
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Current Task
                                </span>
                                <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter shrink-0 mt-1">#{activeOrderId?.slice(-6).toUpperCase()}</h3>
                            </div>
                            <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm border ${flow.colorClass} text-white`}>
                                {currentStatus}
                            </div>
                        </div>

                        {/* Customer Card */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl shadow-emerald-600/5 border border-slate-100 dark:border-slate-800 space-y-8">
                            <div className="flex gap-6">
                                <div className="w-16 h-16 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
                                    <User size={28} />
                                </div>
                                <div className="flex-1 pt-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Customer</p>
                                    <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{activeOrder.name || "DailyClub Customer"}</h4>
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={handleCallCustomer} className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-transform active:scale-95">
                                            <Phone size={12} /> Call Client
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex gap-6">
                                    <div className="w-16 h-16 rounded-[2rem] bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0">
                                        <MapPin size={28} />
                                    </div>
                                    <div className="flex-1 pt-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Delivery Address</p>
                                        <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 leading-snug">{fetchedAddress || activeOrder.adrsName || activeOrder.adrs || "Location data not available"}</h4>
                                    </div>
                                </div>
                                <button
                                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.adrs}`, '_blank')}
                                    className="w-full py-5 bg-slate-900 dark:bg-emerald-600 text-white rounded-[1.5rem] font-black flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest"
                                >
                                    <Navigation size={20} /> Open Navigation
                                </button>
                            </div>
                        </div>

                        {/* Consignment Overview */}
                        <div className="bg-slate-100/50 dark:bg-slate-900/50 rounded-[2.5rem] p-6 border border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setShowConsignment(!showConsignment)}
                                className="w-full flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 shadow-sm">
                                        <ShoppingBag size={20} />
                                    </div>
                                    <span className="font-black text-slate-900 dark:text-white tracking-tight">Consignment Details</span>
                                </div>
                                <ChevronDown className={`text-slate-400 transition-transform duration-300 ${showConsignment ? 'rotate-180' : ''}`} />
                            </button>

                            {showConsignment && (
                                <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                                    {Object.keys(activeOrder).filter(k => k.startsWith('item')).map((key, i) => (
                                        <div key={i} className="flex items-center gap-4 bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs font-black">
                                                {i + 1}
                                            </div>
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{activeOrder[key]}</span>
                                        </div>
                                    ))}
                                    <div className="pt-4 flex justify-between items-center px-4">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Grand Total</span>
                                        <span className="text-xl font-black text-slate-900 dark:text-white">₹{activeOrder.total}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Sticky Action Area */}
            {activeOrder && (
                <div className="bg-white dark:bg-slate-950 border-t border-slate-200/50 dark:border-slate-800/50 p-6 pb-10 sticky bottom-0 z-40 backdrop-blur-3xl shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.1)]">
                    <div className="max-w-lg mx-auto">
                        <div
                            ref={trackRef}
                            className={`relative h-20 w-full rounded-[2rem] overflow-hidden flex items-center px-2 shadow-inner transition-colors duration-500 ${flow.disabled ? 'bg-slate-100' : 'bg-slate-100 dark:bg-slate-900'}`}
                        >
                            {!flow.disabled && (
                                <div
                                    className={`absolute inset-y-2 left-2 rounded-[1.5rem] flex items-center justify-center text-white font-black uppercase text-xs tracking-tighter ${flow.colorClass}`}
                                    style={{ width: `${64 + translateX}px` }}
                                >
                                    {translateX > 50 && <ArrowRight className="animate-pulse" />}
                                </div>
                            )}

                            <span className={`w-full text-center font-black uppercase text-sm tracking-widest pointer-events-none transition-opacity ${flow.disabled ? 'text-slate-400' : 'text-slate-500 dark:text-slate-500'}`}>
                                {flow.text}
                            </span>

                            {!flow.disabled && (
                                <div
                                    ref={handleRef}
                                    onMouseDown={(e) => handleSliderStart(e.clientX)}
                                    onTouchStart={(e) => handleSliderStart(e.touches[0].clientX)}
                                    onMouseMove={(e) => isSliding && handleSliderMove(e.clientX)}
                                    onTouchMove={(e) => isSliding && handleSliderMove(e.touches[0].clientX)}
                                    onMouseUp={handleSliderEnd}
                                    onTouchEnd={handleSliderEnd}
                                    className={`absolute left-2 w-16 h-16 rounded-[1.5rem] bg-white shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform duration-100 z-10`}
                                    style={{ transform: `translateX(${translateX}px)` }}
                                >
                                    <flow.icon className={`text-slate-900`} size={24} />
                                </div>
                            )}

                            {/* Sliding Background Glow */}
                            {!flow.disabled && (
                                <div
                                    className={`absolute left-0 top-0 bottom-0 opacity-20 pointer-events-none ${flow.colorClass}`}
                                    style={{ width: `${translateX + 80}px` }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Simple Popup Alert for Incoming Orders */}
            {alertData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 text-center shadow-2xl border border-white/20 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500 animate-pulse" />
                        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 animate-bounce shadow-xl">
                            <Bell size={48} className="text-emerald-600" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">New Task!</h2>
                        <p className="text-slate-500 mb-10 font-medium">Order assignment received. Review and start delivery now.</p>
                        <button
                            onClick={() => setAlertData(null)}
                            className="w-full py-5 bg-emerald-600 text-white font-black text-lg rounded-3xl shadow-xl shadow-emerald-600/30 active:scale-95 transition-all"
                        >
                            Accept Task
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryScreen;
