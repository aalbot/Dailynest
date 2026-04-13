import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import {
    Zap,
    Home,
    ShoppingCart,
    Users,
    Boxes,
    Bike,
    Wallet,
    Headphones,
    Search,
    Menu,
    X,
    Download,
    AlertTriangle,
    ExternalLink,
    Filter,
    ChevronDown,
} from "lucide-react";
import { useClubMetrics, type ClubTimeRange, type ClubOrderTableRow } from "./useClubMetrics";

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

export type ClubTab =
    | "overview"
    | "orders"
    | "users"
    | "inventory"
    | "delivery"
    | "business"
    | "support";

type StockListFilter = "least_first" | "most_first" | "low_only" | "all";

const fmtMoney = (n: number) => "₹" + (Number.isFinite(n) ? Math.round(n) : 0).toLocaleString("en-IN");

const nav: { id: ClubTab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "users", label: "Customers", icon: Users },
    { id: "inventory", label: "Inventory", icon: Boxes },
    { id: "delivery", label: "Riders", icon: Bike },
    { id: "business", label: "Finance", icon: Wallet },
    { id: "support", label: "Support", icon: Headphones },
];

const Dashboard2 = () => {
    const navigate = useNavigate();
    const { loading, metrics, connected, lastSyncedAt, dbError } = useClubMetrics();
    const [tab, setTab] = useState<ClubTab>("overview");
    const [range, setRange] = useState<"today" | "7d" | "30d" | "all">("today");
    const [mobileNav, setMobileNav] = useState(false);
    const [search, setSearch] = useState("");
    const [supportSearch, setSupportSearch] = useState("");
    const [stockSearchTerm, setStockSearchTerm] = useState("");
    const [stockListFilter, setStockListFilter] = useState<StockListFilter>("least_first");
    const [stockFilterMenuOpen, setStockFilterMenuOpen] = useState(false);
    const [ordersRange, setOrdersRange] = useState<ClubTimeRange>("all");
    const [orderSearch, setOrderSearch] = useState("");

    const slice = useMemo(() => {
        if (range === "today") return metrics.today;
        if (range === "7d") return metrics.week;
        if (range === "30d") return metrics.month;
        return metrics.all;
    }, [metrics, range]);

    const orderSummaryData = useMemo(
        () => ({
            labels: ["Pending", "Delivered", "Cancelled"],
            datasets: [
                {
                    data: [slice.pending, slice.delivered, slice.cancelled],
                    backgroundColor: ["#f97316", "#22c55e", "#ef4444"],
                    borderRadius: 6,
                    barThickness: 40,
                },
            ],
        }),
        [slice]
    );

    const displayedStockItems = useMemo(() => {
        const items = metrics.allStockItems ?? [];
        let list = items.filter((i: { name: string }) => i.name.toLowerCase().includes(stockSearchTerm.toLowerCase()));
        if (stockListFilter === "low_only") {
            list = list.filter((i: { quantity: number }) => i.quantity >= 1 && i.quantity <= 5);
        }
        const sorted = [...list];
        if (stockListFilter === "least_first" || stockListFilter === "low_only") {
            sorted.sort((a: { quantity: number; name: string }, b: { quantity: number; name: string }) => a.quantity - b.quantity || a.name.localeCompare(b.name));
        } else if (stockListFilter === "most_first") {
            sorted.sort((a: { quantity: number; name: string }, b: { quantity: number; name: string }) => b.quantity - a.quantity || a.name.localeCompare(b.name));
        } else {
            sorted.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
        }
        return sorted.slice(0, 200);
    }, [metrics.allStockItems, stockSearchTerm, stockListFilter]);

    const orderChartSlice = useMemo(() => {
        if (ordersRange === "today") return metrics.today;
        if (ordersRange === "7d") return metrics.week;
        if (ordersRange === "30d") return metrics.month;
        return metrics.all;
    }, [metrics, ordersRange]);

    const ordersTableData = useMemo(() => {
        const t = metrics.ordersTables;
        if (ordersRange === "today") return t.today;
        if (ordersRange === "7d") return t.week;
        if (ordersRange === "30d") return t.month;
        return t.all;
    }, [metrics.ordersTables, ordersRange]);

    const filteredOrdersTable = useMemo(() => {
        const q = orderSearch.trim().toLowerCase();
        if (!q) return ordersTableData;
        return ordersTableData.filter((o: ClubOrderTableRow) => {
            const hay = [o.id, o.customerName, o.phone, o.items, o.statusRaw, o.address, o.paymentMethod, o.deliveryPartner]
                .join(" ")
                .toLowerCase();
            return hay.includes(q);
        });
    }, [ordersTableData, orderSearch]);

    useEffect(() => {
        if (tab !== "inventory") setStockFilterMenuOpen(false);
    }, [tab]);

    if (loading && !metrics.today.list.length && metrics.catalogRows.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Navbar />
                <p className="pt-24 text-slate-500">Loading Daily Club…</p>
            </div>
        );
    }

    const NavBtn = ({ item }: { item: (typeof nav)[0] }) => {
        const Icon = item.icon;
        const active = tab === item.id;
        return (
            <button
                type="button"
                onClick={() => {
                    setTab(item.id);
                    setMobileNav(false);
                }}
                className={`flex w-full items-center rounded-lg p-3 text-left text-sm font-medium transition-colors ${
                    active
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
                }`}
            >
                <Icon className="mr-3 h-5 w-5 shrink-0 opacity-80" />
                {item.label}
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 dark:bg-slate-950 dark:text-slate-100">
            <Navbar />
            <div className="flex min-h-[calc(100vh-4rem)] pt-16">
                <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
                    <div className="p-6">
                        <h1 className="flex items-center text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                            <Zap className="mr-2 h-7 w-7" /> DAILY CLUB
                        </h1>
                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Dashboard 2</p>
                    </div>
                    <nav className="mt-2 h-[calc(100%-120px)] space-y-1 overflow-y-auto px-4 pb-8">
                        {nav.map((item) => (
                            <NavBtn key={item.id} item={item} />
                        ))}
                    </nav>
                </aside>

                {mobileNav && (
                    <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setMobileNav(false)}>
                        <div
                            className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl dark:bg-slate-900"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-slate-800">
                                <span className="font-bold text-blue-600">Menu</span>
                                <button type="button" onClick={() => setMobileNav(false)} className="rounded p-2 hover:bg-gray-100 dark:hover:bg-slate-800">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="flex-1 space-y-1 overflow-y-auto p-3">
                                {nav.map((item) => (
                                    <NavBtn key={item.id} item={item} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <main className="flex-1 p-4 md:p-8">
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${
                                dbError
                                    ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200"
                                    : connected
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                                      : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                            }`}
                        >
                            <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                    dbError ? "bg-red-500" : connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                                }`}
                            />
                            {dbError ? `Firebase: ${dbError}` : connected ? "Firebase live" : "Connecting to Firebase…"}
                        </span>
                        {lastSyncedAt != null && (
                            <span className="tabular-nums">Last update {new Date(lastSyncedAt).toLocaleTimeString()}</span>
                        )}
                    </div>
                    <div className="mb-6 flex items-center gap-3 md:hidden">
                        <BackButton />
                        <button type="button" onClick={() => setMobileNav(true)} className="rounded-lg border border-gray-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                            <Menu className="h-5 w-5" />
                        </button>
                        <span className="font-bold text-blue-600">Daily Club</span>
                    </div>

                    {tab === "overview" && (
                        <>
                            <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Overview</h2>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Live snapshot from Firebase.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                                        {(["today", "7d", "30d", "all"] as const).map((r) => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setRange(r)}
                                                className={`rounded-md px-3 py-1 text-xs font-medium ${
                                                    range === r ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800"
                                                }`}
                                            >
                                                {r === "today" ? "Today" : r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All"}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                                        AD
                                    </div>
                                </div>
                            </header>

                            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                    <div className="mb-4 flex justify-between">
                                        <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50">
                                            <ShoppingCart className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Orders in range</p>
                                    <h3 className="text-2xl font-bold tabular-nums">{slice.delivered + slice.pending + slice.cancelled}</h3>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                    <div className="mb-4 flex justify-between">
                                        <div className="rounded-lg bg-orange-50 p-2 text-orange-600 dark:bg-orange-950/40">
                                            <AlertTriangle className="h-5 w-5" />
                                        </div>
                                        <span className="text-sm font-bold text-orange-500">Active</span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Orders pending</p>
                                    <h3 className="text-2xl font-bold tabular-nums">{slice.pending}</h3>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                    <div className="mb-4 flex justify-between">
                                        <div className="rounded-lg bg-green-50 p-2 text-green-600 dark:bg-green-950/40">
                                            <ShoppingCart className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Delivered</p>
                                    <h3 className="text-2xl font-bold tabular-nums">{slice.delivered}</h3>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                    <div className="mb-4 flex justify-between">
                                        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40">
                                            <Wallet className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Revenue (delivered)</p>
                                    <h3 className="text-2xl font-bold tabular-nums">{fmtMoney(slice.revenue)}</h3>
                                </div>
                            </div>

                            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 p-4 dark:border-orange-900/40 dark:bg-orange-950/20">
                                    <div className="flex items-center">
                                        <AlertTriangle className="mr-3 h-6 w-6 text-orange-600" />
                                        <div>
                                            <span className="block font-bold text-orange-900 dark:text-orange-200">{metrics.lowStockAlerts} Stock alerts</span>
                                            <p className="text-xs text-orange-800 dark:text-orange-300/90">
                                                Out (≤0) or low (1–5 units) per variant
                                            </p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setTab("inventory")} className="rounded bg-orange-600 px-4 py-1 text-sm font-medium text-white hover:bg-orange-700">
                                        View items
                                    </button>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                                    <div className="flex items-center">
                                        <Bike className="mr-3 h-6 w-6 text-blue-600" />
                                        <div>
                                            <span className="block font-bold text-blue-900 dark:text-blue-200">
                                                {metrics.onlineRiders} riders online
                                            </span>
                                            <p className="text-xs text-blue-800 dark:text-blue-300/90">Fleet size {metrics.fleetSize} (logistics staff)</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setTab("delivery")} className="rounded bg-blue-600 px-4 py-1 text-sm font-medium text-white hover:bg-blue-700">
                                        Fleet
                                    </button>
                                </div>
                            </div>

                            <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
                                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-4 font-bold text-gray-700 dark:text-slate-200">Sales trend (today by hour)</h4>
                                    <div className="h-48">
                                        <Line
                                            data={{
                                                labels: metrics.salesTrend.labels,
                                                datasets: [
                                                    {
                                                        label: "Revenue (₹)",
                                                        data: metrics.salesTrend.values,
                                                        borderColor: "#2563eb",
                                                        backgroundColor: "rgba(37, 99, 235, 0.06)",
                                                        borderWidth: 2,
                                                        fill: true,
                                                        tension: 0.35,
                                                        pointRadius: 3,
                                                    },
                                                ],
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: false } },
                                                scales: { y: { beginAtZero: true }, x: { grid: { display: false } } },
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-4 font-bold text-gray-700 dark:text-slate-200">Orders summary</h4>
                                    <div className="h-48">
                                        <Bar
                                            data={orderSummaryData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: false } },
                                                scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } },
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-6 font-bold text-gray-700 dark:text-slate-200">Top-selling lines (order items)</h4>
                                    <div className="space-y-5">
                                        {metrics.topToday.length === 0 ? (
                                            <p className="text-sm text-gray-400">No item-level sales in this range.</p>
                                        ) : (
                                            metrics.topToday.map((row, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{row.name}</p>
                                                        <p className="text-xs text-gray-400">From orders</p>
                                                    </div>
                                                    <p className="text-sm font-bold tabular-nums">{row.sold} sold</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-6 font-bold text-gray-700 dark:text-slate-200">Recent low stock</h4>
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b text-xs uppercase tracking-wider text-gray-400 dark:border-slate-700 dark:text-slate-500">
                                                <th className="pb-3 font-medium">Product</th>
                                                <th className="pb-3 text-center font-medium">Hub</th>
                                                <th className="pb-3 text-right font-medium">Stock</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {metrics.lowStockRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="py-6 text-center text-gray-400">
                                                        No low-stock variants
                                                    </td>
                                                </tr>
                                            ) : (
                                                metrics.lowStockRows.map((r, i) => (
                                                    <tr key={i} className="border-b border-gray-50 dark:border-slate-800">
                                                        <td className="py-3 font-semibold text-gray-800 dark:text-slate-200">{r.name}</td>
                                                        <td className="py-3 text-center text-gray-600 dark:text-slate-400">{r.warehouse}</td>
                                                        <td className={`py-3 text-right font-bold ${r.qty <= 3 ? "text-red-500" : "text-orange-500"}`}>{r.qty}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {tab === "orders" && (
                        <>
                            <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Orders management</h2>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                                        Live from <code className="rounded bg-gray-100 px-1 text-xs dark:bg-slate-800">root/order</code> ·{" "}
                                        <span className="font-semibold text-gray-700 dark:text-slate-300">{metrics.totalOrderCount}</span> orders in Firebase
                                    </p>
                                </div>
                                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                                    <div className="flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                                        {(["today", "7d", "30d", "all"] as const).map((r) => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setOrdersRange(r)}
                                                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                                                    ordersRange === r ? "bg-blue-600 text-white" : "text-gray-600 dark:text-slate-300"
                                                }`}
                                            >
                                                {r === "today" ? "Today" : r === "7d" ? "7 days" : r === "30d" ? "30 days" : "All"}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/orders")}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        Order console
                                    </button>
                                    <div className="relative w-full sm:w-72">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <input
                                            value={orderSearch}
                                            onChange={(e) => setOrderSearch(e.target.value)}
                                            placeholder="Search ID, customer, phone, status, items…"
                                            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                                        />
                                    </div>
                                </div>
                            </header>

                            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                                <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <p className="text-[10px] font-bold uppercase text-gray-400">In range</p>
                                    <p className="mt-1 text-2xl font-black tabular-nums text-gray-900 dark:text-slate-100">{ordersTableData.length}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <p className="text-[10px] font-bold uppercase text-gray-400">Delivered (rev.)</p>
                                    <p className="mt-1 text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400">{fmtMoney(orderChartSlice.revenue)}</p>
                                    <p className="text-[10px] text-gray-400">{orderChartSlice.delivered} delivered</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <p className="text-[10px] font-bold uppercase text-gray-400">Pending</p>
                                    <p className="mt-1 text-2xl font-black tabular-nums text-amber-600">{orderChartSlice.pending}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <p className="text-[10px] font-bold uppercase text-gray-400">Cancelled</p>
                                    <p className="mt-1 text-2xl font-black tabular-nums text-rose-600">{orderChartSlice.cancelled}</p>
                                </div>
                            </div>

                            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-1 text-sm font-bold text-gray-700 dark:text-slate-200">Status split</h4>
                                    <p className="mb-4 text-xs text-gray-500 dark:text-slate-400">Selected range</p>
                                    <div className="mx-auto h-52 max-w-[240px]">
                                        {orderChartSlice.pending + orderChartSlice.delivered + orderChartSlice.cancelled > 0 ? (
                                            <Doughnut
                                                data={{
                                                    labels: ["Pending", "Delivered", "Cancelled"],
                                                    datasets: [
                                                        {
                                                            data: [orderChartSlice.pending, orderChartSlice.delivered, orderChartSlice.cancelled],
                                                            backgroundColor: ["#f97316", "#22c55e", "#ef4444"],
                                                        },
                                                    ],
                                                }}
                                                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }}
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-sm text-gray-400">No orders in this range</div>
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-1 text-sm font-bold text-gray-700 dark:text-slate-200">Orders by hour of day</h4>
                                    <p className="mb-4 text-xs text-gray-500 dark:text-slate-400">Bucketed 0–23h (orders in range with a time)</p>
                                    <div className="h-52">
                                        <Bar
                                            data={{
                                                labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
                                                datasets: [{ data: orderChartSlice.hourOrders, backgroundColor: "#3b82f6", borderRadius: 4 }],
                                            }}
                                            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
                                        />
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-1 text-sm font-bold text-gray-700 dark:text-slate-200">Delivered revenue by hour</h4>
                                    <p className="mb-4 text-xs text-gray-500 dark:text-slate-400">Same window as status split</p>
                                    <div className="h-52">
                                        <Line
                                            data={{
                                                labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
                                                datasets: [
                                                    {
                                                        data: orderChartSlice.hourRevenue,
                                                        borderColor: "#8b5cf6",
                                                        backgroundColor: "rgba(139, 92, 246, 0.08)",
                                                        fill: true,
                                                        tension: 0.3,
                                                    },
                                                ],
                                            }}
                                            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex flex-col gap-2 border-b border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-slate-100">All orders in range</h4>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">
                                            Showing {filteredOrdersTable.length} of {ordersTableData.length}
                                            {orderSearch.trim() ? " (filtered)" : ""}
                                        </p>
                                    </div>
                                </div>
                                <div className="max-h-[70vh] overflow-auto">
                                    <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                                        <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-100 text-xs uppercase tracking-wider text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                            <tr>
                                                <th className="whitespace-nowrap p-3 font-semibold">Order ID</th>
                                                <th className="whitespace-nowrap p-3 font-semibold">Customer</th>
                                                <th className="whitespace-nowrap p-3 font-semibold">Phone</th>
                                                <th className="min-w-[160px] p-3 font-semibold">Items</th>
                                                <th className="min-w-[140px] p-3 font-semibold">Address</th>
                                                <th className="whitespace-nowrap p-3 font-semibold">Time</th>
                                                <th className="whitespace-nowrap p-3 font-semibold">Status</th>
                                                <th className="whitespace-nowrap p-3 font-semibold">Pay</th>
                                                <th className="whitespace-nowrap p-3 font-semibold">Delivery</th>
                                                <th className="whitespace-nowrap p-3 font-semibold">Total (raw)</th>
                                                <th className="whitespace-nowrap p-3 text-right font-semibold">Amt (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-gray-800 dark:text-slate-200">
                                            {filteredOrdersTable.map((o: ClubOrderTableRow) => (
                                                <tr key={o.id} className="border-b border-gray-100 align-top hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                                                    <td className="p-3 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{o.id}</td>
                                                    <td className="max-w-[140px] p-3 text-xs font-medium break-words">{o.customerName}</td>
                                                    <td className="whitespace-nowrap p-3 font-mono text-xs">{o.phone}</td>
                                                    <td className="max-w-[220px] p-3 text-xs leading-snug text-gray-600 dark:text-slate-400">{o.items}</td>
                                                    <td className="max-w-[200px] p-3 text-xs text-gray-600 dark:text-slate-400" title={o.address}>
                                                        {o.address.length > 80 ? `${o.address.slice(0, 80)}…` : o.address}
                                                    </td>
                                                    <td className="whitespace-nowrap p-3 text-xs text-gray-500 tabular-nums">{o.timeLabel}</td>
                                                    <td className="p-3">
                                                        <span className="inline-block max-w-[140px] truncate rounded-md bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase text-gray-800 dark:bg-slate-800 dark:text-slate-200" title={o.statusRaw}>
                                                            {o.statusRaw}
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap p-3 text-xs">{o.paymentMethod}</td>
                                                    <td className="max-w-[120px] truncate p-3 text-xs" title={o.deliveryPartner}>
                                                        {o.deliveryPartner}
                                                    </td>
                                                    <td className="max-w-[100px] truncate p-3 font-mono text-xs text-gray-500" title={String(o.totalRaw ?? "")}>
                                                        {o.totalRaw != null && o.totalRaw !== "" ? String(o.totalRaw) : "—"}
                                                    </td>
                                                    <td className="whitespace-nowrap p-3 text-right text-xs font-bold tabular-nums">{fmtMoney(o.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {filteredOrdersTable.length === 0 && (
                                        <p className="p-10 text-center text-sm text-gray-500">No orders match this range or search.</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {tab === "users" && (
                        <>
                            <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Users & customers</h2>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Device tokens from Firebase.</p>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search phone…"
                                        className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm dark:border-slate-700 dark:bg-slate-900 sm:w-64"
                                    />
                                </div>
                            </header>
                            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-4 text-sm font-bold text-gray-700 dark:text-slate-200">New tokens (cumulative count)</h4>
                                    <div className="h-48">
                                        <Line
                                            data={{
                                                labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"],
                                                datasets: [
                                                    {
                                                        data: [
                                                            Math.max(0, metrics.usersList.length - 30),
                                                            Math.max(0, metrics.usersList.length - 20),
                                                            Math.max(0, metrics.usersList.length - 10),
                                                            metrics.usersList.length,
                                                        ],
                                                        borderColor: "#2563eb",
                                                        fill: true,
                                                        tension: 0.3,
                                                    },
                                                ],
                                            }}
                                            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
                                        />
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-4 text-sm font-bold text-gray-700 dark:text-slate-200">Directory size</h4>
                                    <div className="flex h-48 items-center justify-center">
                                        <p className="text-4xl font-black text-blue-600">{metrics.usersList.length}</p>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-4 text-sm font-bold text-gray-700 dark:text-slate-200">Repeat vs new (estimate)</h4>
                                    <div className="mx-auto h-48 max-w-[200px]">
                                        <Doughnut
                                            data={{
                                                labels: ["With orders", "Tokens only"],
                                                datasets: [{ data: [Math.min(metrics.today.delivered, metrics.usersList.length), Math.max(1, metrics.usersList.length - metrics.today.delivered)], backgroundColor: ["#22c55e", "#94a3b8"] }],
                                            }}
                                            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
                                <div className="border-b border-gray-100 bg-gray-50 p-6 dark:border-slate-800 dark:bg-slate-800/50">
                                    <h4 className="font-bold text-gray-800 dark:text-slate-100">Customer directory</h4>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b text-xs uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400">
                                                <th className="p-4">User / token</th>
                                                <th className="p-4">Platform</th>
                                                <th className="p-4">Last update</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {metrics.usersList
                                                .filter((u) => !search || u.phone.toLowerCase().includes(search.toLowerCase()) || u.id.toLowerCase().includes(search.toLowerCase()))
                                                .map((u) => (
                                                    <tr key={u.id} className="border-b border-gray-50 dark:border-slate-800">
                                                        <td className="p-4">
                                                            <p className="font-bold">{u.phone}</p>
                                                            <p className="text-xs text-gray-400">{u.id}</p>
                                                        </td>
                                                        <td className="p-4">{u.platform}</td>
                                                        <td className="p-4 text-gray-500">{u.updatedAt ? new Date(u.updatedAt).toLocaleString() : "—"}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {tab === "inventory" && (
                        <>
                            <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Inventory &amp; stocks</h2>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">
                                        Same live analytics as <span className="font-semibold text-gray-700 dark:text-slate-300">Dashboard → Inventory &amp; Stocks</span>{" "}
                                        (variant qty, offer/MRP value).
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => navigate("/dashboard", { state: { tab: "stocks" } })}
                                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                    >
                                        Open in Dashboard
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/stock-entry")}
                                        className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                    >
                                        Stock entry
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/product-entry")}
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                    >
                                        Products
                                    </button>
                                </div>
                            </header>

                            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                                <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500">Variants listed</p>
                                    <p className="mt-1 text-2xl font-black tabular-nums text-gray-900 dark:text-slate-100">{metrics.totalVariantSkus}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500">Total units</p>
                                    <p className="mt-1 text-2xl font-black tabular-nums text-gray-900 dark:text-slate-100">{metrics.totalStockQuantity}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500">Inventory value</p>
                                    <p className="mt-1 text-2xl font-black tabular-nums text-blue-600 dark:text-blue-400">{fmtMoney(metrics.stockValue)}</p>
                                    <p className="mt-1 text-[10px] text-gray-400">Σ qty × offer (or MRP)</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500">Low / out</p>
                                    <p className="mt-1 text-2xl font-black tabular-nums text-amber-600 dark:text-amber-400">
                                        {metrics.lowStockProducts.length}
                                        <span className="text-sm font-bold text-gray-400 dark:text-slate-500"> / </span>
                                        <span className="text-rose-600 dark:text-rose-400">{metrics.outOfStockSkus}</span>
                                    </p>
                                    <p className="mt-1 text-[10px] text-gray-400">Low (1–5) / out (≤0)</p>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex flex-col gap-4 border-b border-gray-100 bg-gray-50 p-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                                    <h4 className="font-bold text-gray-800 dark:text-slate-100">Inventory list</h4>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search product…"
                                                value={stockSearchTerm}
                                                onChange={(e) => setStockSearchTerm(e.target.value)}
                                                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setStockFilterMenuOpen((o) => !o)}
                                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
                                            >
                                                <Filter className="h-4 w-4" />
                                                Filter
                                                <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition-transform ${stockFilterMenuOpen ? "rotate-180" : ""}`} />
                                            </button>
                                            {stockFilterMenuOpen && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="fixed inset-0 z-40 cursor-default"
                                                        aria-label="Close menu"
                                                        onClick={() => setStockFilterMenuOpen(false)}
                                                    />
                                                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                                        {(
                                                            [
                                                                { id: "least_first" as const, label: "Lowest stock first" },
                                                                { id: "most_first" as const, label: "Highest stock first" },
                                                                { id: "low_only" as const, label: "Low stock only (≤5)" },
                                                                { id: "all" as const, label: "All (A–Z)" },
                                                            ] as const
                                                        ).map((opt) => (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setStockListFilter(opt.id);
                                                                    setStockFilterMenuOpen(false);
                                                                }}
                                                                className={`w-full px-4 py-2.5 text-left font-medium hover:bg-gray-50 dark:hover:bg-slate-800 ${
                                                                    stockListFilter === opt.id
                                                                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                                                                        : "text-gray-700 dark:text-slate-200"
                                                                }`}
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
                                        <thead className="border-b border-gray-200 bg-gray-50 font-bold dark:border-slate-800 dark:bg-slate-800/80">
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
                                                <tr key={`${i.id}-${i.variantId}`} className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                                                    <td className="p-4 font-medium text-gray-900 dark:text-slate-100">{i.name}</td>
                                                    <td className="p-4 font-mono text-xs text-gray-500 dark:text-slate-400">{i.variantId}</td>
                                                    <td className="p-4 text-gray-600 dark:text-slate-400">{i.category}</td>
                                                    <td className="p-4 tabular-nums">{fmtMoney(i.price)}</td>
                                                    <td className="p-4">
                                                        <span
                                                            className={`font-black tabular-nums ${
                                                                i.quantity <= 0
                                                                    ? "text-rose-600 dark:text-rose-400"
                                                                    : i.quantity <= 5
                                                                      ? "text-red-500"
                                                                      : "text-gray-900 dark:text-slate-100"
                                                            }`}
                                                        >
                                                            {i.quantity}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                navigate("/stock-entry", {
                                                                    state: {
                                                                        prefillStock: {
                                                                            productCode: i.id,
                                                                            variantKey: i.variantId,
                                                                            product: {
                                                                                code: i.id,
                                                                                name: i.name,
                                                                                categoryCode: i.categoryCode || "",
                                                                                pic: i.pic || "",
                                                                            },
                                                                            variant: i.variantRaw || {},
                                                                        },
                                                                    },
                                                                })
                                                            }
                                                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                            Stocks
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {displayedStockItems.length === 0 && (
                                        <p className="p-8 text-center text-sm text-gray-500">No rows match your search or filter.</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {tab === "delivery" && (
                        <>
                            <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Rider management</h2>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Logistics employees from HR.</p>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rider…" className="w-full rounded-lg border py-2 pl-10 pr-4 dark:border-slate-700 dark:bg-slate-900 sm:w-64" />
                                </div>
                            </header>
                            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-4 text-sm font-bold dark:text-slate-200">Deliveries today (count)</h4>
                                    <div className="h-40">
                                        <Line
                                            data={{
                                                labels: ["8", "10", "12", "14", "16"],
                                                datasets: [
                                                    {
                                                        data: [2, 4, 6, 5, Math.min(metrics.today.delivered, 20)],
                                                        borderColor: "#f97316",
                                                        backgroundColor: "rgba(249,115,22,0.1)",
                                                        fill: true,
                                                        tension: 0.3,
                                                    },
                                                ],
                                            }}
                                            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                                        />
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-4 text-sm font-bold dark:text-slate-200">Fleet headcount</h4>
                                    <div className="h-40">
                                        <Bar
                                            data={{
                                                labels: ["Fleet"],
                                                datasets: [{ data: [metrics.fleetSize], backgroundColor: "#3b82f6", borderRadius: 6 }],
                                            }}
                                            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
                                        />
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-4 text-sm font-bold dark:text-slate-200">On-time (placeholder)</h4>
                                    <div className="mx-auto h-40 max-w-[180px]">
                                        <Doughnut
                                            data={{ labels: ["Online", "Rest"], datasets: [{ data: [metrics.onlineRiders, Math.max(0, metrics.fleetSize - metrics.onlineRiders)], backgroundColor: ["#22c55e", "#e5e7eb"] }] }}
                                            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
                                <div className="border-b border-gray-100 bg-gray-50 p-6 dark:border-slate-800">
                                    <h4 className="font-bold text-gray-800 dark:text-slate-100">Fleet directory</h4>
                                </div>
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b text-xs uppercase text-gray-500 dark:border-slate-700">
                                            <th className="p-4">Rider</th>
                                            <th className="p-4 text-center">Status</th>
                                            <th className="p-4">Dept</th>
                                            <th className="p-4 text-right">Role</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {metrics.ridersSample
                                            .filter((r: any) => !search || `${r.firstName || ""} ${r.lastName || ""}`.toLowerCase().includes(search.toLowerCase()))
                                            .map((r: any) => (
                                                <tr key={r.id || r.email} className="border-b border-gray-50 dark:border-slate-800">
                                                    <td className="p-4 font-bold">
                                                        {r.firstName} {r.lastName}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold uppercase text-green-700">{r.status || "—"}</span>
                                                    </td>
                                                    <td className="p-4 text-gray-600">{r.department || "—"}</td>
                                                    <td className="p-4 text-right text-xs">{r.role}</td>
                                                </tr>
                                            ))}
                                        {metrics.ridersSample.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-gray-400">
                                                    No logistics employees in HR
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {tab === "business" && (
                        <>
                            <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Business & finance</h2>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Revenue from delivered orders (7-day window for charts).</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex rounded-lg border border-gray-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                                        <button type="button" className="rounded-md bg-blue-600 px-4 py-1 text-sm font-medium text-white">
                                            This week
                                        </button>
                                    </div>
                                    <button type="button" className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 dark:bg-slate-700">
                                        <Download className="h-4 w-4" /> Export
                                    </button>
                                </div>
                            </header>
                            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Week revenue</p>
                                    <h3 className="mt-2 text-2xl font-bold tabular-nums">{fmtMoney(metrics.week.revenue)}</h3>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Inventory value</p>
                                    <h3 className="mt-2 text-2xl font-bold text-blue-600 tabular-nums">{fmtMoney(metrics.stockValue)}</h3>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Completed (week)</p>
                                    <h3 className="mt-2 text-2xl font-bold tabular-nums">{metrics.week.delivered}</h3>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Avg order (week)</p>
                                    <h3 className="mt-2 text-2xl font-bold text-emerald-600 tabular-nums">
                                        {fmtMoney(metrics.week.delivered ? metrics.week.revenue / metrics.week.delivered : 0)}
                                    </h3>
                                </div>
                            </div>
                            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <div className="rounded-xl border border-gray-100 bg-white p-6 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-4 text-sm font-bold text-gray-700 dark:text-slate-200">Revenue trend (7 days)</h4>
                                    <div className="h-64">
                                        <Line
                                            data={{
                                                labels: metrics.weekDailyRevenue.labels.length ? metrics.weekDailyRevenue.labels : ["—"],
                                                datasets: [
                                                    {
                                                        label: "₹",
                                                        data: metrics.weekDailyRevenue.values.length ? metrics.weekDailyRevenue.values : [0],
                                                        borderColor: "#10b981",
                                                        backgroundColor: "rgba(16,185,129,0.1)",
                                                        fill: true,
                                                        tension: 0.35,
                                                    },
                                                ],
                                            }}
                                            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
                                        />
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-4 text-sm font-bold text-gray-700 dark:text-slate-200">Payment split (week)</h4>
                                    <div className="mx-auto h-64 max-w-[260px]">
                                        {metrics.methodSplit.labels.length ? (
                                            <Doughnut
                                                data={{
                                                    labels: metrics.methodSplit.labels,
                                                    datasets: [{ data: metrics.methodSplit.pct, backgroundColor: ["#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#64748b"] }],
                                                }}
                                                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }}
                                            />
                                        ) : (
                                            <p className="pt-20 text-center text-sm text-gray-400">No data</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                <h4 className="mb-4 text-sm font-bold">Profit vs activity (illustrative)</h4>
                                <div className="h-56">
                                    <Bar
                                        data={{
                                            labels: metrics.weekDailyRevenue.labels.slice(-5),
                                            datasets: [
                                                { label: "Revenue", data: metrics.weekDailyRevenue.values.slice(-5), backgroundColor: "#10b981", borderRadius: 4 },
                                                { label: "Orders", data: metrics.weekDailyRevenue.values.slice(-5).map((v) => Math.max(1, Math.round(v / 500))), backgroundColor: "#ef4444", borderRadius: 4 },
                                            ],
                                        }}
                                        options={{ responsive: true, maintainAspectRatio: false, scales: { x: { stacked: false }, y: { beginAtZero: true } } }}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {tab === "support" && (
                        <>
                            <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Support & complaints</h2>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">
                                        Broadcasts from <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">root/notifications</code>
                                        {metrics.ticketCount > 0 ? (
                                            <>
                                                {" "}
                                                · tickets <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">root/support_tickets</code>
                                            </>
                                        ) : null}
                                    </p>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        value={supportSearch}
                                        onChange={(e) => setSupportSearch(e.target.value)}
                                        className="w-full rounded-lg border py-2 pl-10 pr-4 dark:border-slate-700 dark:bg-slate-900 sm:w-64"
                                        placeholder="Search broadcasts…"
                                    />
                                </div>
                            </header>
                            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
                                {[
                                    { t: "Broadcasts (loaded)", v: metrics.notificationCount, sub: "root/notifications" },
                                    { t: "Support tickets", v: metrics.ticketCount, sub: "root/support_tickets" },
                                    { t: "Pending orders (today)", v: metrics.today.pending, sub: "root/order" },
                                    { t: "App users (tokens)", v: metrics.usersList.length, sub: "root/fcm_tokens" },
                                ].map((c, i) => (
                                    <div key={i} className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                        <p className="mb-1 text-sm text-gray-500 dark:text-slate-400">{c.t}</p>
                                        <h3 className="text-3xl font-bold tabular-nums">{c.v}</h3>
                                        <p className="mt-2 text-xs text-gray-400">{c.sub}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-4 text-sm font-bold dark:text-slate-200">Broadcast types</h4>
                                    <div className="mx-auto h-48 max-w-[200px]">
                                        {metrics.notificationTypeSplit.labels.length ? (
                                            <Doughnut
                                                data={{
                                                    labels: metrics.notificationTypeSplit.labels,
                                                    datasets: [
                                                        {
                                                            data: metrics.notificationTypeSplit.pct,
                                                            backgroundColor: ["#3b82f6", "#f97316", "#a855f7", "#22c55e", "#64748b", "#0ea5e9"],
                                                        },
                                                    ],
                                                }}
                                                options={{ responsive: true, maintainAspectRatio: false }}
                                            />
                                        ) : (
                                            <p className="pt-16 text-center text-sm text-gray-400">No broadcasts yet</p>
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-4 text-sm font-bold dark:text-slate-200">Broadcasts per day (7d)</h4>
                                    <div className="h-48">
                                        <Bar
                                            data={{
                                                labels: metrics.notificationVolumeWeek.labels,
                                                datasets: [
                                                    {
                                                        data: metrics.notificationVolumeWeek.values,
                                                        backgroundColor: "#6366f1",
                                                        borderRadius: 4,
                                                    },
                                                ],
                                            }}
                                            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                                        />
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-4 text-sm font-bold dark:text-slate-200">Delivered orders / day (7d)</h4>
                                    <div className="h-48">
                                        <Line
                                            data={{
                                                labels: metrics.resolutionTrend.labels,
                                                datasets: [
                                                    {
                                                        data: metrics.resolutionTrend.values,
                                                        borderColor: "#0ea5e9",
                                                        backgroundColor: "rgba(14,165,233,0.1)",
                                                        fill: true,
                                                        tension: 0.3,
                                                    },
                                                ],
                                            }}
                                            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
                                    <div className="border-b border-gray-100 bg-gray-50 p-4 dark:border-slate-800">
                                        <h4 className="font-bold text-gray-800 dark:text-slate-100">Recent broadcasts</h4>
                                    </div>
                                    <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-slate-800">
                                        {metrics.notificationsRecent.filter(
                                            (n) =>
                                                !supportSearch ||
                                                `${n.title} ${n.message}`.toLowerCase().includes(supportSearch.toLowerCase())
                                        ).length === 0 ? (
                                            <p className="p-6 text-center text-sm text-gray-500">No matching broadcasts</p>
                                        ) : (
                                            metrics.notificationsRecent
                                                .filter(
                                                    (n) =>
                                                        !supportSearch ||
                                                        `${n.title} ${n.message}`.toLowerCase().includes(supportSearch.toLowerCase())
                                                )
                                                .map((n) => (
                                                    <div key={n.id} className="p-4 text-sm">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <span className="font-semibold text-gray-800 dark:text-slate-100">{n.title}</span>
                                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                                                                {n.type}
                                                            </span>
                                                        </div>
                                                        {n.message ? <p className="mt-1 text-gray-600 dark:text-slate-400">{n.message}</p> : null}
                                                        <p className="mt-2 text-xs text-gray-400 tabular-nums">
                                                            {n.ts ? new Date(n.ts).toLocaleString() : "—"}
                                                        </p>
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                </div>
                                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
                                    <div className="border-b border-gray-100 bg-gray-50 p-4 dark:border-slate-800">
                                        <h4 className="font-bold text-gray-800 dark:text-slate-100">Support tickets</h4>
                                    </div>
                                    <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-slate-800">
                                        {metrics.supportTicketsRecent.length === 0 ? (
                                            <p className="p-6 text-center text-sm text-gray-500">
                                                No rows at <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">root/support_tickets</code>. Add
                                                tickets there to list them here.
                                            </p>
                                        ) : (
                                            metrics.supportTicketsRecent.map((t) => (
                                                <div key={t.id} className="flex items-start justify-between gap-3 p-4 text-sm">
                                                    <div>
                                                        <p className="font-semibold text-gray-800 dark:text-slate-100">{t.title}</p>
                                                        <p className="mt-1 text-xs text-gray-400 tabular-nums">
                                                            {t.ts ? new Date(t.ts).toLocaleString() : "—"}
                                                        </p>
                                                    </div>
                                                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                                                        {t.status}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Dashboard2;
