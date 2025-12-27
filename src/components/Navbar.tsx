import { toast } from "sonner";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Crown,
  Star,
  Package,
  ShoppingBag,
  Truck,
  LayoutDashboard,
  ClipboardList,
  Keyboard,
  Building2,
  Grid3X3,
  Search,
  Bell,
  Sun,
  Moon,
  X,
  Check,
  Trash2,
  Settings,
  LogOut,
  User,
  Users,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNotification } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";

import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { iconMap } from "@/utils/appIcons";

const defaultAppItems = [
  { icon: TrendingUp, label: "Dashboard", path: "/dashboard", color: "bg-rose-500" },
  { icon: Users, label: "Employee Management", path: "/employee-management", color: "bg-indigo-600" },
  { icon: LayoutDashboard, label: "Report", path: "/overview", color: "bg-cyan-500" },
  { icon: Sparkles, label: "AI Chat", path: "/chat", color: "bg-blue-600" },
  { icon: ClipboardList, label: "Orders", path: "/orders", color: "bg-pink-500" },
  { icon: Truck, label: "Delivery", path: "/delivery", color: "bg-emerald-500" },
  { icon: Package, label: "Stocks", path: "/stock-entry", color: "bg-blue-500" },
  { icon: ShoppingBag, label: "Products", path: "/product-entry", color: "bg-violet-500" },
  { icon: Building2, label: "Purchase", path: "/back-office", color: "bg-teal-500" },
  { icon: Crown, label: "Wallet", path: "/premium-entry", color: "bg-yellow-500" },
  { icon: Star, label: "Promotions", path: "/rating-entry", color: "bg-orange-500" },
  { icon: Keyboard, label: "SEO", path: "/keyword-entry", color: "bg-indigo-500" },
  { icon: Grid3X3, label: "Task Manager", path: "/tasks", color: "bg-violet-600" },
  { icon: Bell, label: "Notification", path: "/notifications", color: "bg-red-500" },
  { icon: Users, label: "Staff", path: "/staffes", color: "bg-cyan-600" },
];

const Navbar = () => {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotification();
  const navigate = useNavigate();

  const [customApps, setCustomApps] = useState<any[]>([]);

  useEffect(() => {
    const db = firebase.database();
    const appsRef = db.ref("root/apps");
    const onValueChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        setCustomApps(Object.values(data));
      } else {
        setCustomApps([]);
      }
    };
    appsRef.on("value", onValueChange);
    return () => appsRef.off("value", onValueChange);
  }, []);

  const allAppsRaw = [
    ...defaultAppItems,
    ...customApps.map(app => ({
      icon: iconMap[app.icon] || Package,
      label: app.name,
      path: app.path || "/",
      color: app.colorClass || "bg-blue-500"
    }))
  ];

  const userRole = sessionStorage.getItem("user_role");
  const allowedApps = JSON.parse(sessionStorage.getItem("allowed_apps") || "[]");
  const staffName = sessionStorage.getItem("staff_name");

  const displayName = userRole === "admin" ? "Administrator" : (staffName || "Staff Member");
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const userEmail = userRole === "admin" ? "admin@dailyclub.com" : `${staffName?.toLowerCase().replace(/\s/g, '') || 'staff'}@dailyclub.staff`;

  const allApps = allAppsRaw.filter(app => {
    if (userRole === "admin") return true;
    if (userRole === "staff") return allowedApps.includes(app.path);
    if (userRole === "delivery") return app.path === "/delivery";
    return false;
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const filteredApps = searchQuery ? allApps.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase())) : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/apps" className="flex items-center gap-3">
            <img src="/logo.png" alt="DailyClub" className="w-9 h-9 rounded-xl object-contain" />
            <span className="font-bold text-lg tracking-tight text-slate-500 dark:text-slate-400">DailyClub</span>
          </Link>

          {/* Right side icons */}
          <div className="flex items-center gap-2">


            {/* Search */}
            {/* Search */}
            <div className="relative">
              <div className={`flex items-center transition-all duration-300 ease-in-out border ${searchOpen ? 'w-64 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'w-10 h-10 border-transparent hover:bg-secondary justify-center cursor-pointer'} rounded-full`}>
                <Search
                  onClick={() => { if (!searchOpen) setSearchOpen(true); }}
                  className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-opacity ${searchOpen ? 'opacity-50' : ''}`}
                />
                {searchOpen && (
                  <>
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search menus..."
                      className="ml-2 w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
                    />
                    <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full flex-shrink-0">
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  </>
                )}
              </div>

              {/* Search Results */}
              {searchOpen && searchQuery && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                    {filteredApps.length > 0 ? (
                      filteredApps.map(item => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                          className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg group transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center text-white shadow-sm`}>
                            <item.icon size={14} strokeWidth={2.5} />
                          </div>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
                        </Link>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">No matching apps found</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`p-2.5 rounded-full transition-colors relative ${notificationsOpen ? 'bg-secondary' : 'hover:bg-secondary'}`}
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 animate-in fade-in zoom-in-95 origin-top-right overflow-hidden z-50">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Notifications</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={markAllAsRead}
                        title="Mark all as read"
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={clearNotifications}
                        title="Clear all"
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                      <div className="flex flex-col">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markAsRead(n.id);
                              if (n.type === 'order') navigate('/orders');
                              if (n.type === 'delivery') navigate('/delivery');
                              setNotificationsOpen(false);
                            }}
                            className={`p-3 border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1">
                                <h4 className={`text-sm font-medium mb-0.5 ${!n.read ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {n.title}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                                  {n.message}
                                </p>
                                <span className="text-[10px] text-slate-400 mt-1.5 block">
                                  {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {!n.read && (
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 px-6 text-center text-slate-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">No new notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* App Launcher */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`p-2.5 rounded-full transition-colors ${menuOpen ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary hover:text-primary"
                  }`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>

              {/* App Menu Overlay/Modal */}
              {menuOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 pt-20">
                  {/* Backdrop with fade-in */}
                  <div
                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setMenuOpen(false)}
                  />

                  {/* Card starting from Navbar with 'Pop' Animation */}
                  <div className="relative w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-[40px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-800 flex flex-col max-h-[82vh] overflow-hidden animate-in zoom-in-90 slide-in-from-top-4 duration-300 ease-out">
                    {/* Header with Title */}
                    <div className="flex items-center justify-between p-7 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                          <Grid3X3 size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h3 className="font-black text-xl text-slate-900 dark:text-slate-100 tracking-tight">App Launcher</h3>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Quick Navigation</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setMenuOpen(false)}
                        className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-200 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:rotate-90"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    {/* Scrollable Content - More Grid spacing */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30 dark:bg-transparent">
                      <div className="grid grid-cols-3 gap-3 sm:gap-4">
                        {allApps.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            target={item.path === '/delivery' ? "_blank" : undefined}
                            rel={item.path === '/delivery' ? "noopener noreferrer" : undefined}
                            onClick={() => setMenuOpen(false)}
                            className={`flex flex-col items-center gap-3 p-5 rounded-3xl transition-all duration-300 group hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-indigo-500/5 ${location.pathname === item.path ? "bg-white dark:bg-slate-800 shadow-md ring-1 ring-slate-200 dark:ring-slate-700" : ""
                              }`}
                          >
                            <div className={`w-16 h-16 rounded-3xl ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500`}>
                              <item.icon className="w-7 h-7 text-white drop-shadow-md" strokeWidth={2} />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 text-center leading-tight uppercase tracking-[0.1em] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {item.label}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Footer with Glow */}
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                      <Link
                        to="/apps"
                        onClick={() => setMenuOpen(false)}
                        className="group relative flex items-center justify-center gap-3 py-4 w-full bg-slate-900 dark:bg-indigo-600 rounded-2xl text-xs font-black text-white uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95 shadow-xl shadow-slate-900/10 dark:shadow-indigo-500/20"
                      >
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        Explore Full Gallery
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="ml-1 w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold hover:shadow-md transition-shadow uppercase tracking-tighter"
              >
                {initials}
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 animate-in fade-in zoom-in-95 origin-top-right z-50 overflow-hidden">
                  <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{displayName}</p>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">{userEmail}</p>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isDark ? <Moon size={16} /> : <Sun size={16} />}
                        <span>Dark Mode</span>
                      </div>
                      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ${isDark ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </button>

                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>

                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 confirm-logout"></div>

                    <button
                      onClick={() => {
                        sessionStorage.clear();
                        toast.success("Signed out successfully");
                        navigate("/");
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
