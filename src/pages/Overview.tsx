import React, { useState, useEffect, useMemo, Component, ReactNode } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import 'firebase/compat/auth';
import {
    Package, TrendingUp, Star, Crown, Wallet,
    LayoutDashboard, Loader2, AlertCircle,
    ChevronRight, Database, Download, Tag
} from 'lucide-react';
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";

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

// --- Error Boundary ---
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
    constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
    componentDidCatch(error: any, errorInfo: any) { console.error("React Crash:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                    <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>Something went wrong</h1>
                    <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Reload Page</button>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- Components ---

const CellRenderer = ({ value, column }: { value: any, column: string }) => {
    if (value === null || value === undefined) return <span className="text-slate-300 dark:text-slate-600">-</span>;

    let parsedValue = value;
    if (typeof value === 'string' && value.trim().startsWith('{')) {
        try { parsedValue = JSON.parse(value); } catch (e) { }
    }

    if (typeof parsedValue === 'object' && parsedValue !== null) {
        if (parsedValue.mrp || parsedValue.offerPrice || parsedValue.price) {
            return (
                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex flex-col gap-1 min-w-[140px]">
                    {parsedValue.mrp && <div className="line-through text-slate-400">MRP: {parsedValue.mrp}</div>}
                    {parsedValue.offerPrice && <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1"><Tag size={10} />{parsedValue.offerPrice}</div>}
                    {parsedValue.stock && <div className="border-t border-slate-200 dark:border-slate-700 mt-1 pt-1 text-slate-500">Stock: {parsedValue.stock}</div>}
                </div>
            );
        }
        return <span className="text-xs font-mono text-slate-400 block max-w-[200px] truncate">{JSON.stringify(parsedValue)}</span>;
    }

    const colName = String(column).toLowerCase();
    const isImage = colName.includes('pic') || colName.includes('image') || colName.includes('img');
    const looksLikeUrl = typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:image'));

    if (isImage && looksLikeUrl) {
        return (
            <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                <img src={value} alt="img" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
        );
    }

    if (typeof value === 'boolean') {
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${value ?
                'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'}`}>
                {value ? 'Yes' : 'No'}
            </span>
        );
    }

    return <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{String(value)}</span>;
};

const DataTable = ({ data, title, icon: Icon, productLookup, stockLookup }: any) => {
    const [searchTerm, setSearchTerm] = useState('');

    const tableData = useMemo(() => {
        if (!data) return [];
        let processed: any[] = [];
        try {
            if (Array.isArray(data)) {
                processed = data.map((item, index) => ({ id: index, ...item }));
            } else {
                processed = Object.entries(data).map(([key, value]: [string, any]) => {
                    if (typeof value === 'object' && value !== null) return { id: key, ...value };
                    return { id: key, value };
                });
            }

            if (productLookup) {
                processed = processed.map(item => {
                    const foundProd = productLookup[item.id];
                    if (foundProd) {
                        return { 'Product Name': foundProd.name || 'Unknown', ...item };
                    }
                    return item;
                });
            }
        } catch (e) { console.error("Data process error", e); }
        return processed;
    }, [data, productLookup]);

    const columns = useMemo(() => {
        if (tableData.length === 0) return [];
        const keys = new Set<string>();
        tableData.forEach(item => Object.keys(item).forEach(k => keys.add(k)));
        return Array.from(keys).sort((a, b) => {
            const priority = ['pic', 'image', 'id', 'Product Name', 'name', 'code'];
            const aP = priority.indexOf(a), bP = priority.indexOf(b);
            if (aP !== -1 && bP !== -1) return aP - bP;
            if (aP !== -1) return -1;
            if (bP !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [tableData]);

    const filteredData = useMemo(() => {
        if (!searchTerm) return tableData;
        const low = searchTerm.toLowerCase();
        return tableData.filter(item => Object.values(item).some(v => String(v).toLowerCase().includes(low)));
    }, [tableData, searchTerm]);

    const handlePDF = () => {
        try {
            const doc = new jsPDF({ orientation: 'landscape' });
            doc.setFontSize(26);
            doc.setTextColor(79, 70, 229);
            doc.setFont("helvetica", "bold");
            doc.text("DailyClub", 14, 20);

            doc.setFontSize(16);
            doc.setTextColor(40, 40, 40);
            doc.setFont("helvetica", "normal");
            doc.text(`${title} Report`, 14, 29);

            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);

            const tableHeaders = [['ID', 'NAME', 'PRICE', 'UNIT VALUE']];
            const tableRows = filteredData.map(item => {
                const id = item.id || '-';
                let name = item['Product Name'] || item.name;
                if (!name && item.value && typeof item.value === 'object') name = (item.value as any).name;
                if (!name && stockLookup && stockLookup[id] && stockLookup[id].name) name = stockLookup[id].name;

                let variants = '';
                let unitValue = '';

                if (stockLookup && stockLookup[id]) {
                    variants = stockLookup[id].variants || stockLookup[id].variant || '-';
                    unitValue = stockLookup[id].unitvalue || stockLookup[id].unitValue || '-';
                } else if (item.variants || item.unitvalue) {
                    variants = item.variants || '-';
                    unitValue = item.unitvalue || item.unitValue || '-';
                }

                if (typeof variants === 'string' && variants.startsWith('{')) variants = 'JSON Data';

                return [
                    id,
                    name || '-',
                    variants,
                    unitValue
                ];
            });

            autoTable(doc, {
                head: tableHeaders,
                body: tableRows,
                startY: 45,
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 4, textColor: [50, 50, 50], lineColor: [230, 230, 230], lineWidth: 0.1 },
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 100 }, 2: { cellWidth: 60 }, 3: { halign: 'center', cellWidth: 40 } }
            });
            doc.save(`dailyclub_${title.toLowerCase()}_report.pdf`);
        } catch (e: any) {
            console.error(e);
            alert("PDF Error: " + e.message);
        }
    };

    if (!data) return <div className="p-10 text-center text-slate-400">No data found</div>;

    return (
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                        <Icon size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 m-0">{title}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 m-0">{filteredData.length} entries</p>
                    </div>
                </div>
                <div className="flex gap-2.5 flex-wrap w-full md:w-auto">
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-w-[220px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all flex-1 md:flex-none" />
                    <button onClick={handlePDF} className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-95 border border-indigo-500/20">
                        <Download size={18} /> <span>Download PDF</span>
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-auto bg-transparent custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md">
                        <tr>
                            {columns.map(c => (
                                <th key={c} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((row, i) => (
                            <tr key={i} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors group">
                                {columns.map(c => (
                                    <td key={c} className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/50 text-sm align-middle group-last:border-none">
                                        <CellRenderer value={row[c]} column={c} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const Sidebar = ({ activeTab, setActiveTab, menuItems }: any) => (
    <div className="w-[260px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col h-full z-50 transition-transform hidden md:flex pt-6">
        <div className="px-6 mb-2">
            <BackButton />
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1.5 overflow-y-auto">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest px-4 py-2 mb-2">Main Menu</div>
            {menuItems.map((item: any) => (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === item.id ?
                        'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm' :
                        'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <item.icon size={20} className={`transition-colors ${activeTab === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                        {item.label}
                    </div>
                    {activeTab === item.id && <ChevronRight size={16} className="text-indigo-600/50 dark:text-indigo-400/50" />}
                </button>
            ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-500/25 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform">
                <div className="absolute top-0 right-0 p-3 opacity-20 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform"><Crown size={48} /></div>
                <h4 className="font-bold text-sm relative z-10">Premium Plan</h4>
                <p className="text-xs text-indigo-100 mt-1 relative z-10 opacity-90">Manage subscriptions & limits</p>
            </div>
        </div>
    </div>
);

const Overview = () => {
    const [activeTab, setActiveTab] = useState('products');
    const [data, setData] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [authReady, setAuthReady] = useState(false);
    const [productLookup, setProductLookup] = useState<any>({});
    const [stockLookup, setStockLookup] = useState<any>({});

    const menuItems = [
        { id: 'products', label: 'Products', icon: Package, path: 'root/products' },
        { id: 'stock', label: 'Stock Inventory', icon: TrendingUp, path: 'root/stock' },
        { id: 'rating', label: 'Reviews', icon: Star, path: 'root/rating' },
        { id: 'premium', label: 'Premium Users', icon: Crown, path: 'root/premium' },
        { id: 'wallet', label: 'Wallet', icon: Wallet, path: 'root/wallet' },
    ];

    useEffect(() => {
        const auth = firebase.auth();
        const unsub = auth.onAuthStateChanged(u => {
            if (!u) auth.signInAnonymously().catch(console.error);
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    // 1. Fetch Product Names
    useEffect(() => {
        if (!authReady) return;
        const db = firebase.database();
        const ref = db.ref('root/products');
        const onVal = ref.on('value', snap => {
            const val = snap.val();
            if (val) setProductLookup(val);
        });
        return () => ref.off('value', onVal);
    }, [authReady]);

    // 2. Fetch Stock Data for PDF
    useEffect(() => {
        if (!authReady) return;
        const db = firebase.database();
        const ref = db.ref('root/stock');
        const onVal = ref.on('value', snap => {
            const val = snap.val();
            if (val) setStockLookup(val);
        });
        return () => ref.off('value', onVal);
    }, [authReady]);

    useEffect(() => {
        if (!authReady) return;
        setLoading(true);
        const item = menuItems.find(i => i.id === activeTab);
        if (!item) return;

        const db = firebase.database();
        const ref = db.ref(item.path);

        const onVal = ref.on('value', snap => {
            setData(snap.val());
            setLoading(false);
        }, err => {
            console.error(err);
            setLoading(false);
        });
        return () => ref.off('value', onVal);
    }, [activeTab, authReady]);

    const CurrentIcon = menuItems.find(i => i.id === activeTab)?.icon || LayoutDashboard;

    // Mobile Nav
    const MobileNav = () => (
        <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-2 pb-safe flex justify-around md:hidden z-50 safe-area-bottom">
            {menuItems.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === item.id ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400'}`}>
                    <item.icon size={20} />
                    <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
                </button>
            ))}
        </div>
    );

    if (!authReady) return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <Loader2 className="animate-spin text-indigo-500" size={40} />
        </div>
    );

    return (
        <ErrorBoundary>
            <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300">
                <div className="fixed top-0 left-0 right-0 z-[100]">
                    <Navbar />
                </div>

                <div className="flex flex-1 overflow-hidden pt-16">
                    <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} menuItems={menuItems} />

                    <div className="flex-1 flex flex-col h-full overflow-hidden relative">

                        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-hidden flex flex-col gap-4 relative z-0">
                            {/* Header Row */}
                            <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 px-1">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-400 capitalize">
                                        {menuItems.find(i => i.id === activeTab)?.label}
                                    </h1>
                                </div>
                                <div className="text-xs font-mono text-slate-400 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 hidden sm:block">
                                    Sync: Live
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-indigo-500" size={48} />
                                </div>
                            ) : (
                                <DataTable
                                    data={data}
                                    title={menuItems.find(i => i.id === activeTab)?.label}
                                    icon={CurrentIcon}
                                    productLookup={productLookup}
                                    stockLookup={stockLookup}
                                />
                            )}
                        </main>

                        <MobileNav />
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default Overview;
