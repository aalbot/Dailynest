import React, { useState, useEffect, useRef } from "react";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import "firebase/compat/storage";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { toast } from "sonner";
import {
    Tag,
    Box,
    Search,
    Upload,
    Save,
    RotateCcw,
    Edit2,
    Trash2,
    Check,
    Plus,
    Package,
    Image as ImageIcon,
    FileText,
    Ruler,
    Layers
} from "lucide-react";

// --- Types ---
interface Category {
    code: string;
    name: string;
    ratingKey: number;
    pic?: string;
}

interface Product {
    code: string;
    name: string;
    details: string;
    unit: string;
    pkg: string;
    pic?: string;
    categoryCode: string;
}

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyCSH0uuKssWvkgvMOnWV_1u3zPO-1XNWPg",
    authDomain: "dailyclub11.firebaseapp.com",
    databaseURL: "https://dailyclub11-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dailyclub11",
    storageBucket: "dailyclub11.firebasestorage.app",
    messagingSenderId: "439424426599",
    appId: "1:439424426599:web:366ea0de36341a00fdaac2",
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const ProductEntry = () => {
    // --- State ---
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [viewCategoryCode, setViewCategoryCode] = useState("");
    const [productSearchTerm, setProductSearchTerm] = useState("");

    // Category Form State
    const [catForm, setCatForm] = useState({
        code: "",
        name: "",
        ratingKey: "",
        pic: "", // Preview URL
    });
    const [catFile, setCatFile] = useState<File | null>(null);
    const [editingCategoryCode, setEditingCategoryCode] = useState<string | null>(null);

    // Product Form State
    const [prodForm, setProdForm] = useState({
        code: "",
        name: "",
        details: "",
        unit: "",
        pkg: "",
        categoryCode: "",
        pic: "", // Preview URL
    });
    const [prodFile, setProdFile] = useState<File | null>(null);
    const [editingProductCode, setEditingProductCode] = useState<string | null>(null);

    const fileInputRefCat = useRef<HTMLInputElement>(null);
    const fileInputRefProd = useRef<HTMLInputElement>(null);

    // --- Helpers ---
    const checkIfUnique = async (path: string) => {
        const snapshot = await firebase.database().ref(path).once("value");
        return !snapshot.exists();
    };

    const uploadFile = async (file: File, path: string) => {
        const storageRef = firebase.storage().ref(path);
        await storageRef.put(file);
        return await storageRef.getDownloadURL();
    };

    // --- Load Data ---
    useEffect(() => {
        const catRef = firebase.database().ref("root/category");
        const onValueChange = catRef.on("value", (snapshot) => {
            const cats: Category[] = [];
            snapshot.forEach((child) => {
                cats.push({ code: child.key as string, ...child.val() });
            });
            // Sort: Items with lower ratingKey first. No key goes to end.
            cats.sort((a, b) => (a.ratingKey || 9999) - (b.ratingKey || 9999));
            setCategories(cats);
        });
        return () => catRef.off("value", onValueChange);
    }, []);

    useEffect(() => {
        if (!viewCategoryCode) {
            setProducts([]);
            return;
        }
        const prodRef = firebase.database().ref("root/products");
        const query = prodRef.orderByChild("categoryCode").equalTo(viewCategoryCode);
        const onValueChange = query.on("value", (snapshot) => {
            const prods: Product[] = [];
            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    prods.push({ code: child.key as string, ...child.val() });
                });
            }
            setProducts(prods);
        });

        return () => prodRef.off("value", onValueChange);
    }, [viewCategoryCode]);

    // --- Category Handlers ---
    const handleCatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { code, name, ratingKey } = catForm;
        const isEditing = !!editingCategoryCode;
        const oldCode = editingCategoryCode;
        const keyChanged = isEditing && code !== oldCode;

        if (!code || !name || !ratingKey) {
            toast.error("Code, Name, and Rating Key are required.");
            return;
        }

        // File validation for new categories
        if (!isEditing && !catFile) {
            toast.error("Picture is required for new categories.");
            return;
        }

        // Uniqueness Check
        if ((!isEditing || keyChanged) && !(await checkIfUnique(`root/category/${code}`))) {
            toast.error(`Category Code ${code} already exists.`);
            return;
        }

        try {
            let picUrl = catForm.pic; // Default to existing if editing
            if (catFile) {
                const ext = catFile.name.split(".").pop();
                picUrl = await uploadFile(catFile, `root/categories/${code}.${ext}`);
            }

            const db = firebase.database();

            if (keyChanged && oldCode) {
                await db.ref(`root/category/${oldCode}`).remove();
            }

            await db.ref(`root/category/${code}`).set({
                name,
                ratingKey: parseInt(ratingKey),
                pic: picUrl
            });

            toast.success(`Category ${name} saved.`);
            resetCatForm();

        } catch (err: any) {
            console.error(err);
            toast.error(err.message);
        }
    };

    const handleEditCategory = (cat: Category) => {
        setEditingCategoryCode(cat.code);
        setCatForm({
            code: cat.code,
            name: cat.name,
            ratingKey: String(cat.ratingKey || ""),
            pic: cat.pic || ""
        });
        setCatFile(null);
        if (fileInputRefCat.current) fileInputRefCat.current.value = "";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteCategory = async (code: string) => {
        if (confirm(`Delete Category ${code}?`)) {
            await firebase.database().ref(`root/category/${code}`).remove();
            toast.success(`Deleted Category ${code}`);
        }
    };

    const resetCatForm = () => {
        setCatForm({ code: "", name: "", ratingKey: "", pic: "" });
        setCatFile(null);
        setEditingCategoryCode(null);
        if (fileInputRefCat.current) fileInputRefCat.current.value = "";
    };

    // --- Product Handlers ---
    const handleProdSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { code, name, unit, pkg, categoryCode } = prodForm;
        const details = prodForm.details || ""; // ensure details is not undefined
        const isEditing = !!editingProductCode;
        const oldCode = editingProductCode;
        const keyChanged = isEditing && code !== oldCode;

        if (!code || !name || !unit || !pkg || !categoryCode) {
            toast.error("All fields are required.");
            return;
        }

        if (code.length !== 10) {
            toast.error("Product Code must be exactly 10 characters.");
            return;
        }

        if (!isEditing && !prodFile) {
            toast.error("Picture required for new products.");
            return;
        }

        if ((!isEditing || keyChanged) && !(await checkIfUnique(`root/products/${code}`))) {
            toast.error(`Product Code ${code} already exists.`);
            return;
        }

        try {
            let picUrl = prodForm.pic;
            if (prodFile) {
                const ext = prodFile.name.split(".").pop();
                picUrl = await uploadFile(prodFile, `root/products/${code}.${ext}`);
            }

            const db = firebase.database();

            if (keyChanged && oldCode) {
                // Move stock if key changed
                const oldStock = await db.ref(`root/stock/${oldCode}`).once("value");
                if (oldStock.exists()) {
                    await db.ref(`root/stock/${code}`).set(oldStock.val());
                    await db.ref(`root/stock/${oldCode}`).remove();
                }
                await db.ref(`root/products/${oldCode}`).remove();
            }

            await db.ref(`root/products/${code}`).set({
                name, details, unit, pkg, categoryCode,
                pic: picUrl
            });

            toast.success(`Product ${name} saved.`);
            resetProdForm();

        } catch (err: any) {
            console.error(err);
            toast.error(err.message);
        }
    };

    const handleEditProduct = (prod: Product) => {
        setEditingProductCode(prod.code);
        setProdForm({
            code: prod.code,
            name: prod.name,
            details: prod.details || "",
            unit: prod.unit,
            pkg: prod.pkg,
            categoryCode: prod.categoryCode,
            pic: prod.pic || ""
        });
        setProdFile(null);
        if (fileInputRefProd.current) fileInputRefProd.current.value = "";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteProduct = async (code: string) => {
        if (confirm(`Delete Product ${code}? Also deletes stock data.`)) {
            await firebase.database().ref(`root/products/${code}`).remove();
            await firebase.database().ref(`root/stock/${code}`).remove(); // Cleanup stock
            toast.success("Product deleted.");
        }
    };

    const resetProdForm = () => {
        setProdForm({ code: "", name: "", details: "", unit: "", pkg: "", categoryCode: "", pic: "" });
        setProdFile(null);
        setEditingProductCode(null);
        if (fileInputRefProd.current) fileInputRefProd.current.value = "";
    };

    // --- Filtering ---
    const filteredProducts = products.filter(p => {
        if (!productSearchTerm) return true;
        const term = productSearchTerm.toLowerCase();
        return p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term);
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            <Navbar />

            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* Header */}
                <div className="flex flax-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 flex items-center gap-2">
                                <Box className="text-violet-600 dark:text-violet-400" />
                                Inventory Definition
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Define categories and product details</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* CATEGORY COLUMN (Left - 4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Category Form */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <Tag size={20} className="text-violet-500" />
                                {editingCategoryCode ? "Edit Category" : "Add Category"}
                            </h2>

                            <form onSubmit={handleCatSubmit} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Code</label>
                                    <input type="text" value={catForm.code} onChange={e => setCatForm({ ...catForm, code: e.target.value })} placeholder="001" required
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 font-mono" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Name</label>
                                    <input type="text" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="Category Name" required
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Rank Key</label>
                                    <input type="number" value={catForm.ratingKey} onChange={e => setCatForm({ ...catForm, ratingKey: e.target.value })} min="1" max="999" required placeholder="10"
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Image</label>
                                    <div className="flex gap-4 items-center">
                                        <div onClick={() => fileInputRefCat.current?.click()} className="flex-1 h-32 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-violet-500 hover:text-violet-500 transition-colors bg-slate-50/50 dark:bg-slate-800/50 relative overflow-hidden group">
                                            {catForm.pic ? (
                                                <img src={catForm.pic} alt="Preview" className="w-full h-full object-cover absolute inset-0 group-hover:opacity-50 transition-opacity" />
                                            ) : (
                                                <ImageIcon size={24} />
                                            )}
                                            {(catForm.pic) && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="text-white drop-shadow-md" /></div>}
                                            <input type="file" ref={fileInputRefCat} accept="image/*" className="hidden" onChange={e => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setCatFile(e.target.files[0]);
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => setCatForm({ ...catForm, pic: ev.target?.result as string });
                                                    reader.readAsDataURL(e.target.files[0]);
                                                }
                                            }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2">
                                        {editingCategoryCode ? <Check size={16} /> : <Plus size={16} />}
                                        {editingCategoryCode ? "Update" : "Add"}
                                    </button>
                                    {editingCategoryCode && (
                                        <button type="button" onClick={resetCatForm} className="px-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">
                                            <RotateCcw size={16} />
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* Category List */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 max-h-[500px] flex flex-col">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Existing Categories</h3>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                {categories.map(cat => (
                                    <div key={cat.code} className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                        <img src={cat.pic || "https://via.placeholder.com/40"} alt={cat.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{cat.name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{cat.code} (Sort: {cat.ratingKey})</div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditCategory(cat)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDeleteCategory(cat.code)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* PRODUCT COLUMN (Center/Right - 8 cols) */}
                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Product Form - Sticky on top of column on mobile, or just top left of this grid */}
                        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <Package size={24} className="text-violet-500" />
                                {editingProductCode ? "Edit Product" : "Add Product"}
                            </h2>

                            <form onSubmit={handleProdSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Product Code (10 Chars)</label>
                                        <input type="text" value={prodForm.code} onChange={e => setProdForm({ ...prodForm, code: e.target.value })} maxLength={10} placeholder="P001ABCDES" required
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 font-mono" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Product Name</label>
                                        <input type="text" value={prodForm.name} onChange={e => setProdForm({ ...prodForm, name: e.target.value })} placeholder="Coconut Oil" required
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Unit</label>
                                            <select value={prodForm.unit} onChange={e => setProdForm({ ...prodForm, unit: e.target.value })} required
                                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 cursor-pointer appearance-none">
                                                <option value="">Select Unit</option>
                                                <option value="g">g (Gram)</option>
                                                <option value="ml">ml (Milliliter)</option>
                                                <option value="pcs">Pcs (Pieces)</option>
                                                <option value="kg">kg (Kilogram)</option>
                                                <option value="l">l (Liter)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Packaging</label>
                                            <select value={prodForm.pkg} onChange={e => setProdForm({ ...prodForm, pkg: e.target.value })} required
                                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 cursor-pointer appearance-none">
                                                <option value="">Select Pkg</option>
                                                <option value="bottle">Bottle</option>
                                                <option value="cover">Cover</option>
                                                <option value="box">Box</option>
                                                <option value="jar">Jar</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Category</label>
                                        <select value={prodForm.categoryCode} onChange={e => setProdForm({ ...prodForm, categoryCode: e.target.value })} required
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 cursor-pointer appearance-none">
                                            <option value="">Select Category</option>
                                            {categories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4 flex flex-col">
                                    <div className="space-y-1 flex-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Details</label>
                                        <textarea value={prodForm.details} onChange={e => setProdForm({ ...prodForm, details: e.target.value })} placeholder="Product description..."
                                            className="w-full h-full min-h-[100px] px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 resize-none" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Image</label>
                                        <div onClick={() => fileInputRefProd.current?.click()} className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-violet-500 hover:text-violet-500 transition-colors bg-slate-50/50 dark:bg-slate-800/50 relative overflow-hidden group">
                                            {prodForm.pic ? (
                                                <img src={prodForm.pic} alt="Preview" className="w-full h-full object-cover absolute inset-0 group-hover:opacity-50 transition-opacity" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 font-medium text-xs">
                                                    <Upload size={20} />
                                                    <span>Click to Upload</span>
                                                </div>
                                            )}
                                            {(prodForm.pic) && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="text-white drop-shadow-md" /></div>}
                                            <input type="file" ref={fileInputRefProd} accept="image/*" className="hidden" onChange={e => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setProdFile(e.target.files[0]);
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => setProdForm({ ...prodForm, pic: ev.target?.result as string });
                                                    reader.readAsDataURL(e.target.files[0]);
                                                }
                                            }} />
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                            <Save size={18} /> {editingProductCode ? "Update Product" : "Save Product"}
                                        </button>
                                        {editingProductCode && (
                                            <button type="button" onClick={resetProdForm} className="px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-xl transition-all active:scale-[0.98]">
                                                <RotateCcw size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Product List */}
                        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col min-h-[600px]">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <Layers size={20} className="text-violet-500" />
                                    Product List
                                </h2>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative">
                                        <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <select value={viewCategoryCode} onChange={e => setViewCategoryCode(e.target.value)} className="pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 cursor-pointer appearance-none">
                                            <option value="">-- Load Category --</option>
                                            {categories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" placeholder="Search..." value={productSearchTerm} onChange={e => setProductSearchTerm(e.target.value)}
                                            className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 w-full sm:w-48" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 overflow-y-auto custom-scrollbar">
                                {!viewCategoryCode ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <Tag size={32} className="mb-3 opacity-30" />
                                        <p>Select a category to view products.</p>
                                    </div>
                                ) : filteredProducts.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <Search size={32} className="mb-3 opacity-30" />
                                        <p>No products found.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredProducts.map(p => (
                                            <div key={p.code} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex gap-3 group hover:shadow-md transition-all">
                                                <img src={p.pic || "https://via.placeholder.com/60"} alt={p.name} className="w-16 h-16 rounded-lg object-cover bg-slate-100 dark:bg-slate-800" />
                                                <div className="flex-1 min-w-0 flex flex-col">
                                                    <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{p.name}</div>
                                                    <div className="text-xs text-slate-500 font-mono mb-1">{p.code}</div>
                                                    <div className="mt-auto flex items-center justify-between">
                                                        <span className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">{p.unit} / {p.pkg}</span>
                                                        <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleEditProduct(p)} className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40"><Edit2 size={12} /></button>
                                                            <button onClick={() => handleDeleteProduct(p.code)} className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40"><Trash2 size={12} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProductEntry;
