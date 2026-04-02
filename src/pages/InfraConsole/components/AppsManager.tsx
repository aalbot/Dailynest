import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { iconList, iconMap } from "@/utils/appIcons";
import {
    Eye, EyeOff, Save, Package, LayoutDashboard, Pencil, Check, Search, X, Palette,
} from "lucide-react";

const defaultApps = [
    { id: "_dashboard",          path: "/dashboard",          label: "Dashboard",           defaultIcon: "TrendingUp",    defaultColor: "bg-rose-500" },
    { id: "_employee-management",path: "/employee-management",label: "Employee Management", defaultIcon: "Users",          defaultColor: "bg-indigo-600" },
    { id: "_overview",           path: "/overview",           label: "Report",              defaultIcon: "LayoutDashboard",defaultColor: "bg-cyan-500" },
    { id: "_orders",             path: "/orders",             label: "Orders",              defaultIcon: "ClipboardList",  defaultColor: "bg-pink-500" },
    { id: "_delivery",           path: "/delivery",           label: "Delivery",            defaultIcon: "Truck",          defaultColor: "bg-emerald-500" },
    { id: "_stock-entry",        path: "/stock-entry",        label: "Stocks",              defaultIcon: "Package",        defaultColor: "bg-blue-500" },
    { id: "_product-entry",      path: "/product-entry",      label: "Products",            defaultIcon: "ShoppingBag",    defaultColor: "bg-violet-500" },
    { id: "_back-office",        path: "/back-office",        label: "Purchase",            defaultIcon: "Building2",      defaultColor: "bg-teal-500" },
    { id: "_premium-entry",      path: "/premium-entry",      label: "Wallet",              defaultIcon: "Crown",          defaultColor: "bg-yellow-500" },
    { id: "_rating-entry",       path: "/rating-entry",       label: "Promotions",          defaultIcon: "Star",           defaultColor: "bg-orange-500" },
    { id: "_keyword-entry",      path: "/keyword-entry",      label: "SEO",                 defaultIcon: "Keyboard",       defaultColor: "bg-indigo-500" },
    { id: "_tasks",              path: "/tasks",              label: "Task Manager",        defaultIcon: "Grid3X3",        defaultColor: "bg-violet-600" },
    { id: "_notifications",      path: "/notifications",      label: "Notification",        defaultIcon: "Bell",           defaultColor: "bg-red-500" },
    { id: "_staffes",            path: "/staffes",            label: "Onboard",             defaultIcon: "Users",          defaultColor: "bg-cyan-600" },
    { id: "_infra",              path: "/infra",              label: "Infra",               defaultIcon: "ShieldAlert",    defaultColor: "bg-red-600" },
    { id: "_broadcast",           path: "/broadcast",           label: "Broadcast",            defaultIcon: "MessageSquare",  defaultColor: "bg-emerald-600" },
    { id: "_banner-manage",       path: "/banner-manage",       label: "Banner Manage",        defaultIcon: "Image",          defaultColor: "bg-teal-600" },
];


const COLOR_PALETTE = [
    { label: "Rose", value: "bg-rose-500" },
    { label: "Red", value: "bg-red-500" },
    { label: "Orange", value: "bg-orange-500" },
    { label: "Amber", value: "bg-amber-500" },
    { label: "Yellow", value: "bg-yellow-500" },
    { label: "Lime", value: "bg-lime-500" },
    { label: "Green", value: "bg-green-500" },
    { label: "Emerald", value: "bg-emerald-500" },
    { label: "Teal", value: "bg-teal-500" },
    { label: "Cyan", value: "bg-cyan-500" },
    { label: "Sky", value: "bg-sky-500" },
    { label: "Blue", value: "bg-blue-500" },
    { label: "Indigo", value: "bg-indigo-500" },
    { label: "Violet", value: "bg-violet-500" },
    { label: "Purple", value: "bg-purple-500" },
    { label: "Fuchsia", value: "bg-fuchsia-500" },
    { label: "Pink", value: "bg-pink-500" },
    { label: "Slate", value: "bg-slate-700" },
    { label: "Dark", value: "bg-slate-900" },
    { label: "Zinc", value: "bg-zinc-500" },
];

// ─── Edit Modal ──────────────────────────────────────────────────────────────

interface EditModalProps {
    app: typeof defaultApps[0];
    config: any;
    open: boolean;
    onClose: () => void;
    onChange: (appId: string, field: string, value: any) => void;
    onReset: (appId: string) => void;
    onSave: () => void;
    saving: boolean;
}

const EditModal = ({ app, config, open, onClose, onChange, onReset, onSave, saving }: EditModalProps) => {
    const [iconSearch, setIconSearch] = useState("");
    const searchRef = useRef<HTMLInputElement>(null);

    const isLocked = app.id === "_infra";

    const currentName = config?.name ?? "";
    const currentIcon = config?.icon || app.defaultIcon;
    const currentColor = config?.color || app.defaultColor;

    const ActiveIcon = iconMap[currentIcon] || Package;

    const filteredIcons = iconSearch.trim()
        ? iconList.filter(i => i.toLowerCase().includes(iconSearch.toLowerCase()))
        : iconList;

    useEffect(() => {
        if (open) setTimeout(() => searchRef.current?.focus(), 100);
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden dark:bg-slate-900 bg-white">
                {/* Header */}
                <div className={`${currentColor} p-7 text-white relative overflow-hidden`}>
                    <div className="relative z-10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <ActiveIcon size={20} />
                                </div>
                                Edit "{config?.name || app.label}"
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">
                            Route: {app.path} {isLocked && "· Locked (Infra)"}
                        </p>
                    </div>
                    <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
                </div>

                <div className="p-7 space-y-7 max-h-[70vh] overflow-y-auto">
                    {/* App Name */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Pencil size={11} /> Display Name
                        </label>
                        <Input
                            value={currentName}
                            onChange={e => onChange(app.id, "name", e.target.value)}
                            placeholder={`Default: ${app.label}`}
                            disabled={isLocked}
                            className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-semibold text-base"
                        />
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Palette size={11} /> App Color
                        </label>
                        <div className="flex flex-wrap gap-2.5">
                            {COLOR_PALETTE.map(c => (
                                <button
                                    key={c.value}
                                    disabled={isLocked}
                                    onClick={() => onChange(app.id, "color", c.value)}
                                    title={c.label}
                                    className={`w-9 h-9 rounded-xl ${c.value} transition-all duration-200 relative hover:scale-110 active:scale-95 ${currentColor === c.value ? "ring-4 ring-offset-2 ring-slate-600 dark:ring-white scale-110" : ""} disabled:opacity-40 disabled:cursor-not-allowed`}
                                >
                                    {currentColor === c.value && (
                                        <Check size={14} className="absolute inset-0 m-auto text-white drop-shadow" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Icon Picker */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Search size={11} /> Icon
                        </label>

                        {/* Current selection pill */}
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            <div className={`w-10 h-10 rounded-xl ${currentColor} flex items-center justify-center shadow-sm`}>
                                <ActiveIcon size={18} className="text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-800 dark:text-white">{currentIcon}</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Active Icon</p>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                ref={searchRef}
                                value={iconSearch}
                                onChange={e => setIconSearch(e.target.value)}
                                placeholder="Search icons… e.g. Bell, Star, Truck"
                                disabled={isLocked}
                                className="h-11 pl-10 pr-10 rounded-2xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            />
                            {iconSearch && (
                                <button onClick={() => setIconSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Icon Grid */}
                        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                            {filteredIcons.length === 0 && (
                                <div className="col-span-8 py-6 text-center text-slate-400 text-sm">No icons matched "{iconSearch}"</div>
                            )}
                            {filteredIcons.map(iconKey => {
                                const IconComp = iconMap[iconKey];
                                const isSelected = currentIcon === iconKey;
                                if (!IconComp) return null;
                                return (
                                    <button
                                        key={iconKey}
                                        disabled={isLocked}
                                        onClick={() => onChange(app.id, "icon", iconKey)}
                                        title={iconKey}
                                        className={`w-full aspect-square rounded-xl flex-col flex items-center justify-center gap-1 transition-all duration-150 active:scale-95 ${isSelected
                                            ? `${currentColor} text-white shadow-md scale-105`
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105"
                                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                                    >
                                        <IconComp size={18} />
                                        <span className="text-[8px] font-bold truncate w-full text-center px-0.5 leading-none opacity-60">{iconKey}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-7 pb-7">
                    {/* Reset to default - left side */}
                    <Button
                        variant="ghost"
                        onClick={() => { onReset(app.id); onClose(); }}
                        disabled={isLocked || (!config?.name && !config?.icon && !config?.color)}
                        className="rounded-2xl h-11 px-5 font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 gap-2 disabled:opacity-30"
                    >
                        <X size={14} /> Reset to Default
                    </Button>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={onClose} className="rounded-2xl h-11 px-6 font-bold text-slate-500">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => { onSave(); onClose(); }}
                            disabled={saving || isLocked}
                            className="rounded-2xl h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-500/20 gap-2"
                        >
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AppsManager = () => {
    const [localState, setLocalState] = useState<Record<string, any>>({});
    const [customApps, setCustomApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingApp, setEditingApp] = useState<any | null>(null);

    useEffect(() => {
        const db = firebase.database();
        const sysRef = db.ref("root/system_apps");
        const appsRef = db.ref("root/apps");

        let sysLoaded = false;
        let appsLoaded = false;
        const checkDone = () => { if (sysLoaded && appsLoaded) setLoading(false); };

        const sysSub = sysRef.on("value", (snap) => {
            const data = snap.val() || {};
            setLocalState(prev => Object.keys(prev).length === 0 ? JSON.parse(JSON.stringify(data)) : prev);
            sysLoaded = true;
            checkDone();
        });
        const appsSub = appsRef.on("value", (snap) => {
            const data = snap.val();
            setCustomApps(data ? Object.values(data) : []);
            appsLoaded = true;
            checkDone();
        });

        return () => {
            sysRef.off("value", sysSub);
            appsRef.off("value", appsSub);
        };
    }, []);

    const handleFieldChange = (appId: string, field: string, value: any) => {
        setLocalState(prev => ({
            ...prev,
            [appId]: { ...(prev[appId] || {}), [field]: value }
        }));
    };

    const handleReset = async (appId: string) => {
        setLocalState(prev => {
            const updated = { ...prev };
            if (updated[appId]) {
                // Keep isHidden state, clear visual overrides
                updated[appId] = { isHidden: updated[appId].isHidden ?? false };
            }
            return updated;
        });
        // Immediately persist the reset
        setSaving(true);
        try {
            const updated = { ...localState };
            if (updated[appId]) updated[appId] = { isHidden: updated[appId].isHidden ?? false };
            else delete updated[appId];
            await firebase.database().ref("root/system_apps").set(updated);
            toast.success("App reset to default settings.");
        } catch (e: any) {
            toast.error("Reset failed: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const saveChanges = async () => {
        setSaving(true);
        try {
            await firebase.database().ref("root/system_apps").set(localState);
            toast.success("App settings saved globally.");
        } catch (e: any) {
            toast.error("Save failed: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleResetAll = async () => {
        if (!confirm("This will reset ALL app names, icons, and colors to their defaults. Hidden/visible states will be preserved. Continue?")) return;
        // Build a clean state — keep only isHidden flags, drop all visual overrides
        const cleaned: Record<string, any> = {};
        Object.entries(localState).forEach(([key, val]) => {
            if (val?.isHidden !== undefined) {
                cleaned[key] = { isHidden: val.isHidden };
            }
        });
        setLocalState(cleaned);
        setSaving(true);
        try {
            await firebase.database().ref("root/system_apps").set(cleaned);
            toast.success("All app overrides reset to defaults.");
        } catch (e: any) {
            toast.error("Reset failed: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3 text-slate-400">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium animate-pulse">Loading app configurations…</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden">
                <CardHeader className="p-8 pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                                <LayoutDashboard className="text-blue-500" /> Default App Manager
                            </CardTitle>
                            <CardDescription className="text-base font-medium mt-1">
                                Customize visibility, labels, colors, and icons for all portal modules.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={handleResetAll}
                                disabled={saving}
                                className="rounded-2xl h-12 px-5 font-bold gap-2 border-slate-200 dark:border-slate-700 text-rose-500 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            >
                                <X className="w-4 h-4" /> Reset All
                            </Button>
                            <Button
                                onClick={saveChanges}
                                disabled={saving}
                                className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-6 shadow-lg shadow-blue-500/20 active:scale-95 transition-all gap-2"
                            >
                                {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8 pt-4">
                    <div className="space-y-3">
                        {/* ── Default Apps ── */}
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 pb-1 px-1">System Apps</p>
                        {defaultApps.map(app => {
                            const config = localState[app.id] || {};
                            const isHidden = config.isHidden || false;
                            const displayName = config.name || app.label;
                            const iconKey = config.icon || app.defaultIcon;
                            const colorClass = config.color || app.defaultColor;
                            const ActiveIcon = iconMap[iconKey] || Package;
                            const isLocked = app.id === "_infra";

                            return (
                                <div
                                    key={app.id}
                                    className={`flex items-center gap-4 p-4 rounded-[1.5rem] border transition-all duration-300 ${isHidden
                                        ? "bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800 opacity-60"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md"
                                    }`}
                                >
                                    <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-sm transition-colors ${isHidden ? "bg-slate-100 dark:bg-slate-800 text-slate-400" : `${colorClass} text-white`}`}>
                                        <ActiveIcon size={22} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-base font-black tracking-tight truncate ${isHidden ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>
                                            {displayName}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-mono text-slate-400">{app.path}</span>
                                            {config.name && <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-500">renamed</span>}
                                            {config.icon && <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-500">custom icon</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEditingApp(app)}
                                            disabled={isLocked}
                                            className="rounded-xl h-9 px-4 font-bold gap-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 transition-colors"
                                        >
                                            <Pencil size={13} />
                                            Edit
                                        </Button>
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                            {isHidden ? <EyeOff size={13} className="text-slate-400" /> : <Eye size={13} className="text-emerald-500" />}
                                            <Switch
                                                checked={!isHidden}
                                                onCheckedChange={c => handleFieldChange(app.id, "isHidden", !c)}
                                                disabled={isLocked}
                                            />
                                        </div>
                                        <Badge
                                            variant={isHidden ? "secondary" : "default"}
                                            className={`w-16 justify-center font-black uppercase tracking-widest text-[9px] px-3 py-1 ${!isHidden ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}
                                        >
                                            {isHidden ? "Hidden" : "Visible"}
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })}

                        {/* ── Custom Apps ── */}
                        {customApps.length > 0 && (
                            <>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 pb-1 px-1 pt-4">Custom Apps</p>
                                {customApps.map((app: any) => {
                                    const appId = `custom_${app.id}`;
                                    const config = localState[appId] || {};
                                    const isHidden = config.isHidden ?? (app.isHidden ?? false);
                                    const displayName = config.name || app.name;
                                    const iconKey = config.icon || app.icon || "Package";
                                    const colorClass = config.color || app.colorClass || app.colorGradient || "bg-blue-500";
                                    const ActiveIcon = iconMap[iconKey] || Package;

                                    const editableApp = {
                                        id: appId,
                                        path: app.path || "/",
                                        label: app.name,
                                        defaultIcon: app.icon || "Package",
                                        defaultColor: app.colorClass || app.colorGradient || "bg-blue-500"
                                    };

                                    return (
                                        <div
                                            key={appId}
                                            className={`flex items-center gap-4 p-4 rounded-[1.5rem] border transition-all duration-300 ${isHidden
                                                ? "bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800 opacity-60"
                                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md"
                                            }`}
                                        >
                                            <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-sm transition-colors ${isHidden ? "bg-slate-100 dark:bg-slate-800 text-slate-400" : `${colorClass} text-white`}`}>
                                                <ActiveIcon size={22} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-base font-black tracking-tight truncate ${isHidden ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>
                                                    {displayName}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-mono text-slate-400">{app.path}</span>
                                                    <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-500">custom</span>
                                                    {config.name && <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-500">renamed</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditingApp(editableApp)}
                                                    className="rounded-xl h-9 px-4 font-bold gap-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 transition-colors"
                                                >
                                                    <Pencil size={13} />
                                                    Edit
                                                </Button>
                                                <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                    {isHidden ? <EyeOff size={13} className="text-slate-400" /> : <Eye size={13} className="text-emerald-500" />}
                                                    <Switch
                                                        checked={!isHidden}
                                                        onCheckedChange={c => handleFieldChange(appId, "isHidden", !c)}
                                                    />
                                                </div>
                                                <Badge
                                                    variant={isHidden ? "secondary" : "default"}
                                                    className={`w-16 justify-center font-black uppercase tracking-widest text-[9px] px-3 py-1 ${!isHidden ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}
                                                >
                                                    {isHidden ? "Hidden" : "Visible"}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Edit Modal */}
            {editingApp && (
                <EditModal
                    app={editingApp}
                    config={localState[editingApp.id] || {}}
                    open={!!editingApp}
                    onClose={() => setEditingApp(null)}
                    onChange={handleFieldChange}
                    onReset={handleReset}
                    onSave={saveChanges}
                    saving={saving}
                />
            )}
        </div>
    );
};

export default AppsManager;
