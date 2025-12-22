import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import {
    TrendingUp, Menu, LayoutDashboard, DollarSign,
    ShoppingBasket, Users, Loader2, Globe, DatabaseBackup,
    Layers, Package, CheckCircle, XCircle, Activity, Briefcase, Clock, Smartphone,
    ChevronDown, X, AlertTriangle, Search
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

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCSH0uuKssWvkgvMOnWV_1u3zPO-1XNWPg",
    authDomain: "dailyclub11.firebaseapp.com",
    databaseURL: "https://dailyclub11-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dailyclub11",
    storageBucket: "dailyclub11.firebasestorage.app",
    messagingSenderId: "439424426599",
    appId: "1:439424426599:web:366ea0de36341a00fdaac2"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

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

type Tab = 'dashboard' | 'business' | 'users' | 'stocks';
type TimeData = { date: string; count: number; revenue: number };

const Dashboard = () => {
    // State
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [dataSourceMsg, setDataSourceMsg] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Data State
    const [rawData, setRawData] = useState<any>(FALLBACK_DATA);
    const [processed, setProcessed] = useState<any>(null);

    // Users Filter/Sort
    const [userFilter, setUserFilter] = useState('all');
    const [userSortConfig, setUserSortConfig] = useState({ key: 'orderCompletedAt', direction: 'desc' });
    const [stockSearchTerm, setStockSearchTerm] = useState('');
    const location = useLocation();

    // Handle incoming tab state
    useEffect(() => {
        if (location.state && (location.state as any).tab) {
            setActiveTab((location.state as any).tab);
            // Clear state to avoid persistent redirection on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Load Data
    useEffect(() => {
        const db = firebase.database();
        const dataRef = db.ref('/');

        const timeout = setTimeout(() => {
            if (!isConnected) {
                console.warn("Connection timeout. Switching to Backup Data.");
                setIsConnected(false);
                setDataSourceMsg("Connection Timeout (Backup Mode)");
                processData(FALLBACK_DATA);
                setIsLoading(false);
            }
        }, 5000);

        const onValueChange = (snapshot: any) => {
            const val = snapshot.val();
            if (val) {
                clearTimeout(timeout);
                setIsConnected(true);
                setDataSourceMsg("");

                let source = val;
                if (val.root) source = val.root;

                const newData = {
                    category: source.category || {},
                    fcm_tokens: source.fcm_tokens || {},
                    order: source.order || source.orders || {},
                    stock: source.stock || {},
                    products: source.products || {}
                };

                setRawData(newData);
                processData(newData);
                setIsLoading(false);
            } else {
                setDataSourceMsg("Empty Database (Backup Mode)");
                processData(FALLBACK_DATA);
                setIsLoading(false);
            }
        };

        const errorHandler = (err: any) => {
            console.error(err);
            clearTimeout(timeout);
            setDataSourceMsg("Permission Denied (Backup Mode)");
            processData(FALLBACK_DATA);
            setIsLoading(false);
        };

        dataRef.on('value', onValueChange, errorHandler);

        return () => {
            dataRef.off('value', onValueChange);
            clearTimeout(timeout);
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

    const processData = (data: any) => {
        // 1. Categories
        const catArray = Object.entries(data.category || {}).map(([key, value]: [string, any]) => ({
            id: key,
            ...value
        }));

        // 2. Users
        let userArray: any[] = [];
        if (data.fcm_tokens) {
            Object.entries(data.fcm_tokens).forEach(([key, value]: [string, any]) => {
                if (key !== 'anonymous') {
                    userArray.push({
                        id: key,
                        ...value,
                        cleanPlatform: cleanPlatformName(value.platform),
                        isAnon: false
                    });
                }
            });
            if (data.fcm_tokens.anonymous) {
                Object.entries(data.fcm_tokens.anonymous).forEach(([key, value]: [string, any]) => {
                    userArray.push({
                        id: key,
                        ...value,
                        cleanPlatform: cleanPlatformName(value.platform),
                        isAnon: true
                    });
                });
            }
        }

        // 3. Orders
        const orderList = data.order ? Object.entries(data.order).map(([k, v]: [string, any]) => ({ id: k, ...v })) : [];
        const totalOrders = orderList.length;

        let detailedRevenue: any[] = [];

        let totalRevenue = 0;
        let completedOrders = 0;
        let cancelledOrders = 0;
        let pendingOrders = 0;
        let productSales: Record<string, number> = {};
        let revenueByMethod: Record<string, number> = { 'COD': 0, 'Wallet': 0, 'Other': 0 };
        const timeMap: Record<string, TimeData> = {};
        const hourMap = new Array(24).fill(0);

        orderList.forEach((o: any) => {
            const status = (o.status || '').toLowerCase();
            const isCompleted = status.includes('deliver') || status.includes('complete');
            const totalStr = o.total || "";

            let amt = 0;
            let method = "Other";

            if (typeof totalStr === 'string' && totalStr.includes('-')) {
                const parts = totalStr.split('-');
                amt = parseFloat(parts[0].trim());
                const m = parts[1].trim().toLowerCase();
                if (m.includes('cod')) method = 'COD';
                else if (m.includes('wallet')) method = 'Wallet';
            } else {
                amt = parseFloat(totalStr);
            }

            if (isNaN(amt)) amt = 0;

            if (isCompleted) {
                completedOrders++;
                totalRevenue += amt;
                revenueByMethod[method] = (revenueByMethod[method] || 0) + amt;
                detailedRevenue.push({
                    id: o.id,
                    amount: amt,
                    method: method,
                    status: status,
                    date: o.timestamp || o.createdAt || Date.now()
                });
            } else if (status.includes('cancel')) {
                cancelledOrders++;
            } else {
                pendingOrders++;
            }

            const ts = o.timestamp || o.createdAt || o.date;
            if (ts) {
                const dateObj = new Date(ts);
                if (!isNaN(dateObj.getTime())) {
                    const d = dateObj.toLocaleDateString('en-CA');
                    const h = dateObj.getHours();
                    hourMap[h]++;

                    if (!timeMap[d]) timeMap[d] = { date: d, count: 0, revenue: 0 };
                    timeMap[d].count++;
                    if (isCompleted) timeMap[d].revenue += amt;
                }
            }

            Object.keys(o).forEach(key => {
                if (key.startsWith('item')) {
                    const productName = o[key];
                    if (productName && typeof productName === 'string') {
                        productSales[productName] = (productSales[productName] || 0) + 1;
                    }
                }
            });

            if (o.items && Array.isArray(o.items)) {
                o.items.forEach((i: any) => {
                    const name = i.name || i.productName || "Unknown Item";
                    productSales[name] = (productSales[name] || 0) + (i.quantity || 1);
                });
            }
        });

        // 4. Stock
        let totalStockValue = 0;
        let totalStockQuantity = 0;
        let totalVariants = 0;
        let catalogValue = 0;
        let inventoryByCategory: Record<string, number> = {};
        let lowStockProducts: any[] = [];

        if (data.stock && data.products) {
            Object.entries(data.stock).forEach(([prodId, variants]: [string, any]) => {
                const productInfo = data.products[prodId];
                let catName = 'Uncategorized';
                if (productInfo && productInfo.categoryCode && data.category && data.category[productInfo.categoryCode]) {
                    catName = data.category[productInfo.categoryCode].name;
                }

                Object.entries(variants).forEach(([variantId, variant]: [string, any]) => {
                    const qty = parseInt(variant.quantity) || 0;
                    const price = parseFloat(variant.offerPrice) || parseFloat(variant.mrp) || 0;
                    const val = qty * price;

                    totalStockValue += val;
                    totalStockQuantity += qty;
                    totalVariants += 1;
                    catalogValue += price;

                    inventoryByCategory[catName] = (inventoryByCategory[catName] || 0) + val;

                    if (qty <= 5) {
                        lowStockProducts.push({
                            id: prodId,
                            variantId,
                            name: productInfo?.name || "Unknown Product",
                            quantity: qty,
                            category: catName
                        });
                    }
                });
            });
        }

        const registeredUsers = userArray.filter((u: any) => !u.isAnon).length;

        // Platform Stats
        const pStats: Record<string, number> = {};
        userArray.forEach((u: any) => {
            const p = u.cleanPlatform;
            pStats[p] = (pStats[p] || 0) + 1;
        });
        const platformData = Object.entries(pStats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Chart Data
        const chartData = Object.values(timeMap)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-14);

        const topProducts = Object.entries(productSales)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const financialStats = {
            totalRevenue,
            avgOrderValue: completedOrders > 0 ? Math.round(totalRevenue / completedOrders) : 0,
            stockValue: totalStockValue,
            totalStockQuantity,
            pendingOrders,
            totalVariants,
            catalogValue
        };

        const orderStatusData = [
            { name: 'Delivered', value: completedOrders, color: '#10b981' },
            { name: 'Pending', value: pendingOrders, color: '#f59e0b' },
            { name: 'Cancelled', value: cancelledOrders, color: '#ef4444' }
        ];

        const invLabels = Object.keys(inventoryByCategory);
        const invValues = Object.values(inventoryByCategory);
        const revLabels = Object.keys(revenueByMethod).filter(k => revenueByMethod[k] > 0);
        const revValues = revLabels.map(k => revenueByMethod[k]);

        setProcessed({
            categories: catArray,
            users: userArray,
            stats: { totalCategories: catArray.length, totalUsers: userArray.length, registeredUsers, totalOrders, completedOrders, cancelledOrders, totalVariants },
            chartData,
            platformData,
            engagementData: hourMap,
            financialStats,
            topProducts,
            orderStatusData,
            revenueChartData: { labels: revLabels, values: revValues },
            detailedRevenue,
            lowStockProducts,
            allStockItems: Object.entries(data.stock || {}).flatMap(([prodId, variants]: [string, any]) => {
                const productInfo = data.products[prodId];
                let catName = 'Uncategorized';
                if (productInfo && productInfo.categoryCode && data.category && data.category[productInfo.categoryCode]) {
                    catName = data.category[productInfo.categoryCode].name;
                }
                return Object.entries(variants).map(([variantId, variant]: [string, any]) => ({
                    id: prodId,
                    variantId,
                    name: productInfo?.name || "Unknown Product",
                    category: catName,
                    quantity: parseInt(variant.quantity) || 0,
                    price: parseFloat(variant.offerPrice) || parseFloat(variant.mrp) || 0,
                    mrp: parseFloat(variant.mrp) || 0,
                    pic: productInfo?.pic || ""
                }));
            })
        });
    };

    const fmtMoney = (n: number) => '₹' + n.toLocaleString();

    // Derived State for Users Table
    const sortedUsers = useMemo(() => {
        if (!processed?.users) return [];
        let filtered = [...processed.users];
        if (userFilter === 'registered') filtered = filtered.filter((u: any) => !u.isAnon);
        if (userFilter === 'anonymous') filtered = filtered.filter((u: any) => u.isAnon);
        if (userFilter === 'customers') filtered = filtered.filter((u: any) => u.orderCompletedAt);

        filtered.sort((a: any, b: any) => {
            let aVal = a[userSortConfig.key] || 0;
            let bVal = b[userSortConfig.key] || 0;
            if (aVal < bVal) return userSortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return userSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [processed, userFilter, userSortConfig]);

    if (isLoading || !processed) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-slate-500">Loading Analytics...</p>
                </div>
            </div>
        );
    }

    const { stats, chartData, platformData, engagementData, orderStatusData, financialStats, topProducts, inventoryChartData, revenueChartData, detailedRevenue, lowStockProducts, allStockItems } = processed;

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            {/* Navbar (Fixed) */}
            <div className="fixed top-0 left-0 right-0 z-50">
                <Navbar />
            </div>

            {/* Sidebar - Desktop */}
            <aside className="w-[280px] hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl pt-20 pb-6 px-4 z-40 fixed top-0 bottom-0 left-0">
                <div className="mb-6 px-2">
                    <BackButton />
                </div>

                <div className="flex items-center gap-3 px-4 mb-8">
                    <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-500/20">
                        <TrendingUp size={20} />
                    </div>
                    <h1 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Dashboard</h1>
                </div>

                <nav className="flex-1 space-y-1">
                    {[
                        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
                        { id: 'business', label: 'Business & Finance', icon: DollarSign },
                        { id: 'users', label: 'Users & Orders', icon: Users },
                        { id: 'stocks', label: 'Inventory & Stocks', icon: Package }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as Tab)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${activeTab === item.id
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-semibold shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <div className={`rounded-xl p-4 text-white shadow-lg ${isConnected ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-orange-400 to-red-500'}`}>
                        <p className="text-xs font-medium text-white/80 mb-1">Status</p>
                        <p className="text-sm font-bold flex items-center gap-2">
                            {isConnected ? <><Globe size={16} /> Live Data</> : <><DatabaseBackup size={16} /> Backup Mode</>}
                        </p>
                    </div>
                    {dataSourceMsg && <div className="text-xs text-slate-400 text-center">{dataSourceMsg}</div>}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-[280px] pt-16 h-full overflow-hidden flex flex-col">
                {/* Mobile Header Toggle */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <BackButton />
                        <span className="font-bold text-lg text-slate-900 dark:text-slate-100">Dashboard</span>
                    </div>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Menu size={20} className="text-slate-600 dark:text-slate-300" />
                    </button>
                </div>

                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)}>
                        <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 p-6 flex flex-col h-full" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-bold dark:text-white">Menu</h2>
                                <button onClick={() => setSidebarOpen(false)}><X className="dark:text-white" /></button>
                            </div>
                            <nav className="space-y-2">
                                <button onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }} className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-white">Overview</button>
                                <button onClick={() => { setActiveTab('business'); setSidebarOpen(false); }} className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-white">Business</button>
                                <button onClick={() => { setActiveTab('users'); setSidebarOpen(false); }} className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-white">Users</button>
                                <button onClick={() => { setActiveTab('stocks'); setSidebarOpen(false); }} className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-white">Stocks</button>
                            </nav>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">

                    {/* DASHBOARD VIEW */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {lowStockProducts.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex flex-col md:flex-row items-md-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg text-amber-600 dark:text-amber-400">
                                            <AlertTriangle size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-amber-900 dark:text-amber-200 font-bold">Low Stock Warning</h4>
                                            <p className="text-amber-700 dark:text-amber-400 text-sm">{lowStockProducts.length} items are running low (5 or below in stock).</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 max-w-full">
                                        {lowStockProducts.slice(0, 3).map((p: any, i: number) => (
                                            <div key={i} className="flex-shrink-0 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-800 text-xs shadow-sm">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                                                <span className="ml-2 px-1.5 py-0.5 bg-red-50 text-red-600 rounded">Qty: {p.quantity}</span>
                                            </div>
                                        ))}
                                        {lowStockProducts.length > 3 && (
                                            <div className="flex-shrink-0 flex items-center px-3 py-1.5 text-xs text-amber-600 font-medium">
                                                +{lowStockProducts.length - 3} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                                {[
                                    { label: 'Total Categories', value: stats.totalCategories, icon: ShoppingBasket, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
                                    { label: 'Total Products', value: stats.totalVariants, sub: 'Incl. Variants', icon: Layers, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' },
                                    { label: 'Inventory Qty', value: financialStats.totalStockQuantity, sub: 'Total Units', icon: Activity, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
                                    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' },
                                    { label: 'Total Orders', value: stats.totalOrders, icon: Package, color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' },
                                    { label: 'Delivered', value: stats.completedOrders, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
                                    { label: 'Cancelled', value: stats.cancelledOrders, icon: XCircle, color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
                                ].map((kpi, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                        <div>
                                            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{kpi.label}</p>
                                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{kpi.value}</h3>
                                            {kpi.sub && <p className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</p>}
                                        </div>
                                        <div className={`p-3 rounded-lg ${kpi.color}`}><kpi.icon size={20} /></div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Order Timeline</h3>
                                    <div className="h-72 w-full">
                                        <Line data={{
                                            labels: chartData.map((d: any) => d.date),
                                            datasets: [{ label: 'Orders', data: chartData.map((d: any) => d.count), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.4 }]
                                        }} options={{ responsive: true, maintainAspectRatio: false }} />
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Order Status</h3>
                                    <div className="h-64 w-full flex justify-center">
                                        <Doughnut data={{
                                            labels: orderStatusData.map((d: any) => d.name),
                                            datasets: [{ data: orderStatusData.map((d: any) => d.value), backgroundColor: orderStatusData.map((d: any) => d.color) }]
                                        }} options={{ responsive: true, maintainAspectRatio: false }} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Peak Activity (Hourly)</h3>
                                    <div className="h-64 w-full">
                                        <Bar data={{
                                            labels: engagementData.map((_: any, i: number) => `${i}:00`),
                                            datasets: [{ label: 'Activity', data: engagementData, backgroundColor: '#ffc658', borderRadius: 4 }]
                                        }} options={{ responsive: true, maintainAspectRatio: false }} />
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">User Platforms</h3>
                                    <div className="h-64 w-full flex justify-center">
                                        <Pie data={{
                                            labels: platformData.map((d: any) => d.name),
                                            datasets: [{ data: platformData.map((d: any) => d.value), backgroundColor: ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE'] }]
                                        }} options={{ responsive: true, maintainAspectRatio: false }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BUSINESS VIEW */}
                    {activeTab === 'business' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                                <Activity size={16} />
                                <span><span className="font-semibold">Financial Data:</span> Metrics based on real-time order and stock values.</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500 text-sm font-medium">Total Revenue</p>
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{fmtMoney(financialStats.totalRevenue)}</h3>
                                    <p className="text-xs text-slate-400 mt-1">Lifetime Sales</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500 text-sm font-medium">Inventory Value</p>
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{fmtMoney(financialStats.stockValue)}</h3>
                                    <p className="text-xs text-slate-400 mt-1">Current Stock Assets</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500 text-sm font-medium">Pending Orders</p>
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{financialStats.pendingOrders}</h3>
                                    <p className="text-xs text-slate-400 mt-1">To process</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500 text-sm font-medium">Avg Order Value</p>
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{fmtMoney(financialStats.avgOrderValue)}</h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Top Selling</h3>
                                    <div className="h-64 w-full">
                                        <Bar data={{
                                            labels: topProducts.map((p: any) => p.name.substring(0, 10) + '...'),
                                            datasets: [{ label: 'Units', data: topProducts.map((p: any) => p.count), backgroundColor: '#8884d8', indexAxis: 'y' as const }]
                                        }} options={{ indexAxis: 'y' as const, responsive: true, maintainAspectRatio: false }} />
                                    </div>
                                </div>

                                {/* Revenue Details Card */}
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Revenue Breakdown</h3>
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {detailedRevenue && detailedRevenue.length > 0 ? (
                                            detailedRevenue.sort((a: any, b: any) => b.amount - a.amount).map((order: any, index: number) => (
                                                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">#{order.id}</span>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${order.method === 'COD' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                                                                {order.method}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(order.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <span className="font-bold text-slate-900 dark:text-slate-100">{fmtMoney(order.amount)}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-400 text-center py-4">No detailed revenue data available</p>
                                        )}
                                    </div>
                                </div>

                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Inventory by Category</h3>
                                    <div className="h-64 w-full">
                                        <Bar data={{
                                            labels: inventoryChartData.labels,
                                            datasets: [{ label: 'Stock Value (₹)', data: inventoryChartData.values, backgroundColor: '#6366f1', borderRadius: 4 }]
                                        }} options={{ responsive: true, maintainAspectRatio: false }} />
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Revenue by Method</h3>
                                    <div className="h-64 w-full flex justify-center">
                                        <Pie data={{
                                            labels: revenueChartData.labels,
                                            datasets: [{ data: revenueChartData.values, backgroundColor: ['#10b981', '#3b82f6', '#6366f1'] }]
                                        }} options={{ responsive: true, maintainAspectRatio: false }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}



                    {/* USERS VIEW */}
                    {activeTab === 'users' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">User Sessions</h2>
                                        <p className="text-sm text-slate-500">Manage user base and order history.</p>
                                    </div>
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                        {['all', 'registered', 'customers', 'anonymous'].map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setUserFilter(f)}
                                                className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-all ${userFilter === f ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="p-4 cursor-pointer" onClick={() => setUserSortConfig({ key: 'phone', direction: userSortConfig.key === 'phone' && userSortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Identity</th>
                                                <th className="p-4 cursor-pointer" onClick={() => setUserSortConfig({ key: 'cleanPlatform', direction: userSortConfig.key === 'cleanPlatform' && userSortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Platform</th>
                                                <th className="p-4 cursor-pointer" onClick={() => setUserSortConfig({ key: 'updatedAt', direction: userSortConfig.key === 'updatedAt' && userSortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Last Active</th>
                                                <th className="p-4 cursor-pointer" onClick={() => setUserSortConfig({ key: 'orderCompletedAt', direction: userSortConfig.key === 'orderCompletedAt' && userSortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Last Order</th>
                                                <th className="p-4 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {sortedUsers.slice(0, 100).map((u: any) => (
                                                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="p-4 font-medium">
                                                        {u.isAnon ? (
                                                            <span className="flex items-center gap-2 text-slate-500"><Users size={16} /> Anonymous</span>
                                                        ) : (
                                                            <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400"><Smartphone size={16} /> {u.phone}</span>
                                                        )}
                                                        <div className="text-xs text-slate-400 mt-1 font-mono truncate max-w-[150px]">{u.id}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 ${u.cleanPlatform === 'Android' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                            {u.cleanPlatform}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">{u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : '-'}</td>
                                                    <td className="p-4">
                                                        {u.orderCompletedAt ? (
                                                            <div className="flex flex-col"><span className="text-green-600 dark:text-green-400 font-bold">{new Date(u.orderCompletedAt).toLocaleDateString()}</span><span className="text-xs text-slate-400">Completed</span></div>
                                                        ) : <span className="text-slate-300">-</span>}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {u.orderCompletedAt ? <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Customer</span> : <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Visitor</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 text-center">
                                    Displaying {sortedUsers.length} users
                                </div>
                            </div>
                        </div>
                    )}
                    {/* STOCKS VIEW */}
                    {activeTab === 'stocks' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Stock Overview Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500 text-sm font-medium">Total Inventory</p>
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{financialStats.totalStockQuantity} units</h3>
                                    <p className="text-xs text-slate-400 mt-1">Across all variants</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 border-l-4 border-l-red-500">
                                    <p className="text-slate-500 text-sm font-medium">Low Stock Items</p>
                                    <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{lowStockProducts.length} items</h3>
                                    <p className="text-xs text-slate-400 mt-1">Quantity ≤ 5</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500 text-sm font-medium">Unique Variants</p>
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{financialStats.totalVariants}</h3>
                                    <p className="text-xs text-slate-400 mt-1">SKU Count</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500 text-sm font-medium">Inventory Val.</p>
                                    <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{fmtMoney(financialStats.stockValue)}</h3>
                                    <p className="text-xs text-slate-400 mt-1">Est. Asset Value</p>
                                </div>
                            </div>

                            {/* Split View: Low Stock (Left) & Full Inventory (Right) */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                                {/* Left Side: Low Stock Table */}
                                <div className="lg:col-span-1 space-y-4 h-full flex flex-col">
                                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[600px]">
                                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-red-50/50 dark:bg-red-900/10">
                                            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                                                <AlertTriangle size={16} /> Urgent: Low Stock
                                            </h3>
                                        </div>
                                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                                            {lowStockProducts.length > 0 ? (
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                                                        <tr>
                                                            <th className="p-3 font-bold">Product</th>
                                                            <th className="p-3 font-bold text-right">Qty</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                        {lowStockProducts.map((p: any, i: number) => (
                                                            <tr key={i} className="hover:bg-red-50/30 dark:hover:bg-red-900/5 transition-colors">
                                                                <td className="p-3">
                                                                    <div className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                                                                    <div className="text-[10px] text-slate-500">{p.category}</div>
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-black">
                                                                        {p.quantity}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="p-8 text-center text-slate-400 italic text-sm">
                                                    All stock levels are healthy!
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Full Inventory Table */}
                                <div className="lg:col-span-2 space-y-4">
                                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Full Inventory List</h2>
                                                <p className="text-sm text-slate-500">Detailed list of all products and status.</p>
                                            </div>
                                            <div className="relative w-full md:w-64">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="text"
                                                    placeholder="Search products..."
                                                    value={stockSearchTerm}
                                                    onChange={(e) => setStockSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-4">Product Name</th>
                                                        <th className="p-4">Category</th>
                                                        <th className="p-4">Price</th>
                                                        <th className="p-4">Current Stock</th>
                                                        <th className="p-4 text-right">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {allStockItems
                                                        .filter((item: any) =>
                                                            item.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
                                                            item.id.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
                                                            item.category.toLowerCase().includes(stockSearchTerm.toLowerCase())
                                                        )
                                                        .sort((a: any, b: any) => a.quantity - b.quantity)
                                                        .map((item: any) => (
                                                            <tr key={`${item.id}-${item.variantId}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-3">
                                                                        {item.pic ? (
                                                                            <img src={item.pic} alt="" className="w-8 h-8 rounded shadow-sm object-cover" />
                                                                        ) : (
                                                                            <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                                                <Package size={14} />
                                                                            </div>
                                                                        )}
                                                                        <div className="flex flex-col">
                                                                            <span className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</span>
                                                                            <span className="text-[10px] text-slate-400 font-mono">ID: {item.id}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-slate-600 dark:text-slate-400">{item.category}</td>
                                                                <td className="p-4 font-medium text-slate-900 dark:text-slate-100">{fmtMoney(item.price)}</td>
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden min-w-[60px]">
                                                                            <div
                                                                                className={`h-full rounded-full ${item.quantity <= 5 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                                                style={{ width: `${Math.min((item.quantity / 50) * 100, 100)}%` }}
                                                                            />
                                                                        </div>
                                                                        <span className={`font-bold ${item.quantity <= 5 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                            {item.quantity}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    {item.quantity <= 0 ? (
                                                                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Out of Stock</span>
                                                                    ) : item.quantity <= 5 ? (
                                                                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Low Stock</span>
                                                                    ) : (
                                                                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">In Stock</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
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
