import React, { useState, useEffect, useRef, useCallback } from "react";
import { firebase } from "@/lib/firebase";
import { CONFIG } from "@/config";
import {
    Bell, Truck, MapPin, Phone, User, ShoppingBag, Navigation,
    ArrowRight, CheckCircle, Package, LogOut, Radar,
    X, Map as MapIcon, CreditCard, IndianRupee,
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

/** Fraction of usable track width to complete the slide (lower = quicker to confirm). */
const SLIDE_THRESHOLD = 0.58;
const SLIDER_HANDLE_PX = 64;
const SLIDER_INSET_PX = 16;

/** Aligns with `parseOrderTotal` in Dashboard metrics: `total` may be a number or string like `599-COD`. */
function parseOrderMoney(o: Record<string, any> | null | undefined): { amountLabel: string; paymentLabel: string } {
    if (!o) return { amountLabel: "—", paymentLabel: "—" };
    const explicitRaw = [o.payment, o.paymentMode, o.mode_of_payment, o.pay_mode, o.payType, o.payment_method].find(
        (v) => typeof v === "string" && String(v).trim(),
    );
    const explicitStr = typeof explicitRaw === "string" ? explicitRaw.trim() : "";

    const t = o.total;
    if (t == null || t === "") {
        return { amountLabel: "—", paymentLabel: explicitStr || "—" };
    }
    if (typeof t === "number" && !Number.isNaN(t)) {
        return { amountLabel: `₹${t}`, paymentLabel: explicitStr || "—" };
    }
    const s = String(t).trim();
    const numPart = (str: string) => parseFloat(str.replace(/[,₹\s]/g, "")) || 0;
    if (s.includes("-")) {
        const idx = s.indexOf("-");
        const amount = numPart(s.slice(0, idx));
        const rest = s.slice(idx + 1).toLowerCase();
        let method = "Other";
        if (rest.includes("cod")) method = "COD";
        else if (rest.includes("wallet")) method = "Wallet";
        else if (rest.includes("upi")) method = "UPI";
        else if (rest.includes("card") || rest.includes("razorpay")) method = "Card";
        return {
            amountLabel: amount > 0 ? `₹${amount}` : "—",
            paymentLabel: explicitStr || method,
        };
    }
    const amt = numPart(s);
    return { amountLabel: amt > 0 ? `₹${amt}` : "—", paymentLabel: explicitStr || "—" };
}

let mapsScriptPromise: Promise<void> | null = null;

function getGoogleMapsApiKey(): string {
    const envKey = typeof import.meta !== "undefined" ? (import.meta as unknown as { env?: { VITE_GOOGLE_MAPS_API_KEY?: string } }).env?.VITE_GOOGLE_MAPS_API_KEY : "";
    const k = (typeof envKey === "string" && envKey.trim() ? envKey : CONFIG.GOOGLE_MAPS.apiKey || "").trim();
    return k;
}

/**
 * Loads Maps JS API once. Uses callback + loading=async (Google-recommended).
 * Omits `libraries=places` — this screen only needs core Maps + Directions; Places can break load if that API is disabled.
 */
function loadGoogleMaps(apiKey: string): Promise<void> {
    if (!apiKey) {
        return Promise.reject(new Error("Missing Google Maps API key"));
    }
    if (typeof window === "undefined") {
        return Promise.reject(new Error("No window"));
    }
    const g = window as Window & { google?: { maps?: { Map?: unknown } } };
    if (g.google?.maps?.Map) {
        return Promise.resolve();
    }
    if (mapsScriptPromise) {
        return mapsScriptPromise;
    }
    mapsScriptPromise = new Promise((resolve, reject) => {
        const cbName = `__deliveryMapsCb_${Math.random().toString(36).slice(2, 11)}`;
        (window as unknown as Record<string, () => void>)[cbName] = () => {
            try {
                delete (window as unknown as Record<string, unknown>)[cbName];
            } catch {
                /* ignore */
            }
            const scriptEl = document.querySelector<HTMLScriptElement>('script[data-delivery-gmaps="1"]');
            scriptEl?.setAttribute("data-loaded", "1");
            resolve();
        };

        const script = document.createElement("script");
        script.dataset.deliveryGmaps = "1";
        script.async = true;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&callback=${cbName}`;
        script.onerror = () => {
            mapsScriptPromise = null;
            reject(new Error("Failed to load Google Maps"));
        };
        document.head.appendChild(script);
    });
    return mapsScriptPromise;
}

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
    const directionsRendererRef = useRef<any>(null);
    const [eta, setEta] = useState<string | null>(null);
    const [mapLoadError, setMapLoadError] = useState<string | null>(null);

    // Status State
    const [isOnline, setIsOnline] = useState(false);
    const [employeeKey, setEmployeeKey] = useState<string | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);

    // Slider State
    const trackRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);
    const [isSliding, setIsSliding] = useState(false);
    const [translateX, setTranslateX] = useState(0);
    const gestureStartXRef = useRef(0);
    const gestureCompletedRef = useRef(false);
    const flowNextRef = useRef<string | null>(null);

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

    // 4. Load Map & Directions (single script load; one DirectionsRenderer; route updates per order)
    useEffect(() => {
        if (!activeOrder) {
            setEta(null);
            setMapLoadError(null);
            return;
        }

        const apiKey = getGoogleMapsApiKey();
        if (!apiKey) {
            setMapLoadError("missing_key");
            toast.error("Google Maps API key is not configured.");
            return;
        }

        let cancelled = false;

        const run = async () => {
            try {
                await loadGoogleMaps(apiKey);
                if (cancelled || !mapRef.current) return;

                const g = (window as any).google;
                if (!g?.maps?.Map) {
                    throw new Error("Maps API not available");
                }

                setMapLoadError(null);

                if (!googleMapRef.current) {
                    googleMapRef.current = new g.maps.Map(mapRef.current, {
                        zoom: 15,
                        center: { lat: 20.5937, lng: 78.9629 },
                        disableDefaultUI: true,
                        gestureHandling: "greedy",
                        styles: [
                            { featureType: "all", elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                            { featureType: "all", elementType: "labels.text.stroke", stylers: [{ lightness: -80 }] },
                            { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                            { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                            { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2b3544" }] },
                            { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
                        ],
                    });
                }

                if (!directionsRendererRef.current) {
                    directionsRendererRef.current = new g.maps.DirectionsRenderer({
                        map: googleMapRef.current,
                        suppressMarkers: false,
                        polylineOptions: { strokeColor: "#10b981", strokeWeight: 6 },
                    });
                } else {
                    directionsRendererRef.current.setMap(googleMapRef.current);
                }

                const directionsService = new g.maps.DirectionsService();
                const directionsRenderer = directionsRendererRef.current;

                if (!navigator.geolocation) {
                    toast.error("Location is not supported on this device.");
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        if (cancelled) return;
                        const origin = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };

                        let dest: any = activeOrder.adrs;
                        if (typeof dest === "string" && dest.includes(",")) {
                            const parts = dest.split(",");
                            if (!Number.isNaN(parseFloat(parts[0]))) {
                                dest = { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
                            }
                        }

                        directionsService.route(
                            {
                                origin,
                                destination: dest,
                                travelMode: g.maps.TravelMode.DRIVING,
                            },
                            (result: any, status: string) => {
                                if (cancelled) return;
                                if (status === g.maps.DirectionsStatus.OK && result?.routes?.[0]) {
                                    directionsRenderer.setDirections(result);
                                    const leg = result.routes[0].legs?.[0];
                                    setEta(leg?.duration?.text ?? null);
                                } else {
                                    console.error("Directions request failed:", status);
                                    setEta(null);
                                    toast.error("Could not plot route. Use Navigate for directions.");
                                }
                            },
                        );
                    },
                    () => {
                        if (!cancelled) toast.error("Location access denied. Use Navigate to open directions.");
                    },
                    { enableHighAccuracy: true, maximumAge: 30_000, timeout: 12_000 },
                );
            } catch (e) {
                console.error("Maps load error", e);
                if (!cancelled) {
                    setMapLoadError("load_failed");
                    toast.error("Map could not load. Check API key, billing, and Maps / Directions APIs in Google Cloud.");
                }
            }
        };

        void run();
        return () => {
            cancelled = true;
        };
    }, [activeOrder]);

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

    const updateStatus = useCallback(async (newStatus: string) => {
        if (!activeOrderId) return;
        try {
            await firebase.database().ref(`root/order/${activeOrderId}`).update({
                status: newStatus,
                status_updated_at: new Date().toISOString(),
            });
            toast.success(`Status updated to: ${newStatus}`);
        } catch (err: unknown) {
            console.error(err);
            toast.error("Failed to update status");
        }
    }, [activeOrderId]);

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

    const beginSliderGesture = (clientX: number) => {
        if (flow.disabled) return;
        gestureStartXRef.current = clientX;
        gestureCompletedRef.current = false;
        flowNextRef.current = flow.next;
        setIsSliding(true);
        setTranslateX(0);

        const maxSlide = () => {
            const w = trackRef.current?.offsetWidth ?? 0;
            return Math.max(0, w - SLIDER_HANDLE_PX - SLIDER_INSET_PX);
        };

        const applyDx = (cx: number) => {
            const maxX = maxSlide();
            const dx = maxX <= 0 ? 0 : Math.max(0, Math.min(cx - gestureStartXRef.current, maxX));
            setTranslateX(dx);
            if (!gestureCompletedRef.current && maxX > 0 && dx >= maxX * SLIDE_THRESHOLD) {
                gestureCompletedRef.current = true;
                const next = flowNextRef.current;
                if (next) void updateStatus(next);
                setTranslateX(0);
                setIsSliding(false);
                cleanup();
            }
        };

        const cleanup = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("touchmove", onTouchMove as EventListener);
            window.removeEventListener("touchend", onTouchEnd);
        };

        const onMouseMove = (ev: MouseEvent) => {
            applyDx(ev.clientX);
        };

        const onMouseUp = () => {
            if (!gestureCompletedRef.current) {
                setTranslateX(0);
            }
            gestureCompletedRef.current = false;
            setIsSliding(false);
            cleanup();
        };

        const onTouchMove = (ev: TouchEvent) => {
            ev.preventDefault();
            const t = ev.touches[0];
            if (t) applyDx(t.clientX);
        };

        const onTouchEnd = () => {
            if (!gestureCompletedRef.current) {
                setTranslateX(0);
            }
            gestureCompletedRef.current = false;
            setIsSliding(false);
            cleanup();
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("touchmove", onTouchMove, { passive: false });
        window.addEventListener("touchend", onTouchEnd);
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
                <div ref={mapRef} className="absolute inset-0 z-0 bg-slate-200 dark:bg-slate-800">
                    {!activeOrder && (
                        <div className="flex h-full w-full flex-col items-center justify-center p-10 text-center text-slate-400">
                            <MapIcon size={48} className="mb-4 opacity-50" />
                            <p>Map unavailable until order is assigned</p>
                        </div>
                    )}
                    {activeOrder && mapLoadError && (
                        <div className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center bg-slate-900/75 p-6 text-center text-sm text-white backdrop-blur-sm">
                            <MapIcon size={40} className="mb-3 opacity-80" />
                            <p className="font-semibold">Map could not load</p>
                            <p className="mt-1 max-w-xs text-xs text-white/80">Check the Maps JavaScript API, Directions API, billing, and HTTP referrer restrictions. Use Navigate below.</p>
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

                            {(() => {
                                const { amountLabel, paymentLabel } = parseOrderMoney(activeOrder);
                                return (
                                    <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                                        <div className="min-w-0">
                                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Mode of payment</p>
                                            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                                                <CreditCard size={16} className="shrink-0 text-emerald-600" />
                                                <span className="truncate text-sm">{paymentLabel === "—" ? "Not specified" : paymentLabel}</span>
                                            </div>
                                        </div>
                                        <div className="min-w-0 text-right">
                                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Total amount</p>
                                            <div className="flex items-center justify-end gap-1 font-black text-slate-900 dark:text-white">
                                                <IndianRupee size={18} className="shrink-0 text-emerald-600" />
                                                <span className="text-xl tabular-nums tracking-tight">{amountLabel}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

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
                                    {(() => {
                                        const { amountLabel, paymentLabel } = parseOrderMoney(activeOrder);
                                        return (
                                            <>
                                                <div className="mt-4 flex justify-between gap-4 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                                                    <span className="font-black uppercase tracking-widest text-slate-500 text-xs">Mode of payment</span>
                                                    <span className="text-right font-bold text-slate-900 dark:text-white">
                                                        {paymentLabel === "—" ? "Not specified" : paymentLabel}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex justify-between items-center rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                                                    <span className="font-black text-slate-500 uppercase text-xs tracking-widest">Total amount</span>
                                                    <span className="font-black text-xl tabular-nums text-slate-900 dark:text-white">{amountLabel}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
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
                            className={`relative flex h-[4.25rem] w-full touch-none items-center overflow-hidden rounded-[2rem] px-2 shadow-inner transition-colors duration-500 ${
                                flow.disabled ? "bg-slate-100" : "bg-slate-100 dark:bg-slate-900"
                            }`}
                        >
                            {!flow.disabled && (
                                <div
                                    className={`absolute inset-y-2 left-2 flex max-w-[calc(100%-1rem)] items-center justify-center overflow-hidden rounded-[1.5rem] font-black uppercase tracking-tighter text-white ${flow.colorClass}`}
                                    style={{ width: `${SLIDER_HANDLE_PX + translateX}px` }}
                                    aria-hidden
                                >
                                    {translateX > 12 && <ArrowRight className="ml-1 h-4 w-4 shrink-0 animate-pulse" />}
                                </div>
                            )}

                            <span
                                className={`pointer-events-none w-full text-center text-sm font-black uppercase tracking-widest transition-opacity ${
                                    flow.disabled ? "text-slate-400" : "text-slate-500 dark:text-slate-500"
                                }`}
                            >
                                {flow.text}
                            </span>

                            {!flow.disabled && (
                                <div
                                    ref={handleRef}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        beginSliderGesture(e.clientX);
                                    }}
                                    onTouchStart={(e) => {
                                        beginSliderGesture(e.touches[0].clientX);
                                    }}
                                    className={`absolute left-2 z-10 flex h-16 w-16 cursor-grab select-none items-center justify-center rounded-[1.5rem] bg-white shadow-2xl active:cursor-grabbing ${
                                        isSliding ? "" : "transition-[transform] duration-200 ease-out"
                                    }`}
                                    style={{ transform: `translate3d(${translateX}px,0,0)` }}
                                >
                                    <flow.icon className="text-slate-900" size={24} />
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
