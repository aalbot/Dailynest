import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Settings,
    Bell,
    Shield,
    User,
    Smartphone,
    Monitor,
    Volume2,
    VolumeX,
    Palette,
    Check,
    BarChart3,
    Activity,
    Database,
    Zap,
    ChevronRight,
    ClipboardList,
    Package,
    ShoppingBag,
    Menu,
    X,
    LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const { isDark, toggleTheme } = useTheme();
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [activeTab, setActiveTab] = useState("general");
    const [isMenuOpen, setIsMenuOpen] = useState(false); // New state for mobile menu

    const tabs = [
        { id: "general", label: "General", icon: Settings },
        { id: "appearance", label: "Appearance", icon: Palette },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "usage", label: "Usage", icon: Activity },
        { id: "account", label: "Account", icon: User },
        { id: "security", label: "Security", icon: Shield },
    ];

    const userRole = sessionStorage.getItem("user_role") || "Staff";
    const staffName = sessionStorage.getItem("staff_name") || "Admin";

    const activeTabLabel = tabs.find(t => t.id === activeTab)?.label; // Derive active tab label

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full h-[100dvh] sm:h-auto sm:max-h-[600px] sm:w-[95vw] sm:max-w-[720px] p-0 bg-white dark:bg-slate-900 border-none shadow-2xl sm:rounded-[32px] rounded-none overflow-hidden duration-300">
                <div className="flex flex-col md:flex-row h-full max-h-[100dvh] sm:max-h-[600px] overflow-hidden">
                    {/* Sidebar / Mobile Menu */}
                    <div className={`
                        w-full md:w-64 bg-slate-50 dark:bg-slate-950/20 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800/60 flex flex-col shrink-0 relative z-[100] transition-all duration-500 ease-in-out
                        ${isMenuOpen ? 'h-full' : 'h-auto md:h-full'}
                    `}>
                        {/* Mobile Menu Header */}
                        <div className="md:hidden flex items-center justify-between p-4 px-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/60">
                            <div className="flex flex-col">
                                <span className="font-black text-xl tracking-tighter dark:text-white leading-none">Settings</span>
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">{activeTabLabel}</span>
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-90 transition-transform"
                            >
                                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </div>

                        {/* Navigation - Sidebar on Desktop / Collapsible on Mobile */}
                        <div className={`
                            ${isMenuOpen ? 'flex' : 'hidden md:flex'}
                            flex-col flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar
                        `}>
                            <div className="hidden md:flex items-center gap-3 px-2 mb-8">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                    <Settings size={20} />
                                </div>
                                <span className="font-bold text-lg dark:text-white">Settings</span>
                            </div>

                            <nav className="flex flex-col gap-1.5">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setIsMenuOpen(false); // Close menu on tab selection
                                        }}
                                        className={`flex items-center gap-3 px-5 py-3.5 text-sm font-bold rounded-2xl transition-all duration-300 ${activeTab === tab.id
                                            ? "bg-indigo-600 md:bg-white dark:md:bg-slate-800 text-white md:text-indigo-600 dark:md:text-indigo-400 shadow-md md:shadow-sm md:ring-1 md:ring-slate-100 dark:md:ring-slate-700"
                                            : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-300"
                                            }`}
                                    >
                                        <tab.icon size={18} className={`shrink-0 ${activeTab === tab.id ? 'animate-pulse-slow' : ''}`} />
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </nav>

                            <div className="mt-auto hidden md:block pt-6">
                                <div className="p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[11px] font-black shadow-md">
                                            {staffName.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 text-left">
                                            <p className="text-xs font-black dark:text-white truncate tracking-tight">{staffName}</p>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-bold leading-none mt-1">{userRole}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile User Profile at bottom of expanded menu */}
                            <div className="md:hidden mt-8 p-6 bg-slate-100 dark:bg-slate-800/60 rounded-[32px] border border-slate-200 dark:border-slate-800/60 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-black shadow-lg">
                                    {staffName.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black dark:text-white truncate tracking-tight">{staffName}</p>
                                    <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mt-1">{userRole}</p>
                                </div>
                                <Button variant="ghost" className="rounded-xl w-10 h-10 p-0" onClick={onClose}>
                                    <LogOut size={18} />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className={`
                        flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800/50 relative overflow-hidden
                        ${isMenuOpen ? 'hidden md:flex' : 'flex'}
                    `}>
                        <DialogHeader className="px-8 md:px-10 pt-8 md:pt-10 pb-4 md:pb-6 shrink-0 text-left relative z-20 bg-white dark:bg-slate-900">
                            <DialogTitle className="text-3xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                {activeTabLabel}
                            </DialogTitle>
                            <DialogDescription className="text-sm md:text-sm text-slate-500 mt-2 font-medium opacity-80">
                                Customize your portal experience and preferences
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-8 md:pb-10 custom-scrollbar relative min-h-0">
                            {/* Visual Glow behind contents */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />

                            {activeTab === "general" && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="space-y-5">
                                        <h4 className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-slate-400">System Preferences</h4>
                                        <div className="p-6 md:p-6 rounded-[28px] bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/40 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <Label className="text-base md:text-base font-bold flex items-center gap-2">
                                                        {soundEnabled ? <Volume2 size={18} className="text-indigo-500" /> : <VolumeX size={18} className="text-slate-400" />}
                                                        Audio Feedback
                                                    </Label>
                                                    <p className="text-xs text-slate-500 font-medium">Play interactive sounds for events and alerts</p>
                                                </div>
                                                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} className="data-[state=checked]:bg-indigo-600" />
                                            </div>
                                            <div className="h-px bg-slate-200/50 dark:bg-slate-700/40" />
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <Label className="text-base md:text-base font-bold flex items-center gap-2">
                                                        <Monitor size={18} className="text-indigo-500" />
                                                        Desktop Mode
                                                    </Label>
                                                    <p className="text-xs text-slate-500 font-medium">Force professional desktop layout on large mobile devices</p>
                                                </div>
                                                <Switch checked={true} className="data-[state=checked]:bg-indigo-600" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        <h4 className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-slate-400">Regional</h4>
                                        <div className="p-6 md:p-6 rounded-[28px] bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/40 flex items-center justify-between group cursor-pointer hover:border-indigo-500/30 transition-all">
                                            <div className="space-y-1">
                                                <Label className="text-base md:text-base font-bold">Language Setting</Label>
                                                <p className="text-xs text-slate-500 font-medium">Choose your preferred system display language</p>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-4 py-2 rounded-full uppercase tracking-wider">
                                                English (US)
                                                <ChevronRight size={14} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "appearance" && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="space-y-5">
                                        <h4 className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-slate-400">Interface Theme</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <button
                                                onClick={() => isDark && toggleTheme()}
                                                className={`p-6 rounded-[32px] border-2 transition-all duration-300 flex flex-col gap-4 relative overflow-hidden group ${!isDark ? 'border-indigo-600 bg-indigo-50/30 ring-4 ring-indigo-500/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-indigo-500/40'}`}
                                            >
                                                <div className="w-full aspect-[1.6/1] bg-white rounded-2xl shadow-inner border border-slate-100 flex flex-col p-3 gap-2 overflow-hidden transform group-hover:scale-105 transition-transform duration-500">
                                                    <div className="h-2 w-1/2 bg-slate-200 rounded-full animate-pulse" />
                                                    <div className="h-2 w-3/4 bg-slate-100 rounded-full" />
                                                    <div className="mt-auto flex gap-1.5">
                                                        <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm" />
                                                        <div className="w-3 h-3 rounded-full bg-slate-200" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between w-full px-1">
                                                    <span className="text-sm font-black uppercase tracking-widest text-slate-700">Light</span>
                                                    {!isDark && <div className="p-1 bg-indigo-600 rounded-full text-white"><Check size={12} strokeWidth={3} /></div>}
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => !isDark && toggleTheme()}
                                                className={`p-6 rounded-[32px] border-2 transition-all duration-300 flex flex-col gap-4 relative overflow-hidden group ${isDark ? 'border-indigo-500 bg-slate-800/40 ring-4 ring-indigo-500/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-indigo-500/40'}`}
                                            >
                                                <div className="w-full aspect-[1.6/1] bg-slate-950 rounded-2xl shadow-inner border border-white/5 flex flex-col p-3 gap-2 overflow-hidden transform group-hover:scale-105 transition-transform duration-500">
                                                    <div className="h-2 w-1/2 bg-slate-800 rounded-full animate-pulse" />
                                                    <div className="h-2 w-3/4 bg-slate-700 rounded-full" />
                                                    <div className="mt-auto flex gap-1.5">
                                                        <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm" />
                                                        <div className="w-3 h-3 rounded-full bg-slate-800" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between w-full px-1">
                                                    <span className="text-sm font-black uppercase tracking-widest text-slate-100">Dark</span>
                                                    {isDark && <div className="p-1 bg-indigo-500 rounded-full text-white"><Check size={12} strokeWidth={3} /></div>}
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "notifications" && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="space-y-5">
                                        <h4 className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-slate-400">System Notification Nodes</h4>
                                        <div className="p-6 md:p-8 rounded-[32px] bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/40 space-y-7">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <Label className="text-base md:text-base font-bold text-slate-900 dark:text-white">Push Notifications</Label>
                                                    <p className="text-xs text-slate-400 font-medium">Receive real-time alerts on your current device</p>
                                                </div>
                                                <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} className="data-[state=checked]:bg-indigo-600 scale-110" />
                                            </div>
                                            <div className="h-px bg-slate-200/50 dark:bg-slate-700/40" />
                                            <div className="space-y-5">
                                                {[
                                                    { id: 'orders', label: 'Order Alerts', desc: 'Critical alerts for new incoming orders' },
                                                    { id: 'stock', label: 'Inventory Monitor', desc: 'Alerts when stock levels hit threshold' },
                                                    { id: 'delivery', label: 'Fleet Status', desc: 'Updates from active delivery partners' }
                                                ].map((item) => (
                                                    <div key={item.id} className="flex items-center justify-between px-1">
                                                        <div className="space-y-1">
                                                            <Label className="text-sm font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{item.label}</Label>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{item.desc}</p>
                                                        </div>
                                                        <Switch checked={notificationsEnabled} disabled={!notificationsEnabled} className="scale-90" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "usage" && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                                        <div className="p-6 md:p-7 rounded-[32px] bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-100 dark:border-slate-800/60 relative overflow-hidden shadow-sm group hover:shadow-md transition-all">
                                            <div className="absolute -top-4 -right-4 p-8 opacity-10 text-indigo-600 transform rotate-12 group-hover:scale-110 transition-transform"><Database size={80} /></div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Bandwidth</p>
                                            <div className="flex flex-col">
                                                <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">1.24</h3>
                                                <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">GigaBytes</span>
                                            </div>
                                            <div className="mt-5 md:mt-6 space-y-2">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                                    <span>Used</span>
                                                    <span>42% OF PLAN</span>
                                                </div>
                                                <div className="w-full bg-slate-200/50 dark:bg-slate-700/50 h-2 rounded-full overflow-hidden p-0.5">
                                                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full shadow-sm w-[42%]" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 md:p-7 rounded-[32px] bg-gradient-to-br from-emerald-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-100 dark:border-slate-800/60 relative overflow-hidden shadow-sm group hover:shadow-md transition-all">
                                            <div className="absolute -top-4 -right-4 p-8 opacity-10 text-emerald-600 transform -rotate-12 group-hover:scale-110 transition-transform"><Zap size={80} /></div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">System Load</p>
                                            <div className="flex flex-col">
                                                <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">45.2</h3>
                                                <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">K Requests</span>
                                            </div>
                                            <div className="mt-5 md:mt-6 space-y-2">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                                    <span>API Health</span>
                                                    <span>OPTIMAL</span>
                                                </div>
                                                <div className="w-full bg-slate-200/50 dark:bg-slate-700/50 h-2 rounded-full overflow-hidden p-0.5">
                                                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full shadow-sm w-[28%]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-1 space-y-5">
                                        <h4 className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-slate-400">Resource Matrix</h4>
                                        <div className="space-y-4">
                                            {[
                                                { name: "Order Engine", data: "450 MB", calls: "12,402", color: "bg-pink-500", percent: 85, icon: ClipboardList },
                                                { name: "Inventory Cloud", data: "120 MB", calls: "4,150", color: "bg-blue-500", percent: 35, icon: Package },
                                                { name: "Product Catalog", data: "85 MB", calls: "2,840", color: "bg-violet-500", percent: 25, icon: ShoppingBag },
                                            ].map((app) => (
                                                <div key={app.name} className="group p-6 rounded-[32px] bg-white dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-3 rounded-2xl ${app.color}/10 text-slate-700 dark:text-slate-200 group-hover:${app.color} group-hover:text-white transition-all`}>
                                                                <app.icon size={20} strokeWidth={2.5} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">{app.name}</span>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest uppercase mt-0.5">Active Module</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6 self-end sm:self-auto">
                                                            <div className="text-right">
                                                                <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{app.data}</p>
                                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">IO</p>
                                                            </div>
                                                            <div className="text-right border-l border-slate-100 dark:border-slate-700 pl-6">
                                                                <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{app.calls}</p>
                                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Syncs</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-slate-100 dark:bg-slate-700/50 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className={`${app.color} h-full rounded-full group-hover:brightness-110 transition-all duration-700 ease-out`}
                                                            style={{ width: `${app.percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "account" && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 py-8 md:py-10">
                                    <div className="flex flex-col md:flex-row items-center gap-8 p-8 rounded-[38px] bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/40">
                                        <div className="relative shrink-0">
                                            <div className="w-28 h-28 md:w-32 md:h-32 rounded-[40px] bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-xl group overflow-hidden border-4 border-white dark:border-slate-700">
                                                <User size={56} className="md:size-64 opacity-20 group-hover:scale-110 transition-transform" />
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600/80 text-white font-black text-[10px] uppercase tracking-widest">
                                                    Change
                                                </div>
                                            </div>
                                            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center text-indigo-600">
                                                <Shield size={20} strokeWidth={3} />
                                            </div>
                                        </div>
                                        <div className="space-y-4 flex-1 text-center md:text-left">
                                            <div className="space-y-1">
                                                <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Account Center</h3>
                                                <p className="text-[10px] md:text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Active System Profile</p>
                                            </div>
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[400px]">Identity and role management is centralized for security. Contact the Portal Administrator for detail overrides.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Button variant="outline" className="rounded-[22px] h-16 px-8 font-black uppercase text-[10px] tracking-widest border-2 hover:bg-slate-50">Request Access Log</Button>
                                        <Button className="rounded-[22px] h-16 px-8 font-black uppercase text-[10px] tracking-widest bg-indigo-600 shadow-lg shadow-indigo-500/20">Verify Identity</Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer - Baked in look */}
                        <div className="p-8 md:p-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-end gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shrink-0">
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="rounded-[20px] h-15 sm:h-12 px-10 font-black text-slate-500 uppercase text-xs tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Discard
                            </Button>
                            <Button
                                onClick={onClose}
                                className="rounded-[20px] h-15 sm:h-12 px-12 bg-slate-950 dark:bg-indigo-600 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
                            >
                                Apply Changes
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SettingsModal;
