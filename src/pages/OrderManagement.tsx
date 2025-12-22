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
    Bell,
    Menu,
    X,
    Phone,
    Clock,
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
    appId: "1:439424426599:web:366ea0de36341a00fdaac2",
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
    "Cancelled",
];

const OrderManagement = () => {
    const [orders, setOrders] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isMuted, setIsMuted] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
    const [alertData, setAlertData] = useState<any>(null);

    // Sidebar State
    const [activeTab, setActiveTab] = useState("all_orders");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Delivery Assignment State
    const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedOrderIdForAssign, setSelectedOrderIdForAssign] = useState<string | null>(null);
    const [selectedDriverId, setSelectedDriverId] = useState("");
    const [showDeliveryBoysModal, setShowDeliveryBoysModal] = useState(false);
    const [driverCategoryFilter, setDriverCategoryFilter] = useState<string>("all");

    // Compute busy driver IDs from current orders (assigned and not completed)
    const busyDriverIds = useMemo(() => {
        if (!orders) return [];
        return Object.values(orders)
            .filter((o: any) => o.delivery_partner_id && o.status !== 'Delivered' && o.status !== 'Cancelled')
            .map((o: any) => o.delivery_partner_id);
    }, [orders]);

    // Filter delivery boys to only those not currently busy
    const availableDeliveryBoys = useMemo(() => {
        return deliveryBoys.filter((boy: any) => !busyDriverIds.includes(boy.deliveryUserId));
    }, [deliveryBoys, busyDriverIds]);

    const groupedDrivers = useMemo(() => {
        const categories = {
            online: [] as any[],
            offline: [] as any[],
            outForDelivery: [] as any[]
        };
        const today = new Date().toLocaleDateString('en-CA');

        deliveryBoys.forEach(boy => {
            let deliveredToday = 0;
            let isOutForDelivery = false;

            Object.values(orders).forEach((o: any) => {
                if (o.delivery_partner_id === boy.deliveryUserId) {
                    const orderDate = new Date(o.last_updated || o.status_updated_at || "").toLocaleDateString('en-CA');
                    if (o.status === 'Delivered' && orderDate === today) {
                        deliveredToday++;
                    }
                    if (['On the Way', 'Arrival'].includes(o.status)) {
                        isOutForDelivery = true;
                    }
                }
            });

            const boyData = { ...boy, deliveredToday };

            if (boy.status === 'Offline') {
                categories.offline.push(boyData);
            } else if (isOutForDelivery) {
                categories.outForDelivery.push(boyData);
            } else {
                categories.online.push(boyData);
            }
        });

        return categories;
    }, [deliveryBoys, orders]);

    // Fetch Delivery Boys
    // Fetch Delivery Boys
    useEffect(() => {
        const db = firebase.database();
        const empRef = db.ref("root/nexus_hr/employees");
        empRef.on("value", (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Map keys as 'id' to ensure uniqueness and proper selection
                const list = Object.entries(data)
                    .map(([key, value]: [string, any]) => ({ id: key, ...value }))
                    .filter((e: any) => (e.role === 'Ride' || e.department === 'Logistics') && e.status === 'Active');
                setDeliveryBoys(list);
            }
        });
        return () => empRef.off();
    }, []);

    const menuItems = [
        { id: 'all_orders', label: 'All Orders', icon: ShoppingBag },
        { id: 'new_orders', label: 'New Order Placed', icon: Bell },
        { id: 'accepted', label: 'Accepted by Store', icon: CheckCircle },
        { id: 'packing', label: 'Packing Order', icon: Package },
        { id: 'ready', label: 'Ready for Pickup', icon: Store },
        { id: 'delivered', label: 'Delivered', icon: CheckCircle },
        { id: 'cancelled', label: 'Cancelled', icon: XCircle },
    ];

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

        // Filter by Tab
        if (activeTab === 'new_orders') {
            list = list.filter(o => o.status === 'Order Placed');
        } else if (activeTab === 'accepted') {
            list = list.filter(o => o.status === 'Accepted by Store');
        } else if (activeTab === 'packing') {
            list = list.filter(o => o.status === 'Packing Order');
        } else if (activeTab === 'ready') {
            list = list.filter(o => o.status === 'Ready for Pickup');
        } else if (activeTab === 'delivered') {
            list = list.filter(o => o.status === 'Delivered');
        } else if (activeTab === 'cancelled') {
            list = list.filter(o => o.status === 'Cancelled');
        }

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
    }, [orders, searchTerm, activeTab]);

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        if (newStatus === "Ready for Pickup") {
            setSelectedOrderIdForAssign(orderId);
            setShowAssignModal(true);
            return;
        }
        updateOrderStatus(orderId, newStatus);
    };

    const updateOrderStatus = async (orderId: string, status: string, additionalData: any = {}) => {
        try {
            await firebase.database().ref(`root/order/${orderId}`).update({
                status: status,
                last_updated: new Date().toISOString(),
                ...additionalData
            });
            toast.success(`Order #${orderId} updated to ${status}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update status");
        }
    };

    const handleAssignDriver = () => {
        if (!selectedOrderIdForAssign || !selectedDriverId) {
            toast.error("Please select a delivery partner");
            return;
        }

        const driver = deliveryBoys.find(d => d.id === selectedDriverId);

        // Use deliveryUserId because this is what the App tracks for login
        const targetAuthId = driver?.deliveryUserId;

        if (!targetAuthId) {
            toast.error("This partner does not have an App Account linked. Cannot assign.");
            return;
        }

        updateOrderStatus(selectedOrderIdForAssign, "Ready for Pickup", {
            delivery_partner_id: targetAuthId,
            delivery_partner_name: driver ? `${driver.firstName} ${driver.lastName}` : "Unknown",
            delivery_partner_phone: driver?.contactNumber || ""
        });

        setShowAssignModal(false);
        setSelectedOrderIdForAssign(null);
        setSelectedDriverId("");
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
        <div className="flex h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans transition-colors duration-300">
            {/* Fixed Navbar */}
            <div className="fixed top-0 left-0 right-0 z-50">
                <Navbar />
            </div>

            {/* Sidebar - Desktop */}
            <aside className="w-64 hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pt-20 pb-6 fixed top-0 bottom-0 left-0 z-40 transition-all">
                <div className="px-6 mb-6">
                    <BackButton />
                </div>

                <div className="px-6 mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Store className="w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-wider">Order Manager</span>
                </div>

                <nav className="flex-1 space-y-1 px-4">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${activeTab === item.id
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-semibold shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 pt-16 h-full overflow-hidden flex flex-col relative w-full">

                {/* Mobile Header Toggle */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <BackButton />
                        <span className="font-bold text-lg text-slate-900 dark:text-slate-100">Order Manager</span>
                    </div>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600">
                        <Menu size={20} />
                    </button>
                </div>

                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)}>
                        <div className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 p-6 flex flex-col h-full shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-bold dark:text-white">Menu</h2>
                                <button onClick={() => setSidebarOpen(false)}><XCircle className="text-slate-500 dark:text-slate-400" /></button>
                            </div>
                            <nav className="space-y-2">
                                {menuItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-600'}`}
                                    >
                                        <item.icon size={18} /> {item.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>
                )}

                <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-hidden">
                    {/* Page Header */}
                    <div className="shrink-0 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                {menuItems.find(i => i.id === activeTab)?.label}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                {activeTab === 'all_orders' ? 'Showing all order history' : `Filtering by ${menuItems.find(i => i.id === activeTab)?.label}`}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button onClick={toggleMute} className={`p-2.5 rounded-xl border transition-all ${isMuted ? 'bg-red-50 border-red-200 text-red-500 dark:bg-red-900/20 dark:border-red-800' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50'}`}>
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <button onClick={() => setShowDeliveryBoysModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50 shadow-sm whitespace-nowrap">
                                <User size={18} />
                                <span className="font-semibold text-sm">Manage Drivers</span>
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

                    {/* Orders List Container */}
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

                                                            {order.delivery_partner_id && (
                                                                <div className="pt-2">
                                                                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Delivery Partner</h4>
                                                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 text-sm space-y-2">
                                                                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold">
                                                                            <Truck size={14} /> {order.delivery_partner_name || "Assigned Partner"}
                                                                        </div>
                                                                        {order.delivery_partner_phone && (
                                                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-mono">
                                                                                <Phone size={14} /> {order.delivery_partner_phone}
                                                                            </div>
                                                                        )}
                                                                        {(order.status === 'Delivered' || order.status_updated_at) && (
                                                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-500 text-[10px] pt-1 border-t border-blue-100/50 dark:border-blue-900/20">
                                                                                <Clock size={12} />
                                                                                {order.status === 'Delivered' ? 'Delivered at: ' : 'Updated at: '}
                                                                                {new Date(order.status_updated_at || order.last_updated).toLocaleString()}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
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

            {/* Delivery Assignment Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Truck className="text-blue-600" /> Assign Driver
                            </h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-slate-500 mb-4">Select a delivery partner for Order <strong>#{selectedOrderIdForAssign}</strong></p>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                {availableDeliveryBoys.map(boy => (
                                    <label
                                        key={boy.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedDriverId === boy.id
                                            ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 dark:bg-blue-900/20'
                                            : 'bg-slate-50 border-slate-200 hover:border-blue-300 dark:bg-slate-800 dark:border-slate-700'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="driver"
                                            value={boy.id}
                                            checked={selectedDriverId === boy.id}
                                            onChange={() => setSelectedDriverId(boy.id)}
                                            className="hidden"
                                        />
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedDriverId === boy.id ? 'border-blue-600' : 'border-slate-300'}`}>
                                            {selectedDriverId === boy.id && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">{boy.firstName} {boy.lastName}</div>
                                            <div className="text-xs text-slate-500">{boy.contactNumber} • <span className="text-emerald-600">Active</span></div>
                                        </div>
                                    </label>
                                ))}

                                {deliveryBoys.length === 0 && (
                                    <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                                        No delivery partners found online.
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleAssignDriver}
                            disabled={!selectedDriverId}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/30"
                        >
                            Confirm Assignment
                        </button>
                    </div>
                </div>
            )}
            {/* Delivery Boys Management Modal */}
            {showDeliveryBoysModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <User className="text-blue-600" /> Manage Delivery Partners
                            </h3>
                            <button onClick={() => setShowDeliveryBoysModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>

                        {/* Driver Filters */}
                        <div className="flex gap-2 mb-6 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 shrink-0">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'outForDelivery', label: 'Active', icon: Truck },
                                { id: 'online', label: 'Idle', icon: User },
                                { id: 'offline', label: 'Offline', icon: XCircle }
                            ].map((btn) => (
                                <button
                                    key={btn.id}
                                    onClick={() => setDriverCategoryFilter(btn.id)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-bold transition-all ${driverCategoryFilter === btn.id
                                        ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400 ring-1 ring-slate-200 dark:ring-slate-600'
                                        : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800'}`}
                                >
                                    {btn.id === driverCategoryFilter && btn.icon && <btn.icon size={12} />}
                                    {btn.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar text-left">
                            {/* Categories */}
                            {[
                                { id: 'outForDelivery', label: 'Out for Delivery', drivers: groupedDrivers.outForDelivery, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: Truck },
                                { id: 'online', label: 'Online & Idle', drivers: groupedDrivers.online, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: User },
                                { id: 'offline', label: 'Offline', drivers: groupedDrivers.offline, color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/50', icon: XCircle }
                            ].filter(section => driverCategoryFilter === 'all' || driverCategoryFilter === section.id).map((section) => (
                                <div key={section.label}>
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <h4 className={`text-xs font-bold uppercase tracking-wider ${section.color} flex items-center gap-2`}>
                                            <section.icon size={14} />
                                            {section.label}
                                        </h4>
                                        <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">
                                            {section.drivers.length}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {section.drivers.map(boy => (
                                            <div key={boy.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
                                                <div className={`p-2 rounded-lg ${section.bg} ${section.color}`}>
                                                    <section.icon size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                        {boy.firstName} {boy.lastName}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-mono">
                                                        {boy.contactNumber}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Delivered Today</div>
                                                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{boy.deliveredToday}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {section.drivers.length === 0 && (
                                            <div className="text-center py-4 text-xs text-slate-400 italic border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                                                No drivers currently {section.label.toLowerCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => setShowDeliveryBoysModal(false)} className="w-full mt-6 py-4 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold rounded-xl transition-all shadow-lg active:scale-[0.98]">
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderManagement;
