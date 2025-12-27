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
    Coffee,
    Radar,
    ChevronDown,
    X,
    Map as MapIcon
} from "lucide-react";
import Navbar from "@/components/Navbar";

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

import { DeliveryAuth } from "@/components/DeliveryAuth";

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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

    // Fetch Address from Coords using Google Maps API
    useEffect(() => {
        if (!activeOrder) {
            setFetchedAddress(null);
            return;
        }

        // Reset if we have a name already
        if (activeOrder.adrsName || activeOrder.locationName) {
            setFetchedAddress(null);
            return;
        }

        let lat = null, lng = null;

        if (activeOrder.adrs && typeof activeOrder.adrs === 'string' && activeOrder.adrs.includes(',')) {
            // Check if it's "lat,lng" string
            const parts = activeOrder.adrs.split(',');
            const p1 = parseFloat(parts[0]);
            const p2 = parseFloat(parts[1]);
            if (!isNaN(p1) && !isNaN(p2)) {
                lat = p1;
                lng = p2;
            }
        } else if (activeOrder.adrs?.latitude && activeOrder.adrs?.longitude) {
            lat = activeOrder.adrs.latitude;
            lng = activeOrder.adrs.longitude;
        }

        if (lat && lng) {
            const apiKey = "AIzaSyDj1gRVZ4lRJIM2v8c4pJxdyfEY6I1ZGEk";
            fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`)
                .then(res => res.json())
                .then(data => {
                    if (data.results && data.results.length > 0) {
                        // Try to find a good formatted address, maybe skip plus codes if possible, or just take the first formatted_address
                        // Usually results[0] is the most specific
                        setFetchedAddress(data.results[0].formatted_address);
                    }
                })
                .catch(err => console.error("Geocoding error:", err));
        } else {
            setFetchedAddress(null);
        }

    }, [activeOrder]);

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
    const toggleNavigation = () => {
        if (isNavigating) {
            setIsNavigating(false);
            return;
        }

        setIsNavigating(true);
    };

    useEffect(() => {
        if (!isNavigating || !mapRef.current) return;

        const loadMap = () => {
            if (!(window as any).google) {
                const script = document.createElement("script");
                script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDj1gRVZ4lRJIM2v8c4pJxdyfEY6I1ZGEk&libraries=places,geometry`;
                script.async = true;
                script.defer = true;
                document.body.appendChild(script);
                script.onload = initMap;
            } else {
                initMap();
            }
        };

        const initMap = () => {
            if (!activeOrder) return;
            const google = (window as any).google;

            // Get Destination
            let destLat = 0, destLng = 0;
            if (activeOrder.adrs?.latitude && activeOrder.adrs?.longitude) {
                destLat = activeOrder.adrs.latitude;
                destLng = activeOrder.adrs.longitude;
            } else if (typeof activeOrder.adrs === 'string' && activeOrder.adrs.includes(',')) {
                const [l1, l2] = activeOrder.adrs.split(',');
                destLat = parseFloat(l1);
                destLng = parseFloat(l2);
            }

            if (!destLat || !destLng) {
                alert("Invalid destination coordinates for in-app navigation.");
                setIsNavigating(false);
                return;
            }

            // Get Current Location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {
                    const { latitude, longitude } = position.coords;
                    const origin = new google.maps.LatLng(latitude, longitude);
                    const destination = new google.maps.LatLng(destLat, destLng);

                    const map = new google.maps.Map(mapRef.current, {
                        zoom: 15,
                        center: origin,
                        disableDefaultUI: true, // Clean Zepto-like look
                        styles: [
                            {
                                "featureType": "all",
                                "elementType": "geometry",
                                "stylers": [{ "color": "#f5f5f5" }]
                            },
                            {
                                "featureType": "road",
                                "elementType": "geometry",
                                "stylers": [{ "color": "#ffffff" }]
                            },
                            {
                                "featureType": "water",
                                "elementType": "geometry",
                                "stylers": [{ "color": "#e9e9e9" }]
                            },
                            {
                                "featureType": "water",
                                "elementType": "labels.text.fill",
                                "stylers": [{ "color": "#9e9e9e" }]
                            }
                        ]
                    });

                    const directionsService = new google.maps.DirectionsService();
                    const renderer = new google.maps.DirectionsRenderer({
                        map: map,
                        suppressMarkers: false,
                        polylineOptions: {
                            strokeColor: "#10b981", // Emerald color
                            strokeWeight: 6
                        }
                    });

                    setDirectionsRenderer(renderer);

                    directionsService.route({
                        origin: origin,
                        destination: destination,
                        travelMode: google.maps.TravelMode.DRIVING
                    }, (response: any, status: any) => {
                        if (status === "OK") {
                            renderer.setDirections(response);
                            if (response.routes[0] && response.routes[0].legs[0]) {
                                setNavigationInfo({
                                    distance: response.routes[0].legs[0].distance.text,
                                    duration: response.routes[0].legs[0].duration.text
                                });
                            }
                        } else {
                            console.error("Directions request failed due to " + status);
                        }
                    });

                }, () => {
                    alert("Could not get your location.");
                    setIsNavigating(false);
                });
            }
        };

        loadMap();
    }, [isNavigating, activeOrder]);

    const openMaps = () => {
        if (!activeOrder) return;
        let dest = "";
        if (activeOrder.adrs && typeof activeOrder.adrs === 'string' && activeOrder.adrs.includes(',')) {
            dest = activeOrder.adrs.trim().replace(/\s/g, '');
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
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700 relative overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]" />

                <div className="relative group mb-10">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-50" />
                    <div className="relative w-32 h-32 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-2xl border border-slate-100 dark:border-slate-800">
                        <Truck className="w-16 h-16 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors duration-500" />
                    </div>
                </div>

                <div className="space-y-4 max-w-sm mb-12">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Ready for your shift?</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        Going online alerts the operations team that you're available for pick-ups.
                    </p>
                </div>

                <div className="w-full max-w-xs space-y-4">
                    <button
                        onClick={handleGoOnline}
                        className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-3xl shadow-2xl shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-3 group"
                    >
                        <CheckCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        Go Online Now
                    </button>

                    <button
                        onClick={() => { sessionStorage.removeItem("delivery_user"); setUser(null); }}
                        className="w-full py-4 text-slate-400 hover:text-red-500 transition-colors text-sm font-bold uppercase tracking-widest"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-emerald-500/30 overflow-hidden relative flex flex-col items-center">

            {/* Background elements */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 dark:bg-emerald-600/10 rounded-full blur-[120px] animate-float" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-500/5 dark:bg-green-600/10 rounded-full blur-[120px] animate-float-reverse" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay" />
            </div>

            {/* Sticky Header */}
            <header className="sticky top-0 z-40 w-full bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 safe-pt">
                <div className="max-w-lg mx-auto w-full px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="space-y-0.5">
                            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
                                Courier<span className="text-emerald-600">Hub</span>
                            </h1>
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    {user?.name || "Online"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">

                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 p-0.5 shadow-lg active:scale-90 transition-all"
                            >
                                <div className="w-full h-full rounded-full bg-white dark:bg-slate-950 flex items-center justify-center text-emerald-600 dark:text-white">
                                    <User size={20} />
                                </div>
                            </button>

                            {isProfileOpen && (
                                <div className="absolute right-0 top-full mt-3 w-64 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-emerald-500/10 border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 origin-top-right overflow-hidden font-sans">
                                    <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 mb-1">
                                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{user?.name}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Available</p>
                                        </div>
                                    </div>

                                    <div className="p-1 space-y-1">
                                        <button
                                            onClick={() => {
                                                if (confirm("Sign out from delivery?")) {
                                                    handleGoOffline();
                                                    sessionStorage.removeItem("delivery_user");
                                                    setUser(null);
                                                }
                                            }}
                                            className="w-full flex items-center gap-3 p-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl transition-colors"
                                        >
                                            <LogOut size={18} /> Logout Session
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto w-full px-5 py-6 z-10 relative flex-1 flex flex-col overflow-hidden">

                {!activeOrder ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-8 animate-in fade-in duration-1000">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-[ping_3s_linear_infinite]" />
                            <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-[ping_2s_linear_infinite_500ms]" />
                            <div className="relative bg-white dark:bg-slate-900 w-32 h-32 rounded-full shadow-2xl border border-emerald-100 dark:border-slate-800 flex items-center justify-center">
                                <Radar size={60} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Searching for Orders</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-[280px] mx-auto leading-relaxed">
                                We'll beep you when an order is ready.
                            </p>
                        </div>
                        <div className="flex gap-2 bg-emerald-50 dark:bg-emerald-900/10 px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse self-center"></span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-loose">Passive Tracking Active</span>
                        </div>

                        <div className="pt-10 w-full max-w-[220px]">
                            <button
                                onClick={handleGoOffline}
                                className="w-full py-5 flex items-center justify-center gap-3 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-800 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-red-500/5 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all active:scale-95 group"
                            >
                                <Coffee size={18} className="group-hover:rotate-12 transition-transform" />
                                Go Offline
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-in slide-in-from-bottom-5 duration-700">
                        <div className="flex-1 overflow-y-auto space-y-8 pb-6 scrollbar-none relative">
                            {isNavigating ? (
                                <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                                    <div ref={mapRef} className="w-full h-full bg-slate-100 dark:bg-slate-800" />
                                    {/* Overlay Info */}
                                    <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
                                        <div className="flex-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                                                    <Navigation size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Navigating To</p>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                        {fetchedAddress || activeOrder.adrsName || "Customer Location"}
                                                    </p>
                                                    {navigationInfo && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{navigationInfo.distance} </span>
                                                            <span className="text-[10px] font-bold text-slate-400">•</span>
                                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{navigationInfo.duration}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setIsNavigating(false)}
                                            className="w-14 h-auto rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform"
                                        >
                                            <X size={24} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-end justify-between px-2 mt-4">
                                        <div className="space-y-1">
                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${flow.theme === 'blue' ? 'text-blue-600' :
                                                flow.theme === 'orange' ? 'text-orange-600' :
                                                    flow.theme === 'emerald' ? 'text-emerald-600' : 'text-slate-400'
                                                }`}>Current Phase</span>
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                                {flow.icon && <flow.icon size={24} className="text-emerald-600" />}
                                                {currentStatus}
                                            </h3>
                                        </div>
                                        <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-xl text-xs font-mono font-bold shadow-lg shadow-black/10">
                                            #{activeOrderId?.slice(-6).toUpperCase()}
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-[2.5rem] blur opacity-0 group-hover:opacity-100 transition duration-500" />
                                        <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-white dark:border-slate-800 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden">

                                            <div className="p-5 space-y-5">
                                                <div className="flex gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-inner">
                                                        <MapPin size={20} strokeWidth={2.5} />
                                                    </div>
                                                    <div className="space-y-1 flex-1">
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivery Location</p>
                                                            <h4 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                                                                {(() => {
                                                                    if (activeOrder.adrsName) return activeOrder.adrsName;
                                                                    if (activeOrder.locationName) return activeOrder.locationName;
                                                                    if (fetchedAddress) return fetchedAddress;
                                                                    if (typeof activeOrder.adrs === 'string') {
                                                                        const isCoords = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(activeOrder.adrs.trim());
                                                                        return isCoords ? "Pinned Location" : activeOrder.adrs;
                                                                    }
                                                                    return "GPS Location";
                                                                })()}
                                                            </h4>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="h-px bg-gradient-to-r from-transparent via-slate-100 dark:via-slate-800 to-transparent" />

                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
                                                            <User size={20} strokeWidth={2.5} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Contact Person</p>
                                                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{activeOrder.name || "Customer"}</h4>
                                                        </div>
                                                    </div>
                                                    <a href={`tel:${activeOrder.phnm}`} className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 hover:scale-110 active:scale-95 transition-all">
                                                        <Phone size={20} strokeWidth={2.5} />
                                                    </a>
                                                </div>

                                                <div className="h-px bg-gradient-to-r from-transparent via-slate-100 dark:via-slate-800 to-transparent" />

                                                <div className="flex flex-col gap-3">
                                                    <button
                                                        onClick={() => setShowConsignment(!showConsignment)}
                                                        className="w-full py-3 flex items-center justify-between px-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 shrink-0">
                                                                <ShoppingBag size={18} strokeWidth={2.5} />
                                                            </div>
                                                            <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Order Items</p>
                                                        </div>
                                                        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${showConsignment ? 'rotate-180' : ''}`} />
                                                    </button>

                                                    {showConsignment && (
                                                        <div className="px-1 animate-in slide-in-from-top-2 duration-300 overflow-hidden">
                                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                                {Object.keys(activeOrder).filter(k => k.startsWith('item') && activeOrder[k]).map((k, i) => (
                                                                    <span key={i} className="px-2.5 py-1 bg-white dark:bg-slate-900 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 shadow-sm">
                                                                        {activeOrder[k]}
                                                                    </span>
                                                                )) || <span className="text-slate-400 text-sm">No items found</span>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="pt-2">
                                                    <div className="flex gap-3">
                                                        <div className="flex-1 bg-slate-900 dark:bg-emerald-600 rounded-2xl p-4 flex items-center justify-center shadow-lg">
                                                            <div className="text-2xl font-black text-white tracking-tighter flex items-start">
                                                                <span className="text-sm font-bold mt-1 mr-1">{activeOrder.currency || "₹"}</span>
                                                                {activeOrder.total || "0.00"}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-center p-4">
                                                            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest text-center">
                                                                {activeOrder.paymentMode || activeOrder.payMode || "Cash on Delivery"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {!isDisabled && (
                            <div className="pt-6 pb-2 space-y-4 bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-sm -mx-5 px-5 z-20">
                                <div className="flex gap-2">
                                    <button
                                        onClick={toggleNavigation}
                                        className="flex-1 py-5 bg-emerald-600/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 font-black text-xs rounded-[2rem] border border-emerald-600/20 flex items-center justify-center gap-2 hover:bg-emerald-600/20 transition-all active:scale-95 uppercase tracking-widest"
                                    >
                                        <Navigation size={16} strokeWidth={2.5} />
                                        {isNavigating ? "Close Map" : "Get Nav"}
                                    </button>
                                    <button
                                        onClick={openMaps}
                                        className="w-16 py-5 bg-blue-600/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 rounded-[2rem] border border-blue-600/20 flex items-center justify-center hover:bg-blue-600/20 transition-all active:scale-95"
                                    >
                                        <MapIcon size={24} strokeWidth={2.5} />
                                    </button>
                                </div>

                                <div
                                    className={`relative h-20 rounded-[2rem] overflow-hidden select-none border-4 backdrop-blur-xl transition-all duration-500 shadow-2xl ${nextFlow.theme === 'blue' ? 'bg-blue-600/10 border-blue-600/20 shadow-blue-500/10' :
                                        nextFlow.theme === 'orange' ? 'bg-orange-600/10 border-orange-600/20 shadow-orange-500/10' :
                                            'bg-emerald-600/10 border-emerald-600/20 shadow-emerald-500/10'
                                        }`}
                                    ref={trackRef}
                                >
                                    <div
                                        className={`absolute inset-0 flex items-center justify-center font-black text-[9px] tracking-[0.2em] uppercase transition-opacity duration-300 pointer-events-none ${nextFlow.theme === 'blue' ? 'text-blue-600' :
                                            nextFlow.theme === 'orange' ? 'text-orange-600' :
                                                'text-emerald-600'
                                            }`}
                                        style={{ opacity: 1 - (translateX * 2 / (trackRef.current?.offsetWidth || 1)) }}
                                    >
                                        <span className="flex items-center gap-2">
                                            {nextFlow.text}
                                            <ArrowRight size={14} className="animate-bounce-horizontal" />
                                        </span>
                                    </div>

                                    <div
                                        className={`absolute top-2 left-2 bottom-2 w-16 rounded-[1.5rem] shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing z-20 active:scale-95 transition-transform ${nextFlow.theme === 'blue' ? 'bg-blue-600 text-white shadow-blue-600/40' :
                                            nextFlow.theme === 'orange' ? 'bg-orange-600 text-white shadow-orange-600/40' :
                                                'bg-emerald-600 text-white shadow-emerald-600/40'
                                            }`}
                                        ref={handleRef}
                                        style={{ transform: `translateX(${translateX}px)`, transition: isSliding ? 'none' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                                        onTouchStart={e => handleStart(e.touches[0].clientX)}
                                        onMouseDown={e => handleStart(e.clientX)}
                                    >
                                        <SliderIcon size={28} strokeWidth={3} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {alertData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-600" />
                        <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-950 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner relative">
                            <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/20" />
                            <Bell size={44} className="text-emerald-600 dark:text-emerald-400 animate-swing" />
                        </div>
                        <div className="space-y-2 mb-10">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">New Assignment</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">
                                Order <span className="text-emerald-600 font-bold">#{alertData.id?.slice(-6).toUpperCase()}</span> is ready for pickup.
                            </p>
                        </div>
                        <button
                            onClick={dismissAlert}
                            className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-[1.5rem] shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all uppercase tracking-widest"
                        >
                            Accept Job
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
};

export default DeliveryScreen;
