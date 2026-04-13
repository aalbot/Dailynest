import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { firebase } from "@/lib/firebase";
import {
    TrendingUp, Menu, LayoutDashboard, IndianRupee,
    ShoppingBasket, Users, Loader2, Globe, DatabaseBackup,
    Layers, Package, CheckCircle, XCircle, Activity, Briefcase, Clock, Smartphone,
    ChevronDown, ChevronRight, X, AlertTriangle, Search, Calendar, Filter, ExternalLink
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";

// Register ChartJS
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

// Fallback Data
const FALLBACK_DATA = {
    "category": { "CBB0013": { "name": "Bath & Body", "pic": "https://placehold.co/400x300?text=Bath", "ratingKey": 19 }, "CCC014": { "name": "Chocolates", "pic": "https://placehold.co/400x300?text=Choco", "ratingKey": 15 } },
    "fcm_tokens": { "anonymous": { "1764332045562": { "platform": "web", "updatedAt": 1764332045562 } } },
    "order": {
        "1000": { "status": "Cancelled", "total": "6580 - Wallet", "timestamp": 1764635203508, "item1": "Nivea Soap", "item2": "Dove Shampoo" },
        "1005": { "status": "Delivered", "total": "299 - COD", "timestamp": 1764636936831, "item1": "Colgate Soft Toothbrush" },
        "1006": { "status": "Delivered", "total": "150 - COD", "timestamp": 1764637000000, "item1": "Colgate Soft Toothbrush" }
    },
    "stock": { "PBBCGBR009": { "01": { "mrp": 30, "offerPrice": "25.00", "quantity": 10 } } },
    "products": { "PBBCGBR009": { "categoryCode": "CBB0013", "name": "Colgate Soft Toothbrush" } }
};

type Tab = 'dashboard' | 'business' | 'users' | 'stocks' | 'orders';
type TimeData = { date: string; count: number; revenue: number };

type StockListFilter = 'least_first' | 'most_first' | 'low_only' | 'all';

/** Parse order total from number, "299 - COD", currency strings, etc. */
function parseOrderTotal(o: any): { amount: number; method: string } {
    const t = o?.total;
    if (t == null || t === "") return { amount: 0, method: "Other" };
    if (typeof t === "number" && !Number.isNaN(t)) return { amount: t, method: "Other" };
    const s = String(t).trim();
    const numPart = (str: string) => parseFloat(str.replace(/[,₹\s]/g, "")) || 0;
    if (s.includes("-")) {
        const idx = s.indexOf("-");
        const amount = numPart(s.slice(0, idx));
        const rest = s.slice(idx + 1).toLowerCase();
        if (rest.includes("cod")) return { amount, method: "COD" };
        if (rest.includes("wallet")) return { amount, method: "Wallet" };
        if (rest.includes("upi")) return { amount, method: "UPI" };
        if (rest.includes("card") || rest.includes("razorpay") || rest.includes("pay")) return { amount, method: "Card" };
        return { amount, method: "Other" };
    }
    return { amount: numPart(s), method: "Other" };
}

function orderStatusBucket(status: string): "delivered" | "cancelled" | "pending" {
    const st = (status || "").toLowerCase();
    if (st.includes("deliver") || st.includes("complete")) return "delivered";
    if (st.includes("cancel")) return "cancelled";
    return "pending";
}

const Dashboard = () => {
    // State
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [dataSourceMsg, setDataSourceMsg] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Data State
    const [rawData, setRawData] = useState<any>(FALLBACK_DATA);

    // Users Filter/Sort
    const [userFilter, setUserFilter] = useState('all');
    const [userSortConfig, setUserSortConfig] = useState({ key: 'orderCompletedAt', direction: 'desc' });
    const [stockSearchTerm, setStockSearchTerm] = useState('');
    const [stockListFilter, setStockListFilter] = useState<StockListFilter>('least_first');
    const [stockFilterMenuOpen, setStockFilterMenuOpen] = useState(false);
    const [timePeriod, setTimePeriod] = useState<string>('all');
    const [nowTick, setNowTick] = useState(() => Date.now());
    const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
    const coreReadyRef = useRef<Record<string, boolean>>({});
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const id = window.setInterval(() => setNowTick(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    // Handle incoming tab state
    useEffect(() => {
        if (location.state && (location.state as any).tab) {
            setActiveTab((location.state as any).tab);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    useEffect(() => {
        if (activeTab !== "stocks") setStockFilterMenuOpen(false);
    }, [activeTab]);

    // Load Data — full real-time listeners; empty DB still marks nodes ready
    useEffect(() => {
        const db = firebase.database();
        const rootRef = db.ref("root");
        const CORE_NODES = ["category", "products", "fcm_tokens", "order", "stock"] as const;

        const markCoreReady = (node: string) => {
            if (!CORE_NODES.includes(node as (typeof CORE_NODES)[number])) return;
            coreReadyRef.current[node] = true;
            if (CORE_NODES.every((n) => coreReadyRef.current[n])) {
                setIsLoading(false);
                setIsConnected(true);
                setDataSourceMsg("");
            }
        };

        setIsLoading(true);
        coreReadyRef.current = {};

        const onDataUpdate = (node: string, val: any) => {
            const safe = val == null ? {} : val;
            setRawData((prev: any) => ({ ...prev, [node]: safe }));
            setLastSyncAt(Date.now());
            markCoreReady(node);
        };

        const categoryRef = rootRef.child("category");
        const productsRef = rootRef.child("products");
        const fcmRef = rootRef.child("fcm_tokens");
        const orderRef = rootRef.child("order");
        const stockRef = rootRef.child("stock");
        const hrRef = db.ref("root/nexus_hr");
        const empRef = hrRef.child("employees");
        const deptRef = hrRef.child("departments");

        categoryRef.on("value", (snap) => onDataUpdate("category", snap.val()));
        productsRef.on("value", (snap) => onDataUpdate("products", snap.val()));
        fcmRef.on("value", (snap) => onDataUpdate("fcm_tokens", snap.val()));
        orderRef.on("value", (snap) => onDataUpdate("order", snap.val()));
        stockRef.on("value", (snap) => onDataUpdate("stock", snap.val()));
        empRef.on("value", (snap) => onDataUpdate("employees", snap.val()));
        deptRef.on("value", (snap) => onDataUpdate("departments", snap.val()));

        const timeout = window.setTimeout(() => {
            setIsLoading((loading) => {
                if (loading) {
                    setIsConnected(false);
                    setDataSourceMsg("Timeout — showing last known data");
                }
                return false;
            });
        }, 12000);

        return () => {
            categoryRef.off("value");
            productsRef.off("value");
            fcmRef.off("value");
            orderRef.off("value");
            stockRef.off("value");
            empRef.off("value");
            deptRef.off("value");
            window.clearTimeout(timeout);
        };
    }, []);

    // Helper functions
    const cleanPlatformName = (platform: string) => {
        if (!platform) return 'Unknown';
        if (platform.includes('android')) return 'Android';
        if (platform.includes('windows')) return 'Windows';
        if (platform.includes('web')) return 'Web';
        if (platform.includes('macOS')) return 'macOS';
        if (platform.includes('iOS')) return 'iOS';
        return platform;
    };

    const fmtMoney = (n: number) => '₹' + n.toLocaleString();

    // Memoize processing logic
    const processed = useMemo(() => {
        if (!rawData) return null;
        const data = rawData;
        const now = Date.now();
        const startOfToday = new Date().setHours(0, 0, 0, 0);
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

        // Categories
        const catArray = Object.entries(data.category || {}).map(([key, value]: [string, any]) => ({ id: key, ...value }));

        // Users
        let userArray: any[] = [];
        if (data.fcm_tokens) {
            Object.entries(data.fcm_tokens).forEach(([key, value]: [string, any]) => {
                if (key !== 'anonymous') userArray.push({ id: key, ...value, cleanPlatform: cleanPlatformName(value.platform), isAnon: false });
            });
            if (data.fcm_tokens.anonymous) {
                Object.entries(data.fcm_tokens.anonymous).forEach(([key, value]: [string, any]) => {
                    userArray.push({ id: key, ...value, cleanPlatform: cleanPlatformName(value.platform), isAnon: true });
                });
            }
        }

        // Orders
        const allOrders = data.order ? Object.entries(data.order).map(([k, v]: [string, any]) => ({ id: k, ...v })) : [];
        let orderList = allOrders;

        if (timePeriod === 'today') {
            orderList = allOrders.filter(o => (o.timestamp || o.createdAt) >= startOfToday);
        } else if (timePeriod === '7d') {
            orderList = allOrders.filter(o => (o.timestamp || o.createdAt) >= sevenDaysAgo);
        } else if (timePeriod === '30d') {
            orderList = allOrders.filter(o => (o.timestamp || o.createdAt) >= thirtyDaysAgo);
        }

        let totalRevenue = 0, completedOrders = 0, cancelledOrders = 0, pendingOrders = 0;
        let productSales: Record<string, number> = {};
        const methodStats: Record<string, number> = {};
        const timeMap: Record<string, TimeData> = {};
        const hourMap = new Array(24).fill(0);
        orderList.forEach((o: any) => {
            const bucket = orderStatusBucket(o.status);
            const isComp = bucket === "delivered";
            const { amount: amt, method } = parseOrderTotal(o);

            if (isComp) {
                completedOrders++;
                totalRevenue += amt;
                methodStats[method] = (methodStats[method] || 0) + amt;
            } else if (bucket === "cancelled") cancelledOrders++;
            else pendingOrders++;

            const ts = o.timestamp || o.createdAt;
            if (ts) {
                const d = new Date(ts).toLocaleDateString('en-CA');
                const h = new Date(ts).getHours();
                hourMap[h]++;
                if (!timeMap[d]) timeMap[d] = { date: d, count: 0, revenue: 0 };
                timeMap[d].count++;
                if (isComp) timeMap[d].revenue += amt;
            }

            Object.keys(o).forEach(k => { if (k.startsWith('item') && o[k]) productSales[o[k]] = (productSales[o[k]] || 0) + 1; });
        });

        const periodLabel =
            timePeriod === "today" ? "Today" :
            timePeriod === "7d" ? "Last 7 days" :
            timePeriod === "30d" ? "Last 30 days" : "All time";

        let priorRevenue = 0;
        if (timePeriod === "7d") {
            const startPrev = now - (14 * 24 * 60 * 60 * 1000);
            const endPrev = sevenDaysAgo;
            allOrders.forEach((o: any) => {
                const ts = o.timestamp || o.createdAt;
                if (!ts || ts < startPrev || ts >= endPrev) return;
                if (orderStatusBucket(o.status) === "delivered") priorRevenue += parseOrderTotal(o).amount;
            });
        } else if (timePeriod === "30d") {
            const startPrev = now - (60 * 24 * 60 * 60 * 1000);
            const endPrev = thirtyDaysAgo;
            allOrders.forEach((o: any) => {
                const ts = o.timestamp || o.createdAt;
                if (!ts || ts < startPrev || ts >= endPrev) return;
                if (orderStatusBucket(o.status) === "delivered") priorRevenue += parseOrderTotal(o).amount;
            });
        }
        const revenueDeltaPct =
            priorRevenue > 0 ? Math.round(((totalRevenue - priorRevenue) / priorRevenue) * 100) :
            totalRevenue > 0 ? 100 : 0;

        const recentOrdersTable = [...orderList]
            .filter((o: any) => o.timestamp || o.createdAt)
            .sort((a: any, b: any) => (b.timestamp || b.createdAt) - (a.timestamp || a.createdAt))
            .slice(0, 25)
            .map((o: any) => {
                const { amount, method } = parseOrderTotal(o);
                const b = orderStatusBucket(o.status);
                const statusLabel = b === "delivered" ? "Delivered" : b === "cancelled" ? "Cancelled" : "Pending";
                return {
                    id: o.id,
                    date: o.timestamp || o.createdAt,
                    amount,
                    method,
                    statusLabel,
                    statusBucket: b,
                };
            });

        // Stock
        let stockVal = 0, stockQty = 0, stockVariants = 0;
        let outOfStockSkus = 0;
        let lowStock: any[] = [], inventoryByCat: Record<string, number> = {};
        if (data.stock && data.products) {
            Object.entries(data.stock).forEach(([pid, variants]: [string, any]) => {
                const pInfo = data.products[pid];
                const cat = (pInfo && data.category?.[pInfo.categoryCode]) ? data.category[pInfo.categoryCode].name : 'Uncategorized';
                Object.entries(variants).forEach(([vid, v]: [string, any]) => {
                    const parsed = parseInt(String(v.quantity ?? "").trim(), 10);
                    const q = Number.isFinite(parsed) ? parsed : 0;
                    const pr = parseFloat(v.offerPrice) || parseFloat(v.mrp) || 0;
                    stockVal += (q * pr); stockQty += q; stockVariants++;
                    if (q <= 0) outOfStockSkus++;
                    inventoryByCat[cat] = (inventoryByCat[cat] || 0) + (q * pr);
                    if (q >= 1 && q <= 5) lowStock.push({ id: pid, name: pInfo?.name || "Unknown", quantity: q, category: cat });
                });
            });
        }

        const uniqueProductCount = Object.keys(data.products || {}).length;
        const orderDenominator = completedOrders + cancelledOrders + pendingOrders;
        const completionRatePct = orderDenominator > 0 ? Math.round((completedOrders / orderDenominator) * 1000) / 10 : 0;

        // Today's snapshot (always from full order set, not time filter)
        let todayRevenue = 0, todayOrderCount = 0, todayDeliveredCount = 0, todayUsers = 0;
        allOrders.forEach((o: any) => {
            const ts = o.timestamp || o.createdAt;
            if (!ts || ts < startOfToday) return;
            todayOrderCount++;
            if (orderStatusBucket(o.status) === "delivered") {
                todayDeliveredCount++;
                todayRevenue += parseOrderTotal(o).amount;
            }
        });
        userArray.forEach(u => { if (u.updatedAt >= startOfToday) todayUsers++; });

        return {
            stats: {
                totalCategories: catArray.length,
                totalUsers: userArray.length,
                totalOrders: orderList.length,
                completedOrders,
                cancelledOrders,
                pendingOrders,
                totalVariants: stockVariants,
                uniqueProductCount,
                allOrdersCount: allOrders.length,
                todayOrders: todayOrderCount,
                todayDeliveredCount,
                todayUsers,
                outOfStockSkus,
                completionRatePct,
            },
            pulse: {
                revenue: todayRevenue,
                orders: todayOrderCount,
                deliveredToday: todayDeliveredCount,
                users: todayUsers,
            },
            chartData: Object.values(timeMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-14),
            platformData: Object.entries(userArray.reduce((acc, u) => { acc[u.cleanPlatform] = (acc[u.cleanPlatform] || 0) + 1; return acc; }, {} as any)).map(([name, value]: any) => ({ name, value })),
            financialStats: {
                totalRevenue,
                avgOrder: completedOrders > 0 ? totalRevenue / completedOrders : 0,
                stockValue: stockVal,
                totalStockQuantity: stockQty,
                pendingOrders,
                totalVariants: stockVariants,
                priorRevenue,
                revenueDeltaPct,
            },
            topProducts: Object.entries(productSales).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
            orderStatusData: [{ name: 'Delivered', value: completedOrders, color: '#10b981' }, { name: 'Pending', value: pendingOrders, color: '#f59e0b' }, { name: 'Cancelled', value: cancelledOrders, color: '#ef4444' }],
            inventoryChartData: { labels: Object.keys(inventoryByCat), values: Object.values(inventoryByCat) },
            revenueByMethod: {
                labels: Object.keys(methodStats).filter((k) => methodStats[k] > 0),
                values: Object.keys(methodStats).filter((k) => methodStats[k] > 0).map((k) => methodStats[k]),
            },
            periodLabel,
            recentOrdersTable,
            lowStockProducts: lowStock,
            users: userArray,
            engagementData: hourMap,
            hrStats: (() => {
                const empSrc = data.employees;
                const empList: any[] = Array.isArray(empSrc)
                    ? empSrc
                    : empSrc && typeof empSrc === "object"
                        ? Object.values(empSrc)
                        : [];
                return {
                    totalEmployees: empList.length,
                    deptBreakdown: data.departments
                        ? Object.values(data.departments).map((d: any) => ({
                            name: d.name,
                            count: empList.filter((e: any) => e.department === d.name).length,
                        }))
                        : [],
                };
            })(),
            allStockItems: Object.entries(data.stock || {}).flatMap(([pid, variants]: [string, any]) => {
                const pInfo = data.products?.[pid];
                const cat = (pInfo && data.category?.[pInfo.categoryCode]) ? data.category[pInfo.categoryCode].name : 'Uncategorized';
                return Object.entries(variants).map(([vid, v]: [string, any]) => {
                    const parsed = parseInt(String(v.quantity ?? "").trim(), 10);
                    const qty = Number.isFinite(parsed) ? parsed : 0;
                    return {
                    id: pid,
                    variantId: vid,
                    name: pInfo?.name || "Unknown",
                    category: cat,
                    categoryCode: pInfo?.categoryCode || "",
                    quantity: qty,
                    price: parseFloat(v.offerPrice) || parseFloat(v.mrp) || 0,
                    pic: pInfo?.pic || "",
                    variantRaw: v,
                };
                });
            })
        };
    }, [rawData, timePeriod]);

    const displayedStockItems = useMemo(() => {
        const items = processed?.allStockItems ?? [];
        let list = items.filter((i: { name: string }) => i.name.toLowerCase().includes(stockSearchTerm.toLowerCase()));
        if (stockListFilter === 'low_only') {
            list = list.filter((i: { quantity: number }) => i.quantity >= 1 && i.quantity <= 5);
        }
        const sorted = [...list];
        if (stockListFilter === 'least_first' || stockListFilter === 'low_only') {
            sorted.sort((a: { quantity: number; name: string }, b: { quantity: number; name: string }) => a.quantity - b.quantity || a.name.localeCompare(b.name));
        } else if (stockListFilter === 'most_first') {
            sorted.sort((a: { quantity: number; name: string }, b: { quantity: number; name: string }) => b.quantity - a.quantity || a.name.localeCompare(b.name));
        } else {
            sorted.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
        }
        return sorted.slice(0, 200);
    }, [processed, stockSearchTerm, stockListFilter]);

    const sortedUsers = useMemo(() => {
        if (!processed?.users) return [];
        let filtered = [...processed.users];
        if (userFilter === 'registered') filtered = filtered.filter((u: any) => !u.isAnon);
        if (userFilter === 'anonymous') filtered = filtered.filter((u: any) => u.isAnon);
        if (userFilter === 'customers') filtered = filtered.filter((u: any) => u.orderCompletedAt);
        filtered.sort((a, b) => {
            const av = a[userSortConfig.key] || 0, bv = b[userSortConfig.key] || 0;
            return userSortConfig.direction === 'desc' ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
        });
        return filtered;
    }, [processed, userFilter, userSortConfig]);

    if (isLoading || !processed) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="animate-spin text-blue-600" /></div>;

    const {
        stats,
        pulse,
        chartData,
        platformData,
        financialStats,
        topProducts,
        orderStatusData,
        inventoryChartData,
        revenueByMethod,
        periodLabel,
        recentOrdersTable,
        lowStockProducts,
        users,
        engagementData,
        hrStats,
        allStockItems,
    } = processed;

    const secsSinceSync = lastSyncAt != null ? Math.max(0, Math.floor((nowTick - lastSyncAt) / 1000)) : null;

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            <Navbar />
            <aside className="w-[280px] hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl pt-20 pb-6 px-4 z-40 fixed top-0 bottom-0 left-0">
                <div className="mb-6 px-2"><BackButton /></div>
                <div className="flex items-center gap-3 px-4 mb-8">
                    <div className="bg-blue-600 text-white p-2 rounded-xl"><TrendingUp size={20} /></div>
                    <h1 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Dashboard</h1>
                </div>
                <nav className="flex-1 space-y-1">
                    {[
                        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
                        { id: 'business', label: 'Business & Finance', icon: IndianRupee },
                        { id: 'orders', label: 'Orders Analysis', icon: ShoppingBasket },
                        { id: 'users', label: 'Users & Orders', icon: Users },
                        { id: 'stocks', label: 'Inventory & Stocks', icon: Package }
                    ].map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id as Tab)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-semibold shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <div className={`rounded-xl p-4 text-white shadow-lg ${isConnected ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-orange-400 to-red-500'}`}>
                        <p className="text-xs font-medium text-white/80 mb-1">Firebase</p>
                        <p className="text-sm font-bold flex items-center gap-2">{isConnected ? <><Globe size={16} /> Live sync</> : <><DatabaseBackup size={16} /> Offline / fallback</>}</p>
                        {dataSourceMsg ? <p className="text-[10px] text-white/90 mt-2 leading-snug">{dataSourceMsg}</p> : isConnected ? <p className="text-[10px] text-white/75 mt-2">Orders, stock, products & tokens stream in real time.</p> : null}
                    </div>
                </div>
            </aside>

            <main className="flex-1 md:ml-[280px] pt-16 h-full overflow-hidden flex flex-col">
                <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
                    <div className="flex items-center gap-3"><BackButton /><span className="font-bold text-lg text-slate-900 dark:text-slate-100">Dashboard</span></div>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><Menu size={20} className="text-slate-600 dark:text-slate-300" /></button>
                </div>

                {sidebarOpen && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)}>
                        <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 p-6 flex flex-col h-full" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-8"><h2 className="text-xl font-bold dark:text-white">Menu</h2><button onClick={() => setSidebarOpen(false)}><X className="dark:text-white" /></button></div>
                            <nav className="space-y-2">
                                {['dashboard', 'business', 'orders', 'users', 'stocks'].map(t => (
                                    <button key={t} onClick={() => { setActiveTab(t as Tab); setSidebarOpen(false); }} className={`w-full text-left p-3 rounded-lg capitalize ${activeTab === t ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-white'}`}>{t}</button>
                                ))}
                            </nav>
                        </div>
                    </div>
                )}

                <div id="dashboard-main-scroll" className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3 capitalize">
                                {activeTab} Analytics
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                Real-time business intelligence for your organization.
                                {isConnected && secsSinceSync != null && (
                                    <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        <span className="inline-flex items-center gap-1">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Live
                                        </span>
                                        <span className="text-slate-400 dark:text-slate-500 font-normal">·</span>
                                        <span>Firebase synced {secsSinceSync === 0 ? "just now" : `${secsSinceSync}s ago`}</span>
                                        <span className="text-slate-400 dark:text-slate-500 font-normal hidden sm:inline">·</span>
                                        <span className="font-mono text-slate-500 dark:text-slate-400">{new Date(nowTick).toLocaleTimeString()}</span>
                                    </span>
                                )}
                                {!isConnected && dataSourceMsg && (
                                    <span className="mt-1.5 block text-xs font-medium text-amber-600 dark:text-amber-400">{dataSourceMsg}</span>
                                )}
                            </p>
                        </div>
                        <div className="flex flex-col items-stretch sm:items-end gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center sm:text-right">Order charts: {periodLabel}</p>
                            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                {[
                                    { id: 'today', label: 'Today' },
                                    { id: '7d', label: '7 Days' },
                                    { id: '30d', label: '30 Days' },
                                    { id: 'all', label: 'All Time' }
                                ].map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setTimePeriod(p.id)}
                                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${timePeriod === p.id
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Today Pulse Snapshot */}
                            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 md:p-8 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    <TrendingUp size={160} />
                                </div>
                                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest opacity-80">Today's Revenue</p>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-4xl md:text-5xl font-black">{fmtMoney(pulse.revenue)}</h3>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-indigo-100/60 text-xs">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Live Tracking
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 col-span-1 lg:col-span-3 gap-4 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8">
                                        <div className="space-y-1">
                                            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest opacity-60">Orders today</p>
                                            <p className="text-2xl md:text-3xl font-black tabular-nums">{pulse.orders}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest opacity-60">Delivered</p>
                                            <p className="text-2xl md:text-3xl font-black tabular-nums">{pulse.deliveredToday}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest opacity-60">New users</p>
                                            <p className="text-2xl md:text-3xl font-black tabular-nums">{pulse.users}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest opacity-60">Avg delivered</p>
                                            <p className="text-2xl md:text-3xl font-black tabular-nums">{fmtMoney(pulse.deliveredToday > 0 ? pulse.revenue / pulse.deliveredToday : 0)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {lowStockProducts.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-600 dark:text-amber-400 shrink-0"><AlertTriangle size={20} /></div>
                                        <div className="min-w-0">
                                            <h4 className="text-amber-900 dark:text-amber-200 font-bold">Low Stock Alert</h4>
                                            <p className="text-amber-800 dark:text-amber-300/90 text-sm">{lowStockProducts.length} items running low.</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:shrink-0">
                                        <div className="flex flex-wrap gap-2">
                                            {lowStockProducts.slice(0, 3).map((p, i) => (
                                                <div key={i} className="bg-white dark:bg-slate-900 px-2 py-1 rounded border border-amber-200/80 dark:border-amber-800 text-[10px] font-bold text-amber-900 dark:text-amber-100">{p.name} ({p.quantity})</div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStockListFilter("low_only");
                                                setActiveTab("stocks");
                                                document.getElementById("dashboard-main-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
                                            }}
                                            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
                                        >
                                            View inventory
                                            <ChevronRight size={18} className="opacity-90" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                                {[
                                    { label: 'Employees', value: hrStats.totalEmployees, icon: Briefcase, color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' },
                                    { label: 'Categories', value: stats.totalCategories, icon: ShoppingBasket, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
                                    { label: 'Catalog products', value: stats.uniqueProductCount, icon: Package, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' },
                                    { label: 'Stock variants', value: stats.totalVariants, icon: Layers, color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400' },
                                    { label: 'Stock units', value: financialStats.totalStockQuantity, icon: Activity, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
                                    { label: 'Out of stock', value: stats.outOfStockSkus, icon: AlertTriangle, color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' },
                                    { label: 'App users', value: stats.totalUsers, icon: Users, color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' },
                                    { label: `Orders (${periodLabel})`, value: stats.totalOrders, icon: ShoppingBasket, color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' },
                                    { label: 'Delivered', value: stats.completedOrders, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
                                    { label: 'Cancelled', value: stats.cancelledOrders, icon: XCircle, color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
                                    { label: 'Fulfillment rate', value: `${stats.completionRatePct}%`, icon: TrendingUp, color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400' },
                                ].map((kpi, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center justify-center gap-2 hover:border-blue-500/50 hover:shadow-md transition-all group">
                                        <div className={`p-2.5 rounded-xl ${kpi.color} group-hover:scale-110 transition-transform`}><kpi.icon size={18} /></div>
                                        <div className="min-w-0"><p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-tighter leading-tight">{kpi.label}</p><h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 tabular-nums">{kpi.value}</h3></div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold mb-1">Orders & revenue</h3>
                                    <p className="text-xs text-slate-500 mb-4">Daily order count and delivered revenue ({periodLabel.toLowerCase()})</p>
                                    <div className="h-72 w-full">
                                        <Line
                                            data={{
                                                labels: chartData.map(d => d.date),
                                                datasets: [
                                                    {
                                                        label: 'Orders',
                                                        data: chartData.map(d => d.count),
                                                        borderColor: '#3b82f6',
                                                        backgroundColor: 'rgba(59, 130, 246, 0.06)',
                                                        tension: 0.35,
                                                        fill: true,
                                                        yAxisID: 'y',
                                                    },
                                                    {
                                                        label: 'Revenue (₹)',
                                                        data: chartData.map(d => d.revenue),
                                                        borderColor: '#a855f7',
                                                        backgroundColor: 'rgba(168, 85, 247, 0.06)',
                                                        tension: 0.35,
                                                        fill: true,
                                                        yAxisID: 'y1',
                                                    },
                                                ],
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                interaction: { mode: 'index', intersect: false },
                                                scales: {
                                                    y: {
                                                        type: 'linear',
                                                        position: 'left',
                                                        beginAtZero: true,
                                                        title: { display: true, text: 'Orders' },
                                                        grid: { color: 'rgba(148, 163, 184, 0.15)' },
                                                    },
                                                    y1: {
                                                        type: 'linear',
                                                        position: 'right',
                                                        beginAtZero: true,
                                                        title: { display: true, text: 'Revenue ₹' },
                                                        grid: { drawOnChartArea: false },
                                                    },
                                                    x: { grid: { display: false } },
                                                },
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold mb-4">Order Status</h3>
                                    <div className="h-64 flex justify-center"><Doughnut data={{ labels: orderStatusData.map(d => d.name), datasets: [{ data: orderStatusData.map(d => d.value), backgroundColor: orderStatusData.map(d => d.color) }] }} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold mb-4">Staff by Department</h3>
                                    <div className="h-64"><Bar data={{ labels: hrStats.deptBreakdown.map(d => d.name), datasets: [{ label: 'Staff', data: hrStats.deptBreakdown.map(d => d.count), backgroundColor: '#6366f1' }] }} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold mb-4">Visitor Platforms</h3>
                                    <div className="h-64 flex justify-center"><Pie data={{ labels: platformData.map(d => d.name), datasets: [{ data: platformData.map(d => d.value), backgroundColor: ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'] }] }} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'business' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">
                                Figures below use the selected time range for orders and revenue; inventory reflects <span className="font-semibold text-slate-700 dark:text-slate-300">live</span> stock and catalog data.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide">Revenue ({periodLabel})</p>
                                    <h3 className="text-2xl font-black mt-1 text-slate-900 dark:text-slate-100 tabular-nums">{fmtMoney(financialStats.totalRevenue)}</h3>
                                    <p className="text-[10px] text-slate-400 mt-1">Delivered orders only</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide">Avg order</p>
                                    <h3 className="text-2xl font-black mt-1 tabular-nums">{fmtMoney(financialStats.avgOrder)}</h3>
                                    <p className="text-[10px] text-slate-400 mt-1">Mean on completed orders</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide">Inventory value</p>
                                    <h3 className="text-2xl font-black mt-1 text-blue-600 dark:text-blue-400 tabular-nums">{fmtMoney(financialStats.stockValue)}</h3>
                                    <p className="text-[10px] text-slate-400 mt-1">Σ qty × offer (or MRP)</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide">Stock units</p>
                                    <h3 className="text-2xl font-black mt-1 tabular-nums">{financialStats.totalStockQuantity}</h3>
                                    <p className="text-[10px] text-slate-400 mt-1">{stats.totalVariants} variants · {stats.outOfStockSkus} at zero</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide">Pipeline</p>
                                    <h3 className="text-2xl font-black mt-1 text-orange-500 tabular-nums">{stats.pendingOrders}</h3>
                                    <p className="text-[10px] text-slate-400 mt-1">Non-delivered, non-cancelled</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide">Fulfillment</p>
                                    <h3 className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.completionRatePct}%</h3>
                                    <p className="text-[10px] text-slate-400 mt-1">Delivered ÷ all in range</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold mb-1">Inventory by category</h3>
                                    <p className="text-xs text-slate-500 mb-4">Retail value by category (live)</p>
                                    <div className="h-72">
                                        <Bar
                                            data={{
                                                labels: inventoryChartData.labels,
                                                datasets: [{ label: 'Value (₹)', data: inventoryChartData.values, backgroundColor: '#34d399' }],
                                            }}
                                            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                                        />
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold mb-1">Revenue by payment method</h3>
                                    <p className="text-xs text-slate-500 mb-4">Delivered orders in {periodLabel.toLowerCase()}</p>
                                    <div className="h-72">
                                        {revenueByMethod.labels.length > 0 ? (
                                            <Bar
                                                data={{
                                                    labels: revenueByMethod.labels,
                                                    datasets: [{
                                                        label: 'Revenue (₹)',
                                                        data: revenueByMethod.values,
                                                        backgroundColor: revenueByMethod.labels.map((_, i) => ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'][i % 6]),
                                                    }],
                                                }}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    indexAxis: 'y',
                                                    plugins: { legend: { display: false } },
                                                }}
                                            />
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-sm text-slate-400">No delivered revenue in this range</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold mb-1">Order status mix</h3>
                                    <p className="text-xs text-slate-500 mb-4">{periodLabel} · {stats.totalOrders} orders in range</p>
                                    <div className="h-64 flex justify-center">
                                        <Doughnut
                                            data={{
                                                labels: orderStatusData.map(d => d.name),
                                                datasets: [{ data: orderStatusData.map(d => d.value), backgroundColor: orderStatusData.map(d => d.color) }],
                                            }}
                                            options={{ responsive: true, maintainAspectRatio: false }}
                                        />
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold mb-1">Revenue trend</h3>
                                    <p className="text-xs text-slate-500 mb-4">Same window as Overview chart</p>
                                    <div className="h-64 w-full">
                                        <Line
                                            data={{
                                                labels: chartData.map(d => d.date),
                                                datasets: [{
                                                    label: 'Revenue (₹)',
                                                    data: chartData.map(d => d.revenue),
                                                    borderColor: '#8b5cf6',
                                                    backgroundColor: 'rgba(139, 92, 246, 0.12)',
                                                    tension: 0.35,
                                                    fill: true,
                                                }],
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                scales: { y: { beginAtZero: true }, x: { grid: { display: false } } },
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* KPI Metrics */}
                            <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">Order metrics for <span className="font-semibold text-slate-700 dark:text-slate-300">{periodLabel}</span> ({stats.totalOrders} orders). Revenue = delivered orders only.</p>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl"><IndianRupee size={20} /></div>
                                        {(timePeriod === '7d' || timePeriod === '30d') && financialStats.priorRevenue > 0 && (
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${financialStats.revenueDeltaPct >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                                                {financialStats.revenueDeltaPct >= 0 ? '+' : ''}{financialStats.revenueDeltaPct}% vs prior {timePeriod === '7d' ? 'week' : 'month'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Total Sales</p>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 tabular-nums">{fmtMoney(financialStats.totalRevenue)}</h3>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl"><Package size={20} /></div>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Total Orders</p>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.totalOrders}</h3>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-xl"><Activity size={20} /></div>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Avg Order Value</p>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{fmtMoney(financialStats.avgOrder)}</h3>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl"><AlertTriangle size={20} /></div>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Cancelled</p>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.cancelledOrders}</h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Sales Trend Chart */}
                                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-lg font-bold">Revenue Trend</h3>
                                            <p className="text-sm text-slate-500">Daily sales performance over time</p>
                                        </div>
                                    </div>
                                    <div className="h-80 w-full">
                                        <Line
                                            data={{
                                                labels: chartData.map(d => d.date),
                                                datasets: [
                                                    {
                                                        label: 'Revenue',
                                                        data: chartData.map(d => d.revenue),
                                                        borderColor: '#8b5cf6',
                                                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                                        tension: 0.4,
                                                        fill: true,
                                                    }
                                                ]
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                scales: {
                                                    y: {
                                                        beginAtZero: true,
                                                        grid: { color: 'rgba(0,0,0,0.05)' }
                                                    },
                                                    x: { grid: { display: false } }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Top Products List */}
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
                                    <h3 className="text-lg font-bold mb-4">Top Selling Products</h3>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                                        {topProducts.map((prod, idx) => (
                                            <div key={idx} className="flex items-center gap-4 group">
                                                <div className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 font-bold text-xs shrink-0">#{idx + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold truncate text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors">{prod.name}</p>
                                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(prod.count / (topProducts[0]?.count || 1)) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{prod.count} sold</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Recent Transactions Table */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold">Recent orders</h3>
                                    <p className="text-xs text-slate-500 mt-1">Newest first · parsed amount & status from Firebase</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-xs font-bold">
                                            <tr>
                                                <th className="p-4">Order ID</th>
                                                <th className="p-4">Date & Time</th>
                                                <th className="p-4">Amount</th>
                                                <th className="p-4">Payment</th>
                                                <th className="p-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {recentOrdersTable.length === 0 ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No orders in the selected range</td></tr>
                                            ) : (
                                                recentOrdersTable.map((order) => (
                                                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="p-4 font-medium text-slate-700 dark:text-slate-300 font-mono text-xs">#{order.id}</td>
                                                        <td className="p-4 text-slate-500">
                                                            {new Date(order.date).toLocaleDateString()}
                                                            <span className="text-xs ml-2 opacity-60">{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </td>
                                                        <td className="p-4 font-bold tabular-nums">{fmtMoney(order.amount)}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${order.method === 'COD' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : order.method === 'Wallet' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                                {order.method}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            {order.statusLabel === 'Delivered' && (
                                                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-xs font-bold"><CheckCircle size={14} /> Delivered</span>
                                                            )}
                                                            {order.statusLabel === 'Cancelled' && (
                                                                <span className="text-red-600 dark:text-red-400 flex items-center gap-1 text-xs font-bold"><XCircle size={14} /> Cancelled</span>
                                                            )}
                                                            {order.statusLabel === 'Pending' && (
                                                                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 text-xs font-bold"><Clock size={14} /> Pending</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">
                                Showing {Math.min(50, sortedUsers.length)} of {sortedUsers.length} users (filter: {userFilter}) · {stats.totalUsers} total device tokens in Firebase
                            </p>
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <h2 className="text-xl font-bold">User Management</h2>
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                        {['all', 'registered', 'customers'].map(f => <button key={f} onClick={() => setUserFilter(f)} className={`px-4 py-2 text-xs font-bold rounded-md capitalize transition-all ${userFilter === f ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>{f}</button>)}
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-800">
                                            <tr><th className="p-4">User</th><th className="p-4">Platform</th><th className="p-4">Status</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {sortedUsers.slice(0, 50).map(u => (
                                                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="p-4 font-medium">{u.phone || 'Anonymous'}<div className="text-[10px] text-slate-400">{u.id}</div></td>
                                                    <td className="p-4"><span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold">{u.cleanPlatform}</span></td>
                                                    <td className="p-4">{u.orderCompletedAt ? <span className="text-emerald-600 font-bold">Customer</span> : <span className="text-slate-400">Visitor</span>}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'stocks' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                                    <p className="text-[10px] font-bold uppercase text-slate-400">Variants listed</p>
                                    <p className="text-2xl font-black tabular-nums mt-1">{allStockItems.length}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                                    <p className="text-[10px] font-bold uppercase text-slate-400">Total units</p>
                                    <p className="text-2xl font-black tabular-nums mt-1">{financialStats.totalStockQuantity}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                                    <p className="text-[10px] font-bold uppercase text-slate-400">Inventory value</p>
                                    <p className="text-2xl font-black tabular-nums mt-1 text-blue-600 dark:text-blue-400">{fmtMoney(financialStats.stockValue)}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                                    <p className="text-[10px] font-bold uppercase text-slate-400">Low / out</p>
                                    <p className="text-2xl font-black tabular-nums mt-1 text-amber-600 dark:text-amber-400">{lowStockProducts.length}<span className="text-sm font-bold text-slate-400"> / </span><span className="text-rose-600">{stats.outOfStockSkus}</span></p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                                    <h2 className="text-xl font-bold">Inventory List</h2>
                                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:items-center">
                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                            <input type="text" placeholder="Search product..." value={stockSearchTerm} onChange={e => setStockSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm border-none focus:ring-1 focus:ring-blue-500" />
                                        </div>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setStockFilterMenuOpen(o => !o)}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-full sm:w-auto justify-center"
                                            >
                                                <Filter size={16} />
                                                Filter
                                                <ChevronDown size={14} className={`opacity-60 transition-transform ${stockFilterMenuOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {stockFilterMenuOpen && (
                                                <>
                                                    <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close menu" onClick={() => setStockFilterMenuOpen(false)} />
                                                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1 text-sm">
                                                        {([
                                                            { id: 'least_first' as const, label: 'Lowest stock first' },
                                                            { id: 'most_first' as const, label: 'Highest stock first' },
                                                            { id: 'low_only' as const, label: 'Low stock only (≤5)' },
                                                            { id: 'all' as const, label: 'All (A–Z)' },
                                                        ]).map(opt => (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setStockListFilter(opt.id);
                                                                    setStockFilterMenuOpen(false);
                                                                }}
                                                                className={`w-full text-left px-4 py-2.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 ${stockListFilter === opt.id ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="p-4 text-left">Product</th>
                                                <th className="p-4 text-left">Variant</th>
                                                <th className="p-4 text-left">Category</th>
                                                <th className="p-4 text-left">Price</th>
                                                <th className="p-4 text-left">Stock</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayedStockItems.map((i: any) => (
                                                <tr key={`${i.id}-${i.variantId}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="p-4 font-medium">{i.name}</td>
                                                    <td className="p-4 font-mono text-xs text-slate-500">{i.variantId}</td>
                                                    <td className="p-4 text-slate-500">{i.category}</td>
                                                    <td className="p-4">{fmtMoney(i.price)}</td>
                                                    <td className="p-4"><span className={`font-black ${i.quantity <= 0 ? 'text-rose-600 dark:text-rose-400' : i.quantity <= 5 ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>{i.quantity}</span></td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                navigate('/stock-entry', {
                                                                    state: {
                                                                        prefillStock: {
                                                                            productCode: i.id,
                                                                            variantKey: i.variantId,
                                                                            product: {
                                                                                code: i.id,
                                                                                name: i.name,
                                                                                categoryCode: i.categoryCode || '',
                                                                                pic: i.pic || '',
                                                                            },
                                                                            variant: i.variantRaw || {},
                                                                        },
                                                                    },
                                                                });
                                                            }}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                                        >
                                                            <ExternalLink size={12} />
                                                            Stocks
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {displayedStockItems.length === 0 && (
                                        <p className="p-8 text-center text-slate-500 text-sm">No rows match your search or filter.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
