import React, { useState, useEffect } from "react";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import {
    Check,
    Search,
    Filter,
    Tag,
    Type,
    Save,
    ImageIcon,
    Database,
    ArrowRight,
    Loader2
} from 'lucide-react';
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { toast, Toaster } from "sonner";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCSH0uuKssWvkgvMOnWV_1u3zPO-1XNWPg",
    authDomain: "dailyclub11.firebaseapp.com",
    databaseURL:
        "https://dailyclub11-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dailyclub11",
    storageBucket: "dailyclub11.firebasestorage.app",
    messagingSenderId: "439424426599",
    appId: "1:439424426599:web:5ee8965e14990c57fdaac2",
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

interface Product {
    dbKey: string;
    name: string;
    labelName?: string;
    keywords?: string;
    pic?: string;
    categoryCode: string;
    isSaved?: boolean;
}

interface Category {
    code: string;
    name: string;
}

const KeywordEntry = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load Categories
        const db = firebase.database();
        const catRef = db.ref("root/category");

        catRef.once("value", (snapshot) => {
            if (snapshot.exists()) {
                const cats: Category[] = [];
                snapshot.forEach(child => {
                    cats.push({ code: child.key as string, name: child.val().name });
                });
                cats.sort((a, b) => a.name.localeCompare(b.name));
                setCategories(cats);
            }
        });
    }, []);

    const loadProducts = async (catCode: string) => {
        if (!catCode) {
            setProducts([]);
            setFilteredProducts([]);
            return;
        }

        setLoading(true);
        setProducts([]);
        setFilteredProducts([]);
        setSearchTerm("");
        setStatusFilter("all");

        try {
            const db = firebase.database();
            const prodRef = db.ref("root/products");
            const snapshot = await prodRef.orderByChild("categoryCode").equalTo(catCode).once("value");

            if (snapshot.exists()) {
                const prods: Product[] = [];
                snapshot.forEach(child => {
                    const val = child.val();
                    prods.push({
                        dbKey: child.key as string,
                        name: val.name,
                        labelName: val.labelName || "",
                        keywords: val.keywords || "",
                        pic: val.pic || "",
                        categoryCode: val.categoryCode,
                        isSaved: false
                    });
                });
                setProducts(prods);
                setFilteredProducts(prods);
            } else {
                setProducts([]);
                setFilteredProducts([]);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts(selectedCategory);
    }, [selectedCategory]);

    useEffect(() => {
        // Filter Logic
        let result = products;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(p =>
                (p.name && p.name.toLowerCase().includes(term)) ||
                (p.dbKey && p.dbKey.toLowerCase().includes(term))
            );
        }

        if (statusFilter === 'saved') {
            result = result.filter(p => p.isSaved);
        }

        setFilteredProducts(result);
    }, [searchTerm, statusFilter, products]);


    // Handler to update local state field inputs
    const handleFieldChange = (dbKey: string, field: keyof Product, value: string) => {
        setProducts(prev => prev.map(p => {
            if (p.dbKey === dbKey) {
                return { ...p, [field]: value };
            }
            return p;
        }));
    };

    const handleSave = async (product: Product) => {
        if (!product.name.trim()) {
            toast.error("Name cannot be empty");
            return;
        }

        try {
            await firebase.database().ref(`root/products/${product.dbKey}`).update({
                name: product.name,
                labelName: product.labelName,
                keywords: product.keywords
            });

            // Update saved status locally
            setProducts(prev => prev.map(p => {
                if (p.dbKey === product.dbKey) {
                    return { ...p, isSaved: true };
                }
                return p;
            }));

            toast.success("Saved successfully");

        } catch (err: any) {
            console.error(err);
            toast.error("Error: " + err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            <Navbar />
            <Toaster position="top-right" />

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 flex items-center gap-2">
                                <Database className="text-teal-500" />
                                Product Metadata
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Optimize product SEO keywords, labels and details</p>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 sticky top-20 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full appearance-none pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-500/20 outline-none transition-all cursor-pointer"
                            >
                                <option value="">-- Select Category --</option>
                                {categories.map(c => (
                                    <option key={c.code} value={c.code}>{c.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <Filter size={18} />
                            </div>
                        </div>
                    </div>

                    <div className="flex-[2] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search products by Name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Content Grid */}
                <div className="min-h-[500px]">
                    {!selectedCategory ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
                            <Tag size={48} className="mb-4 opacity-20" />
                            <p className="font-medium">Please select a category to begin editing</p>
                        </div>
                    ) : loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="animate-spin text-teal-500" size={40} />
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p className="font-medium">No products found matching your search</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                            {filteredProducts.map(p => (
                                <div key={p.dbKey} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-teal-200 dark:hover:border-teal-900 transition-all duration-300">
                                    {/* Card Header */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                                            {p.pic ? (
                                                <img
                                                    src={p.pic}
                                                    alt={p.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <ImageIcon size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate" title={p.name}>{p.name}</h3>
                                                <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">
                                                    #{p.dbKey}
                                                </span>
                                            </div>
                                            <div className="mt-2 relative">
                                                <Type size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={p.name}
                                                    onChange={(e) => handleFieldChange(p.dbKey, 'name', e.target.value)}
                                                    className="w-full pl-7 pr-2 py-1 bg-slate-50 dark:bg-slate-800 border-b border-transparent focus:border-teal-500 rounded text-sm text-slate-700 dark:text-slate-300 font-medium focus:bg-white dark:focus:bg-slate-950 outline-none transition-colors"
                                                    placeholder="Product Name"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Edit Fields */}
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Label Tag</label>
                                            <div className="relative">
                                                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" />
                                                <input
                                                    type="text"
                                                    value={p.labelName || ""}
                                                    placeholder="e.g. Best Seller"
                                                    onChange={(e) => handleFieldChange(p.dbKey, 'labelName', e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:border-teal-500 rounded-lg text-sm text-slate-900 dark:text-slate-100 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Search Keywords</label>
                                            <textarea
                                                value={p.keywords || ""}
                                                placeholder="comma, separated, tags..."
                                                onChange={(e) => handleFieldChange(p.dbKey, 'keywords', e.target.value)}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:border-teal-500 rounded-lg text-sm text-slate-900 dark:text-slate-100 outline-none transition-all resize-none min-h-[80px]"
                                            />
                                        </div>

                                        <div className="pt-2 flex justify-end">
                                            <button
                                                onClick={() => handleSave(p)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95 ${p.isSaved ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900'}`}
                                            >
                                                {p.isSaved ? <Check size={16} /> : <Save size={16} />}
                                                {p.isSaved ? 'Saved' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KeywordEntry;
