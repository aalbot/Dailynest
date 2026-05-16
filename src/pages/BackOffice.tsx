import React, { useState, useEffect } from 'react';
import { firebase } from "@/lib/firebase";
import {
    Menu, LayoutGrid, Package, Box, Edit2,
    Trash2, UploadCloud, Search, Plus, X
} from 'lucide-react';
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { toast, Toaster } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

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
    categoryCode: string;
    stock: number;
    details?: string;
    pic?: string;
}

type Tab = 'categories' | 'products' | 'stock';

const BackOffice = () => {
    const [activeTab, setActiveTab] = useState<Tab>('categories');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { getTranslation } = useLang();

    const [categories, setCategories] = useState<Category[]>([]);
    const [editingCatKey, setEditingCatKey] = useState<string | null>(null);
    const [cCode, setCCode] = useState('');
    const [cName, setCName] = useState('');
    const [cRatingKey, setCRatingKey] = useState(1);
    const [cPicPreview, setCPicPreview] = useState('');
    const [cFile, setCFile] = useState<File | null>(null);
    const [catDialogOpen, setCatDialogOpen] = useState(false);

    const [products, setProducts] = useState<Product[]>([]);
    const [viewCat, setViewCat] = useState('');
    const [prodSearch, setProdSearch] = useState('');
    const [editingProdKey, setEditingProdKey] = useState<string | null>(null);
    const [pCode, setPCode] = useState('');
    const [pName, setPName] = useState('');
    const [pColor, setPColor] = useState('');
    const [pCategoryCode, setPCategoryCode] = useState('');
    const [pStock, setPStock] = useState(0);
    const [pDetails, setPDetails] = useState('');
    const [pPicPreview, setPPicPreview] = useState('');
    const [pFile, setPFile] = useState<File | null>(null);
    const [prodDialogOpen, setProdDialogOpen] = useState(false);
    const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
    const [loadingCategoryProducts, setLoadingCategoryProducts] = useState(false);

    useEffect(() => {
        const db = firebase.database();

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
        };
    }, []);

    useEffect(() => {
        if (!viewCat) {
            setCategoryProducts([]);
            setLoadingCategoryProducts(false);
            return;
        }

        setLoadingCategoryProducts(true);
        const query = firebase.database().ref("root/products").orderByChild("categoryCode").equalTo(viewCat);
        const onValue = (snap: { exists: () => boolean; forEach: (cb: (child: { key: string | null; val: () => Record<string, unknown> }) => void) => void }) => {
            const arr: Product[] = [];
            if (snap.exists()) {
                snap.forEach((child) => {
                    arr.push({ code: child.key as string, ...child.val() });
                });
            }
            setCategoryProducts(arr.sort((a, b) => a.name.localeCompare(b.name)));
            setLoadingCategoryProducts(false);
        };
        query.on("value", onValue);
        return () => query.off("value", onValue);
    }, [viewCat]);

    const productMatchesCategory = (product: Product, catCode: string) => {
        const productCat = String(product.categoryCode ?? "").trim();
        const selected = String(catCode).trim();
        if (!productCat || !selected) return false;
        if (productCat === selected) return true;
        const cat = categories.find((c) => c.code === selected);
        return cat ? productCat === cat.name : false;
    };

    const viewProductsInCategory = (catCode: string) => {
        setViewCat(catCode);
        setProdSearch("");
        setActiveTab("products");
        setSidebarOpen(false);
    };

    const handleCatEdit = (cat: Category) => {
        setEditingCatKey(cat.code);
        setCCode(cat.code);
        setCName(cat.name);
        setCRatingKey(cat.ratingKey);
        setCPicPreview(cat.pic || '');
        setCFile(null);
        setCatDialogOpen(true);
    };

    const openNewCategory = () => {
        setEditingCatKey(null);
        setCCode('');
        setCName('');
        setCRatingKey(1);
        setCPicPreview('');
        setCFile(null);
        setCatDialogOpen(true);
    };

    const resetCatForm = () => {
        setEditingCatKey(null);
        setCCode('');
        setCName('');
        setCRatingKey(1);
        setCPicPreview('');
        setCFile(null);
        setCatDialogOpen(false);
    };

    const saveCategory = async () => {
        if (!cCode || !cName) return toast.error(getTranslation("backOffice.categories.messages.missingFields"));

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

            toast.success(getTranslation("backOffice.categories.messages.saveSuccess"));
            resetCatForm();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to save category";
            toast.error(message);
        }
    };

    const deleteCategory = async (code: string) => {
        if (!confirm(getTranslation("backOffice.categories.messages.deleteConfirm"))) return;
        try {
            await firebase.database().ref(`root/category/${code}`).remove();
            toast.success(getTranslation("backOffice.categories.messages.deleteSuccess"));
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to delete category";
            toast.error(message);
        }
    };

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
        setProdDialogOpen(true);
    };

    const openNewProduct = () => {
        setEditingProdKey(null);
        setPCode('');
        setPName('');
        setPColor('');
        setPCategoryCode(viewCat || '');
        setPStock(0);
        setPDetails('');
        setPPicPreview('');
        setPFile(null);
        setProdDialogOpen(true);
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
        setProdDialogOpen(false);
    };

    const saveProduct = async () => {
        if (!pCode || !pName || !pCategoryCode) return toast.error(getTranslation("backOffice.products.messages.missingFields"));

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

            toast.success(getTranslation("backOffice.products.messages.saveSuccess"));
            resetProdForm();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to save product";
            toast.error(message);
        }
    };

    const deleteProduct = async (code: string) => {
        if (!confirm(getTranslation("backOffice.products.messages.deleteConfirm"))) return;
        try {
            await firebase.database().ref(`root/products/${code}`).remove();
            toast.success(getTranslation("backOffice.products.messages.deleteSuccess"));
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to delete product";
            toast.error(message);
        }
    };

    const productsForSelectedCategory = viewCat
        ? (categoryProducts.length > 0
            ? categoryProducts
            : products.filter((p) => productMatchesCategory(p, viewCat)))
        : [];

    const filteredProducts = productsForSelectedCategory.filter((p) => {
        if (!prodSearch) return true;
        const term = prodSearch.toLowerCase();
        return p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term);
    });

    const selectedCategoryName = viewCat
        ? categories.find((c) => c.code === viewCat)?.name ?? viewCat
        : "";

    const NavItem = ({ id, icon: Icon, label }: { id: Tab; icon: React.ComponentType<{ size?: number }>; label: string }) => (
        <button
            type="button"
            onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all ${activeTab === id ? 'bg-indigo-50 font-semibold text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}
        >
            <Icon size={20} />
            <span>{label}</span>
        </button>
    );

    const CategoryFormDialog = () => (
        <Dialog open={catDialogOpen} onOpenChange={(open) => { if (!open) resetCatForm(); else setCatDialogOpen(true); }}>
            <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {editingCatKey ? <Edit2 size={18} className="text-indigo-500" /> : <Plus size={18} className="text-emerald-500" />}
                        {editingCatKey ? getTranslation("backOffice.categories.edit") : getTranslation("backOffice.categories.new")}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-400">{getTranslation("backOffice.categories.form.code")}</label>
                        <input
                            value={cCode}
                            onChange={(e) => setCCode(e.target.value)}
                            disabled={!!editingCatKey}
                            className="w-full rounded-lg bg-slate-50 px-3 py-2 outline-none transition-all focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:bg-slate-800"
                            placeholder={getTranslation("backOffice.categories.form.codePlaceholder")}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-400">{getTranslation("backOffice.categories.form.name")}</label>
                        <input
                            value={cName}
                            onChange={(e) => setCName(e.target.value)}
                            className="w-full rounded-lg bg-slate-50 px-3 py-2 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800"
                            placeholder={getTranslation("backOffice.categories.form.namePlaceholder")}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-400">{getTranslation("backOffice.categories.form.priority")}</label>
                        <input
                            type="number"
                            value={cRatingKey}
                            onChange={(e) => setCRatingKey(Number(e.target.value))}
                            className="w-full rounded-lg bg-slate-50 px-3 py-2 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800"
                        />
                    </div>
                    <div className="relative flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-indigo-500 dark:border-slate-700 dark:bg-slate-800/50">
                        <input
                            type="file"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                    setCFile(f);
                                    setCPicPreview(URL.createObjectURL(f));
                                }
                            }}
                            className="absolute inset-0 cursor-pointer opacity-0"
                        />
                        {cPicPreview ? (
                            <img decoding="async" loading="lazy" src={cPicPreview} alt="Preview" className="h-full w-full rounded-lg object-contain p-2" />
                        ) : (
                            <>
                                <UploadCloud className="mb-2 text-slate-400" />
                                <span className="text-xs text-slate-500">{getTranslation("backOffice.categories.form.uploadIcon")}</span>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={saveCategory}
                            className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95"
                        >
                            {getTranslation("common.save")}
                        </button>
                        <button
                            type="button"
                            onClick={resetCatForm}
                            className="rounded-xl bg-slate-100 px-4 py-2.5 font-semibold transition-all hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                        >
                            {getTranslation("common.cancel")}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );

    const ProductFormDialog = () => (
        <Dialog open={prodDialogOpen} onOpenChange={(open) => { if (!open) resetProdForm(); else setProdDialogOpen(true); }}>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {editingProdKey ? <Edit2 size={18} className="text-indigo-500" /> : <Plus size={18} className="text-emerald-500" />}
                        {editingProdKey ? getTranslation("backOffice.products.edit") : getTranslation("backOffice.products.new")}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-400">{getTranslation("backOffice.products.form.code")}</label>
                            <input
                                value={pCode}
                                onChange={(e) => setPCode(e.target.value)}
                                disabled={!!editingProdKey}
                                className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-400">{getTranslation("backOffice.products.form.stock")}</label>
                            <input
                                type="number"
                                value={pStock}
                                onChange={(e) => setPStock(Number(e.target.value))}
                                className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-400">{getTranslation("backOffice.products.form.name")}</label>
                        <input
                            value={pName}
                            onChange={(e) => setPName(e.target.value)}
                            className="w-full rounded-lg bg-slate-50 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-400">{getTranslation("backOffice.products.form.category")}</label>
                            <select
                                value={pCategoryCode}
                                onChange={(e) => setPCategoryCode(e.target.value)}
                                className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800"
                            >
                                <option value="">{getTranslation("backOffice.products.form.select")}</option>
                                {categories.map((c) => (
                                    <option key={c.code} value={c.code}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-400">{getTranslation("backOffice.products.form.color")}</label>
                            <input
                                value={pColor}
                                onChange={(e) => setPColor(e.target.value)}
                                className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-400">{getTranslation("backOffice.products.form.details")}</label>
                        <textarea
                            value={pDetails}
                            onChange={(e) => setPDetails(e.target.value)}
                            className="h-20 w-full resize-none rounded-lg bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800"
                        />
                    </div>
                    <div className="relative flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-indigo-500 dark:border-slate-700 dark:bg-slate-800/50">
                        <input
                            type="file"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                    setPFile(f);
                                    setPPicPreview(URL.createObjectURL(f));
                                }
                            }}
                            className="absolute inset-0 cursor-pointer opacity-0"
                        />
                        {pPicPreview ? (
                            <img decoding="async" loading="lazy" src={pPicPreview} alt="Preview" className="h-full w-full rounded-lg object-contain p-2" />
                        ) : (
                            <UploadCloud className="text-slate-400" />
                        )}
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={saveProduct}
                            className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95"
                        >
                            {getTranslation("common.save")}
                        </button>
                        <button
                            type="button"
                            onClick={resetProdForm}
                            className="rounded-xl bg-slate-100 px-4 py-2.5 font-semibold transition-all hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                        >
                            {getTranslation("common.cancel")}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 font-sans transition-colors duration-300 dark:bg-slate-950">
            <Toaster position="top-right" />

            <div className="fixed top-0 left-0 right-0 z-50">
                <Navbar />
            </div>

            <aside className="fixed top-0 bottom-0 left-0 z-40 hidden w-[280px] flex-col border-r border-slate-200 bg-white/80 px-4 pb-6 pt-20 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 md:flex">
                <div className="mb-6 px-2">
                    <BackButton />
                </div>
                <nav className="space-y-1">
                    <NavItem id="categories" icon={LayoutGrid} label={getTranslation("backOffice.tabs.categories")} />
                    <NavItem id="products" icon={Package} label={getTranslation("backOffice.tabs.products")} />
                    <NavItem id="stock" icon={Box} label={getTranslation("backOffice.tabs.stock")} />
                </nav>
            </aside>

            <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden pt-16 md:ml-[280px]">
                <div className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:hidden">
                    <div className="flex items-center gap-3">
                        <BackButton />
                        <span className="text-lg font-bold">DailyClub BackOffice</span>
                    </div>
                    <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                        <Menu size={20} />
                    </button>
                </div>

                {sidebarOpen && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)}>
                        <div
                            className="absolute right-0 top-0 bottom-0 flex w-[280px] flex-col bg-white p-6 dark:bg-slate-900"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mb-8 flex items-center justify-between">
                                <h2 className="text-xl font-bold">Menu</h2>
                                <button type="button" onClick={() => setSidebarOpen(false)}><X /></button>
                            </div>
                            <nav className="space-y-2">
                                <NavItem id="categories" icon={LayoutGrid} label={getTranslation("backOffice.tabs.categories")} />
                                <NavItem id="products" icon={Package} label={getTranslation("backOffice.tabs.products")} />
                                <NavItem id="stock" icon={Box} label={getTranslation("backOffice.tabs.stock")} />
                            </nav>
                        </div>
                    </div>
                )}

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-4">
                    {activeTab === 'categories' && (
                        <div className="flex h-full min-h-0 flex-col gap-3 animate-in fade-in duration-300">
                            <div className="flex shrink-0 items-center justify-between gap-3">
                                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    {getTranslation("backOffice.tabs.categories")}
                                </h2>
                                <button
                                    type="button"
                                    onClick={openNewCategory}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95"
                                >
                                    <Plus size={16} />
                                    {getTranslation("backOffice.categories.new")}
                                </button>
                            </div>
                            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/95">
                                            <TableRow>
                                                <TableHead className="w-28">{getTranslation("backOffice.categories.form.code")}</TableHead>
                                                <TableHead>{getTranslation("backOffice.categories.form.name")}</TableHead>
                                                <TableHead className="w-24">{getTranslation("backOffice.categories.form.priority")}</TableHead>
                                                <TableHead className="w-20 text-center">Icon</TableHead>
                                                <TableHead className="w-24 text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {categories.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="py-12 text-center text-sm text-slate-500">
                                                        No categories yet
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                categories.map((cat) => (
                                                    <TableRow key={cat.code}>
                                                        <TableCell className="font-mono text-xs text-slate-500">{cat.code}</TableCell>
                                                        <TableCell className="font-medium">{cat.name}</TableCell>
                                                        <TableCell>{cat.ratingKey}</TableCell>
                                                        <TableCell>
                                                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                                                                <img
                                                                    decoding="async"
                                                                    loading="lazy"
                                                                    src={cat.pic || "https://via.placeholder.com/40"}
                                                                    alt={cat.name}
                                                                    className="h-full w-full object-contain"
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex justify-end gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => viewProductsInCategory(cat.code)}
                                                                    className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                                    aria-label="View products"
                                                                    title="View products"
                                                                >
                                                                    <Package size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCatEdit(cat)}
                                                                    className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400"
                                                                    aria-label="Edit"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteCategory(cat.code)}
                                                                    className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                                                                    aria-label="Delete"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                            <CategoryFormDialog />
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="flex h-full min-h-0 flex-col gap-3 animate-in fade-in duration-300">
                            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                        {getTranslation("backOffice.tabs.products")}
                                    </h2>
                                    {viewCat && (
                                        <p className="mt-0.5 truncate text-xs text-slate-500">
                                            {selectedCategoryName}
                                            {!loadingCategoryProducts && (
                                                <span className="ml-1 text-slate-400">
                                                    ({filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"})
                                                </span>
                                            )}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:max-w-2xl">
                                    <div className="relative min-w-[160px] flex-1 sm:max-w-[220px]">
                                        <Package size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <select
                                            value={viewCat}
                                            onChange={(e) => {
                                                setViewCat(e.target.value);
                                                setProdSearch("");
                                            }}
                                            className="w-full appearance-none rounded-lg bg-white py-2 pl-9 pr-8 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-900 dark:ring-slate-700"
                                        >
                                            <option value="">{getTranslation("backOffice.products.form.select")}</option>
                                            {categories.map((c) => (
                                                <option key={c.code} value={c.code}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="relative min-w-[140px] flex-1 sm:max-w-[200px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            value={prodSearch}
                                            onChange={(e) => setProdSearch(e.target.value)}
                                            placeholder={getTranslation("backOffice.products.search")}
                                            disabled={!viewCat}
                                            className="w-full rounded-lg bg-white py-2 pl-9 pr-3 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:ring-slate-700"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={openNewProduct}
                                        disabled={!viewCat}
                                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Plus size={16} />
                                        {getTranslation("backOffice.products.new")}
                                    </button>
                                </div>
                            </div>
                            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
                                    {!viewCat ? (
                                        <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-4 text-slate-400">
                                            <Package size={32} className="mb-2 opacity-30" />
                                            <p className="text-sm font-medium">Select a category to view products</p>
                                            <p className="mt-1 text-xs text-slate-500">Choose a category from the dropdown above</p>
                                        </div>
                                    ) : loadingCategoryProducts ? (
                                        <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-slate-400">
                                            <p className="text-sm">Loading products…</p>
                                        </div>
                                    ) : (
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/95">
                                            <TableRow>
                                                <TableHead className="w-16">Image</TableHead>
                                                <TableHead className="w-28">{getTranslation("backOffice.products.form.code")}</TableHead>
                                                <TableHead>{getTranslation("backOffice.products.form.name")}</TableHead>
                                                <TableHead className="w-20">{getTranslation("backOffice.products.form.stock")}</TableHead>
                                                <TableHead className="w-24 text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredProducts.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="py-12 text-center text-sm text-slate-500">
                                                        No products in this category
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredProducts.map((p) => (
                                                    <TableRow key={p.code}>
                                                        <TableCell>
                                                            <div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                                                                <img
                                                                    decoding="async"
                                                                    loading="lazy"
                                                                    src={p.pic || "https://via.placeholder.com/40"}
                                                                    alt={p.name}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs text-slate-500">{p.code}</TableCell>
                                                        <TableCell className="max-w-[200px] truncate font-medium">{p.name}</TableCell>
                                                        <TableCell>{p.stock ?? 0}</TableCell>
                                                        <TableCell>
                                                            <div className="flex justify-end gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleProdEdit(p)}
                                                                    className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400"
                                                                    aria-label="Edit"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteProduct(p.code)}
                                                                    className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                                                                    aria-label="Delete"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                    )}
                                </div>
                            </div>
                            <ProductFormDialog />
                        </div>
                    )}

                    {activeTab === 'stock' && (
                        <div className="flex h-full min-h-0 flex-col items-center justify-center text-slate-400">
                            <Box size={48} className="mb-4 opacity-20" />
                            <h2 className="mb-2 text-xl font-bold">{getTranslation("backOffice.stock.title")}</h2>
                            <p className="max-w-sm text-center text-sm">{getTranslation("backOffice.stock.description")}</p>
                            <a href="/stock-entry" className="mt-4 font-semibold text-indigo-600 hover:underline">
                                {getTranslation("backOffice.stock.goLink")} &rarr;
                            </a>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default BackOffice;
