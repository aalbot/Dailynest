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
import { DeliveryAuth } from "@/components/DeliveryAuth";

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

    // Main Render Logic
    if (!user) return <DeliveryAuth onLogin={setUser} />;

    if (!isOnline) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="relative w-32 h-32 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-2xl border border-slate-100 dark:border-slate-800 mb-10">
                    <Truck className="w-16 h-16 text-slate-300" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Ready for your shift?</h1>
                <p className="text-slate-500 mb-12">Going online lets the team assign you orders.</p>
                <div className="w-full max-w-xs space-y-4">
                    <button onClick={handleGoOnline} className="w-full py-5 bg-emerald-600 text-white font-black text-lg rounded-3xl shadow-2xl shadow-emerald-600/30">Go Online Now</button>
                    <button onClick={() => { sessionStorage.removeItem("delivery_user"); setUser(null); }} className="w-full py-4 text-slate-400 font-bold uppercase tracking-widest text-sm">Log Out</button>
                </div>
            </div>
        );
    }

    const currentStatus = activeOrder?.status || "Unknown";
    const flow = getFlow(currentStatus);

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden flex flex-col">
            <header className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 p-4">
                <div className="max-w-lg mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Courier<span className="text-emerald-600">Hub</span></h1>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{user.name}</p>
                    </div>
                    <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-lg"><User size={20} /></button>
                </div>
            </header>

            <main className="max-w-lg mx-auto w-full px-5 py-6 flex-1 overflow-hidden flex flex-col">
                {!activeOrder ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-8">
                        <Radar size={60} className="text-emerald-600 animate-pulse" />
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white">Searching for Orders</h2>
                        <button onClick={handleGoOffline} className="w-full max-w-[200px] py-4 bg-white dark:bg-slate-900 text-red-600 border border-slate-200 dark:border-slate-800 rounded-3xl font-black uppercase text-xs tracking-widest">Go Offline</button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Current Task</span>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white shrink-0">#{activeOrderId?.slice(-6).toUpperCase()}</h3>
                            </div>
                            <div className="bg-slate-900 text-white px-3 py-1 rounded-xl text-xs font-bold">{currentStatus}</div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 space-y-6">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0"><MapPin size={20} /></div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Delivery Address</p>
                                    <h4 className="font-black text-slate-900 dark:text-white">{fetchedAddress || activeOrder.adrsName || "Customer Location"}</h4>
                                </div>
                            </div>

                            <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.adrs}`, '_blank')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                                <Navigation size={18} /> Open in Google Maps
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DeliveryScreen;
