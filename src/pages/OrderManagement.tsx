import React, { useEffect, useState, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { firebase } from "@/lib/firebase";
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
import {
    ORDER_PROGRESS_STEPS,
    ORDER_STATUS_DROPDOWN_OPTIONS,
    canonicalOrderStatusForUi,
    getOrderProgressStepIndex,
} from "@/utils/orderStatus";

export { ORDER_PROGRESS_STEPS, canonicalOrderStatusForUi, getOrderProgressStepIndex };

const STATUS_OPTIONS = ORDER_STATUS_DROPDOWN_OPTIONS;

/** Non-order nodes stored under `root/order` (e.g. counters) — must not appear as rows. */
const EXCLUDED_ORDER_NODE_KEYS = new Set(["counter"]);

function stripNonOrderNodes<T extends Record<string, unknown>>(raw: T): Record<string, unknown> {
    return Object.fromEntries(Object.entries(raw).filter(([k]) => !EXCLUDED_ORDER_NODE_KEYS.has(k)));
}

const OrderManagement = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isMuted, setIsMuted] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
    /** Order ids that just became “Order Placed” — 1s blink highlight. */
    const [newOrderHighlightIds, setNewOrderHighlightIds] = useState<string[]>([]);
    const newOrderHighlightTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    /** From navbar / toast “View order” — scroll + ring this row. */
    const [navHighlightOrderId, setNavHighlightOrderId] = useState<string | null>(null);

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
                    if (["Out for Delivery", "Arriving", "On the Way", "Arrival"].includes(o.status)) {
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
        { id: 'new_orders', label: 'Order Placed', icon: Bell },
        { id: 'packed', label: 'Packed', icon: Package },
        { id: 'out_delivery', label: 'Out for Delivery', icon: Truck },
        { id: 'arriving', label: 'Arriving', icon: MapPin },
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

    const toggleMute = () => {
        initAudio();
        setIsMuted(!isMuted);
    };

    const prevOrdersRef = useRef<Record<string, any>>({});
    /** After first full snapshot — avoids treating every existing row as "new" on listener attach. */
    const ordersBootstrapDoneRef = useRef(false);

    useEffect(() => {
        const db = firebase.database();
        const ordersRef = db.ref("root/order");
        const ordersQuery = ordersRef.limitToLast(150); // Optimized limit

        const handleOrderUpdate = (snapshot: any, event: "added" | "changed") => {
            const key = snapshot.key;
            const newOrder = snapshot.val();
            if (!key || EXCLUDED_ORDER_NODE_KEYS.has(key)) return;

            if (!ordersBootstrapDoneRef.current) {
                prevOrdersRef.current[key] = { ...newOrder, status: canonicalOrderStatusForUi(newOrder.status) };
                return;
            }

            const prevOrders = prevOrdersRef.current;
            const oldOrder = prevOrders[key];
            const normalizedStatus = canonicalOrderStatusForUi(newOrder.status);
            const normalizedOrder = { ...newOrder, status: normalizedStatus };

            const becameOrderPlaced =
                normalizedStatus === "Order Placed" &&
                ordersBootstrapDoneRef.current &&
                ((event === "added" && !oldOrder) ||
                    (event === "changed" &&
                        oldOrder &&
                        canonicalOrderStatusForUi(oldOrder.status) !== "Order Placed"));

            // Beep on other status / time updates (not double with new Order Placed below).
            if (oldOrder) {
                const changed =
                    canonicalOrderStatusForUi(oldOrder.status) !== normalizedStatus ||
                    oldOrder.last_updated !== newOrder.last_updated;
                if (changed && !becameOrderPlaced) {
                    playBeep();
                }
            }

            // New “Order Placed”: 1s row blink; toast + beep sound come from NotificationContext on every route.
            if (becameOrderPlaced) {
                setNewOrderHighlightIds((prev) => (prev.includes(key) ? prev : [...prev, key]));
                if (newOrderHighlightTimers.current[key]) clearTimeout(newOrderHighlightTimers.current[key]);
                newOrderHighlightTimers.current[key] = setTimeout(() => {
                    setNewOrderHighlightIds((prev) => prev.filter((id) => id !== key));
                    delete newOrderHighlightTimers.current[key];
                }, 1_000);
            }

            setOrders((prev) => ({ ...prev, [key]: normalizedOrder }));
            prevOrdersRef.current[key] = normalizedOrder;
        };

        ordersQuery.once("value", (snapshot) => {
            const val = stripNonOrderNodes((snapshot.val() || {}) as Record<string, unknown>);
            const normalizedVal = Object.fromEntries(
                Object.entries(val).map(([k, row]) => {
                    const r = row as Record<string, any>;
                    return [k, { ...r, status: canonicalOrderStatusForUi(r.status) }];
                })
            );
            prevOrdersRef.current = { ...normalizedVal };
            setOrders(normalizedVal as Record<string, any>);
            ordersBootstrapDoneRef.current = true;
            if (isInitialLoadRef.current) isInitialLoadRef.current = false;
            setLoading(false);
        });

        const onChildAdded = (s: any) => handleOrderUpdate(s, "added");
        const onChildChanged = (s: any) => handleOrderUpdate(s, "changed");
        ordersQuery.on("child_added", onChildAdded);
        ordersQuery.on("child_changed", onChildChanged);

        return () => {
            ordersQuery.off("child_added", onChildAdded);
            ordersQuery.off("child_changed", onChildChanged);
            ordersBootstrapDoneRef.current = false;
            Object.values(newOrderHighlightTimers.current).forEach(clearTimeout);
            newOrderHighlightTimers.current = {};
        };
    }, []);

    // Filter Logic
    const filteredOrders = useMemo(() => {
        if (!orders) return [];
        let list = Object.entries(orders)
            .filter(([id]) => !EXCLUDED_ORDER_NODE_KEYS.has(id))
            .map(([id, data]) => ({ id, ...data }));

        // Filter by tab — same step index as timeline / row colours (covers all legacy status strings).
        if (activeTab !== "all_orders") {
            list = list.filter((o) => {
                if (activeTab === "cancelled") {
                    return getOrderProgressStepIndex(o.status) === -1;
                }
                const step = getOrderProgressStepIndex(o.status);
                switch (activeTab) {
                    case "new_orders":
                        return step === 0;
                    case "packed":
                        return step === 1;
                    case "out_delivery":
                        return step === 2;
                    case "arriving":
                        return step === 3;
                    case "delivered":
                        return step === 4;
                    default:
                        return true;
                }
            });
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

    useEffect(() => {
        const st = location.state as { highlightOrderId?: string } | null | undefined;
        const oid = st?.highlightOrderId;
        if (!oid || typeof oid !== "string") return;
        setActiveTab("all_orders");
        setSearchTerm("");
        setNavHighlightOrderId(oid);
        setExpandedOrders((prev) => {
            const next = new Set(prev);
            next.add(oid);
            return next;
        });
        navigate(location.pathname, { replace: true, state: {} });
    }, [location.state, location.pathname, navigate]);

    useEffect(() => {
        if (!navHighlightOrderId) return;
        const t = window.setTimeout(() => {
            document.getElementById(`order-row-${navHighlightOrderId}`)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }, 500);
        return () => window.clearTimeout(t);
    }, [navHighlightOrderId, loading, orders]);

    useEffect(() => {
        if (!navHighlightOrderId) return;
        const t = window.setTimeout(() => setNavHighlightOrderId(null), 14_000);
        return () => window.clearTimeout(t);
    }, [navHighlightOrderId]);

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        if (newStatus === "Packed") {
            setSelectedOrderIdForAssign(orderId);
            setSelectedDriverId("");
            setShowAssignModal(true);
            return;
        }
        updateOrderStatus(orderId, newStatus);
    };

    const closeAssignModal = () => {
        setShowAssignModal(false);
        setSelectedOrderIdForAssign(null);
        setSelectedDriverId("");
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

        const partnerName = driver ? `${driver.firstName} ${driver.lastName}`.trim() : "Unknown";
        const partnerPhone = (driver?.contactNumber ?? driver?.phone ?? "").toString().trim();

        updateOrderStatus(selectedOrderIdForAssign, "Packed", {
            delivery_partner_id: targetAuthId,
            delivery_partner_name: partnerName,
            delivery_partner_phone: partnerPhone
        });

        closeAssignModal();
    };

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedOrders);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedOrders(newSet);
    };

    /** Full-row tint by pipeline step (legacy strings map via `getOrderProgressStepIndex`). */
    const ORDER_ROW_TONE_BY_STEP: Record<number, string> = {
        0: "border-l-4 border-l-blue-600 bg-blue-100/95 dark:bg-blue-950/45 dark:border-l-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/55",
        1: "border-l-4 border-l-amber-600 bg-amber-100/95 dark:bg-amber-950/40 dark:border-l-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50",
        2: "border-l-4 border-l-cyan-600 bg-cyan-100/95 dark:bg-cyan-950/40 dark:border-l-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-950/50",
        3: "border-l-4 border-l-violet-600 bg-violet-100/95 dark:bg-violet-950/40 dark:border-l-violet-400 hover:bg-violet-100 dark:hover:bg-violet-950/50",
        4: "border-l-4 border-l-emerald-600 bg-emerald-100/95 dark:bg-emerald-950/40 dark:border-l-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50",
    };

    const getOrderRowTone = (status: string | undefined) => {
        if (getOrderProgressStepIndex(status) === -1) {
            return "border-l-4 border-l-red-600 bg-red-100/95 dark:bg-red-950/35 dark:border-l-red-400 hover:bg-red-100 dark:hover:bg-red-950/45";
        }
        const step = getOrderProgressStepIndex(status);
        return ORDER_ROW_TONE_BY_STEP[step] ?? ORDER_ROW_TONE_BY_STEP[0];
    };

    const STATUS_SELECT_BY_STEP: Record<number, string> = {
        0: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700",
        1: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700",
        2: "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-900/40 dark:text-cyan-200 dark:border-cyan-700",
        3: "bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-700",
        4: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700",
    };

    const getStatusColor = (status: string | undefined) => {
        if (getOrderProgressStepIndex(status) === -1) {
            return "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700";
        }
        const step = getOrderProgressStepIndex(status);
        return STATUS_SELECT_BY_STEP[step] ?? "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600";
    };

    /** Slow attention pulse on the status control when still at step 0 (Order Placed). */
    const orderPlacedSelectBlinkClass = "animate-order-placed-dropdown-blink";

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Order Placed": return <AlertTriangle size={14} />;
            case "Accepted by Store": return <CheckCircle size={14} />;
            case "Packing Order":
            case "Packed": return <Package size={14} />;
            case "Ready for Pickup":
            case "Out for Delivery": return <Truck size={14} />;
            case "On the Way":
            case "Arrival":
            case "Arriving": return <MapPin size={14} />;
            case "Delivered": return <CheckCircle size={14} />;
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

                    {/* Mobile / small screens: same filters as sidebar (sidebar is hidden below md). */}
                    <div className="flex md:hidden gap-2 overflow-x-auto pb-4 -mx-1 px-1 shrink-0 scrollbar-thin">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setActiveTab(item.id)}
                                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    activeTab === item.id
                                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-200"
                                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                }`}
                            >
                                <item.icon size={14} className="opacity-80" />
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Orders List Container */}
                    <div className="flex-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                        {/* Table Header - Sticky */}
                        <div className="shrink-0 hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 backdrop-blur-sm z-10">
                            <div className="col-span-1">ID</div>
                            <div className="col-span-2">Time</div>
                            <div className="col-span-2">Customer</div>
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
                                    const isOrderPlacedStep = getOrderProgressStepIndex(order.status) === 0;
                                    const itemString = Object.keys(order).filter(k => k.startsWith('item') && order[k]).map(k => order[k]).join(', ');
                                    const isNewListHighlight = newOrderHighlightIds.includes(order.id);
                                    const isNavHighlight = navHighlightOrderId === order.id;
                                    const rowTone = getOrderRowTone(order.status);
                                    const newOrderRowClass =
                                        "relative z-[1] ring-2 ring-amber-400/80 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 shadow-[0_0_16px_-4px_rgba(251,191,36,0.5)] animate-new-order-row-blink";
                                    const navHighlightClass =
                                        "relative z-[2] ring-2 ring-sky-500/90 ring-offset-2 ring-offset-white shadow-[0_0_0_3px_rgba(14,165,233,0.35),0_12px_40px_-12px_rgba(14,165,233,0.25)] dark:ring-sky-400/85 dark:ring-offset-slate-950 dark:shadow-[0_0_0_3px_rgba(56,189,248,0.3),0_12px_40px_-12px_rgba(56,189,248,0.2)]";

                                    const rowFocusClass = isNavHighlight
                                        ? navHighlightClass
                                        : isNewListHighlight
                                          ? newOrderRowClass
                                          : isExpanded
                                            ? "ring-1 ring-slate-200/90 dark:ring-slate-700/80 z-[1]"
                                            : "";

                                    return (
                                        <div
                                            key={order.id}
                                            id={`order-row-${order.id}`}
                                            className={`group border-b border-slate-100/80 dark:border-slate-800/50 transition-colors duration-200 ${rowTone} ${rowFocusClass}`}
                                        >
                                            {/* Desktop Row */}
                                            <div onClick={() => toggleExpand(order.id)} className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer">
                                                <div className="col-span-1 font-mono text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                                                    #{order.id.slice(-4)}
                                                </div>
                                                <div className="col-span-2">
                                                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                                        <Clock size={12} className="text-indigo-500" />
                                                        {new Date(order.last_updated || order.status_updated_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5 ml-4.5 pl-0.5">
                                                        {new Date(order.last_updated || order.status_updated_at || Date.now()).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                                                    </div>
                                                </div>
                                                <div className="col-span-2">
                                                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{order.name || "Unknown"}</div>
                                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                                        <Phone size={10} className="opacity-50" />
                                                        {order.phnm}
                                                    </div>
                                                </div>
                                                <div className="col-span-2 text-xs text-slate-600 dark:text-slate-400 truncate pr-4" title={itemString}>
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
                                                            className={`w-full appearance-none pl-9 pr-8 py-2 rounded-lg text-sm font-semibold border transition-all cursor-pointer focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900 outline-none ${getStatusColor(order.status)} disabled:opacity-80 disabled:cursor-not-allowed ${isOrderPlacedStep && !isCancelled && !isDelivered ? orderPlacedSelectBlinkClass : ""}`}
                                                        >
                                                            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                            {!STATUS_OPTIONS.includes(order.status) && (
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
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">#{order.id}</span>
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                                                                <Clock size={10} />
                                                                {new Date(order.last_updated || order.status_updated_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                            </span>
                                                        </div>
                                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 mt-1">{order.name || "Guest"}</h3>
                                                    </div>
                                                    <div className="font-bold text-slate-900 dark:text-slate-100">₹{order.total}</div>
                                                </div>
                                                <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{itemString}</div>
                                                <div
                                                    className={`text-xs font-semibold px-2 py-1 rounded-lg inline-flex items-center gap-1 w-fit border ${getStatusColor(order.status)} ${isOrderPlacedStep && !isCancelled && !isDelivered ? orderPlacedSelectBlinkClass : ""}`}
                                                >
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
                                                                    className={`w-full appearance-none pl-9 pr-8 py-3 rounded-xl text-sm font-semibold border transition-all ${getStatusColor(order.status)} ${isOrderPlacedStep && !isCancelled && !isDelivered ? orderPlacedSelectBlinkClass : ""}`}
                                                                >
                                                                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                    {!STATUS_OPTIONS.includes(order.status) && (
                                                                        <option value={order.status}>{order.status}</option>
                                                                    )}
                                                                </select>
                                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70">
                                                                    {getStatusIcon(order.status)}
                                                                </div>
                                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" size={14} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                                                        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4">Order progress</h4>
                                                        {isCancelled ? (
                                                            <p className="text-sm font-medium text-red-600 dark:text-red-400">This order was cancelled.</p>
                                                        ) : (
                                                            <ol className="space-y-2.5">
                                                                {ORDER_PROGRESS_STEPS.map((label, idx) => {
                                                                    const stepIdx = getOrderProgressStepIndex(order.status);
                                                                    const completed = isDelivered || stepIdx > idx;
                                                                    const active = !isDelivered && stepIdx === idx;
                                                                    return (
                                                                        <li key={label} className="flex items-center gap-3">
                                                                            <span
                                                                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold border-2 transition-colors ${completed
                                                                                    ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-600"
                                                                                    : active
                                                                                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300"
                                                                                        : "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900"
                                                                                    }`}
                                                                            >
                                                                                {completed ? <CheckCircle size={16} strokeWidth={2.5} /> : idx + 1}
                                                                            </span>
                                                                            <span className={`text-sm font-semibold ${active ? "text-blue-700 dark:text-blue-300" : completed ? "text-emerald-800 dark:text-emerald-200/90" : "text-slate-500 dark:text-slate-400"}`}>
                                                                                {label}
                                                                            </span>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ol>
                                                        )}
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

            {/* Delivery Assignment Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Truck className="text-blue-600" /> Assign delivery partner
                            </h3>
                            <button type="button" onClick={closeAssignModal} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-slate-500 mb-4">
                                Order <strong>#{selectedOrderIdForAssign?.slice(-6)}</strong> will be marked <strong>Packed</strong>. Choose a partner — their name and contact will be saved on this order.
                            </p>

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
