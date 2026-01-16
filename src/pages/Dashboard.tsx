import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { firebase } from "@/lib/firebase";
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

    // Users Filter/Sort
    const [userFilter, setUserFilter] = useState('all');
    const [userSortConfig, setUserSortConfig] = useState({ key: 'orderCompletedAt', direction: 'desc' });
    const [stockSearchTerm, setStockSearchTerm] = useState('');
    const location = useLocation();

    // Handle incoming tab state
    useEffect(() => {
        if (location.state && (location.state as any).tab) {
            setActiveTab((location.state as any).tab);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Load Data
    useEffect(() => {
        const db = firebase.database();
        const rootRef = db.ref('root');
        const nodes = ['category', 'fcm_tokens', 'order', 'stock', 'products'];
        const dataBuffer: any = { ...FALLBACK_DATA };
        let loadedCount = 0;

        setIsLoading(true);

        const onDataUpdate = (node: string, val: any) => {
            dataBuffer[node] = val || {};
            setRawData((prev: any) => ({ ...prev, [node]: val || {} }));

            if (nodes.includes(node)) {
                loadedCount = nodes.filter(n => dataBuffer[n] && Object.keys(dataBuffer[n]).length > 0).length;
                if (loadedCount >= nodes.length) {
                    setIsLoading(false);
                    setIsConnected(true);
                }
            }
        };

        // Static nodes
        rootRef.child('category').once('value', snap => onDataUpdate('category', snap.val()));
        rootRef.child('products').once('value', snap => onDataUpdate('products', snap.val()));
        rootRef.child('fcm_tokens').once('value', snap => onDataUpdate('fcm_tokens', snap.val()));

        // Real-time nodes
        const stockRef = rootRef.child('stock');
        stockRef.on('value', snap => onDataUpdate('stock', snap.val()));

        const orderQuery = rootRef.child('order').limitToLast(500);
        const handleOrderUpdate = (snap: any) => {
            setRawData((prev: any) => ({
                ...prev,
                order: { ...(prev.order || {}), [snap.key!]: snap.val() }
            }));
            if (isLoading && nodes.includes('order')) {
                // Initial load check
            }
        };
        orderQuery.on('value', snap => onDataUpdate('order', snap.val()));

        // HR Data
        const hrRef = db.ref('root/nexus_hr');
        hrRef.child('employees').on('value', snap => onDataUpdate('employees', snap.val()));
        hrRef.child('departments').on('value', snap => onDataUpdate('departments', snap.val()));

        const timeout = setTimeout(() => {
            if (isLoading) {
                setIsConnected(false);
                setDataSourceMsg("Timeout - Backup Mode");
                setIsLoading(false);
            }
        }, 12000);

        return () => {
            rootRef.child('stock').off();
            orderQuery.off();
            hrRef.child('employees').off();
            hrRef.child('departments').off();
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

    const fmtMoney = (n: number) => '₹' + n.toLocaleString();

    // Memoize processing logic
    const processed = useMemo(() => {
        if (!rawData) return null;
        const data = rawData;

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
        const orderList = data.order ? Object.entries(data.order).map(([k, v]: [string, any]) => ({ id: k, ...v })) : [];
        let totalRevenue = 0, completedOrders = 0, cancelledOrders = 0, pendingOrders = 0;
        let productSales: Record<string, number> = {};
        let methodStats: Record<string, number> = { 'COD': 0, 'Wallet': 0, 'Other': 0 };
        const timeMap: Record<string, TimeData> = {};
        const hourMap = new Array(24).fill(0);
        let detailedRev: any[] = [];

        orderList.forEach((o: any) => {
            const status = (o.status || '').toLowerCase();
            const isComp = status.includes('deliver') || status.includes('complete');
            let amt = 0, method = "Other";
            if (typeof o.total === 'string' && o.total.includes('-')) {
                const parts = o.total.split('-');
                amt = parseFloat(parts[0]);
                method = parts[1].trim().toLowerCase().includes('cod') ? 'COD' : 'Wallet';
            } else amt = parseFloat(o.total) || 0;

            if (isComp) {
                completedOrders++; totalRevenue += amt;
                methodStats[method] = (methodStats[method] || 0) + amt;
                detailedRev.push({ id: o.id, amount: amt, method: method, date: o.timestamp || Date.now() });
            } else if (status.includes('cancel')) cancelledOrders++;
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

        // Stock
        let stockVal = 0, stockQty = 0, stockVariants = 0;
        let lowStock: any[] = [], inventoryByCat: Record<string, number> = {};
        if (data.stock && data.products) {
            Object.entries(data.stock).forEach(([pid, variants]: [string, any]) => {
                const pInfo = data.products[pid];
                const cat = (pInfo && data.category?.[pInfo.categoryCode]) ? data.category[pInfo.categoryCode].name : 'Uncategorized';
                Object.entries(variants).forEach(([vid, v]: [string, any]) => {
                    const q = parseInt(v.quantity) || 0, pr = parseFloat(v.offerPrice) || parseFloat(v.mrp) || 0;
                    stockVal += (q * pr); stockQty += q; stockVariants++;
                    inventoryByCat[cat] = (inventoryByCat[cat] || 0) + (q * pr);
                    if (q <= 5) lowStock.push({ id: pid, name: pInfo?.name || "Unknown", quantity: q, category: cat });
                });
            });
        }

        return {
            stats: { totalCategories: catArray.length, totalUsers: userArray.length, totalOrders: orderList.length, completedOrders, cancelledOrders, totalVariants: stockVariants },
            chartData: Object.values(timeMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-14),
            platformData: Object.entries(userArray.reduce((acc, u) => { acc[u.cleanPlatform] = (acc[u.cleanPlatform] || 0) + 1; return acc; }, {} as any)).map(([name, value]: any) => ({ name, value })),
            financialStats: { totalRevenue, avgOrder: completedOrders > 0 ? totalRevenue / completedOrders : 0, stockValue: stockVal, totalStockQuantity: stockQty, pendingOrders, totalVariants: stockVariants },
            topProducts: Object.entries(productSales).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
            orderStatusData: [{ name: 'Delivered', value: completedOrders, color: '#10b981' }, { name: 'Pending', value: pendingOrders, color: '#f59e0b' }, { name: 'Cancelled', value: cancelledOrders, color: '#ef4444' }],
            inventoryChartData: { labels: Object.keys(inventoryByCat), values: Object.values(inventoryByCat) },
            revenueChartData: { labels: Object.keys(methodStats).filter(k => methodStats[k] > 0), values: Object.values(methodStats).filter(v => v > 0) },
            detailedRevenue: detailedRev,
            lowStockProducts: lowStock,
            users: userArray,
            engagementData: hourMap,
            hrStats: {
                totalEmployees: Object.keys(data.employees || {}).length,
                deptBreakdown: data.departments ? Object.values(data.departments).map((d: any) => ({
                    name: d.name,
                    count: Object.values(data.employees || {}).filter((e: any) => e.department === d.name).length
                })) : []
            },
            allStockItems: Object.entries(data.stock || {}).flatMap(([pid, variants]: [string, any]) => {
                const pInfo = data.products?.[pid];
                const cat = (pInfo && data.category?.[pInfo.categoryCode]) ? data.category[pInfo.categoryCode].name : 'Uncategorized';
                return Object.entries(variants).map(([vid, v]: [string, any]) => ({
                    id: pid, variantId: vid, name: pInfo?.name || "Unknown", category: cat,
                    quantity: parseInt(v.quantity) || 0, price: parseFloat(v.offerPrice) || parseFloat(v.mrp) || 0, pic: pInfo?.pic || ""
                }));
            })
        };
    }, [rawData]);

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

    const { stats, chartData, platformData, financialStats, topProducts, orderStatusData, inventoryChartData, revenueChartData, detailedRevenue, lowStockProducts, users, engagementData, hrStats, allStockItems } = processed;

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
                        { id: 'business', label: 'Business & Finance', icon: DollarSign },
                        { id: 'users', label: 'Users & Orders', icon: Users },
                        { id: 'stocks', label: 'Inventory & Stocks', icon: Package }
                    ].map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id as Tab)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-semibold shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <div className={`rounded-xl p-4 text-white shadow-lg ${isConnected ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-orange-400 to-red-500'}`}>
                        <p className="text-xs font-medium text-white/80 mb-1">Status</p>
                        <p className="text-sm font-bold flex items-center gap-2">{isConnected ? <><Globe size={16} /> Live Data</> : <><DatabaseBackup size={16} /> Backup Mode</>}</p>
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
                                {['dashboard', 'business', 'users', 'stocks'].map(t => (
                                    <button key={t} onClick={() => { setActiveTab(t as Tab); setSidebarOpen(false); }} className={`w-full text-left p-3 rounded-lg capitalize ${activeTab === t ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-white'}`}>{t}</button>
                                ))}
                            </nav>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {lowStockProducts.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><AlertTriangle size={20} /></div>
                                        <div><h4 className="text-amber-900 dark:text-amber-200 font-bold">Low Stock Alert</h4><p className="text-amber-700 text-sm">{lowStockProducts.length} items running low.</p></div>
                                    </div>
                                    <div className="flex gap-2">
                                        {lowStockProducts.slice(0, 3).map((p, i) => <div key={i} className="bg-white px-2 py-1 rounded border text-[10px] font-bold">{p.name} ({p.quantity})</div>)}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                                {[
                                    { label: 'Employees', value: hrStats.totalEmployees, icon: Users, color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' },
                                    { label: 'Categories', value: stats.totalCategories, icon: ShoppingBasket, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
                                    { label: 'Products', value: stats.totalVariants, icon: Layers, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' },
                                    { label: 'Stock Qty', value: financialStats.totalStockQuantity, icon: Activity, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
                                    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' },
                                    { label: 'Orders', value: stats.totalOrders, icon: Package, color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' },
                                    { label: 'Delivered', value: stats.completedOrders, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
                                    { label: 'Cancelled', value: stats.cancelledOrders, icon: XCircle, color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
                                ].map((kpi, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center justify-center gap-2 hover:border-blue-500/50 hover:shadow-md transition-all group">
                                        <div className={`p-2.5 rounded-xl ${kpi.color} group-hover:scale-110 transition-transform`}><kpi.icon size={18} /></div>
                                        <div><p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-tighter">{kpi.label}</p><h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{kpi.value}</h3></div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold mb-4">Order Timeline</h3>
                                    <div className="h-72 w-full"><Line data={{ labels: chartData.map(d => d.date), datasets: [{ label: 'Orders', data: chartData.map(d => d.count), borderColor: '#3b82f6', tension: 0.4, fill: true, backgroundColor: 'rgba(59, 130, 246, 0.05)' }] }} options={{ responsive: true, maintainAspectRatio: false }} /></div>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800"><p className="text-slate-500 text-sm">Total Revenue</p><h3 className="text-2xl font-bold mt-1">{fmtMoney(financialStats.totalRevenue)}</h3></div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800"><p className="text-slate-500 text-sm">Inventory Value</p><h3 className="text-2xl font-bold mt-1 text-blue-600">{fmtMoney(financialStats.stockValue)}</h3></div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800"><p className="text-slate-500 text-sm">Avg Order Value</p><h3 className="text-2xl font-bold mt-1">{fmtMoney(financialStats.avgOrder)}</h3></div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800"><p className="text-slate-500 text-sm">Pending Orders</p><h3 className="text-2xl font-bold mt-1 text-orange-500">{financialStats.pendingOrders}</h3></div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold mb-4">Inventory by Category</h3>
                                    <div className="h-64"><Bar data={{ labels: inventoryChartData.labels, datasets: [{ label: 'Value (₹)', data: inventoryChartData.values, backgroundColor: '#34d399' }] }} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold mb-4">Revenue Methodology</h3>
                                    <div className="h-64 flex justify-center"><Pie data={{ labels: revenueChartData.labels, datasets: [{ data: revenueChartData.values, backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'] }] }} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <h2 className="text-xl font-bold">Inventory List</h2>
                                    <div className="relative w-64">
                                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                        <input type="text" placeholder="Search product..." value={stockSearchTerm} onChange={e => setStockSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm border-none focus:ring-1 focus:ring-blue-500" />
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-800">
                                            <tr><th className="p-4 text-left">Product</th><th className="p-4 text-left">Category</th><th className="p-4 text-left">Price</th><th className="p-4 text-left">Stock</th></tr>
                                        </thead>
                                        <tbody>
                                            {allStockItems.filter(i => i.name.toLowerCase().includes(stockSearchTerm.toLowerCase())).slice(0, 100).map(i => (
                                                <tr key={`${i.id}-${i.variantId}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50">
                                                    <td className="p-4 font-medium">{i.name}</td>
                                                    <td className="p-4 text-slate-500">{i.category}</td>
                                                    <td className="p-4">{fmtMoney(i.price)}</td>
                                                    <td className="p-4"><span className={`font-black ${i.quantity <= 5 ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>{i.quantity}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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
