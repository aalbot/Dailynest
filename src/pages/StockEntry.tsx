import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { firebase } from "@/lib/firebase";
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
    ListFilter,
    Menu,
    X,
} from "lucide-react";

type SidebarSection = "stock" | "priority";

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

type PrefillStockState = {
    productCode: string;
    variantKey: string;
    product: Product;
    variant: Record<string, unknown>;
};

const StockEntry = () => {
    const location = useLocation();
    const navigate = useNavigate();

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
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
    const formProductSuggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const formRef = useRef<HTMLDivElement>(null);

    const [formProductSuggestions, setFormProductSuggestions] = useState<Product[]>([]);
    const [formCodeFocused, setFormCodeFocused] = useState(false);

    // --- Handlers ---

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    /** Related products by code key prefix and name prefix (Firebase). */
    const fetchRelatedProducts = async (term: string, limit = 12): Promise<Product[]> => {
        const t = term.trim();
        if (!t) return [];
        const db = firebase.database();
        const map = new Map<string, Product>();

        const [codeSnap, nameSnap] = await Promise.all([
            db.ref("root/products").orderByKey().startAt(t).endAt(t + "\uf8ff").limitToFirst(limit).once("value"),
            db.ref("root/products").orderByChild("name").startAt(t).endAt(t + "\uf8ff").limitToFirst(limit).once("value"),
        ]);

        const pushVal = (code: string, val: any) => {
            if (!val || !code) return;
            map.set(code, { ...val, code });
        };

        if (codeSnap.exists()) {
            codeSnap.forEach((child) => pushVal(child.key as string, child.val()));
        }
        if (nameSnap.exists()) {
            nameSnap.forEach((child) => {
                const val = child.val();
                pushVal((val?.code as string) || (child.key as string), val);
            });
        }

        return Array.from(map.values());
    };

    const handleFormCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFormData({ ...formData, code: val });

        if (formProductSuggestTimeoutRef.current) clearTimeout(formProductSuggestTimeoutRef.current);

        if (!val.trim()) {
            setFormProductSuggestions([]);
            return;
        }

        formProductSuggestTimeoutRef.current = setTimeout(async () => {
            try {
                const list = await fetchRelatedProducts(val.trim());
                setFormProductSuggestions(list);
            } catch (err) {
                console.error(err);
                setFormProductSuggestions([]);
            }
        }, 350);
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
                    setCurrentProduct({ ...snapshot.val(), code });
                } else {
                    setCurrentProduct(null);
                }
            } catch (err) {
                console.error(err);
            }
        };

        const timer = setTimeout(lookupProduct, 500);
        return () => clearTimeout(timer);
    }, [formData.code]);

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

    const applyProductToStockForm = (p: Product) => {
        setFormData({
            code: p.code,
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
        setCurrentProduct(p);
        setFormProductSuggestions([]);
        void loadStockView(p.code);
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    useEffect(() => {
        const prefill = (location.state as { prefillStock?: PrefillStockState } | null)?.prefillStock;
        if (!prefill?.productCode || !prefill?.variantKey) return;

        const { productCode, variantKey, product, variant: raw } = prefill;
        const v = raw || {};

        setCurrentProduct(product);
        setFormProductSuggestions([]);
        setFormData({
            code: productCode,
            key: variantKey,
            pkg: typeof v.pkg === "string" && v.pkg ? v.pkg : "bottle",
            unitValue: v.unitValue != null && v.unitValue !== "" ? String(v.unitValue) : "",
            quantity: v.quantity != null && v.quantity !== "" ? String(v.quantity) : "",
            mrp: v.mrp != null && v.mrp !== "" ? String(v.mrp) : "",
            offerPrice: v.offerPrice != null && v.offerPrice !== "" ? String(v.offerPrice) : "0.00",
            tax: v.tax != null && v.tax !== "" ? String(v.tax) : "",
            trending: String(v.priorityTrending ?? "0"),
            exclusive: String(v.priorityExclusive ?? "0"),
            bestSeller: String(v.priorityBestseller ?? "0"),
            suggestionBox: String(v.prioritySuggestionBox ?? "0"),
            suggestionSearch: String(v.prioritySuggestionSearch ?? "0"),
        });

        void loadStockView(productCode);
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        toast.success("Product loaded from analytics");

        navigate(location.pathname, { replace: true, state: {} });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- apply once per navigation; loadStockView is stable for this use
    }, [location.state, location.pathname, navigate]);

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
            void (async () => {
                const exactSnap = await firebase.database().ref(`root/products/${term}`).once("value");
                if (exactSnap.exists()) {
                    const val = exactSnap.val() as Product;
                    applyProductToStockForm({ ...val, code: term });
                    setSearchResults([]);
                    setShowSearchResults(false);
                    return;
                }

                const results = await fetchRelatedProducts(term, 10);
                if (results.length > 0) {
                    setSearchResults(results);
                    setShowSearchResults(true);
                } else {
                    setSearchResults([]);
                    setShowSearchResults(false);
                }
            })();
        }, 400);
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
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        setFormProductSuggestions([]);
    };

    const NavItem = ({
        id,
        icon: Icon,
        label,
    }: {
        id: SidebarSection;
        icon: React.ElementType;
        label: string;
    }) => (
        <button
            type="button"
            onClick={() => {
                setActiveView(id);
                setSidebarOpen(false);
                if (id === "stock") setPriorityFilter("");
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all ${
                activeView === id
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
        >
            <Icon size={20} />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            <div className="fixed top-0 left-0 right-0 z-50">
                <Navbar />
            </div>

            <aside className="w-[240px] hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl pt-20 pb-4 px-3 z-40 fixed top-0 bottom-0 left-0">
                <div className="mb-4 px-1">
                    <BackButton />
                </div>
                <div className="px-2 mb-5">
                    <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Package size={18} className="text-blue-500 shrink-0" />
                        Stocks
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                        Inventory &amp; pricing
                    </p>
                </div>
                <nav className="space-y-1 px-1">
                    <NavItem id="stock" icon={ShoppingBag} label="Stock Variants" />
                    <NavItem id="priority" icon={Award} label="Priority Rankings" />
                </nav>
            </aside>

            <main className="flex-1 md:ml-[240px] pt-16 h-full min-h-0 flex flex-col overflow-hidden">
                <div className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <BackButton />
                        <span className="font-bold text-sm truncate">Stock &amp; Price Manager</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0"
                        aria-label="Open menu"
                    >
                        <Menu size={18} />
                    </button>
                </div>

                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <div
                            className="absolute left-0 top-0 bottom-0 w-[260px] bg-white dark:bg-slate-900 p-5 flex flex-col shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <span className="font-bold text-slate-800 dark:text-slate-100">Menu</span>
                                <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
                                    <X size={20} />
                                </button>
                            </div>
                            <nav className="space-y-1">
                                <NavItem id="stock" icon={ShoppingBag} label="Stock Variants" />
                                <NavItem id="priority" icon={Award} label="Priority Rankings" />
                            </nav>
                        </div>
                    </div>
                )}

                <div className="flex-1 min-h-0 p-3 md:p-4 overflow-hidden">
                    <div className="h-full grid grid-cols-1 grid-rows-2 lg:grid-rows-1 lg:grid-cols-12 gap-3 md:gap-4 min-h-0">
                        <div
                            ref={formRef}
                            className="lg:col-span-5 flex flex-col min-h-0 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
                        >
                            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                <Edit2 size={16} className="text-blue-500" />
                                Add / Update Stock
                            </h2>

                            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-3">
                                <div className="space-y-1 relative">
                                    <label htmlFor="code" className="text-[10px] font-semibold text-slate-500 uppercase">Product Code (Lookup)</label>
                                    <input
                                        type="text"
                                        id="code"
                                        value={formData.code}
                                        onChange={handleFormCodeChange}
                                        onFocus={() => setFormCodeFocused(true)}
                                        onBlur={() => {
                                            window.setTimeout(() => setFormCodeFocused(false), 200);
                                        }}
                                        placeholder="Search code or name…"
                                        required
                                        autoComplete="off"
                                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 font-mono text-sm"
                                    />
                                    {formCodeFocused && formProductSuggestions.length > 0 && (
                                        <div
                                            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 custom-scrollbar"
                                            role="listbox"
                                        >
                                            {formProductSuggestions.map((p) => (
                                                <button
                                                    key={p.code}
                                                    type="button"
                                                    role="option"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => applyProductToStockForm(p)}
                                                    className="flex w-full items-center gap-2 border-b border-slate-100 p-2 text-left last:border-none hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                                                >
                                                    <img
                                                        decoding="async"
                                                        loading="lazy"
                                                        src={p.pic || "https://via.placeholder.com/40"}
                                                        alt=""
                                                        className="h-9 w-9 shrink-0 rounded-lg object-cover bg-slate-100 dark:bg-slate-800"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                                                        <div className="mt-0.5 font-mono text-[10px] text-slate-500">{p.code}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {currentProduct && (
                                    <div className="flex items-center gap-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 shrink-0">
                                        <img decoding="async" loading="lazy" src={currentProduct.pic || "https://via.placeholder.com/60"} alt="Preview" className="w-12 h-12 rounded-lg object-cover bg-white shrink-0 aspect-square" />
                                        <div className="min-w-0">
                                            <div className="font-semibold text-sm text-blue-700 dark:text-blue-300 truncate">{currentProduct.name}</div>
                                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono mt-0.5">{currentProduct.code}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Variant Key</label>
                                    <input type="text" id="key" value={formData.key} onChange={handleInputChange} placeholder="01" required className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 font-mono font-bold text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Packaging</label>
                                    <select id="pkg" value={formData.pkg} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 cursor-pointer appearance-none text-sm">
                                        <option value="bottle">Bottle</option>
                                        <option value="cover">Cover</option>
                                        <option value="box">Box</option>
                                        <option value="jar">Jar</option>
                                        <option value="piece">Piece</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Unit Value (g/ml)</label>
                                    <div className="relative">
                                        <Layers size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="number" id="unitValue" value={formData.unitValue} onChange={handleInputChange} required min="1" className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Qty In Stock</label>
                                    <div className="relative">
                                        <Box size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="number" id="quantity" value={formData.quantity} onChange={handleInputChange} required min="0" className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-500 uppercase">MRP</label>
                                    <div className="relative">
                                        <DollarSign size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="number" id="mrp" value={formData.mrp} onChange={handleInputChange} required min="0.01" step="0.01" className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Offer Price</label>
                                    <div className="relative">
                                        <Tag size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="number" id="offerPrice" value={formData.offerPrice} onChange={handleInputChange} min="0" step="0.01" className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Tax %</label>
                                    <div className="relative">
                                        <Percent size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="number" id="tax" value={formData.tax} onChange={handleInputChange} required min="0" max="100" className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 text-sm" />
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
                                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Priority Rankings (Optional)</label>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        <div className="space-y-0.5 text-center">
                                            <label className="text-[9px] font-medium text-slate-500">Trend</label>
                                            <input type="text" id="trending" value={formData.trending} onChange={handleInputChange} className="w-full text-center py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs text-slate-900 dark:text-slate-100 font-medium" />
                                        </div>
                                        <div className="space-y-0.5 text-center">
                                            <label className="text-[9px] font-medium text-slate-500">Excl.</label>
                                            <input type="text" id="exclusive" value={formData.exclusive} onChange={handleInputChange} className="w-full text-center py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs text-slate-900 dark:text-slate-100 font-medium" />
                                        </div>
                                        <div className="space-y-0.5 text-center">
                                            <label className="text-[9px] font-medium text-slate-500">Best</label>
                                            <input type="text" id="bestSeller" value={formData.bestSeller} onChange={handleInputChange} className="w-full text-center py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs text-slate-900 dark:text-slate-100 font-medium" />
                                        </div>
                                        <div className="space-y-0.5 text-center">
                                            <label className="text-[9px] font-medium text-slate-500">S.Box</label>
                                            <input type="text" id="suggestionBox" value={formData.suggestionBox} onChange={handleInputChange} className="w-full text-center py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs text-slate-900 dark:text-slate-100 font-medium" />
                                        </div>
                                        <div className="space-y-0.5 text-center">
                                            <label className="text-[9px] font-medium text-slate-500">S.Srch</label>
                                            <input type="text" id="suggestionSearch" value={formData.suggestionSearch} onChange={handleInputChange} className="w-full text-center py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs text-slate-900 dark:text-slate-100 font-medium" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-1 shrink-0">
                                    <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 rounded-lg shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm">
                                        <Save size={16} /> Save Variant
                                    </button>
                                    <button type="button" onClick={resetForm} className="px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-all">
                                        <RotateCcw size={16} />
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="lg:col-span-7 flex flex-col min-h-0 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="flex flex-col gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                <div className="flex items-center gap-2">
                                    {activeView === "stock" ? <ShoppingBag className="text-emerald-500" size={16} /> : <Award className="text-amber-500" size={16} />}
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                        {activeView === "stock" ? "Stock Variants" : "Priority Rankings"}
                                    </h2>
                                </div>
                                {activeView === "stock" ? (
                                    <div className="relative group">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Search product name or code..."
                                            value={searchTerm}
                                            onChange={handleSearchTermChange}
                                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 outline-none"
                                        />
                                        {showSearchResults && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                                {searchResults.map((p) => (
                                                    <div
                                                        key={p.code}
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => applyProductToStockForm(p)}
                                                        className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-none"
                                                    >
                                                        <img decoding="async" loading="lazy" src={p.pic || "https://via.placeholder.com/30"} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-semibold truncate">{p.name}</div>
                                                            <div className="text-[10px] font-mono text-slate-500">{p.code}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <ListFilter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <select
                                            value={priorityFilter}
                                            onChange={(e) => setPriorityFilter(e.target.value)}
                                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 cursor-pointer appearance-none"
                                        >
                                            <option value="">Select ranking category...</option>
                                            <option value="priorityTrending">Trending (T)</option>
                                            <option value="priorityExclusive">Exclusive (E)</option>
                                            <option value="priorityBestseller">Best Seller (B)</option>
                                            <option value="prioritySuggestionBox">Sugg. Box (SB)</option>
                                            <option value="prioritySuggestionSearch">Sugg. Search (SS)</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 bg-slate-50/80 dark:bg-slate-950/50 space-y-2">
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
                                        <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-slate-400">
                                            <ListFilter size={32} className="mb-2 opacity-30" />
                                            <p className="text-sm text-center">
                                                {priorityFilter ? "No items ranked in this category." : "Select a ranking category above."}
                                            </p>
                                        </div>
                                    ) : (
                                        priorityItems.map((item) => (
                                            <div
                                                key={`${item.pCode}-${item.vKey}`}
                                                className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 hover:shadow-md transition-all"
                                            >
                                                <div className="flex flex-col items-center justify-center min-w-[2.5rem] shrink-0">
                                                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{item.rank}</div>
                                                </div>
                                                <img
                                                    decoding="async"
                                                    loading="lazy"
                                                    src={item.pic || "https://via.placeholder.com/50"}
                                                    className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0 aspect-square"
                                                    alt="prod"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{item.name}</div>
                                                    <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                        <span className="font-mono">{item.pCode}</span>
                                                        <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">{item.vKey}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(item.pCode, item.vKey, item.data)}
                                                    className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </>
                            )}

                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StockEntry;
