import React, { useState, useEffect, useRef } from "react";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import {
    Search,
    Package,
    Tag,
    TrendingUp,
    Zap,
    Award,
    Box,
    Edit2,
    Trash2,
    Save,
    RotateCcw,
    DollarSign,
    Percent,
    ShoppingBag,
    Layers,
    ListFilter
} from "lucide-react";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBUhKliTOKWKVW-TCTaYiRN9FXCjoxcsHg",
    authDomain: "dclub-32718.firebaseapp.com",
    projectId: "dclub-32718",
    storageBucket: "dclub-32718.firebasestorage.app",
    messagingSenderId: "401946278556",
    appId: "1:401946278556:web:efd912ca5196ce248b0b59",
    measurementId: "G-Q9RC6QRR7K",
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

interface Product {
    code: string;
    name: string;
    pic?: string;
    rating?: number | string;
    categoryCode: string;
}

interface StockVariant {
    key: string;
    mrp: number;
    offerPrice: string;
    pkg: string;
    quantity: number;
    tax: number;
    unitValue: number;
    priorityTrending: string;
    priorityExclusive: string;
    priorityBestseller: string;
    prioritySuggestionBox: string;
    prioritySuggestionSearch: string;
}

interface PriorityItem {
    rank: string;
    pCode: string;
    vKey: string;
    data: any;
    name: string;
    pic: string;
}

const StockEntry = () => {
    // State
    const [searchTerm, setSearchTerm] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);

    const [currentProductCode, setCurrentProductCode] = useState("");
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

    const [stockVariants, setStockVariants] = useState<StockVariant[]>([]);
    const [priorityItems, setPriorityItems] = useState<PriorityItem[]>([]);

    const [activeView, setActiveView] = useState<"stock" | "priority">("stock");

    // Form State
    const [formData, setFormData] = useState({
        code: "",
        key: "",
        pkg: "bottle",
        unitValue: "",
        quantity: "",
        mrp: "",
        offerPrice: "0.00",
        tax: "",
        trending: "0",
        exclusive: "0",
        bestSeller: "0",
        suggestionBox: "0",
        suggestionSearch: "0",
    });

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- Handlers ---

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    // Lookup Product details when code changes in form
    useEffect(() => {
        const lookupProduct = async () => {
            const code = formData.code.trim();
            if (!code || code.length < 2) {
                setCurrentProduct(null);
                return;
            }

            try {
                const prodRef = firebase.database().ref(`root/products/${code}`);
                const snapshot = await prodRef.once("value");
                if (snapshot.exists()) {
                    setCurrentProduct(snapshot.val());
                } else {
                    setCurrentProduct({ code, name: "Not Found", categoryCode: "" });
                }
            } catch (err) {
                console.error(err);
            }
        };

        const timer = setTimeout(lookupProduct, 500);
        return () => clearTimeout(timer);
    }, [formData.code]);

    // Search Logic (Global Search)
    const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTerm(term);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (!term) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        searchTimeoutRef.current = setTimeout(() => {
            (async () => {
                // 1. Exact match logic
                const exactSnap = await firebase.database().ref(`root/products/${term}`).once("value");
                if (exactSnap.exists()) {
                    loadStockView(term);
                    setSearchResults([]);
                    setShowSearchResults(false);
                    return;
                }

                // 2. Name search
                const nameSnap = await firebase.database().ref("root/products")
                    .orderByChild("name")
                    .startAt(term)
                    .endAt(term + "\uf8ff")
                    .limitToFirst(5)
                    .once("value");

                if (nameSnap.exists()) {
                    const results: Product[] = [];
                    nameSnap.forEach((child) => { results.push(child.val()); });
                    setSearchResults(results);
                    setShowSearchResults(true);
                } else {
                    setSearchResults([]);
                }
            })();
        }, 400);
    };

    const loadStockView = async (productCode: string) => {
        setActiveView("stock");
        setCurrentProductCode(productCode);
        setSearchTerm(productCode); // Update input
        setShowSearchResults(false);
        setPriorityFilter(""); // Reset priority filter

        // Load Stock
        try {
            const stockSnap = await firebase.database().ref(`root/stock/${productCode}`).once("value");
            const variants: StockVariant[] = [];
            if (stockSnap.exists()) {
                stockSnap.forEach(child => {
                    variants.push({ key: child.key as string, ...child.val() });
                });
            }
            setStockVariants(variants);

        } catch (err) {
            console.error(err);
            toast.error("Failed to load stock data");
        }
    };

    const loadPriorityView = async (priorityKey: string) => {
        if (!priorityKey) {
            setActiveView("stock");
            return;
        }

        setActiveView("priority");
        setPriorityItems([]); // clear

        try {
            const snapshot = await firebase.database().ref("root/stock").once("value");
            const rawItems: any[] = [];

            snapshot.forEach(prodSnap => {
                const pCode = prodSnap.key as string;
                prodSnap.forEach(varSnap => {
                    const data = varSnap.val();
                    const rank = data[priorityKey];
                    if (rank && rank !== '0') {
                        rawItems.push({ rank, pCode, vKey: varSnap.key, data });
                    }
                });
            });

            rawItems.sort((a, b) => a.rank.localeCompare(b.rank));

            // Enhance with Names
            const enriched = await Promise.all(rawItems.map(async (item) => {
                const pSnap = await firebase.database().ref(`root/products/${item.pCode}`).once("value");
                const pVal = pSnap.val();
                return {
                    ...item,
                    name: pVal ? pVal.name : "Unknown",
                    pic: pVal ? pVal.pic : ""
                };
            }));

            setPriorityItems(enriched);

        } catch (err) {
            console.error(err);
            toast.error("Failed to load rankings");
        }
    };

    useEffect(() => {
        if (priorityFilter) {
            loadPriorityView(priorityFilter);
        }
    }, [priorityFilter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { code, key, mrp, offerPrice, pkg, quantity, tax, unitValue,
            trending, exclusive, bestSeller, suggestionBox, suggestionSearch } = formData;

        if (!code || !key || !pkg || !mrp) {
            toast.error("Fill required fields");
            return;
        }

        try {
            const db = firebase.database();
            // Check product
            const pSnap = await db.ref(`root/products/${code}`).once("value");
            if (!pSnap.exists()) {
                toast.error(`Product ${code} not found`);
                return;
            }

            const offerFloat = parseFloat(offerPrice);
            const mrpFloat = parseFloat(mrp);
            if (offerFloat > mrpFloat) {
                toast.error("Offer Price cannot be > MRP");
                return;
            }

            await db.ref(`root/stock/${code}/${key}`).set({
                mrp: mrpFloat,
                offerPrice: parseFloat(offerPrice || "0").toFixed(2),
                pkg,
                quantity: parseInt(quantity || "0"),
                tax: parseInt(tax || "0"),
                unitValue: parseInt(unitValue || "0"),
                priorityTrending: trending,
                priorityExclusive: exclusive,
                priorityBestseller: bestSeller,
                prioritySuggestionBox: suggestionBox,
                prioritySuggestionSearch: suggestionSearch
            });

            toast.success(`Stock saved: ${code} (${key})`);

            if (activeView === "stock") {
                if (currentProductCode === code) loadStockView(code);
            } else {
                loadPriorityView(priorityFilter);
            }

            // clear part of form
            setFormData(prev => ({
                ...prev,
                key: "",
                mrp: "",
                offerPrice: "0.00",
                quantity: "",
                tax: "",
                unitValue: "",
                trending: "0",
                exclusive: "0",
                bestSeller: "0",
                suggestionBox: "0",
                suggestionSearch: "0"
            }));

        } catch (err) {
            console.error(err);
            toast.error("Save Error");
        }
    };

    const handleEdit = (pCode: string, vKey: string, data: any) => {
        setFormData({
            code: pCode,
            key: vKey,
            pkg: data.pkg,
            mrp: data.mrp,
            offerPrice: data.offerPrice,
            quantity: data.quantity,
            tax: data.tax,
            unitValue: data.unitValue,
            trending: data.priorityTrending || "0",
            exclusive: data.priorityExclusive || "0",
            bestSeller: data.priorityBestseller || "0",
            suggestionBox: data.prioritySuggestionBox || "0",
            suggestionSearch: data.prioritySuggestionSearch || "0"
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.info("Loaded for editing");
    };

    const handleDelete = async (pCode: string, vKey: string) => {
        if (confirm(`Delete variant ${vKey}?`)) {
            await firebase.database().ref(`root/stock/${pCode}/${vKey}`).remove();
            toast.success("Deleted");
            if (activeView === "stock") loadStockView(pCode);
            else loadPriorityView(priorityFilter);
        }
    };

    const resetForm = () => {
        setFormData({
            code: "",
            key: "",
            pkg: "bottle",
            mrp: "",
            offerPrice: "0.00",
            quantity: "",
            tax: "",
            unitValue: "",
            trending: "0",
            exclusive: "0",
            bestSeller: "0",
            suggestionBox: "0",
            suggestionSearch: "0"
        });
        setCurrentProduct(null);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* Header */}
                <div className="flex flax-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2">
                                <Package className="text-blue-600 dark:text-blue-400" />
                                Stock & Price Manager
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage inventory, pricing, and variant rankings</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg dark:shadow-slate-950/20 flex flex-col md:flex-row gap-4 items-start md:items-center transition-all hover:shadow-xl sticky top-20 z-40">
                    <div className="relative flex-[2] w-full group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search Product Name or Code..."
                            value={searchTerm}
                            onChange={handleSearchTermChange}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                        {showSearchResults && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                {searchResults.map(p => (
                                    <div
                                        key={p.code}
                                        onClick={() => loadStockView(p.code)}
                                        className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800 last:border-none"
                                    >
                                        <img src={p.pic || "https://via.placeholder.com/30"} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800" />
                                        <div>
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit">{p.code}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="relative flex-1 w-full md:w-auto min-w-[200px] group">
                        <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer appearance-none"
                        >
                            <option value="">View Rankings</option>
                            <option value="priorityTrending">Trending (T)</option>
                            <option value="priorityExclusive">Exclusive (E)</option>
                            <option value="priorityBestseller">Best Seller (B)</option>
                            <option value="prioritySuggestionBox">Sugg. Box (SB)</option>
                            <option value="prioritySuggestionSearch">Sugg. Search (SS)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

                    {/* Form Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <Edit2 className="text-blue-500" size={20} />
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add / Update Stock</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="code" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Product Code (Lookup)</label>
                                <input
                                    type="text"
                                    id="code"
                                    value={formData.code}
                                    onChange={handleInputChange}
                                    placeholder="Enter P001..."
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 font-mono transition-all"
                                />
                            </div>

                            {currentProduct && (
                                <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 animate-in fade-in zoom-in-95 duration-300">
                                    <img src={currentProduct.pic || "https://via.placeholder.com/60"} alt="Preview" className="w-16 h-16 rounded-lg object-cover bg-white" />
                                    <div>
                                        <div className="font-bold text-blue-700 dark:text-blue-300 text-lg">{currentProduct.name}</div>
                                        <div className="text-sm text-blue-600 dark:text-blue-400 font-mono bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded w-fit mt-1">{currentProduct.code}</div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Variant Key</label>
                                    <input type="text" id="key" value={formData.key} onChange={handleInputChange} placeholder="01" required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 font-mono font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Packaging</label>
                                    <select id="pkg" value={formData.pkg} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 cursor-pointer appearance-none">
                                        <option value="bottle">Bottle</option>
                                        <option value="cover">Cover</option>
                                        <option value="box">Box</option>
                                        <option value="jar">Jar</option>
                                        <option value="piece">Piece</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Unit Value (g/ml)</label>
                                    <div className="relative">
                                        <Layers size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="number" id="unitValue" value={formData.unitValue} onChange={handleInputChange} required min="1" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Qty In Stock</label>
                                    <div className="relative">
                                        <Box size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="number" id="quantity" value={formData.quantity} onChange={handleInputChange} required min="0" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">MRP</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="number" id="mrp" value={formData.mrp} onChange={handleInputChange} required min="0.01" step="0.01" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Offer Price</label>
                                    <div className="relative">
                                        <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="number" id="offerPrice" value={formData.offerPrice} onChange={handleInputChange} min="0" step="0.01" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tax %</label>
                                <div className="relative">
                                    <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="number" id="tax" value={formData.tax} onChange={handleInputChange} required min="0" max="100" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100" />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 block">Priority Rankings (Optional)</label>
                                <div className="grid grid-cols-5 gap-2">
                                    <div className="space-y-1 text-center">
                                        <label className="text-xs font-medium text-slate-500">Trend</label>
                                        <input type="text" id="trending" value={formData.trending} onChange={handleInputChange} className="w-full text-center py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-900 dark:text-slate-100 font-medium" />
                                    </div>
                                    <div className="space-y-1 text-center">
                                        <label className="text-xs font-medium text-slate-500">Excl.</label>
                                        <input type="text" id="exclusive" value={formData.exclusive} onChange={handleInputChange} className="w-full text-center py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-900 dark:text-slate-100 font-medium" />
                                    </div>
                                    <div className="space-y-1 text-center">
                                        <label className="text-xs font-medium text-slate-500">Best</label>
                                        <input type="text" id="bestSeller" value={formData.bestSeller} onChange={handleInputChange} className="w-full text-center py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-900 dark:text-slate-100 font-medium" />
                                    </div>
                                    <div className="space-y-1 text-center">
                                        <label className="text-xs font-medium text-slate-500">S.Box</label>
                                        <input type="text" id="suggestionBox" value={formData.suggestionBox} onChange={handleInputChange} className="w-full text-center py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-900 dark:text-slate-100 font-medium" />
                                    </div>
                                    <div className="space-y-1 text-center">
                                        <label className="text-xs font-medium text-slate-500">S.Srch</label>
                                        <input type="text" id="suggestionSearch" value={formData.suggestionSearch} onChange={handleInputChange} className="w-full text-center py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-900 dark:text-slate-100 font-medium" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                    <Save size={18} /> Save Variant
                                </button>
                                <button type="button" onClick={resetForm} className="px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-xl transition-all active:scale-[0.98]">
                                    <RotateCcw size={18} />
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* List Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 flex flex-col h-full min-h-[500px]">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                            {activeView === "stock" ? <ShoppingBag className="text-emerald-500" size={20} /> : <Award className="text-amber-500" size={20} />}
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {activeView === "stock" ? "Stock Variants" : "Priority Rankings"}
                            </h2>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 custom-scrollbar">
                            {activeView === "stock" && (
                                <>
                                    {stockVariants.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                            <Package size={48} className="mb-4 opacity-50 text-slate-300 dark:text-slate-700" />
                                            <p className="text-center">{currentProductCode ? "No stock variants found." : "Search for a product or\nselect a ranking."}</p>
                                        </div>
                                    ) : (
                                        stockVariants.map((v) => (
                                            <div key={v.key} className="group bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 transition-all hover:shadow-md">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                        <span className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded text-xs font-mono text-slate-500 dark:text-slate-400">#{v.key}</span>
                                                        <span className="text-sm">{v.unitValue} {v.pkg}</span>
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEdit(currentProductCode, v.key, v)} className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => handleDelete(currentProductCode, v.key)} className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400 mb-3">
                                                    <div>MRP: <span className="font-semibold text-slate-900 dark:text-slate-200">{v.mrp}</span></div>
                                                    <div>Qty: <span className="font-semibold text-slate-900 dark:text-slate-200">{v.quantity}</span></div>
                                                    <div>Offer: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{v.offerPrice}</span></div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {v.priorityTrending && v.priorityTrending !== '0' && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded flex items-center gap-1"><TrendingUp size={10} /> {v.priorityTrending}</span>}
                                                    {v.priorityExclusive && v.priorityExclusive !== '0' && <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded flex items-center gap-1"><Zap size={10} /> {v.priorityExclusive}</span>}
                                                    {v.priorityBestseller && v.priorityBestseller !== '0' && <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold rounded flex items-center gap-1"><Award size={10} /> {v.priorityBestseller}</span>}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </>
                            )}

                            {activeView === "priority" && (
                                <>
                                    {priorityItems.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                            <ListFilter size={48} className="mb-4 opacity-50 text-slate-300 dark:text-slate-700" />
                                            <p>No items ranked in this category.</p>
                                        </div>
                                    ) : (
                                        priorityItems.map((item) => (
                                            <div key={`${item.pCode}-${item.vKey}`} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 pr-4 transition-all">
                                                <div className="flex flex-col items-center justify-center min-w-[3rem]">
                                                    <div className="text-2xl font-black text-blue-500/20 md:text-blue-500/10">#</div>
                                                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400 -mt-4">{item.rank}</div>
                                                </div>

                                                <img src={item.pic || "https://via.placeholder.com/50"} className="w-12 h-12 rounded-lg object-cover bg-white" alt="prod" />

                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.name}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                        <span>{item.pCode}</span>
                                                        <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono text-slate-700 dark:text-slate-300">{item.vKey}</span>
                                                    </div>
                                                </div>

                                                <button onClick={() => handleEdit(item.pCode, item.vKey, item.data)} className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StockEntry;
