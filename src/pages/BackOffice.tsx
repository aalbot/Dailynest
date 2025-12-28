import React, { useState, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import 'firebase/compat/storage';
import {
    Menu, LayoutGrid, Package, Box, Edit2,
    Trash2, UploadCloud, Search, Plus, CheckCircle,
    AlertCircle, Image as ImageIcon, Check, Loader2, ArrowLeft,
    X, ShoppingBag, Database
} from 'lucide-react';
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { toast, Toaster } from "sonner";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBUhKliTOKWKVW-TCTaYiRN9FXCjoxcsHg",
    authDomain: "dclub-32718.firebaseapp.com",
    projectId: "dclub-32718",
    storageBucket: "dclub-32718.firebasestorage.app",
    messagingSenderId: "401946278556",
    appId: "1:401946278556:web:efd912ca5196ce248b0b59",
    measurementId: "G-Q9RC6QRR7K"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Types
interface Category {
    code: string;
    name: string;
    ratingKey: number;
    pic?: string;
}

interface Product {
    code: string;
    name: string;
    color?: string;
    categoryCode: string; // Foreign Key
    stock: number;
    details?: string;
    pic?: string;
}

interface StockVariant {
    vKey: string;
    size: 'small' | 'premium' | 'none';
    qty: number;
    mrp: number;
    offerPrice?: number;
    tax?: number;
    images?: string[];
    trending?: number;
    exclusive?: number;
    bestseller?: number;
    specialOffer?: number;
    search?: number;
    suggestion?: number;
}

type Tab = 'categories' | 'products' | 'stock';

const BackOffice = () => {
    // --- State ---
    const [activeTab, setActiveTab] = useState<Tab>('categories');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Categories
    const [categories, setCategories] = useState<Category[]>([]);
    const [editingCatKey, setEditingCatKey] = useState<string | null>(null);
    // Cat Form
    const [cCode, setCCode] = useState('');
    const [cName, setCName] = useState('');
    const [cRatingKey, setCRatingKey] = useState(1);
    const [cPicPreview, setCPicPreview] = useState('');
    const [cFile, setCFile] = useState<File | null>(null);

    // Products
    const [products, setProducts] = useState<Product[]>([]);
    const [viewCat, setViewCat] = useState(''); // Filter in list
    const [prodSearch, setProdSearch] = useState(''); // Filter input
    const [editingProdKey, setEditingProdKey] = useState<string | null>(null);
    // Prod Form
    const [pCode, setPCode] = useState('');
    const [pName, setPName] = useState('');
    const [pColor, setPColor] = useState('');
    const [pCategoryCode, setPCategoryCode] = useState('');
    const [pStock, setPStock] = useState(0);
    const [pDetails, setPDetails] = useState('');
    const [pPicPreview, setPPicPreview] = useState('');
    const [pFile, setPFile] = useState<File | null>(null);

    // Stock
    const [stockSearchQuery, setStockSearchQuery] = useState('');
    const [stockSearchResults, setStockSearchResults] = useState<Product[]>([]);
    const [activeStockProduct, setActiveStockProduct] = useState<Product | null>(null);
    const [stockFilter, setStockFilter] = useState('all');


    // --- Load Data ---
    useEffect(() => {
        const db = firebase.database();

        // Cats
        db.ref('root/category').on('value', snap => {
            const data = snap.val();
            const arr: Category[] = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    arr.push({ code: key, ...data[key] });
                });
            }
            setCategories(arr.sort((a, b) => a.name.localeCompare(b.name)));
        });

        // Prods
        db.ref('root/products').on('value', snap => {
            const data = snap.val();
            const arr: Product[] = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    arr.push({ code: key, ...data[key] });
                });
            }
            setProducts(arr.sort((a, b) => a.name.localeCompare(b.name)));
        });


        return () => {
            db.ref('root/category').off();
            db.ref('root/products').off();

        }
    }, []);

    // --- Handlers: Categories ---
    const handleCatEdit = (cat: Category) => {
        setEditingCatKey(cat.code);
        setCCode(cat.code);
        setCName(cat.name);
        setCRatingKey(cat.ratingKey);
        setCPicPreview(cat.pic || '');
        setCFile(null);
    };

    const resetCatForm = () => {
        setEditingCatKey(null);
        setCCode('');
        setCName('');
        setCRatingKey(1);
        setCPicPreview('');
        setCFile(null);
    };

    const saveCategory = async () => {
        if (!cCode || !cName) return toast.error("Missing Code or Name");

        try {
            let picUrl = cPicPreview;
            if (cFile) {
                const storageRef = firebase.storage().ref();
                const fileRef = storageRef.child(`category/${cCode}`);
                await fileRef.put(cFile);
                picUrl = await fileRef.getDownloadURL();
            }

            await firebase.database().ref(`root/category/${cCode}`).update({
                name: cName,
                ratingKey: cRatingKey,
                pic: picUrl
            });

            toast.success("Category Saved!");
            resetCatForm();
        } catch (e: any) {
            console.error(e);
            toast.error(e.message);
        }
    };

    const deleteCategory = async (code: string) => {
        if (!confirm('Delete this Category?')) return;
        try {
            await firebase.database().ref(`root/category/${code}`).remove();
            toast.success("Category Deleted");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    // --- Handlers: Products ---
    const handleProdEdit = (prod: Product) => {
        setEditingProdKey(prod.code);
        setPCode(prod.code);
        setPName(prod.name);
        setPColor(prod.color || '');
        setPCategoryCode(prod.categoryCode);
        setPStock(prod.stock);
        setPDetails(prod.details || '');
        setPPicPreview(prod.pic || '');
        setPFile(null);
    };

    const resetProdForm = () => {
        setEditingProdKey(null);
        setPCode('');
        setPName('');
        setPColor('');
        setPCategoryCode('');
        setPStock(0);
        setPDetails('');
        setPPicPreview('');
        setPFile(null);
    };

    const saveProduct = async () => {
        if (!pCode || !pName || !pCategoryCode) return toast.error("Missing mandatory fields");

        try {
            let picUrl = pPicPreview;
            if (pFile) {
                const storageRef = firebase.storage().ref();
                const fileRef = storageRef.child(`products/${pCode}`);
                await fileRef.put(pFile);
                picUrl = await fileRef.getDownloadURL();
            }

            await firebase.database().ref(`root/products/${pCode}`).update({
                name: pName,
                color: pColor,
                categoryCode: pCategoryCode,
                stock: Number(pStock),
                details: pDetails,
                pic: picUrl
            });

            toast.success("Product Saved!");
            resetProdForm();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const deleteProduct = async (code: string) => {
        if (!confirm('Delete Product?')) return;
        try {
            await firebase.database().ref(`root/products/${code}`).remove();
            toast.success("Product Deleted");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    // --- Render Helpers ---
    const filteredProducts = products.filter(p => {
        const matchesCat = viewCat ? p.categoryCode === viewCat : true;
        const matchesSearch = prodSearch ? (p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.code.toLowerCase().includes(prodSearch.toLowerCase())) : true;
        return matchesCat && matchesSearch;
    });

    const NavItem = ({ id, icon: Icon, label }: { id: Tab, icon: any, label: string }) => (
        <button
            onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all ${activeTab === id ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
            <Icon size={20} />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            <Toaster position="top-right" />

            {/* Navbar (Fixed) */}
            <div className="fixed top-0 left-0 right-0 z-50">
                <Navbar />
            </div>

            {/* Sidebar - Desktop */}
            <aside className="w-[280px] hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl pt-20 pb-6 px-4 z-40 fixed top-0 bottom-0 left-0">
                <div className="mb-6 px-2">
                    <BackButton />
                </div>



                <nav className="space-y-1">
                    <NavItem id="categories" icon={LayoutGrid} label="Categories" />
                    <NavItem id="products" icon={Package} label="Products" />
                    <NavItem id="stock" icon={Box} label="Stock & Variants" />
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-[280px] pt-16 h-full overflow-hidden flex flex-col">

                {/* Mobile Header Toggle */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <BackButton />
                        <span className="font-bold text-lg">DailyClub BackOffice</span>
                    </div>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Menu size={20} />
                    </button>
                </div>

                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)}>
                        <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 p-6 flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-bold">Menu</h2>
                                <button onClick={() => setSidebarOpen(false)}><X /></button>
                            </div>
                            <nav className="space-y-2">
                                <NavItem id="categories" icon={LayoutGrid} label="Categories" />
                                <NavItem id="products" icon={Package} label="Products" />
                                <NavItem id="stock" icon={Box} label="Stock & Variants" />
                            </nav>
                        </div>
                    </div>
                )}

                {/* TAB CONTENT */}
                <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">

                    {/* --- CATEGORIES TAB --- */}
                    {activeTab === 'categories' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Form Section */}
                            <div className="lg:col-span-4 space-y-4">
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm sticky top-6">
                                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        {editingCatKey ? <Edit2 size={18} className="text-indigo-500" /> : <Plus size={18} className="text-emerald-500" />}
                                        {editingCatKey ? 'Edit Category' : 'New Category'}
                                    </h2>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Code (Key)</label>
                                            <input
                                                value={cCode}
                                                onChange={e => setCCode(e.target.value)}
                                                disabled={!!editingCatKey}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-60"
                                                placeholder="e.g. CAT001"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Name</label>
                                            <input
                                                value={cName}
                                                onChange={e => setCName(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="Display Name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Priority (1-10)</label>
                                            <input
                                                type="number"
                                                value={cRatingKey}
                                                onChange={e => setCRatingKey(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            />
                                        </div>

                                        {/* Image Upload */}
                                        <div className="relative group cursor-pointer border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl h-32 flex flex-col items-center justify-center hover:border-indigo-500 transition-colors bg-slate-50 dark:bg-slate-800/50">
                                            <input
                                                type="file"
                                                onChange={e => {
                                                    const f = e.target.files?.[0];
                                                    if (f) {
                                                        setCFile(f);
                                                        setCPicPreview(URL.createObjectURL(f));
                                                    }
                                                }}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                            {cPicPreview ? (
                                                <img src={cPicPreview} alt="Preview" className="h-full w-full object-contain rounded-lg p-2" />
                                            ) : (
                                                <>
                                                    <UploadCloud className="text-slate-400 mb-2" />
                                                    <span className="text-xs text-slate-500">Click to upload icon</span>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button onClick={saveCategory} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
                                                Save
                                            </button>
                                            {editingCatKey && (
                                                <button onClick={resetCatForm} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-semibold transition-all">
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* List Section */}
                            <div className="lg:col-span-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {categories.map(cat => (
                                        <div key={cat.code} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all group">
                                            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-lg flex-shrink-0 p-2 border border-slate-100 dark:border-slate-800">
                                                <img src={cat.pic || 'https://via.placeholder.com/50'} alt={cat.name} className="w-full h-full object-contain" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate">{cat.name}</h4>
                                                <p className="text-xs text-slate-500 font-mono">#{cat.code}</p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">Pri: {cat.ratingKey}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleCatEdit(cat)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"><Edit2 size={14} /></button>
                                                <button onClick={() => deleteCategory(cat.code)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}


                    {/* --- PRODUCTS TAB --- */}
                    {activeTab === 'products' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Form */}
                            <div className="lg:col-span-4 space-y-4">
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
                                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        {editingProdKey ? <Edit2 size={18} className="text-indigo-500" /> : <Plus size={18} className="text-emerald-500" />}
                                        {editingProdKey ? 'Edit Product' : 'New Product'}
                                    </h2>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Code</label>
                                                <input
                                                    value={pCode} onChange={e => setPCode(e.target.value)} disabled={!!editingProdKey}
                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Stock</label>
                                                <input
                                                    type="number" value={pStock} onChange={e => setPStock(Number(e.target.value))}
                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Name</label>
                                            <input value={pName} onChange={e => setPName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Category</label>
                                                <select value={pCategoryCode} onChange={e => setPCategoryCode(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                                                    <option value="">Select...</option>
                                                    {categories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Color Info</label>
                                                <input value={pColor} onChange={e => setPColor(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Details</label>
                                            <textarea value={pDetails} onChange={e => setPDetails(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm h-20 resize-none" />
                                        </div>

                                        {/* Prod Image */}
                                        <div className="relative group cursor-pointer border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl h-32 flex flex-col items-center justify-center hover:border-indigo-500 transition-colors bg-slate-50 dark:bg-slate-800/50">
                                            <input type="file" onChange={e => { const f = e.target.files?.[0]; if (f) { setPFile(f); setPPicPreview(URL.createObjectURL(f)); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            {pPicPreview ? <img src={pPicPreview} alt="Preview" className="h-full w-full object-contain rounded-lg p-2" /> : <UploadCloud className="text-slate-400" />}
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button onClick={saveProduct} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-500/20">Save</button>
                                            {editingProdKey && <button onClick={resetProdForm} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-semibold transition-all">Cancel</button>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Product List */}
                            <div className="lg:col-span-8 flex flex-col gap-4">
                                {/* Filter Bar */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap gap-3 items-center sticky top-0 z-10 shadow-sm">
                                    <div className="flex-1 flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input value={prodSearch} onChange={e => setProdSearch(e.target.value)} placeholder="Search Products..." className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                        </div>
                                        <select value={viewCat} onChange={e => setViewCat(e.target.value)} className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none border-none">
                                            <option value="">All Categories</option>
                                            {categories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {filteredProducts.map(p => (
                                        <div key={p.code} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 group hover:shadow-lg transition-all">
                                            <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative">
                                                <img src={p.pic || 'https://via.placeholder.com/150'} alt={p.name} className="w-full h-full object-cover" />
                                                <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-md">Stock: {p.stock}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate">{p.name}</h4>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-xs text-slate-500 font-mono">#{p.code}</span>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleProdEdit(p)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"><Edit2 size={14} /></button>
                                                        <button onClick={() => deleteProduct(p.code)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'stock' && (
                        <div className="text-center py-20 text-slate-400">
                            <Box size={48} className="mx-auto mb-4 opacity-20" />
                            <h2 className="text-xl font-bold mb-2">Stock Management</h2>
                            <p>Please use the detailed Stock Entry page for advanced variant management.</p>
                            <a href="/stock-entry" className="inline-block mt-4 text-indigo-600 font-semibold hover:underline">Go to Stock Entry &rarr;</a>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default BackOffice;
