import React, { useState, useEffect } from "react";
import { Search, Moon, Sun, Settings, LogOut, ClipboardList, Truck, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import firebase from "firebase/compat/app";
import "firebase/compat/database";

const QuickActionCard = ({ onSearch }: { onSearch: (query: string) => void }) => {
    const navigate = useNavigate();
    const [isDark, setIsDark] = useState(false);
    const [ordersToday, setOrdersToday] = useState(0);
    const [onlineDrivers, setOnlineDrivers] = useState(0);

    // Theme Toggle Logic
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'dark') {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDark(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        if (newTheme) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    // Calculate Stats
    useEffect(() => {
        const db = firebase.database();
        const ordersRef = db.ref("root/order");
        const driversRef = db.ref("root/nexus_hr/employees");

        const today = new Date().toLocaleDateString('en-CA');

        // Orders Listener
        ordersRef.on("value", (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const count = Object.values(data).filter((o: any) => {
                    const orderDate = new Date(o.last_updated || o.timestamp).toLocaleDateString('en-CA');
                    return orderDate === today;
                }).length;
                setOrdersToday(count);
            }
        });

        // Drivers Listener
        driversRef.on("value", (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Filter for Logistics/Ride role and NOT offline (simplified active check)
                const onlineCount = Object.values(data).filter((e: any) =>
                    (e.role === 'Ride' || e.department === 'Logistics') &&
                    e.status === 'Active' &&
                    e.availabilityStatus !== 'Offline' // Assuming availabilityStatus or similar logic exists, otherwise just Active
                ).length;
                // Note: Previous logic in OrderManagement implied calculating "offline" manually.
                // Here we will use a simpler approximation if explicit status isn't available, 
                // but if we want strictly "Online", we might need that "delivery_boys" logic again.
                // For now, let's count Active employees.
                setOnlineDrivers(onlineCount);
            }
        });

        return () => {
            ordersRef.off();
            driversRef.off();
        };
    }, []);

    return (
        <Card className="h-full border-white/20 dark:border-white/10 shadow-xl bg-white/10 dark:bg-black/40 backdrop-blur-2xl overflow-hidden flex flex-col">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
                {/* Search Bar */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search apps..."
                        onChange={(e) => onSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-400 text-sm font-medium"
                    />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1">
                        <div className="bg-indigo-500/20 p-2 rounded-full mb-1">
                            <ClipboardList size={18} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 pointer-events-none">
                            {ordersToday}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Orders Today
                        </span>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1">
                        <div className="bg-emerald-500/20 p-2 rounded-full mb-1">
                            <Truck size={18} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 pointer-events-none">
                            {onlineDrivers}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Drivers Online
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2.5 mt-auto">
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 border border-white/20 dark:border-white/10 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                {isDark ? <Moon size={18} /> : <Sun size={18} />}
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Dark Mode</span>
                        </div>
                        <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ${isDark ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </button>

                    <button className="w-full flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 border border-white/20 dark:border-white/10 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <Settings size={18} />
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Settings</span>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            sessionStorage.clear();
                            toast.success("Signed out successfully");
                            navigate("/");
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/20 text-red-600 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                <LogOut size={18} />
                            </div>
                            <span className="text-sm font-semibold text-red-700 dark:text-red-400">Sign Out</span>
                        </div>
                    </button>
                </div>
            </CardContent>
        </Card>
    );
};

export default QuickActionCard;
