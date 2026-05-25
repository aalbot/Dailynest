import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Shield, Users, Truck, LogIn, Sparkles, Info, Key, ChevronRight, LayoutDashboard, Globe, ArrowLeft, Sun, Moon, Eye, EyeOff, UserPlus, Phone, Mail, User, Briefcase, Globe2 } from "lucide-react";
import { toast } from "sonner";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { useTheme } from "@/contexts/ThemeContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLang } from "@/contexts/LanguageContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useData } from '@/data/react/useData';
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const Gateway = () => {
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();
    const { getTranslation } = useLang();
    const { config: branding } = useBranding();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isSignup, setIsSignup] = useState(false);

useEffect(() => {

  const handleMouseMove = (e: MouseEvent) => {

    const mouseY = e.clientY;

    const screenHeight = window.innerHeight;

    const percentage = mouseY / screenHeight;

    const maxScroll =
      document.documentElement.scrollHeight -
      window.innerHeight;

    window.scrollTo({
      top: percentage * maxScroll,
      behavior: "smooth",
    });
  };

  document.addEventListener("mousemove", handleMouseMove);

  return () => {
    document.removeEventListener("mousemove", handleMouseMove);
  };

}, []);
    // Login Form State
    const [loginData, setLoginData] = useState({ identity: '', password: '' });

    // Unified Signup State
    const [signupData, setSignupData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        roleType: 'Staff' as 'Staff' | 'Delivery' | 'External',
        photoUrl: ''
    });
    const [isValidEmail, setIsValidEmail] = useState(false);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.src = reader.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const maxSize = 256; // Standardize size
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    ctx?.drawImage(img, 0, 0, width, height);
                    setSignupData(prev => ({ ...prev, photoUrl: canvas.toDataURL('image/jpeg', 0.8) }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        // Redirect if already logged in (session-based)
        const userRole = sessionStorage.getItem("user_role");
        const adminAuth = sessionStorage.getItem("admin_auth");
        const staffAuth = sessionStorage.getItem("staff_auth");
        const deliveryAuth = sessionStorage.getItem("delivery_user");

        if (userRole && (adminAuth || staffAuth)) {
            navigate("/apps");
        } else if (deliveryAuth) {
            navigate("/delivery");
        }
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginData.identity || !loginData.password) {
            toast.error(getTranslation("gateway.login.missingCredentials"));
            return;
        }

        setLoading(true);
        const db = firebase.database();

        try {
            // 0. Check Superadmin
            if (loginData.identity === 'superadmin' && loginData.password === 'superadmin') {
                toast.success("Welcome Superadmin");
                sessionStorage.clear();
                sessionStorage.setItem("admin_auth", "true");
                sessionStorage.setItem("user_role", "superadmin");
                navigate("/apps");
                return;
            }

            // 1. Check Hardcoded Admin
            if (loginData.identity === 'admin' && loginData.password === 'admin') {
                toast.success(getTranslation("gateway.login.welcomeAdmin"));
                sessionStorage.clear();
                sessionStorage.setItem("admin_auth", "true");
                sessionStorage.setItem("user_role", "admin");
                navigate("/apps");
                return;
            }

            // 2. Check Staff Table
            const staffRef = db.ref("root/staff");
            const staffSnap = await staffRef.once("value");
            const staffs = staffSnap.val();

            if (staffs) {
                const matchedStaff = Object.values(staffs).find(
                    (s: any) => s.email === loginData.identity && s.password === loginData.password
                ) as any;

                if (matchedStaff) {
                    toast.success(getTranslation("gateway.login.welcomeUser", { name: matchedStaff.name }));
                    sessionStorage.clear();
                    sessionStorage.setItem("staff_auth", "true");
                    sessionStorage.setItem("user_role", "staff");
                    sessionStorage.setItem("user_status", matchedStaff.status || "Active");
                    sessionStorage.setItem("staff_id", matchedStaff.id);
                    sessionStorage.setItem("employee_id", matchedStaff.employeeId || "");
                    sessionStorage.setItem("staff_name", matchedStaff.name);
                    sessionStorage.setItem("allowed_apps", JSON.stringify(matchedStaff.allowedApps || []));
                    navigate("/apps");
                    return;
                }
            }

            // 3. Check Delivery Table
            const deliveryRef = db.ref("root/delivery_users");
            const deliverySnap = await deliveryRef.orderByChild("email").equalTo(loginData.identity).once("value");
            const deliveryUsers = deliverySnap.val();

            if (deliveryUsers) {
                const matchedDelivery = Object.values(deliveryUsers).find(
                    (d: any) => d.password === loginData.password
                ) as any;

                if (matchedDelivery) {
                    toast.success(getTranslation("gateway.login.welcomeUser", { name: matchedDelivery.name }));
                    sessionStorage.clear();
                    sessionStorage.setItem("delivery_user", JSON.stringify(matchedDelivery));
                    sessionStorage.setItem("user_role", "delivery");
                    sessionStorage.setItem("user_status", matchedDelivery.status || "Active");

                    if (matchedDelivery.status === 'pending' || matchedDelivery.status === 'Pending') {
                        navigate("/apps");
                    } else {
                        navigate("/delivery");
                    }
                    return;
                }
            }

            // 4. Check External Users Table
            const externalRef = db.ref("root/external_users");
            const externalSnap = await externalRef.orderByChild("email").equalTo(loginData.identity).once("value");
            const externalUsers = externalSnap.val();

            if (externalUsers) {
                const matchedExternal = Object.values(externalUsers).find(
                    (ex: any) => ex.password === loginData.password
                ) as any;

                if (matchedExternal) {
                    toast.success(getTranslation("gateway.login.welcomeUser", { name: matchedExternal.name }));
                    sessionStorage.clear();
                    sessionStorage.setItem("user_role", "external");
                    sessionStorage.setItem("user_status", matchedExternal.status || "Active");
                    sessionStorage.setItem("user_id", matchedExternal.id);
                    navigate("/apps");
                    return;
                }
            }

            toast.error(getTranslation("gateway.login.invalidCredentials"));
        } catch (error) {
            console.error(error);
            toast.error(getTranslation("gateway.login.authFailed"));
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!signupData.name || !signupData.email || !signupData.phone || !signupData.password) {
            toast.error(getTranslation("gateway.signup.missingFields"));
            return;
        }

        if (signupData.password !== signupData.confirmPassword) {
            toast.error(getTranslation("gateway.signup.passwordMismatch"));
            return;
        }

        setLoading(true);
        const db = firebase.database();

        try {
            const signupPayload = {
                name: signupData.name,
                email: signupData.email,
                phone: signupData.phone,
                password: signupData.password,
                status: 'pending',
                photoUrl: signupData.photoUrl || '',
                createdAt: new Date().toISOString()
            };

            let userId = "";

            if (signupData.roleType === 'Staff') {
                const staffRef = db.ref("root/staff").push();
                userId = staffRef.key!;
                await staffRef.set({
                    ...signupPayload,
                    id: userId,
                    username: signupData.email.split('@')[0], // Default username from email
                    role: "Pending Staff",
                    allowedApps: []
                });
            } else if (signupData.roleType === 'Delivery') {
                const deliveryRef = db.ref("root/delivery_users").push();
                userId = deliveryRef.key!;
                await deliveryRef.set({
                    ...signupPayload,
                    id: userId,
                    role: "Delivery Partner"
                });

                // Also Add to HR Employees
                const empRef = db.ref("root/nexus_hr/employees").push();
                await empRef.set({
                    id: empRef.key,
                    firstName: signupData.name.split(' ')[0],
                    lastName: signupData.name.split(' ').slice(1).join(' ') || '',
                    email: signupData.email,
                    contactNumber: signupData.phone,
                    role: "Ride",
                    department: "Logistics",
                    status: "Offline",
                    workStatus: "pending",
                    dateOfJoining: new Date().toISOString(),
                    deliveryUserId: userId
                });
            } else {
                const externalRef = db.ref("root/external_users").push();
                userId = externalRef.key!;
                await externalRef.set({
                    ...signupPayload,
                    id: userId,
                    role: "External User"
                });
            }

            // Write to Global Notifications for Admin
            const adminNotifyRef = db.ref("root/notifications").push();
            await adminNotifyRef.set({
                id: adminNotifyRef.key,
                title: getTranslation("gateway.signup.adminNotifyTitle"),
                message: getTranslation("gateway.signup.adminNotifyMessage", { name: signupData.name, role: signupData.roleType }),
                requesterName: signupData.name,
                userId: userId,
                type: "verification",
                timestamp: Date.now(),
                read: false,
                roleType: signupData.roleType
            });

            toast.success(getTranslation("gateway.signup.signupSuccess"));
            setIsSignup(false);
            setLoginData({ identity: signupData.email, password: signupData.password });
        } catch (error) {
            console.error(error);
            toast.error(getTranslation("gateway.signup.signupFailed"));
        } finally {
            setLoading(false);
        }
    };
    const validateEmail = (value) => {

        setSignupData({
        ...signupData,
        email: value});

const emailRegex =
/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

setIsValidEmail(
emailRegex.test(value.trim())
);

};

    return (
        
        <div className={`min-h-screen flex items-center justify-center p-6 sm:p-8 overflow-hidden relative selection:bg-blue-500/30 font-sans antialiased transition-colors duration-500 ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>

            {/* Theme Toggle Button */}
            <div className="absolute top-6 right-6 z-50 animate-reveal-up">
                <button
                    onClick={toggleTheme}
                    aria-label="Toggle Theme"
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

                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
                <div className={`absolute inset-x-0 top-0 h-px transition-colors duration-1000 ${isDark ? 'bg-gradient-to-r from-transparent via-white/10 to-transparent' : 'bg-gradient-to-r from-transparent via-slate-200 to-transparent'}`} />
                <div className={`absolute inset-x-0 bottom-0 h-px transition-colors duration-1000 ${isDark ? 'bg-gradient-to-r from-transparent via-white/10 to-transparent' : 'bg-gradient-to-r from-transparent via-slate-200 to-transparent'}`} />
            </div>

            <div className="relative z-10 w-full max-w-5xl">
                <div className="text-center mb-6 space-y-2 animate-reveal-up">
                    <img
                        src={branding.logoUrl}
                        alt={branding.appName}
                        className="mx-auto mb-4 h-20 w-20 rounded-3xl object-contain shadow-2xl shadow-indigo-500/25 ring-1 ring-white/30 dark:ring-white/10"
                    />
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium uppercase tracking-[0.2em] backdrop-blur-md mb-2 transition-colors duration-300 ${isDark ? 'bg-white/5 border-white/10 text-white/60' : 'bg-white border-slate-200 text-slate-500 shadow-sm'}`}>
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        <span>{getTranslation("gateway.badge")}</span>
                    </div>
                    <h1 className={`text-5xl sm:text-7xl font-black tracking-tighter leading-[0.9] text-balance transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500">{branding.appName}</span>
                    </h1>
                    <p className={`text-lg sm:text-xl font-medium max-w-2xl mx-auto leading-relaxed transition-colors duration-300 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {isSignup ? getTranslation("gateway.signupSubtitle") : getTranslation("gateway.subtitle")}
                    </p>
                </div>

                <div className="animate-reveal-up flex justify-center">
                    <Card className={`w-full max-w-md border backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden relative transition-all duration-500 ${isDark ? 'bg-slate-900/60 border-slate-800/80 shadow-slate-950/50' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                        <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r transition-all duration-500 ${isSignup ? 'from-indigo-500 via-purple-500 to-pink-500' : 'from-blue-500 via-indigo-500 to-violet-500'}`} />

                        <CardHeader className="text-center p-6 sm:p-8 pb-0">
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl transition-all duration-500 overflow-hidden ${isSignup ? 'bg-purple-500/10 border-purple-500/20' : 'bg-indigo-500/10 border-indigo-500/20'} border`}>
                                {isSignup ? (
                                    <UserPlus className="w-10 h-10 text-purple-500" />
                                ) : (
                                    <img src={branding.logoUrl} alt={branding.appName} className="h-full w-full object-contain p-2" />
                                )}
                            </div>
                            <CardTitle className={`text-3xl font-black transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {isSignup ? getTranslation("gateway.signup.title") : getTranslation("gateway.login.title")}
                            </CardTitle>
                            <CardDescription className={`font-medium transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {isSignup ? getTranslation("gateway.signup.description") : getTranslation("gateway.login.description")}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-6 sm:p-8 pt-6">
                            {!isSignup ? (
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className={`text-[10px] font-bold uppercase tracking-[0.2em] ml-1 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{getTranslation("gateway.login.identityLabel")}</Label>
                                        <div className="relative group">
                                            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-600'}`} />
                                            <Input
                                                placeholder={getTranslation("gateway.login.identityPlaceholder")}
                                                value={loginData.identity}
                                                onChange={(e) => setLoginData({ ...loginData, identity: e.target.value })}
                                                className={`h-14 pl-12 rounded-2xl transition-all border-2 ${isDark ? 'bg-white/5 border-slate-800 text-white focus:ring-blue-500/40 focus:border-blue-500/40' : 'bg-slate-50 border-slate-100 text-slate-900 focus:ring-blue-500/20 focus:border-blue-500/50'}`}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className={`text-[10px] font-bold uppercase tracking-[0.2em] ml-1 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{getTranslation("gateway.login.passwordLabel")}</Label>
                                        <div className="relative group">
                                            <Key className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-600'}`} />
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder={getTranslation("gateway.login.passwordPlaceholder")}
                                                value={loginData.password}
                                                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                                className={`h-14 pl-12 pr-12 rounded-2xl transition-all border-2 ${isDark ? 'bg-white/5 border-slate-800 text-white focus:ring-blue-500/40 focus:border-blue-500/40' : 'bg-slate-50 border-slate-100 text-slate-900 focus:ring-blue-500/20 focus:border-blue-500/50'}`}
                                            />
                                            <button
                                                type="button"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <Button type="submit" disabled={loading} className={`w-full font-black h-14 rounded-2xl shadow-2xl group transition-all duration-300 mt-4 ${isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'}`}>
                                        {loading ? getTranslation("gateway.login.verifying") : getTranslation("gateway.login.submitButton")}
                                        <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                                    </Button>

                                    <div className="text-center pt-4">
                                        <p className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {getTranslation("gateway.login.newHere")}
                                            <button
                                                type="button"
                                                onClick={() => setIsSignup(true)}
                                                className="ml-2 text-blue-500 hover:underline font-bold"
                                            >
                                                {getTranslation("gateway.login.registerLink")}
                                            </button>
                                        </p>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleSignup} className="space-y-4">
                                    {/* Image Upload */}
                                    <div className="flex justify-center mb-6">
                                        <div className="relative group cursor-pointer w-24 h-24">
                                            <div className={`w-24 h-24 rounded-full border-2 overflow-hidden flex items-center justify-center transition-all ${isDark ? 'bg-white/5 border-slate-700' : 'bg-slate-50 border-slate-200'} group-hover:border-indigo-500`}>
                                                {signupData.photoUrl ? (
                                                    <img decoding="async" loading="lazy" src={signupData.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <UserPlus className={`w-8 h-8 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="absolute bottom-0 right-0 bg-indigo-500 rounded-full p-1.5 shadow-lg transform translate-x-1 translate-y-1">
                                                <Sparkles className="w-3 h-3 text-white" />
                                            </div>
                                        </div>
                                        <p className={`text-[10px] mt-2 absolute -bottom-6 font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Upload Photo</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className={`text-[10px] font-bold uppercase tracking-[0.2em] ml-1 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{getTranslation("gateway.signup.roleTypeLabel")}</Label>
                                        <Select
                                            value={signupData.roleType}
                                            onValueChange={(val: any) => setSignupData({ ...signupData, roleType: val })}
                                        >
                                            <SelectTrigger className={`h-14 rounded-2xl border-2 transition-all ${isDark ? 'bg-white/5 border-slate-800 text-white focus:ring-purple-500/40 focus:border-purple-500/40' : 'bg-slate-50 border-slate-100 text-slate-900 focus:ring-purple-500/20 focus:border-purple-500/50'}`}>
                                                <SelectValue placeholder={getTranslation("gateway.signup.roleTypeLabel")} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                <SelectItem value="Staff" className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 inline-block mr-2" /> {getTranslation("gateway.signup.roleStaffLabel")}
                                                </SelectItem>
                                                <SelectItem value="Delivery">
                                                    <Truck className="w-4 h-4 inline-block mr-2" /> {getTranslation("gateway.signup.roleDeliveryLabel")}
                                                </SelectItem>
                                                <SelectItem value="External">
                                                    <Globe2 className="w-4 h-4 inline-block mr-2" /> {getTranslation("gateway.signup.roleExternalLabel")}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className={`text-[10px] font-bold uppercase tracking-[0.2em] ml-1 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{getTranslation("gateway.signup.nameLabel")}</Label>
                                        <div className="relative group">
                                            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-purple-400' : 'text-slate-400 group-focus-within:text-purple-600'}`} />
                                            <Input
                                                placeholder={getTranslation("gateway.signup.namePlaceholder")}
                                                value={signupData.name}
                                                onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                                                className={`h-14 pl-12 rounded-2xl transition-all border-2 ${isDark ? 'bg-white/5 border-slate-800 text-white focus:ring-purple-500/40 focus:border-purple-500/40' : 'bg-slate-50 border-slate-100 text-slate-900 focus:ring-purple-500/20 focus:border-purple-500/50'}`}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className={`text-[10px] font-bold uppercase tracking-[0.2em] ml-1 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{getTranslation("gateway.signup.emailLabel")}</Label>
                                          <div className="relative group">

<Mail
className="
absolute
left-4
top-1/2
-translate-y-1/2
w-4
h-4
z-10"
/>

<Input
type="email"
placeholder={getTranslation(
"gateway.signup.emailPlaceholder"
)}

value={signupData.email}

onChange={(e)=>
validateEmail(
e.target.value
)
}

className="pl-12 pr-12"
/>

{isValidEmail && (

<div
className="
absolute
right-4
top-1/2
-transform
-translate-y-1/2
w-5
h-5
bg-green-500
rounded-full
flex
items-center
justify-center
shadow-sm
"
>

<span
className="
text-white
text-xs
font-bold
"
>

✓

</span>

</div>

)}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className={`text-[10px] font-bold uppercase tracking-[0.2em] ml-1 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{getTranslation("gateway.signup.phoneLabel")}</Label>
                                            <div className="relative group">
                                                <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-purple-400' : 'text-slate-400 group-focus-within:text-purple-600'}`} />
                                                <Input
                                                    placeholder={getTranslation("gateway.signup.phonePlaceholder")}
                                                    value={signupData.phone}
                                                    onChange={(e) => setSignupData({ ...signupData, phone: e.target.value.replace(/\D/g,"") })}
                                                    className={`h-14 pl-12 rounded-2xl transition-all border-2 ${isDark ? 'bg-white/5 border-slate-800 text-white focus:ring-purple-500/40 focus:border-purple-500/40' : 'bg-slate-50 border-slate-100 text-slate-900 focus:ring-purple-500/20 focus:border-purple-500/50'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className={`text-[10px] font-bold uppercase tracking-[0.2em] ml-1 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{getTranslation("gateway.signup.passwordLabel")}</Label>
                                            <div className="relative group">
                                                <Key className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-purple-400' : 'text-slate-400 group-focus-within:text-purple-600'}`} />
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={signupData.password}
                                                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                                                    className={`h-14 pl-12 rounded-2xl transition-all border-2 ${isDark ? 'bg-white/5 border-slate-800 text-white focus:ring-purple-500/40 focus:border-purple-500/40' : 'bg-slate-50 border-slate-100 text-slate-900 focus:ring-purple-500/20 focus:border-purple-500/50'}`}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className={`text-[10px] font-bold uppercase tracking-[0.2em] ml-1 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{getTranslation("gateway.signup.confirmPasswordLabel")}</Label>
                                            <div className="relative group">
                                                <Key className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-purple-400' : 'text-slate-400 group-focus-within:text-purple-600'}`} />
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={signupData.confirmPassword}
                                                    onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                                                    className={`h-14 pl-12 rounded-2xl transition-all border-2 ${isDark ? 'bg-white/5 border-slate-800 text-white focus:ring-purple-500/40 focus:border-purple-500/40' : 'bg-slate-50 border-slate-100 text-slate-900 focus:ring-purple-500/20 focus:border-purple-500/50'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Button type="submit" disabled={loading} className={`w-full font-black h-14 rounded-2xl shadow-2xl group transition-all duration-300 mt-4 ${isDark ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20'}`}>
                                        {loading ? getTranslation("gateway.signup.submitting") : getTranslation("gateway.signup.submitButton")}
                                        <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() => setIsSignup(false)}
                                        className={`w-full transition-all text-xs font-bold uppercase tracking-widest mt-2 flex items-center justify-center gap-2 ${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
                                    >
                                        <ArrowLeft size={14} />
                                        {getTranslation("gateway.signup.backToLogin")}
                                    </button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Footer Credits */}
                <div className="mt-8 text-center animate-reveal-up stagger-4 opacity-30 hover:opacity-100 transition-opacity duration-700">
                    <p className={`text-[10px] font-bold uppercase tracking-[0.4em] transition-colors ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        &copy; 2024 {getTranslation("gateway.copyright", { appName: branding.appName })}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Gateway;
