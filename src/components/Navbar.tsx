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
  TrendingUp,
  LogIn,
  Clock,
  MessageSquare,
  Image,
  Search,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNotification } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";

import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { iconMap } from "@/utils/appIcons";
import SettingsModal from "./SettingsModal";
import { useLang } from "@/contexts/LanguageContext";
import { useBranding } from "@/contexts/BrandingContext";
import SearchBar from "./SearchBar";
import { normalizeDestinationUrl, isCustomAppExternalDestination } from "@/utils/destinationUrl";


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
  { icon: Settings, label: "Infra", path: "/infra", color: "bg-slate-800" },
  { icon: MessageSquare, label: "Broadcast", path: "/broadcast", color: "bg-emerald-600" },
  { icon: Image, label: "Banner Manage", path: "/banner-manage", color: "bg-teal-600" },
];

const Navbar = () => {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { config: branding } = useBranding();
  // ... existing state ...
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  /** Hide app suggestion list after outside click until user types again. */
  const [appSuggestDismissed, setAppSuggestDismissed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotification();
  const { getTranslation, locale } = useLang();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();

  // Staff specific states
  const [currentStaff, setCurrentStaff] = useState<any>(null);
  const [staffPhoto, setStaffPhoto] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [liveTimer, setLiveTimer] = useState("00:00:00");

  const [customApps, setCustomApps] = useState<any[]>([]);
  const [systemOverrides, setSystemOverrides] = useState<Record<string, any>>({});

  const staffId = sessionStorage.getItem("staff_id");

  useEffect(() => {
    const db = firebase.database();
    const appsRef = db.ref("root/apps");
    appsRef.on("value", (snapshot) => {
      const data = snapshot.val();
      setCustomApps(data ? Object.values(data) : []);
    });

    const overridesRef = db.ref("root/system_apps");
    overridesRef.on("value", (snap) => setSystemOverrides(snap.val() || {}));

    // Staff & Attendance Listener
    let staffRef: firebase.database.Reference | null = null;
    let empRef: firebase.database.Reference | null = null;
    const attRef = db.ref("root/nexus_hr/attendance");

    if (staffId) {
      staffRef = db.ref(`root/staff/${staffId}`);
      staffRef.on("value", (snapshot) => {
        const staff = snapshot.val();
        setCurrentStaff(staff);
        if (staff?.employeeId) {
          empRef = db.ref(`root/nexus_hr/employees/${staff.employeeId}`);
          empRef.on("value", (empSnap) => {
            setStaffPhoto(empSnap.val()?.photoUrl || null);
          });
        }
      });
    }

    attRef.on("value", (snapshot) => {
      const data = snapshot.val();
      setAttendance(data ? Object.values(data) : []);
    });

    return () => {
      appsRef.off();
      overridesRef.off();
      if (staffRef) staffRef.off();
      if (empRef) empRef.off();
      attRef.off();
    };
  }, [staffId]);

  const handleSearch = useCallback((val: string) => {
    setSearchQuery(val);
    setAppSuggestDismissed(false);
    window.dispatchEvent(new CustomEvent("global-search", { detail: val }));
  }, []);

  // Live Timer Logic

  useEffect(() => {
    let interval: any;
    const updateTimer = () => {
      if (!currentStaff) return;

      const today = new Date().toISOString().split('T')[0];
      const recordsToday = attendance.filter(a =>
        a.employeeId === currentStaff.employeeId &&
        a.dateString === today
      );

      // Sum up completed sessions
      let totalSeconds = recordsToday.reduce((acc, curr) => {
        return acc + (parseFloat(curr.totalHours || "0") * 3600);
      }, 0);

      // Add current session if active
      if (currentStaff.checkedIn && currentStaff.lastCheckIn) {
        const startTime = new Date(currentStaff.lastCheckIn).getTime();
        const now = new Date().getTime();
        totalSeconds += Math.floor((now - startTime) / 1000);
      }

      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = Math.floor(totalSeconds % 60);
      setLiveTimer(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    updateTimer();
    interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentStaff, attendance]);

  const handleCheckIn = async () => {
    if (!currentStaff?.employeeId) {
      toast.error(getTranslation("attendance.noHrLink"));
      return;
    }
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const date = now.toISOString().split('T')[0];
    try {
      const db = firebase.database();
      const attId = 'ATT-' + Date.now() + Math.random().toString(36).substr(2, 9);
      await db.ref(`root/nexus_hr/attendance/${attId}`).set({
        id: attId,
        employeeId: currentStaff.employeeId,
        dateString: date,
        status: "Present",
        checkInTime: time,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });
      await db.ref(`root/staff/${staffId}`).update({
        checkedIn: true,
        currentAttendanceId: attId,
        lastCheckIn: now.toISOString()
      });
      toast.success(getTranslation("attendance.checkInSuccess", { time }));
    } catch (error) { toast.error(getTranslation("attendance.checkInFailed")); }
  };

  const handleCheckOut = async () => {
    if (!currentStaff?.currentAttendanceId) return;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    try {
      const db = firebase.database();
      const attSnapshot = await db.ref(`root/nexus_hr/attendance/${currentStaff.currentAttendanceId}`).once('value');
      const attData = attSnapshot.val();
      let totalHours = "0.00";
      if (attData?.checkInTime) {
        const [inH, inM] = attData.checkInTime.split(':').map(Number);
        const inDate = new Date(); inDate.setHours(inH, inM, 0);
        totalHours = ((now.getTime() - inDate.getTime()) / (1000 * 60 * 60)).toFixed(2);
      }
      await db.ref(`root/nexus_hr/attendance/${currentStaff.currentAttendanceId}`).update({ checkOutTime: time, totalHours: totalHours });
      await db.ref(`root/staff/${staffId}`).update({ checkedIn: false, currentAttendanceId: null, lastCheckOut: now.toISOString() });
      toast.success(getTranslation("attendance.checkOutSuccess", { time, totalHours }));
    } catch (error) { toast.error(getTranslation("attendance.checkOutFailed")); }
  };

  const overrideLabel = (path: string, defaultLabel: string) => {
    const override = systemOverrides[path.replace(/\//g, '_')];
    return override?.name || defaultLabel;
  };

  const allAppsRaw = [
    ...defaultAppItems.map(app => {
      // Map path to a translation key
      const keyMap: Record<string, string> = {
        "/dashboard": "dashboard",
        "/employee-management": "employeeManagement",
        "/overview": "overview",
        "/chat": "chat",
        "/orders": "orders",
        "/delivery": "delivery",
        "/stock-entry": "stocks",
        "/product-entry": "products",
        "/back-office": "purchase",
        "/premium-entry": "wallet",
        "/rating-entry": "promotions",
        "/keyword-entry": "seo",
        "/tasks": "taskManager",
        "/notifications": "notifications",
        "/staffes": "staff",
        "/staff-test": "test",
        "/customers": "customers",
        "/broadcast": "broadcast",
        "/banner-manage": "bannerManage"
      };

      const key = `apps.${keyMap[app.path] || 'default'}`;
      const overrodeItem = systemOverrides[app.path.replace(/\//g, '_')];

      return {
        ...app,
        icon: (overrodeItem?.icon && iconMap[overrodeItem.icon]) ? iconMap[overrodeItem.icon] : app.icon,
        label: overrideLabel(app.path, getTranslation(key, {}, app.label)),
        color: overrodeItem?.color || app.color,
        openInNewTab: false,
        isHidden: overrodeItem?.isHidden || false,
        useExternalLink: false,
        destinationHref: app.path
      };
    }),
    ...customApps.map(app => {
      const path = app.path || "/";
      const useExternal = isCustomAppExternalDestination(path, app.type);
      const destinationHref = useExternal ? normalizeDestinationUrl(path) : path;
      return {
        icon: iconMap[app.icon] || Package,
        label: app.name,
        path,
        color: app.colorClass || "bg-blue-500",
        openInNewTab: useExternal || !!app.openInNewTab,
        isHidden: false,
        useExternalLink: useExternal,
        destinationHref
      };
    })
  ];

  const userRole = sessionStorage.getItem("user_role");
  const allowedApps = JSON.parse(sessionStorage.getItem("allowed_apps") || "[]");
  const staffName = sessionStorage.getItem("staff_name");

  const displayName = userRole === "superadmin" ? "Superadmin" : userRole === "admin" ? "Administrator" : (staffName || "Staff Member");
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const userEmail = userRole === "superadmin" ? "superadmin@dailyclub.com" : userRole === "admin" ? "admin@dailyclub.com" : `${staffName?.toLowerCase().replace(/\s/g, '') || 'staff'}@dailyclub.staff`;

  const allApps = allAppsRaw.filter(app => {
    // If the app is marked as hidden via Infra, hide it for everyone.
    if (app.isHidden) return false;

    if (userRole === "superadmin") return true; 
    if (userRole === "admin") return app.path !== "/infra";
    if (userRole === "staff") return allowedApps.includes(app.path) && app.path !== "/infra";
    if (userRole === "delivery") return app.path === "/delivery";
    return false;
  });

  type NavAppItem = (typeof allApps)[number];

  const goToApp = useCallback(
    (app: NavAppItem) => {
      const href = app.destinationHref ?? app.path;
      setSearchOpen(false);
      setSearchQuery("");
      setAppSuggestDismissed(true);
      window.dispatchEvent(new CustomEvent("global-search", { detail: "" }));
      if (app.openInNewTab) {
        window.open(href, "_blank", "noopener,noreferrer");
      } else {
        navigate(href);
      }
    },
    [navigate]
  );

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allApps.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.path.toLowerCase().includes(q)
    );
  }, [searchQuery, allApps]);

  const showAppSuggestions = searchQuery.trim().length > 0 && !appSuggestDismissed;

  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const navSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(t)) {
        setMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(t)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(t)) {
        setProfileOpen(false);
      }
      const inDesktopSearch = navSearchRef.current?.contains(t);
      const inMobileSearch = mobileSearchRef.current?.contains(t);
      if (!inDesktopSearch && !inMobileSearch) {
        setAppSuggestDismissed(true);
      }
    };
    const handleOpenSettings = () => setSettingsOpen(true);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("open-settings", handleOpenSettings);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("open-settings", handleOpenSettings);
    };
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8 flex-1">
            <Link to="/apps" className="flex items-center gap-3 shrink-0">
              <img decoding="async" loading="lazy" src={branding.logoUrl} alt={branding.appName} className="w-9 h-9 rounded-xl object-contain" />
              <span className="font-black text-xl tracking-tighter text-slate-900 dark:text-white">{branding.appName}</span>
            </Link>

            {/* Desktop search + live app suggestions (each keystroke). */}
            <div ref={navSearchRef} className="relative mx-3 hidden min-w-0 flex-1 max-w-md xl:max-w-lg lg:block">
              <SearchBar value={searchQuery} onChange={handleSearch} variant="navbar" className="max-w-full" />
              {showAppSuggestions && (
                <div
                  className="absolute left-0 right-0 top-full z-[70] mt-1 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
                  role="listbox"
                  aria-label="App suggestions"
                >
                  {filteredApps.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">No matching apps</div>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto py-1">
                      {filteredApps.slice(0, 14).map((app) => {
                        const Icon = app.icon;
                        return (
                          <li key={`${app.path}-${app.label}`}>
                            <button
                              type="button"
                              role="option"
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => goToApp(app)}
                            >
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm ${app.color}`}
                              >
                                <Icon className="h-4 w-4" strokeWidth={2.2} />
                              </span>
                              <span className="min-w-0 flex-1 font-medium text-foreground">{app.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Right side icons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Search apps"
              className={`lg:hidden p-2.5 rounded-full transition-colors ${searchOpen ? "bg-secondary text-foreground" : "hover:bg-secondary text-muted-foreground"}`}
              onClick={() => {
                setSearchOpen((o) => !o);
                setAppSuggestDismissed(false);
              }}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                aria-label="Notifications"
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
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{getTranslation("navbar.notificationsTitle")}</h3>
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
                            className={`border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors group ${!n.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                          >
                            <button
                              type="button"
                              className="w-full p-3 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/50 rounded-none transition-colors"
                              onClick={() => markAsRead(n.id)}
                            >
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className={`text-sm font-medium mb-0.5 ${!n.read ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>
                                    {n.title}
                                  </h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                                    {n.message}
                                  </p>
                                  <span className="text-[10px] text-slate-400 mt-1.5 block">
                                    {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                                {!n.read && (
                                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                )}
                              </div>
                            </button>
                            {(n.type === "order" || n.type === "stock" || n.type === "delivery") && (
                              <div className="flex flex-wrap gap-2 px-3 pb-3">
                                {n.type === "order" && (
                                  <button
                                    type="button"
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
                                    onClick={() => {
                                      markAsRead(n.id);
                                      setNotificationsOpen(false);
                                      navigate(
                                        "/orders",
                                        n.orderId ? { state: { highlightOrderId: n.orderId } } : undefined
                                      );
                                    }}
                                  >
                                    View order
                                  </button>
                                )}
                                {n.type === "stock" && (
                                  <button
                                    type="button"
                                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
                                    onClick={() => {
                                      markAsRead(n.id);
                                      setNotificationsOpen(false);
                                      navigate("/stock-entry");
                                    }}
                                  >
                                    View stock
                                  </button>
                                )}
                                {n.type === "delivery" && (
                                  <button
                                    type="button"
                                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                                    onClick={() => {
                                      markAsRead(n.id);
                                      setNotificationsOpen(false);
                                      navigate("/delivery");
                                    }}
                                  >
                                    View delivery
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 px-6 text-center text-slate-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">{getTranslation("navbar.noNotifications")}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2.5 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-primary hidden sm:flex"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>



            {/* User Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                aria-label="User Profile"
                onClick={() => setProfileOpen(!profileOpen)}
                className="ml-1 w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold hover:shadow-md transition-shadow uppercase tracking-tighter overflow-hidden border-2 border-white dark:border-slate-800 relative"
              >
                {staffPhoto ? (
                  <img decoding="async" loading="lazy" src={staffPhoto} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
                {userRole === 'staff' && (
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 transition-colors duration-500 ${currentStaff?.checkedIn ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    {currentStaff?.checkedIn && <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />}
                  </div>
                )}
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 animate-in fade-in zoom-in-95 origin-top-right z-50 overflow-hidden">
                  <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 overflow-hidden shrink-0 border border-indigo-100 dark:border-indigo-800">
                      {staffPhoto ? <img decoding="async" loading="lazy" src={staffPhoto} className="w-full h-full object-cover" alt="Staff Profile" /> : initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{displayName}</p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">{userRole}</p>
                    </div>
                  </div>

                  {userRole === 'staff' && (
                    <div className="px-2 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${currentStaff?.checkedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                              {currentStaff?.checkedIn ? getTranslation("common.onDuty") : getTranslation("common.offDuty")}
                            </span>
                          </div>
                          {liveTimer !== "00:00:00" && (
                            <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-full border ${currentStaff?.checkedIn ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500/10 bg-indigo-500/5' : 'text-slate-400 border-slate-200 bg-slate-50'}`}>
                              {liveTimer}
                            </span>
                          )}
                        </div>

                        {currentStaff?.checkedIn ? (
                          <button
                            onClick={handleCheckOut}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500 text-white font-bold text-xs shadow-md shadow-red-500/10 active:scale-95 transition-all"
                          >
                            <LogOut size={14} />
                            {getTranslation("common.checkOut")}
                          </button>
                        ) : (
                          <button
                            onClick={handleCheckIn}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/10 active:scale-95 transition-all"
                          >
                            <LogIn size={14} />
                            {getTranslation("common.checkIn")}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <button
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isDark ? <Moon size={16} /> : <Sun size={16} />}
                        <span>{getTranslation("appGallery.sidebar.darkMode")}</span>
                      </div>
                      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ${isDark ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </button>

                    <button
                      onClick={() => { setSettingsOpen(true); setProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Settings size={16} />
                      <span>{getTranslation("navbar.settings")}</span>
                    </button>

                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 confirm-logout"></div>

                    <button
                      onClick={() => {
                        sessionStorage.clear();
                        toast.success(getTranslation("feedback.signedOut"));
                        navigate("/");
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                    >
                      <LogOut size={16} />
                      <span>{getTranslation("navbar.signout")}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Mobile: search sheet (navbar search is hidden below lg). */}
      {searchOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[55] bg-black/45 backdrop-blur-[2px] lg:hidden"
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
          />
          <div
            ref={mobileSearchRef}
            className="fixed left-0 right-0 top-16 z-[56] border-b border-border bg-background/95 px-4 py-3 shadow-xl backdrop-blur-md lg:hidden animate-in slide-in-from-top-2 fade-in duration-200"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex max-w-lg items-start gap-2">
              <div className="min-w-0 flex-1">
                <SearchBar
                  value={searchQuery}
                  onChange={handleSearch}
                  variant="navbar"
                  autoFocus
                  className="w-full"
                />
                {showAppSuggestions && (
                  <div
                    className="mt-2 max-h-[min(50vh,20rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-md"
                    role="listbox"
                    aria-label="App suggestions"
                  >
                    {filteredApps.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">No matching apps</div>
                    ) : (
                      <ul className="py-1">
                        {filteredApps.slice(0, 14).map((app) => {
                          const Icon = app.icon;
                          return (
                            <li key={`m-${app.path}-${app.label}`}>
                              <button
                                type="button"
                                role="option"
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => goToApp(app)}
                              >
                                <span
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm ${app.color}`}
                                >
                                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                                </span>
                                <span className="min-w-0 flex-1 font-medium text-foreground">{app.label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </nav >
  );
};

export default Navbar;
