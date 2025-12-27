import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Shield, Users, Truck, LogIn, Sparkles, Info, Key, ChevronRight, LayoutDashboard, Globe, ArrowLeft, Sun, Moon, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { useTheme } from "@/contexts/ThemeContext";

const Gateway = () => {
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();
    const [view, setView] = useState<'selection' | 'admin' | 'staff'>('selection');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form States
    const [adminData, setAdminData] = useState({ username: '', password: '' });
    const [staffData, setStaffData] = useState({ username: '', password: '' });

    useEffect(() => {
        // Redirect if already logged in (session-based)
        const userRole = sessionStorage.getItem("user_role");
        const adminAuth = sessionStorage.getItem("admin_auth");
        const staffAuth = sessionStorage.getItem("staff_auth");

        if (userRole && (adminAuth || staffAuth)) {
            navigate("/apps");
        } else if (sessionStorage.getItem("delivery_user")) {
            navigate("/delivery");
        }
    }, [navigate]);

    const handleAdminLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (adminData.username === 'admin' && adminData.password === 'admin') {
            toast.success("Welcome back, Commander!");
            sessionStorage.clear();
            sessionStorage.setItem("admin_auth", "true");
            sessionStorage.setItem("user_role", "admin");
            navigate("/apps");
        } else {
            toast.error("Invalid Admin Credentials");
        }
    };

    const handleStaffLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!staffData.username || !staffData.password) {
            toast.error("Please enter credentials");
            return;
        }

        setLoading(true);
        try {
            const db = firebase.database();
            const staffRef = db.ref("root/staff");
            const snapshot = await staffRef.once("value");
            const staffs = snapshot.val();

            if (staffs) {
                const staffArray = Object.values(staffs) as any[];
                const matchedStaff = staffArray.find(
                    s => s.username === staffData.username && s.password === staffData.password
                );

                if (matchedStaff) {
                    toast.success(`Welcome, ${matchedStaff.name}!`);
                    sessionStorage.clear();
                    sessionStorage.setItem("staff_auth", "true");
                    sessionStorage.setItem("user_role", "staff");
                    sessionStorage.setItem("staff_name", matchedStaff.name);
                    sessionStorage.setItem("allowed_apps", JSON.stringify(matchedStaff.allowedApps || []));
                    navigate("/apps");
                } else {
                    toast.error("Invalid Username or Password");
                }
            } else {
                toast.error("No staff accounts found. Contact Admin.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const handleSelection = (type: 'admin' | 'staff' | 'delivery') => {
        if (type === 'admin') {
            // auto-fill master credentials for convenience
            setAdminData({ username: 'admin', password: 'admin' });
            setView('admin');
        } else if (type === 'staff') setView('staff');
        else navigate('/delivery');
    };

    // Ensure admin credentials are available if user navigates directly to admin view
    useEffect(() => {
        if (view === 'admin' && (!adminData.username && !adminData.password)) {
            setAdminData({ username: 'admin', password: 'admin' });
        }
    }, [view]);

    return (
        <div className={`min-h-screen flex items-center justify-center p-6 sm:p-8 overflow-hidden relative selection:bg-blue-500/30 font-sans antialiased transition-colors duration-500 ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>

            {/* Theme Toggle Button */}
            <div className="absolute top-6 right-6 z-50 animate-reveal-up">
                <button
                    onClick={toggleTheme}
                    className={`p-3 rounded-2xl border transition-all duration-300 ${isDark
                        ? 'bg-slate-900/50 border-slate-800 text-yellow-400 hover:bg-slate-800'
                        : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-50 shadow-sm'
                        }`}
                >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
            </div>

            {/* Advanced background system */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] animate-float transition-colors duration-1000 ${isDark ? 'bg-blue-600/20' : 'bg-blue-400/10'}`} />
                <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] animate-float-reverse transition-colors duration-1000 ${isDark ? 'bg-violet-600/20' : 'bg-violet-400/10'}`} />
                <div className={`absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full blur-[100px] animate-glow-pulse transition-colors duration-1000 ${isDark ? 'bg-indigo-600/10' : 'bg-indigo-400/5'}`} />

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
                <div className={`absolute inset-x-0 top-0 h-px transition-colors duration-1000 ${isDark ? 'bg-gradient-to-r from-transparent via-white/10 to-transparent' : 'bg-gradient-to-r from-transparent via-slate-200 to-transparent'}`} />
                <div className={`absolute inset-x-0 bottom-0 h-px transition-colors duration-1000 ${isDark ? 'bg-gradient-to-r from-transparent via-white/10 to-transparent' : 'bg-gradient-to-r from-transparent via-slate-200 to-transparent'}`} />
            </div>

            <div className="relative z-10 w-full max-w-5xl">
                <div className="text-center mb-6 space-y-2 animate-reveal-up">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium uppercase tracking-[0.2em] backdrop-blur-md mb-2 transition-colors duration-300 ${isDark ? 'bg-white/5 border-white/10 text-white/60' : 'bg-white border-slate-200 text-slate-500 shadow-sm'}`}>
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        <span>Unified Access Control</span>
                    </div>
                    <h1 className={`text-5xl sm:text-7xl font-black tracking-tighter leading-[0.9] text-balance transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Daily<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500">Club</span>
                    </h1>
                    <p className={`text-lg sm:text-xl font-medium max-w-2xl mx-auto leading-relaxed transition-colors duration-300 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        One ecosystem. Infinite possibilities. Select your access point.
                    </p>
                </div>

                {view === 'selection' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Admin Option */}
                        <div
                            onClick={() => handleSelection('admin')}
                            className="group relative cursor-pointer opacity-0 animate-reveal-up stagger-1"
                        >
                            <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-0 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                            <Card className={`relative h-full border backdrop-blur-3xl overflow-hidden rounded-[2rem] transition-all duration-500 group-hover:translate-y-[-8px] ${isDark ? 'bg-slate-900/40 border-slate-800/50 group-hover:bg-slate-900/60' : 'bg-white/80 border-slate-200 group-hover:bg-white shadow-xl shadow-slate-200/50'}`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <CardHeader className="p-8 pb-4 text-center">
                                    <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-blue-500/20 shadow-2xl shadow-blue-500/10 text-blue-500">
                                        <Shield className="w-10 h-10" />
                                    </div>
                                    <CardTitle className={`text-2xl font-black mb-2 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>Administrator</CardTitle>
                                    <CardDescription className={`text-sm leading-relaxed px-4 font-medium transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Full system control, data analytics, and global configuration.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="p-8 pt-0">
                                    <div className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl border font-bold transition-all duration-500 group-hover:bg-blue-600 group-hover:border-blue-500 group-hover:text-white group-hover:shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)] group-hover:scale-[1.02] ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                                        <span>Enter Portal</span>
                                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </div>

                                </CardContent>

                                <div className="absolute inset-0 shimmer-bg opacity-0 group-hover:opacity-10" />
                            </Card>
                        </div>

                        {/* Staff Option */}
                        <div
                            onClick={() => handleSelection('staff')}
                            className="group relative cursor-pointer opacity-0 animate-reveal-up stagger-2"
                        >
                            <div className="absolute -inset-0.5 bg-gradient-to-br from-violet-600 to-purple-600 rounded-[2.5rem] blur opacity-0 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                            <Card className={`relative h-full border backdrop-blur-3xl overflow-hidden rounded-[2rem] transition-all duration-500 group-hover:translate-y-[-8px] ${isDark ? 'bg-slate-900/40 border-slate-800/50 group-hover:bg-slate-900/60' : 'bg-white/80 border-slate-200 group-hover:bg-white shadow-xl shadow-slate-200/50'}`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <CardHeader className="p-8 pb-4 text-center">
                                    <div className="w-20 h-20 rounded-3xl bg-violet-500/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 border border-violet-500/20 shadow-2xl shadow-violet-500/10 text-violet-500">
                                        <Users className="w-10 h-10" />
                                    </div>
                                    <CardTitle className={`text-2xl font-black mb-2 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>Store Staff</CardTitle>
                                    <CardDescription className={`text-sm leading-relaxed px-4 font-medium transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Manage inventory, process tasks, and oversee daily operations.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="p-8 pt-0">
                                    <div className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl border font-bold transition-all duration-500 group-hover:bg-violet-600 group-hover:border-violet-500 group-hover:text-white group-hover:shadow-[0_0_30px_-5px_rgba(124,58,237,0.4)] group-hover:scale-[1.02] ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                                        <span>Staff Access</span>
                                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </CardContent>

                                <div className="absolute inset-0 shimmer-bg opacity-0 group-hover:opacity-10" />
                            </Card>
                        </div>

                        {/* Delivery Option */}
                        <div
                            onClick={() => handleSelection('delivery')}
                            className="group relative cursor-pointer opacity-0 animate-reveal-up stagger-3"
                        >
                            <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-[2.5rem] blur opacity-0 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                            <Card className={`relative h-full border backdrop-blur-3xl overflow-hidden rounded-[2rem] transition-all duration-500 group-hover:translate-y-[-8px] ${isDark ? 'bg-slate-900/40 border-slate-800/50 group-hover:bg-slate-900/60' : 'bg-white/80 border-slate-200 group-hover:bg-white shadow-xl shadow-slate-200/50'}`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <CardHeader className="p-8 pb-4 text-center">
                                    <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-emerald-500/20 shadow-2xl shadow-emerald-500/10 text-emerald-500">
                                        <Truck className="w-10 h-10" />
                                    </div>
                                    <CardTitle className={`text-2xl font-black mb-2 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>Delivery Fleet</CardTitle>
                                    <CardDescription className={`text-sm leading-relaxed px-4 font-medium transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Real-time tracking, order fulfillment, and route optimization.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="p-8 pt-0">
                                    <div className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl border font-bold transition-all duration-500 group-hover:bg-emerald-600 group-hover:border-emerald-500 group-hover:text-white group-hover:shadow-[0_0_30px_-5px_rgba(5,150,105,0.4)] group-hover:scale-[1.02] ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                                        <span>Join Fleet</span>
                                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </CardContent>

                                <div className="absolute inset-0 shimmer-bg opacity-0 group-hover:opacity-10" />
                            </Card>
                        </div>
                    </div>
                )}

                {(view === 'admin' || view === 'staff') && (
                    <div className="animate-reveal-up flex justify-center">
                        <Card className={`w-full max-w-md border backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden relative transition-all duration-500 ${isDark ? 'bg-slate-900/60 border-slate-800/80 shadow-slate-950/50' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                            <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r transition-all duration-500 ${view === 'admin' ? 'from-blue-500 to-indigo-500' : 'from-violet-500 to-pink-500'}`} />

                            <CardHeader className="text-center p-6 sm:p-8 pb-0">
                                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl transition-all duration-500 ${view === 'admin' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-violet-500/10 border-violet-500/20 text-violet-500'} border`}>
                                    {view === 'admin' ? <Shield className="w-10 h-10" /> : <Users className="w-10 h-10" />}
                                </div>
                                <CardTitle className={`text-3xl font-black transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>{view === 'admin' ? 'Admin Portal' : 'Staff Login'}</CardTitle>
                                <CardDescription className={`font-medium transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {view === 'admin' ? '"Access granted to authorized commanders."' : 'Internal staff authentication point.'}
                                </CardDescription>
                                {view === 'admin' && (
                                    <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-mono transition-all duration-300 ${isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                                        <Key className="w-3 h-3" />
                                        <span>User: <strong>admin</strong> | Pass: <strong>admin</strong></span>
                                    </div>
                                )}
                            </CardHeader>

                            <CardContent className="p-6 sm:p-8 pt-0 space-y-4">
                                {view === 'admin' ? (
                                    <>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className={`text-[10px] font-bold uppercase tracking-[0.2em] ml-1 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Identity</Label>
                                                <div className="relative group">
                                                    <LayoutDashboard className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-600'}`} />
                                                    <Input
                                                        placeholder="admin"
                                                        value={adminData.username}
                                                        onChange={(e) => setAdminData({ ...adminData, username: e.target.value })}
                                                        className={`h-14 pl-12 rounded-2xl transition-all border-2 ${isDark ? 'bg-white/5 border-slate-800 text-white focus:ring-blue-500/40 focus:border-blue-500/40' : 'bg-slate-50 border-slate-100 text-slate-900 focus:ring-blue-500/20 focus:border-blue-500/50'}`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className={`text-[10px] font-bold uppercase tracking-[0.2em] ml-1 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Security Key</Label>
                                                <div className="relative group">
                                                    <Key className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-600'}`} />
                                                    <Input
                                                        type="password"
                                                        placeholder="••••••••"
                                                        value={adminData.password}
                                                        onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                                                        className={`h-14 pl-12 rounded-2xl transition-all border-2 ${isDark ? 'bg-white/5 border-slate-800 text-white focus:ring-blue-500/40 focus:border-blue-500/40' : 'bg-slate-50 border-slate-100 text-slate-900 focus:ring-blue-500/20 focus:border-blue-500/50'}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <Button onClick={handleAdminLogin} className={`w-full font-black h-14 rounded-2xl shadow-2xl group transition-all duration-300 ${isDark ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'}`}>
                                            <span>Initialize Dashboard</span>
                                            <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                                        </Button>

                                    </>
                                ) : (
                                    <form onSubmit={handleStaffLogin} className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className={`text-[10px] font-bold uppercase tracking-[0.2em] ml-1 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Staff Identity</Label>
                                                <div className="relative group">
                                                    <Users className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-violet-400' : 'text-slate-400 group-focus-within:text-violet-600'}`} />
                                                    <Input
                                                        placeholder="username"
                                                        value={staffData.username}
                                                        onChange={(e) => setStaffData({ ...staffData, username: e.target.value })}
                                                        className={`h-14 pl-12 rounded-2xl transition-all border-2 ${isDark ? 'bg-white/5 border-slate-800 text-white focus:ring-violet-500/40 focus:border-violet-500/40' : 'bg-slate-50 border-slate-100 text-slate-900 focus:ring-violet-500/20 focus:border-violet-500/50'}`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className={`text-[10px] font-bold uppercase tracking-[0.2em] ml-1 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Security Code</Label>
                                                <div className="relative group">
                                                    <Lock size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-violet-400' : 'text-slate-400 group-focus-within:text-violet-600'}`} />
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                        value={staffData.password}
                                                        onChange={(e) => setStaffData({ ...staffData, password: e.target.value })}
                                                        className={`h-14 pl-12 pr-12 rounded-2xl transition-all border-2 ${isDark ? 'bg-white/5 border-slate-800 text-white focus:ring-violet-500/40 focus:border-violet-500/40' : 'bg-slate-50 border-slate-100 text-slate-900 focus:ring-violet-500/20 focus:border-violet-500/50'}`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500"
                                                    >
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <Button type="submit" disabled={loading} className={`w-full font-black h-14 rounded-2xl shadow-2xl group transition-all duration-300 ${isDark ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/30' : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20'}`}>
                                            {loading ? "Verifying..." : "Authorized Entrance"}
                                            <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                                        </Button>
                                    </form>
                                )}

                                <button
                                    onClick={() => setView('selection')}
                                    className={`w-full transition-all text-xs font-bold uppercase tracking-widest mt-2 flex items-center justify-center gap-2 ${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
                                >
                                    <ArrowLeft size={14} />
                                    Return to Selection
                                </button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Footer Credits */}
                <div className="mt-8 text-center animate-reveal-up stagger-4 opacity-30 hover:opacity-100 transition-opacity duration-700">
                    <p className={`text-[10px] font-bold uppercase tracking-[0.4em] transition-colors ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        &copy; 2024 DailyClub Digital Ecosystem &bull; All Systems Operational
                    </p>
                </div>
            </div>
        </div>
    );
};

// Internal icon for forms
const Lock = ({ size, className }: { size: number, className: string }) => (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);

export default Gateway;
