import React, { useState, useEffect, useRef } from "react";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
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
    Coffee
} from "lucide-react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";

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

// Types
interface FlowStatus {
    next: string | null;
    text: string;
    icon: any;
    colorClass: string;
    disabled: boolean;
}

// Convert classes to Tailwind color schemes
// We will assign a 'theme' string which our component interprets for styles
const STATUS_FLOW: Record<string, FlowStatus & { theme: string }> = {
    "Ready for Pickup": {
        next: "On the Way",
        text: "Slide to Start Delivery",
        icon: Truck,
        theme: "blue",
        colorClass: "bg-blue-600",
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

import { DeliveryAuth } from "@/components/DeliveryAuth";

const SLIDE_THRESHOLD = 0.8;

const DeliveryScreen = () => {
    const [user, setUser] = useState<any>(null);
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
    const [alertData, setAlertData] = useState<{ id: string } | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // Status State
    const [isOnline, setIsOnline] = useState(false);
    const [employeeKey, setEmployeeKey] = useState<string | null>(null);

    // Sync Online Status
    useEffect(() => {
        if (!user) return;
        const db = firebase.database();
        const empRef = db.ref("root/nexus_hr/employees");

        // Find employee record by deliveryUserId
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

    const handleGoOnline = () => {
        if (employeeKey) {
            firebase.database().ref(`root/nexus_hr/employees/${employeeKey}`).update({ status: 'Active' });
        }
    };

    const handleGoOffline = () => {
        if (employeeKey) {
            firebase.database().ref(`root/nexus_hr/employees/${employeeKey}`).update({ status: 'Offline' });
        }
    };

    // Slider State
    const trackRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);
    const [isSliding, setIsSliding] = useState(false);
    const [startX, setStartX] = useState(0);
    const [translateX, setTranslateX] = useState(0);

    // Check Login
    useEffect(() => {
        const stored = sessionStorage.getItem("delivery_user");
        if (stored) {
            setUser(JSON.parse(stored));
        }
    }, []);

    // MOVED AUTH CHECK TO RENDER to avoid Hook Rules violation
    // if (!user) ...

    // Audio Context
    const audioCtxRef = useRef<AudioContext | null>(null);
    const alertShownRef = useRef<Record<string, boolean>>({});

    useEffect(() => {
        if (!user) return; // Wait for user login

        const db = firebase.database();
        const ordersRef = db.ref("root/order");

        const onValue = ordersRef.on("value", (snapshot) => {
            const orders = snapshot.val();
            if (!orders) {
                setActiveOrder(null);
                setActiveOrderId(null);
                return;
            }

            let foundOrder: any = null;
            let foundId: string | null = null;

            // 1. Check current active if still valid (not completed)
            if (activeOrderId && orders[activeOrderId]) {
                const st = orders[activeOrderId].status;
                if (st !== "Delivered" && st !== "Cancelled") {
                    foundOrder = orders[activeOrderId];
                    foundId = activeOrderId;
                }
            }

            // 2. If no active, find FIRST 'Ready for Pickup' assigned to ME
            if (!foundOrder) {
                for (const id in orders) {
                    const o = orders[id];
                    // STRICT filtering: Status is Ready AND Assigned to this user
                    if (o.status === "Ready for Pickup" && o.delivery_partner_id === user.id) {
                        foundOrder = o;
                        foundId = id;
                        break;
                    }
                }
            }

            setActiveOrder(foundOrder);
            setActiveOrderId(foundId);

            // Trigger Alert
            if (foundOrder && foundId && foundOrder.status === "Ready for Pickup") {
                if (!alertShownRef.current[foundId]) {
                    triggerAlert(foundId);
                    alertShownRef.current[foundId] = true;
                }
            }
        });

        return () => ordersRef.off("value", onValue);
    }, [activeOrderId, user]);

    // --- Audio ---
    const initAudio = () => {
        if (!audioCtxRef.current) {
            const Ctor = window.AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new Ctor();
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    };

    const triggerAlert = (id: string) => {
        initAudio();
        // Play sound
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

    const dismissAlert = () => {
        setAlertData(null);
    };

    // --- Slider Logic ---
    const handleStart = (clientX: number) => {
        if (!activeOrder) return;
        const status = activeOrder.status || "Unknown";
        const flow = getFlow(status);
        if (flow.disabled || !flow.next) return;

        initAudio();

        setIsSliding(true);
        setStartX(clientX);
    };

    // Add global listeners when sliding
    useEffect(() => {
        if (!isSliding) return;

        const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

            if (!trackRef.current || !handleRef.current) return;

            const trackWidth = trackRef.current.offsetWidth;
            const handleWidth = handleRef.current.offsetWidth;
            const maxDelta = trackWidth - handleWidth - 8; // 8px total padding (4px each side)

            let delta = clientX - startX;
            delta = Math.max(0, Math.min(delta, maxDelta));
            setTranslateX(delta);
        };

        const handleGlobalEnd = () => {
            setIsSliding(false);

            if (!trackRef.current || !handleRef.current) return;

            const trackWidth = trackRef.current.offsetWidth;
            const handleWidth = handleRef.current.offsetWidth;
            const maxTravel = trackWidth - handleWidth - 8;

            if (translateX / maxTravel >= SLIDE_THRESHOLD) {
                // Success
                setTranslateX(maxTravel);
                const status = activeOrder.status || "Unknown";
                const flow = getFlow(status);
                if (flow && flow.next) {
                    updateStatus(flow.next);
                }
                setTimeout(() => setTranslateX(0), 300);
            } else {
                // Failed - Snap Back
                setTranslateX(0);
            }
        };

        document.addEventListener('mousemove', handleGlobalMove);
        document.addEventListener('mouseup', handleGlobalEnd);
        document.addEventListener('touchmove', handleGlobalMove);
        document.addEventListener('touchend', handleGlobalEnd);

        return () => {
            document.removeEventListener('mousemove', handleGlobalMove);
            document.removeEventListener('mouseup', handleGlobalEnd);
            document.removeEventListener('touchmove', handleGlobalMove);
            document.removeEventListener('touchend', handleGlobalEnd);
        };
    }, [isSliding, startX, translateX, activeOrder]);

    // Status Updater
    const updateStatus = async (newStatus: string) => {
        if (!activeOrderId) return;
        try {
            await firebase.database().ref(`root/order/${activeOrderId}`).update({
                status: newStatus,
                status_updated_at: new Date().toISOString()
            });
        } catch (err) {
            console.error(err);
        }
    };

    // Navigation
    const openMaps = () => {
        if (!activeOrder) return;
        let dest = "";
        if (activeOrder.adrs && typeof activeOrder.adrs === 'string' && activeOrder.adrs.includes(',')) {
            dest = activeOrder.adrs.replace(/\s/g, '');
        } else {
            if (activeOrder.adrs?.latitude && activeOrder.adrs?.longitude) {
                dest = `${activeOrder.adrs.latitude},${activeOrder.adrs.longitude}`;
            } else {
                dest = activeOrder.adrs;
            }
        }

        if (!dest) {
            alert("Address invalid");
            return;
        }

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const url = `https://www.google.com/maps/dir/${pos.coords.latitude},${pos.coords.longitude}/${dest}`;
                window.open(url, '_blank');
            }, () => {
                window.open(`https://www.google.com/maps/search/?api=1&query=${dest}`, '_blank');
            });
        } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${dest}`, '_blank');
        }
    };

    // Helper
    const getFlow = (status: string) => {
        if (STATUS_FLOW[status]) return STATUS_FLOW[status];
        const keys = Object.keys(STATUS_FLOW);
        const match = keys.find(k => k.toLowerCase() === status.toLowerCase());
        return match ? STATUS_FLOW[match] : STATUS_FLOW["Unknown"];
    };

    const currentStatus = activeOrder?.status || "Unknown";
    const flow = getFlow(currentStatus);
    const nextFlow = STATUS_FLOW[flow.next || "Delivered"];
    const isDisabled = flow.disabled || !flow.next;

    // Theme Colors Helper
    const getThemeColors = (theme: string) => {
        switch (theme) {
            case 'blue': return 'bg-blue-600 text-white shadow-blue-500/30';
            case 'orange': return 'bg-orange-500 text-white shadow-orange-500/30';
            case 'emerald': return 'bg-emerald-600 text-white shadow-emerald-500/30';
            case 'red': return 'bg-red-600 text-white';
            default: return 'bg-slate-600 text-white';
        }
    };

    // Icon for current step slider
    const SliderIcon = nextFlow?.icon || CheckCircle;

    if (!user) {
        return <DeliveryAuth onLogin={setUser} />;
    }

    if (!isOnline) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Truck className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                </div>
                <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">Ready to Start?</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs mx-auto">You are currently offline. Go online to start receiving delivery requests.</p>
                <button
                    onClick={handleGoOnline}
                    className="w-full max-w-xs py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <CheckCircle className="w-6 h-6" /> Ready for Pickup
                </button>
                <button
                    onClick={() => { sessionStorage.removeItem("delivery_user"); setUser(null); }}
                    className="mt-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-medium"
                >
                    Logout
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-slate-950 dark:to-slate-900 font-sans transition-colors duration-300 flex flex-col items-center">


            <div className="w-full max-w-lg mt-16 px-4 py-6 flex-1 flex flex-col min-h-[calc(100vh-64px)] safe-pb">

                {/* Header */}
                <div className="flex flex-row items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2">
                                Delivery Dashboard
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                {user?.name || "Live Feed"}
                            </p>
                        </div>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all"
                        >
                            <User size={20} />
                        </button>

                        {isProfileOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.name || "Delivery Partner"}</p>
                                        <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => {
                                            handleGoOffline();
                                            setIsProfileOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2 p-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors mb-1"
                                    >
                                        <Coffee size={16} /> Take a break
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (confirm("Stop getting orders and Logout?")) {
                                                handleGoOffline();
                                                sessionStorage.removeItem("delivery_user");
                                                setUser(null);
                                            }
                                        }}
                                        className="w-full flex items-center gap-2 p-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                    >
                                        <LogOut size={16} /> Logout
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {!activeOrder ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                            <div className="relative bg-white dark:bg-slate-800 p-6 rounded-full shadow-2xl border border-blue-100 dark:border-slate-700">
                                <Truck size={48} className="text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Waiting for Orders</h2>
                        <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                            Stay online. We'll notify you with a loud alert when a new pickup is ready.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-8 duration-500 flex-1">

                        {/* Status Card */}
                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-1 rounded-2xl shadow-xl overflow-hidden">
                            <div className={`p-4 rounded-xl flex items-center justify-between ${flow.theme === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' :
                                flow.theme === 'orange' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' :
                                    flow.theme === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' :
                                        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}>
                                <div className="flex items-center gap-3 font-bold">
                                    {flow.icon && <flow.icon size={20} />}
                                    <span>{currentStatus}</span>
                                </div>
                                <div className="text-xs font-mono bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                                    #{activeOrderId}
                                </div>
                            </div>

                            <div className="p-5 space-y-5">
                                {/* Map / Directions */}
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                                        <MapPin size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Destination</div>
                                        <div className="font-semibold text-slate-900 dark:text-slate-100 leading-snug mb-3">
                                            {activeOrder.adrs || "No address provided"}
                                        </div>
                                        <button
                                            onClick={openMaps}
                                            className="w-full py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-lg shadow-slate-900/20"
                                        >
                                            <Navigation size={16} /> Navigate
                                        </button>
                                    </div>
                                </div>

                                <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>

                                {/* Customer Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Customer</div>
                                            <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{activeOrder.name || "Guest"}</div>
                                        </div>
                                    </div>
                                    <a href={`tel:${activeOrder.phnm}`} className="flex gap-3 p-2 -m-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                                            <Phone size={20} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Call</div>
                                            <div className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-sm">{activeOrder.phnm || "N/A"}</div>
                                        </div>
                                    </a>
                                </div>

                                <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>

                                {/* Order Items */}
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                                        <ShoppingBag size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Items</div>
                                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {Object.keys(activeOrder).filter(k => k.startsWith('item') && activeOrder[k]).map(k => activeOrder[k]).join(' • ') || "No items listed"}
                                        </div>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between border border-slate-100 dark:border-slate-700/50">
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                        <Wallet size={18} />
                                        <span className="text-sm font-semibold">Total to Collect</span>
                                    </div>
                                    <div className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                                        <span className="text-base mr-1">{activeOrder.currency || "₹"}</span>
                                        {activeOrder.total || "0.00"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1"></div> {/* Spacer */}

                        {/* Slider Button */}
                        <div className="sticky bottom-6 z-10">
                            <div
                                className={`relative h-16 rounded-full overflow-hidden select-none border-4 transition-colors ${isDisabled ? "bg-slate-200 dark:bg-slate-800 border-slate-100 dark:border-slate-700 cursor-not-allowed" :
                                    nextFlow.theme === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-50 dark:border-blue-900/50' :
                                        nextFlow.theme === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-50 dark:border-orange-900/50' :
                                            'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-50 dark:border-emerald-900/50'
                                    }`}
                                ref={trackRef}
                            >
                                {/* Text Label */}
                                <div className={`absolute inset-0 flex items-center justify-center font-bold text-sm tracking-widest uppercase transition-opacity duration-300 ${isDisabled ? "text-slate-400" :
                                    nextFlow.theme === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                                        nextFlow.theme === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                                            'text-emerald-600 dark:text-emerald-400'
                                    }`} style={{ opacity: isSliding ? 0 : 1 }}>
                                    {isDisabled ? flow.text : nextFlow.text}
                                    {!isDisabled && <div className="ml-2 animate-bounce-horizontal"><ArrowRight size={14} /></div>}
                                </div>

                                {/* Sliding Handle */}
                                {!isDisabled && (
                                    <div
                                        className={`absolute top-1 left-1 bottom-1 w-14 rounded-full shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing z-20 ${nextFlow.theme === 'blue' ? 'bg-blue-600 text-white' :
                                            nextFlow.theme === 'orange' ? 'bg-orange-600 text-white' :
                                                'bg-emerald-600 text-white'
                                            }`}
                                        ref={handleRef}
                                        style={{ transform: `translateX(${translateX}px)`, transition: isSliding ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                                        onTouchStart={e => handleStart(e.touches[0].clientX)}
                                        onMouseDown={e => handleStart(e.clientX)}
                                    >
                                        <SliderIcon size={24} strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* New Order Alert Modal */}
            {alertData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
                        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                            <Bell size={40} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">New Order!</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-8">
                            Order #{alertData.id} is ready for pickup.
                        </p>
                        <button
                            onClick={dismissAlert}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-xl shadow-blue-500/30 active:scale-95 transition-all"
                        >
                            Start Order
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryScreen;
