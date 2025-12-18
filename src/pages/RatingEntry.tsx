import React, { useEffect, useState } from "react";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import {
    Star,
    Search,
    Loader2,
    Save,
    Filter,
    PackageOpen,
    Minus,
    Plus
} from "lucide-react";

// Initialize Firebase if not already initialized
const firebaseConfig = {
    apiKey: "AIzaSyCSH0uuKssWvkgvMOnWV_1u3zPO-1XNWPg",
    authDomain: "dailyclub11.firebaseapp.com",
    databaseURL: "https://dailyclub11-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dailyclub11",
    storageBucket: "dailyclub11.firebasestorage.app",
    messagingSenderId: "439424426599",
    appId: "1:439424426599:web:5ee8965e14990c57fdaac2",
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

interface Category {
    code: string;
    name: string;
}

const RatingEntry = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState("Please select a category to begin rating.");

    // Load Categories on mount
    useEffect(() => {
        const database = firebase.database();
        const categoryRef = database.ref("root/category");

        categoryRef.once("value", (snapshot) => {
            if (!snapshot.exists()) return;

            const cats: Category[] = [];
            snapshot.forEach((child) => {
                const val = child.val();
                cats.push({ code: child.key as string, name: val.name });
            });

            // Sort alphabetically
            cats.sort((a, b) => a.name.localeCompare(b.name));
            setCategories(cats);
        });
    }, []);

    // Load Products when category changes
    useEffect(() => {
        if (!selectedCategory) {
            setAllProducts([]);
            setFilteredProducts([]);
            setLoadingMsg("Please select a category to begin rating.");
            return;
        }

        const fetchProducts = async () => {
            setLoading(true);
            setLoadingMsg("Loading products...");
            setAllProducts([]);
            setFilteredProducts([]);

            try {
                const database = firebase.database();
                const productRef = database.ref("root/products");
                const snapshot = await productRef
                    .orderByChild("categoryCode")
                    .equalTo(selectedCategory)
                    .once("value");

                if (snapshot.exists()) {
                    const prods: Product[] = [];
                    snapshot.forEach((child) => {
                        const val = child.val();
                        // Ensure rating exists
                        if (val.rating === undefined) val.rating = 0;
                        prods.push(val);
                    });
                    setAllProducts(prods);
                    setFilteredProducts(prods);
                } else {
                    setLoadingMsg("No products found in this category.");
                }
            } catch (error) {
                console.error(error);
                setLoadingMsg("Error loading data.");
                toast.error("Failed to load products.");
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [selectedCategory]);

    // Filter products when search term changes
    useEffect(() => {
        if (!allProducts.length) return;
        const term = searchTerm.toLowerCase();
        const filtered = allProducts.filter(
            (p) =>
                p.name.toLowerCase().includes(term) ||
                p.code.toLowerCase().includes(term)
        );
        setFilteredProducts(filtered);
    }, [searchTerm, allProducts]);

    const updateRating = async (product: Product, newRatingVal: number) => {
        // Validation
        if (isNaN(newRatingVal) || newRatingVal < 0 || newRatingVal > 5) {
            toast.error("Please enter a valid rating between 0.0 and 5.0");
            return;
        }

        const roundedRating = Math.round(newRatingVal * 10) / 10;

        try {
            const database = firebase.database();
            await database.ref(`root/products/${product.code}`).update({
                rating: roundedRating,
            });

            // Update local state to reflect change immediately
            const updateList = (list: Product[]) =>
                list.map((p) =>
                    p.code === product.code ? { ...p, rating: roundedRating } : p
                );

            setAllProducts((prev) => updateList(prev));
            setFilteredProducts((prev) => updateList(prev));

            toast.success(`Rating saved: ${roundedRating} ⭐`);
        } catch (error: any) {
            console.error("Save failed", error);
            toast.error("Failed to save rating: " + error.message);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 font-sans transition-colors duration-300">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* Header */}
                <div className="flex flax-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 flex items-center gap-2">
                                <Star className="text-amber-500 fill-amber-500" />
                                Rating Manager
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage product ratings and reviews</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg dark:shadow-slate-950/20 flex flex-col md:flex-row gap-4 items-center transition-all hover:shadow-xl">
                    <div className="relative flex-1 w-full md:w-auto group">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={18} />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all cursor-pointer appearance-none"
                        >
                            <option value="">Select Category</option>
                            {categories.map((cat) => (
                                <option key={cat.code} value={cat.code}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="relative flex-1 w-full md:w-auto group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 animate-pulse">
                        <Loader2 size={48} className="animate-spin mb-4 text-amber-500" />
                        <p>{loadingMsg}</p>
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map((product) => (
                            <ProductCard key={product.code} product={product} onSave={updateRating} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <PackageOpen size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium text-slate-600 dark:text-slate-300">
                            {selectedCategory ? (searchTerm ? "No matches found." : loadingMsg) : loadingMsg}
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

// Sub-component for individual card logic
const ProductCard = ({ product, onSave }: { product: Product, onSave: (p: Product, r: number) => void }) => {
    const [ratingInput, setRatingInput] = useState(product.rating ? String(product.rating) : "0.0");

    useEffect(() => {
        setRatingInput(product.rating ? String(product.rating) : "0.0");
    }, [product.rating]);

    const getStars = (r: number | string) => {
        const val = parseFloat(String(r));
        if (!val) return [0, 0, 0, 0, 0]; // 0 = empty, 1 = full, 0.5 = half

        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (val >= i) stars.push(1);
            else if (val >= i - 0.5) stars.push(0.5);
            else stars.push(0);
        }
        return stars;
    };

    const starData = getStars(product.rating || 0);

    const handleIncrement = () => {
        setRatingInput(prev => {
            const val = parseFloat(prev) || 0;
            return Math.min(5, val + 0.1).toFixed(1);
        });
    };

    const handleDecrement = () => {
        setRatingInput(prev => {
            const val = parseFloat(prev) || 0;
            return Math.max(0, val - 0.1).toFixed(1);
        });
    };

    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-amber-500/10 dark:hover:shadow-amber-900/20 transition-all duration-300 group flex flex-col">
            <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                    src={product.pic}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/300?text=No+Wait+Img')}
                    alt={product.name}
                />
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-lg">
                    {product.code}
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col gap-4">
                <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight mb-2 h-10">
                        {product.name}
                    </h3>

                    <div className="flex items-center gap-1 mb-2">
                        {starData.map((s, i) => (
                            <Star
                                key={i}
                                size={16}
                                className={`${s === 1 ? 'fill-amber-400 text-amber-400' : s === 0.5 ? 'fill-amber-400/50 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                            />
                        ))}
                        <span className="ml-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                            {product.rating ? Number(product.rating).toFixed(1) : "0.0"}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl p-1">
                        <button
                            onClick={handleDecrement}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-sm hover:text-amber-600 dark:hover:text-amber-400 active:scale-95 transition-all"
                        >
                            <Minus size={16} strokeWidth={3} />
                        </button>

                        <span className="font-bold text-lg text-slate-800 dark:text-slate-100 tabular-nums">
                            {ratingInput}
                        </span>

                        <button
                            onClick={handleIncrement}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-sm hover:text-amber-600 dark:hover:text-amber-400 active:scale-95 transition-all"
                        >
                            <Plus size={16} strokeWidth={3} />
                        </button>
                    </div>

                    <button
                        onClick={() => onSave(product, parseFloat(ratingInput))}
                        className="w-full bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-slate-900/10 dark:shadow-slate-950/30"
                    >
                        <Save size={18} /> Update Rating
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RatingEntry;
