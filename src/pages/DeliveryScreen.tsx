import React, { useState, useEffect, useRef } from "react";
import { firebase } from "@/lib/firebase";
import { CONFIG } from "@/config";
import {
    Bell, Truck, MapPin, Phone, User, ShoppingBag, Navigation,
    ArrowRight, CheckCircle, Package, LogOut, Radar, ChevronDown,
    X, Map as MapIcon, RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Flow config
interface FlowStatus {
    next: string | null;
    text: string;
    icon: any;
    colorClass: string;
    disabled: boolean;
    theme: string;
}

/** Map older Firebase statuses to the current driver flow. */
function normalizeDriverOrderStatus(status: string): string {
    const map: Record<string, string> = {
        "Ready for Pickup": "Out for Delivery",
        "On the Way": "Arriving",
        Arrival: "Arriving",
    };
    return map[status] || status;
}

const STATUS_FLOW: Record<string, FlowStatus> = {
    Packed: {
        next: "Out for Delivery",
        text: "Slide when heading out for delivery",
        icon: Package,
        theme: "emerald",
        colorClass: "bg-emerald-600",
        disabled: false,
    },
    "Out for Delivery": {
        next: "Arriving",
        text: "Slide to mark Arriving",
        icon: Truck,
        theme: "emerald",
        colorClass: "bg-emerald-600",
        disabled: false,
    },
    Arriving: {
        next: "Delivered",
        text: "Slide to Mark Delivered",
        icon: MapPin,
        theme: "orange",
        colorClass: "bg-orange-500",
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

// Helper to load Google Maps script
const loadGoogleMaps = (apiKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if ((window as any).google && (window as any).google.maps) {
            resolve();
            return;
        }
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
    });
};

const DeliveryScreen = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
    const [alertData, setAlertData] = useState<{ id: string } | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [showConsignment, setShowConsignment] = useState(false);

    // Map & Location
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<any>(null);
    const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [eta, setEta] = useState<string | null>(null);

    // Status State
    const [isOnline, setIsOnline] = useState(false);
    const [employeeKey, setEmployeeKey] = useState<string | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);

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
            try {
                const parsedUser = JSON.parse(stored);
                if (parsedUser && parsedUser.id) {
                    setUser(parsedUser);
                } else {
                    toast.error("Invalid user session");
                    navigate("/");
                }
            } catch (e) {
                navigate("/");
            }
        } else {
            navigate("/");
        }
    }, [navigate]);

    // 2. Sync Online Status (Robust)
    useEffect(() => {
        if (!user) return;
        const db = firebase.database();
        const empRef = db.ref("root/nexus_hr/employees");

        setLoadingStatus(true);

        // Try getting by deliveryUserId first
        const listener = empRef.orderByChild("deliveryUserId").equalTo(user.id).on("value", snapshot => {
            if (snapshot.exists()) {
                const key = Object.keys(snapshot.val())[0];
                const val = snapshot.val()[key];
                setEmployeeKey(key);
                setIsOnline(val.status === 'Active');
                setLoadingStatus(false);
            } else {
                console.warn("No employee record found for delivery user:", user.id);
                setLoadingStatus(false);
            }
        });

        return () => empRef.off("value", listener);
    }, [user]);

    // 3. Sync Active Order (Fixed)
    useEffect(() => {
        if (!user) return;
        const db = firebase.database();
        const ordersRef = db.ref("root/order");

        const ordersQuery = ordersRef.orderByChild("delivery_partner_id").equalTo(user.id).limitToLast(10);

        const handleSnapshot = (snapshot: any) => {
            const orders = snapshot.val() || {};
            let foundOrder: any = null;
            let foundId: string | null = null;

            // Iterate to find active order
            const activeStatuses = ["Packed", "Out for Delivery", "Arriving", "Ready for Pickup", "On the Way", "Arrival"];
            const activeOrders = Object.entries(orders).filter(([_, ord]: [string, any]) =>
                activeStatuses.includes(ord.status)
            );

            if (activeOrders.length > 0) {
                // Pick the first one
                [foundId, foundOrder] = activeOrders[0];
            }

            setActiveOrder(foundOrder);
            setActiveOrderId(foundId);

            if (foundOrder && foundId && (foundOrder.status === "Packed" || foundOrder.status === "Out for Delivery" || foundOrder.status === "Ready for Pickup")) {
                if (!alertShownRef.current[foundId]) {
                    triggerAlert(foundId);
                    alertShownRef.current[foundId] = true;
                }
            }
        };

        ordersQuery.on("value", handleSnapshot);

        return () => ordersQuery.off("value", handleSnapshot);
    }, [user]);

    // 4. Load Map & Directions
    useEffect(() => {
        if (!activeOrder || !window.google) {
            if (CONFIG.GOOGLE_MAPS.apiKey) {
                loadGoogleMaps(CONFIG.GOOGLE_MAPS.apiKey).then(() => {
                    // Re-trigger effect
                    if (activeOrder) initMap();
                }).catch(e => console.error("Maps load error", e));
            }
            return;
        }
        initMap();
    }, [activeOrder]);

    const initMap = () => {
        if (!mapRef.current || !activeOrder) return;
        if (!window.google) return;

        // Initialize Map if not already
        if (!googleMapRef.current) {
            googleMapRef.current = new window.google.maps.Map(mapRef.current, {
                zoom: 15,
                center: { lat: 0, lng: 0 }, // Default, will update
                disableDefaultUI: true,
                styles: [
                    {
                        "featureType": "all",
                        "elementType": "geometry",
                        "stylers": [{ "color": "#242f3e" }]
                    },
                    {
                        "featureType": "all",
                        "elementType": "labels.text.stroke",
                        "stylers": [{ "lightness": -80 }]
                    },
                    {
                        "featureType": "administrative",
                        "elementType": "labels.text.fill",
                        "stylers": [{ "color": "#746855" }]
                    },
                    {
                        "featureType": "poi",
                        "elementType": "labels.text.fill",
                        "stylers": [{ "color": "#d59563" }]
                    },
                    {
                        "featureType": "road",
                        "elementType": "geometry.fill",
                        "stylers": [{ "color": "#2b3544" }]
                    },
                    {
                        "featureType": "road",
                        "elementType": "labels.text.fill",
                        "stylers": [{ "color": "#9ca5b3" }]
                    }
                ]
            });
        }

        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
            map: googleMapRef.current,
            suppressMarkers: false, // We'll rely on default markers for now or customize
            polylineOptions: {
                strokeColor: "#10b981", // Emerald-500
                strokeWeight: 6,
            }
        });
        setDirectionsRenderer(directionsRenderer);

        // Get Driver Location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const origin = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setCurrentLocation(origin);

                    // Destination Parsing
                    let dest: any = activeOrder.adrs;
                    // Try to parse lat/lng if string contains comma
                    if (typeof dest === 'string' && dest.includes(',')) {
                        const parts = dest.split(',');
                        if (!isNaN(parseFloat(parts[0]))) {
                            dest = { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
                        }
                    }

                    // Calculate Route
                    directionsService.route(
                        {
                            origin: origin,
                            destination: dest,
                            travelMode: window.google.maps.TravelMode.DRIVING
                        },
                        (result: any, status: any) => {
                            if (status === window.google.maps.DirectionsStatus.OK) {
                                directionsRenderer.setDirections(result);
                                const route = result.routes[0].legs[0];
                                setEta(route.duration.text);
                            } else {
                                console.error(`Directions request failed due to ${status}`);
                            }
                        }
                    );
                },
                () => {
                    toast.error("Location access denied. Cannot show route.");
                }
            );
        }
    };

    // Audio Logic
    const initAudio = () => {
        if (!audioCtxRef.current) {
            const Ctor = window.AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new Ctor();
        }
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    };

    const triggerAlert = (id: string) => {
        try {
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
        } catch (e) { console.error("Audio block", e); }
    };

    // Actions
    const handleGoOnline = () => {
        if (!employeeKey) {
            toast.error("Employee record not linked. Contact Admin.");
            return;
        }
        firebase.database().ref(`root/nexus_hr/employees/${employeeKey}`).update({ status: 'Active' })
            .then(() => toast.success("You are now Online!"))
            .catch(err => toast.error("Failed to go online: " + err.message));
    };

    const handleGoOffline = () => {
        if (!employeeKey) return;
        firebase.database().ref(`root/nexus_hr/employees/${employeeKey}`).update({ status: 'Offline' });
    };

    const updateStatus = async (newStatus: string) => {
        if (!activeOrderId) return;
        try {
            await firebase.database().ref(`root/order/${activeOrderId}`).update({
                status: newStatus,
                status_updated_at: new Date().toISOString()
            });
            toast.success(`Status updated to: ${newStatus}`);
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to update status");
        }
    };

    const handleCallCustomer = () => {
        if (activeOrder?.phnm) window.location.href = `tel:${activeOrder.phnm}`;
        else toast.error("No phone number available");
    };

    // Slider Logic
    const getFlow = (status: string) => {
        const key = normalizeDriverOrderStatus(status);
        return STATUS_FLOW[key] || STATUS_FLOW["Unknown"];
    };
    const currentStatus = activeOrder?.status || "Unknown";
    const flow = getFlow(currentStatus);

    const handleSliderStart = (clientX: number) => {
        if (flow.disabled) return;
        setIsSliding(true);
        setStartX(clientX);
    };

    const handleSliderMove = (clientX: number) => {
        if (!isSliding || !trackRef.current) return;
        const width = trackRef.current.offsetWidth;
        const delta = clientX - startX;
        const progress = Math.max(0, Math.min(delta, width * 0.9)); // Cap at 90% width
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

    const handleLogout = () => {
        handleGoOffline();
        sessionStorage.removeItem("delivery_user");
        setUser(null);
        navigate("/");
    };


    // RENDER
    if (!user) return null; // Redirect handled in useEffect

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
                    <button
                        onClick={handleGoOnline}
                        disabled={loadingStatus}
                        className="w-full py-5 bg-emerald-600 text-white font-black text-lg rounded-3xl shadow-2xl shadow-emerald-600/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loadingStatus ? "Checking Account..." : "Go Online Now"}
                    </button>
                    <button onClick={handleLogout} className="w-full py-4 text-slate-400 font-bold uppercase tracking-widest text-sm">Log Out</button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden flex flex-col relative">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 z-40 p-4">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-[2rem] p-4 flex justify-between items-center shadow-lg">
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

            {/* Profile Drawer */}
            {isProfileOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
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
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Delivery Partner</p>
                                </div>
                            </div>
                            <button onClick={handleGoOffline} className="w-full py-4 bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 rounded-2xl font-bold flex items-center justify-center gap-2">
                                <LogOut size={18} /> Take a Break
                            </button>
                        </div>
                        <button onClick={handleLogout} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-xl shadow-red-600/20">Sign Out</button>
                    </div>
                </div>
            )}

            {/* Main Content Area - Split into Map & Details */}
            <main className="flex-1 relative">
                {/* Map Layer */}
                <div ref={mapRef} className="absolute inset-0 bg-slate-200 dark:bg-slate-800 z-0">
                    {!activeOrder && (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                            <MapIcon size={48} className="mb-4 opacity-50" />
                            <p>Map unavailable until order is assigned</p>
                        </div>
                    )}
                </div>

                {/* Content Overlay */}
                {!activeOrder ? (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-sm">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500 rounded-full blur-3xl opacity-20 animate-pulse" />
                            <Radar size={80} className="text-emerald-600 animate-spin-slow relative z-10" />
                        </div>
                        <div className="mt-8 text-center space-y-3">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Searching for Orders</h2>
                            <p className="text-slate-500 max-w-[200px] mx-auto text-sm">We'll alert you as soon as a new task is assigned to you.</p>
                        </div>
                        <button onClick={handleGoOffline} className="mt-8 px-8 py-3 bg-white dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-3xl font-black uppercase text-xs tracking-widest hover:text-red-500 transition-colors">Go Offline</button>
                    </div>
                ) : (
                    <div className="absolute bottom-24 left-0 right-0 px-4 z-20 flex flex-col justify-end pointer-events-none">
                        {/* Status Chip */}
                        <div className="self-center mb-4 pointer-events-auto">
                            <div className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-lg border ${flow.colorClass} text-white flex items-center gap-2`}>
                                {eta && <span className="opacity-80 mr-1 border-r border-white/20 pr-2">{eta}</span>}
                                {currentStatus}
                            </div>
                        </div>

                        {/* Order Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 pointer-events-auto">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Customer</p>
                                    <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{activeOrder.name || "Customer"}</h4>
                                    <p className="text-sm font-medium text-slate-500 mt-1 line-clamp-1">{activeOrder.adrsName || activeOrder.adrs}</p>
                                </div>
                                <button onClick={handleCallCustomer} className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 hover:bg-emerald-100 transition-colors">
                                    <Phone size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <button
                                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.adrs}`, '_blank')}
                                    className="py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                                >
                                    <Navigation size={18} /> Navigate
                                </button>
                                <button
                                    onClick={() => setShowConsignment(!showConsignment)}
                                    className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                                >
                                    <ShoppingBag size={18} /> Details
                                </button>
                            </div>
                        </div>

                        {/* Consignment Scrollable Sheet */}
                        {showConsignment && (
                            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 z-30 pointer-events-auto animate-in slide-in-from-bottom h-[60vh] flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Order Details</h3>
                                    <button onClick={() => setShowConsignment(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                    {Object.keys(activeOrder).filter(k => k.startsWith('item')).map((key, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs font-black shrink-0">{i + 1}</div>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{activeOrder[key]}</span>
                                        </div>
                                    ))}
                                    <div className="mt-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex justify-between items-center">
                                        <span className="font-black text-slate-500 uppercase text-xs tracking-widest">Total Amount</span>
                                        <span className="font-black text-xl text-slate-900 dark:text-white">₹{activeOrder.total}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Sticky Action Area */}
            {activeOrder && (
                <div className="bg-white dark:bg-slate-950 border-t border-slate-200/50 dark:border-slate-800/50 p-6 pb-8 sticky bottom-0 z-40 backdrop-blur-3xl">
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
                        </div>
                    </div>
                </div>
            )}

            {/* Popup Alert */}
            {alertData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 text-center shadow-2xl border border-white/20 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500 animate-pulse" />
                        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 animate-bounce shadow-xl">
                            <Bell size={48} className="text-emerald-600" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">New Task!</h2>
                        <p className="text-slate-500 mb-10 font-medium">Order assignment received.</p>
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
