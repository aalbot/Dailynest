import React, { useState, useEffect, useRef } from "react";
import { firebase } from "@/lib/firebase";
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
    Layers,
    Menu,
    X,
    LayoutGrid,
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

type ActiveSection = "categories" | "products";

const ProductEntry = () => {
    // --- State ---
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [viewCategoryCode, setViewCategoryCode] = useState("");
    const [productSearchTerm, setProductSearchTerm] = useState("");
    const [categorySearchTerm, setCategorySearchTerm] = useState("");
    const [activeSection, setActiveSection] = useState<ActiveSection>("categories");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Category Form State
    const [catForm, setCatForm] = useState({
        code: "",
        name: "",
        ratingKey: "",
        pic: "",
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
        pic: "",
    });
    const [prodFile, setProdFile] = useState<File | null>(null);
    const [editingProductCode, setEditingProductCode] = useState<string | null>(null);

    const fileInputRefCat = useRef<HTMLInputElement>(null);
    const fileInputRefProd = useRef<HTMLInputElement>(null);
    const catFormRef = useRef<HTMLDivElement>(null);
    const prodFormRef = useRef<HTMLDivElement>(null);

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

        if (!isEditing && !catFile) {
            toast.error("Picture is required for new categories.");
            return;
        }

        if ((!isEditing || keyChanged) && !(await checkIfUnique(`root/category/${code}`))) {
            toast.error(`Category Code ${code} already exists.`);
            return;
        }

        try {
            let picUrl = catForm.pic;
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
                pic: picUrl,
            });

            toast.success(`Category ${name} saved.`);
            resetCatForm();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to save category.";
            console.error(err);
            toast.error(message);
        }
    };

    const handleEditCategory = (cat: Category) => {
        setActiveSection("categories");
        setEditingCategoryCode(cat.code);
        setCatForm({
            code: cat.code,
            name: cat.name,
            ratingKey: String(cat.ratingKey || ""),
            pic: cat.pic || "",
        });
        setCatFile(null);
        if (fileInputRefCat.current) fileInputRefCat.current.value = "";
        catFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        const details = prodForm.details || "";
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
                const oldStock = await db.ref(`root/stock/${oldCode}`).once("value");
                if (oldStock.exists()) {
                    await db.ref(`root/stock/${code}`).set(oldStock.val());
                    await db.ref(`root/stock/${oldCode}`).remove();
                }
                await db.ref(`root/products/${oldCode}`).remove();
            }

            await db.ref(`root/products/${code}`).set({
                name,
                details,
                unit,
                pkg,
                categoryCode,
                pic: picUrl,
            });

            toast.success(`Product ${name} saved.`);
            resetProdForm();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to save product.";
            console.error(err);
            toast.error(message);
        }
    };

    const handleEditProduct = (prod: Product) => {
        setActiveSection("products");
        setEditingProductCode(prod.code);
        setProdForm({
            code: prod.code,
            name: prod.name,
            details: prod.details || "",
            unit: prod.unit,
            pkg: prod.pkg,
            categoryCode: prod.categoryCode,
            pic: prod.pic || "",
        });
        setProdFile(null);
        if (fileInputRefProd.current) fileInputRefProd.current.value = "";
        prodFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleDeleteProduct = async (code: string) => {
        if (confirm(`Delete Product ${code}? Also deletes stock data.`)) {
            await firebase.database().ref(`root/products/${code}`).remove();
            await firebase.database().ref(`root/stock/${code}`).remove();
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
    const filteredProducts = products.filter((p) => {
        if (!productSearchTerm) return true;
        const term = productSearchTerm.toLowerCase();
        return p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term);
    });

    const filteredCategories = categories.filter((c) => {
        if (!categorySearchTerm) return true;
        const term = categorySearchTerm.toLowerCase();
        return c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term);
    });

    const handleCatImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCatFile(e.target.files[0]);
            const reader = new FileReader();
            reader.onload = (ev) => setCatForm({ ...catForm, pic: ev.target?.result as string });
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleProdImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setProdFile(e.target.files[0]);
            const reader = new FileReader();
            reader.onload = (ev) => setProdForm({ ...prodForm, pic: ev.target?.result as string });
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const NavItem = ({
        id,
        icon: Icon,
        label,
    }: {
        id: ActiveSection;
        icon: React.ElementType;
        label: string;
    }) => (
        <button
            type="button"
            onClick={() => {
                setActiveSection(id);
                setSidebarOpen(false);
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all ${
                activeSection === id
                    ? "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
        >
            <Icon size={20} />
            <span>{label}</span>
        </button>
    );

    const SquareImageUpload = ({
        pic,
        onClick,
        inputRef,
        onChange,
        placeholder,
        fill = false,
    }: {
        pic: string;
        onClick: () => void;
        inputRef: React.RefObject<HTMLInputElement | null>;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: React.ReactNode;
        fill?: boolean;
    }) => (
        <div
            onClick={onClick}
            className={
                fill
                    ? "h-full max-w-full aspect-square mx-auto border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400 cursor-pointer hover:border-violet-500 hover:text-violet-500 transition-colors bg-slate-50/50 dark:bg-slate-800/50 relative overflow-hidden group min-h-[8rem]"
                    : "w-28 h-28 shrink-0 aspect-square border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400 cursor-pointer hover:border-violet-500 hover:text-violet-500 transition-colors bg-slate-50/50 dark:bg-slate-800/50 relative overflow-hidden group"
            }
        >
            {pic ? (
                <img
                    decoding="async"
                    loading="lazy"
                    src={pic}
                    alt="Preview"
                    className="w-full h-full object-cover absolute inset-0 group-hover:opacity-50 transition-opacity"
                />
            ) : (
                placeholder ?? <ImageIcon size={22} />
            )}
            {pic && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 className="text-white drop-shadow-md" size={18} />
                </div>
            )}
            <input type="file" ref={inputRef} accept="image/*" className="hidden" onChange={onChange} />
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            <div className="fixed top-0 left-0 right-0 z-50">
                <Navbar />
            </div>

            {/* Sidebar — desktop */}
            <aside className="w-[240px] hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl pt-20 pb-4 px-3 z-40 fixed top-0 bottom-0 left-0">
                <div className="mb-4 px-1">
                    <BackButton />
                </div>
                <div className="px-2 mb-5">
                    <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Box size={18} className="text-violet-500 shrink-0" />
                        Inventory
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                        Categories &amp; products
                    </p>
                </div>
                <nav className="space-y-1 px-1">
                    <NavItem id="categories" icon={LayoutGrid} label="Categories" />
                    <NavItem id="products" icon={Package} label="Products" />
                </nav>
            </aside>

            {/* Main */}
            <main className="flex-1 md:ml-[240px] pt-16 h-full min-h-0 flex flex-col overflow-hidden">
                {/* Mobile header */}
                <div className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <BackButton />
                        <span className="font-bold text-sm truncate">Inventory Definition</span>
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

                {/* Mobile sidebar overlay */}
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
                                <NavItem id="categories" icon={LayoutGrid} label="Categories" />
                                <NavItem id="products" icon={Package} label="Products" />
                            </nav>
                        </div>
                    </div>
                )}

                {/* Content — single viewport */}
                <div className="flex-1 min-h-0 p-3 md:p-4 overflow-hidden">
                    {activeSection === "categories" && (
                        <div className="h-full grid grid-cols-1 grid-rows-2 lg:grid-rows-1 lg:grid-cols-12 gap-3 md:gap-4 min-h-0 animate-in fade-in duration-300">
                            {/* Add Category */}
                            <div
                                ref={catFormRef}
                                className="lg:col-span-4 flex flex-col min-h-0 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
                            >
                                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                    <Tag size={16} className="text-violet-500" />
                                    {editingCategoryCode ? "Edit Category" : "Add Category"}
                                </h2>
                                <form
                                    onSubmit={handleCatSubmit}
                                    className="flex flex-col flex-1 min-h-0 p-4"
                                >
                                    <div className="space-y-3 shrink-0">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Code</label>
                                        <input
                                            type="text"
                                            value={catForm.code}
                                            onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
                                            placeholder="001"
                                            required
                                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 font-mono text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Name</label>
                                        <input
                                            type="text"
                                            value={catForm.name}
                                            onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                                            placeholder="Category Name"
                                            required
                                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Rank Key</label>
                                        <input
                                            type="number"
                                            value={catForm.ratingKey}
                                            onChange={(e) => setCatForm({ ...catForm, ratingKey: e.target.value })}
                                            min="1"
                                            max="999"
                                            required
                                            placeholder="10"
                                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 text-sm"
                                        />
                                    </div>
                                    </div>
                                    <div className="flex-1 min-h-0 flex flex-col mt-3">
                                        <label className="text-[10px] font-semibold text-slate-500 uppercase shrink-0 mb-1">Image</label>
                                        <div className="flex-1 min-h-0 flex items-center justify-center">
                                            <SquareImageUpload
                                                fill
                                                pic={catForm.pic}
                                                onClick={() => fileInputRefCat.current?.click()}
                                                inputRef={fileInputRefCat}
                                                onChange={handleCatImageChange}
                                                placeholder={
                                                    <div className="flex flex-col items-center gap-1 font-medium text-[10px] text-center px-1">
                                                        <Upload size={20} />
                                                        <span>Click to Upload</span>
                                                    </div>
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-3 shrink-0">
                                        <button
                                            type="submit"
                                            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
                                        >
                                            {editingCategoryCode ? <Check size={14} /> : <Plus size={14} />}
                                            {editingCategoryCode ? "Update" : "Add"}
                                        </button>
                                        {editingCategoryCode && (
                                            <button
                                                type="button"
                                                onClick={resetCatForm}
                                                className="px-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                            >
                                                <RotateCcw size={14} />
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>

                            {/* Existing Categories */}
                            <div className="lg:col-span-8 flex flex-col min-h-0 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                        <Layers size={16} className="text-violet-500" />
                                        Existing Categories
                                    </h3>
                                    <div className="relative">
                                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search categories..."
                                            value={categorySearchTerm}
                                            onChange={(e) => setCategorySearchTerm(e.target.value)}
                                            className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 w-full sm:w-48"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 bg-slate-50/80 dark:bg-slate-950/50">
                                    {filteredCategories.length === 0 ? (
                                        <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-slate-400">
                                            {categories.length === 0 ? (
                                                <>
                                                    <Tag size={28} className="mb-2 opacity-30" />
                                                    <p className="text-sm">No categories yet.</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Search size={28} className="mb-2 opacity-30" />
                                                    <p className="text-sm">No categories found.</p>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {filteredCategories.map((cat) => (
                                            <div
                                                key={cat.code}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex gap-2.5 group hover:shadow-md transition-all"
                                            >
                                                <img
                                                    decoding="async"
                                                    loading="lazy"
                                                    src={cat.pic || "https://via.placeholder.com/60"}
                                                    alt={cat.name}
                                                    className="w-12 h-12 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0 aspect-square"
                                                />
                                                <div className="flex-1 min-w-0 flex flex-col">
                                                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                                                        {cat.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-mono mb-0.5">{cat.code}</div>
                                                    <div className="mt-auto flex items-center justify-between gap-1">
                                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 truncate">
                                                            Sort: {cat.ratingKey}
                                                        </span>
                                                        <div className="flex gap-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditCategory(cat)}
                                                                className="p-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                                            >
                                                                <Edit2 size={11} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteCategory(cat.code)}
                                                                className="p-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40"
                                                            >
                                                                <Trash2 size={11} />
                                                            </button>
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
                    )}

                    {activeSection === "products" && (
                        <div className="h-full grid grid-cols-1 grid-rows-2 lg:grid-rows-1 lg:grid-cols-12 gap-3 md:gap-4 min-h-0 animate-in fade-in duration-300">
                            {/* Add Product */}
                            <div
                                ref={prodFormRef}
                                className="lg:col-span-5 flex flex-col min-h-0 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
                            >
                                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                    <Package size={16} className="text-violet-500" />
                                    {editingProductCode ? "Edit Product" : "Add Product"}
                                </h2>
                                <form
                                    onSubmit={handleProdSubmit}
                                    className="flex flex-col flex-1 min-h-0 p-4"
                                >
                                    <div className="space-y-3 shrink-0">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">
                                                Product Code (10)
                                            </label>
                                            <input
                                                type="text"
                                                value={prodForm.code}
                                                onChange={(e) => setProdForm({ ...prodForm, code: e.target.value })}
                                                maxLength={10}
                                                placeholder="P001ABCDES"
                                                required
                                                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 font-mono text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Name</label>
                                            <input
                                                type="text"
                                                value={prodForm.name}
                                                onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                                                placeholder="Coconut Oil"
                                                required
                                                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Unit</label>
                                            <select
                                                value={prodForm.unit}
                                                onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value })}
                                                required
                                                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 cursor-pointer appearance-none text-sm"
                                            >
                                                <option value="">Select Unit</option>
                                                <option value="g">g (Gram)</option>
                                                <option value="ml">ml (Milliliter)</option>
                                                <option value="pcs">Pcs (Pieces)</option>
                                                <option value="kg">kg (Kilogram)</option>
                                                <option value="l">l (Liter)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Packaging</label>
                                            <select
                                                value={prodForm.pkg}
                                                onChange={(e) => setProdForm({ ...prodForm, pkg: e.target.value })}
                                                required
                                                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 cursor-pointer appearance-none text-sm"
                                            >
                                                <option value="">Select Pkg</option>
                                                <option value="bottle">Bottle</option>
                                                <option value="cover">Cover</option>
                                                <option value="box">Box</option>
                                                <option value="jar">Jar</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Category</label>
                                            <select
                                                value={prodForm.categoryCode}
                                                onChange={(e) => setProdForm({ ...prodForm, categoryCode: e.target.value })}
                                                required
                                                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 cursor-pointer appearance-none text-sm"
                                            >
                                                <option value="">Select Category</option>
                                                {categories.map((c) => (
                                                    <option key={c.code} value={c.code}>
                                                        {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Details</label>
                                            <textarea
                                                value={prodForm.details}
                                                onChange={(e) => setProdForm({ ...prodForm, details: e.target.value })}
                                                placeholder="Product description..."
                                                rows={2}
                                                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 resize-none text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-0 flex flex-col mt-3">
                                        <label className="text-[10px] font-semibold text-slate-500 uppercase shrink-0 mb-1">Image</label>
                                        <div className="flex-1 min-h-0 flex items-center justify-center">
                                            <SquareImageUpload
                                                fill
                                                pic={prodForm.pic}
                                                onClick={() => fileInputRefProd.current?.click()}
                                                inputRef={fileInputRefProd}
                                                onChange={handleProdImageChange}
                                                placeholder={
                                                    <div className="flex flex-col items-center gap-1 font-medium text-[10px] text-center px-1">
                                                        <Upload size={20} />
                                                        <span>Click to Upload</span>
                                                    </div>
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-3 shrink-0">
                                        <button
                                            type="submit"
                                            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 rounded-lg shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
                                        >
                                            <Save size={16} />
                                            {editingProductCode ? "Update Product" : "Save Product"}
                                        </button>
                                        {editingProductCode && (
                                            <button
                                                type="button"
                                                onClick={resetProdForm}
                                                className="px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-all"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>

                            {/* Product List */}
                            <div className="lg:col-span-7 flex flex-col min-h-0 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                        <Layers size={16} className="text-violet-500" />
                                        Product List
                                    </h2>
                                    <div className="flex flex-col xs:flex-row gap-2">
                                        <div className="relative">
                                            <Tag size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <select
                                                value={viewCategoryCode}
                                                onChange={(e) => setViewCategoryCode(e.target.value)}
                                                className="pl-8 pr-6 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 cursor-pointer appearance-none w-full sm:w-auto min-w-[140px]"
                                            >
                                                <option value="">-- Load Category --</option>
                                                {categories.map((c) => (
                                                    <option key={c.code} value={c.code}>
                                                        {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="relative">
                                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search..."
                                                value={productSearchTerm}
                                                onChange={(e) => setProductSearchTerm(e.target.value)}
                                                className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-slate-100 w-full sm:w-36"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 bg-slate-50/80 dark:bg-slate-950/50">
                                    {!viewCategoryCode ? (
                                        <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-slate-400">
                                            <Tag size={28} className="mb-2 opacity-30" />
                                            <p className="text-sm">Select a category to view products.</p>
                                        </div>
                                    ) : filteredProducts.length === 0 ? (
                                        <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-slate-400">
                                            <Search size={28} className="mb-2 opacity-30" />
                                            <p className="text-sm">No products found.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {filteredProducts.map((p) => (
                                                <div
                                                    key={p.code}
                                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex gap-2.5 group hover:shadow-md transition-all"
                                                >
                                                    <img
                                                        decoding="async"
                                                        loading="lazy"
                                                        src={p.pic || "https://via.placeholder.com/60"}
                                                        alt={p.name}
                                                        className="w-12 h-12 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0 aspect-square"
                                                    />
                                                    <div className="flex-1 min-w-0 flex flex-col">
                                                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                                                            {p.name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 font-mono mb-0.5">{p.code}</div>
                                                        <div className="mt-auto flex items-center justify-between gap-1">
                                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 truncate">
                                                                {p.unit} / {p.pkg}
                                                            </span>
                                                            <div className="flex gap-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleEditProduct(p)}
                                                                    className="p-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                                                >
                                                                    <Edit2 size={11} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteProduct(p.code)}
                                                                    className="p-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40"
                                                                >
                                                                    <Trash2 size={11} />
                                                                </button>
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
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProductEntry;
