import { Link, useLocation } from "react-router-dom";
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
  Trash2
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNotification } from "@/contexts/NotificationContext";

const appItems = [
  { icon: Crown, label: "Premium Entry", path: "/premium-entry", color: "bg-yellow-500" },
  { icon: Star, label: "Rating Entry", path: "/rating-entry", color: "bg-orange-500" },
  { icon: Package, label: "Stock Entry", path: "/stock-entry", color: "bg-blue-500" },
  { icon: ShoppingBag, label: "Product Entry", path: "/product-entry", color: "bg-violet-500" },
  { icon: Truck, label: "Delivery Screen", path: "/delivery", color: "bg-emerald-500" },
  { icon: LayoutDashboard, label: "Overview", path: "/overview", color: "bg-cyan-500" },
  { icon: ClipboardList, label: "Order Management", path: "/orders", color: "bg-pink-500" },
  { icon: Keyboard, label: "Keyword Entry", path: "/keyword-entry", color: "bg-indigo-500" },
  { icon: Building2, label: "Back Office", path: "/back-office", color: "bg-teal-500" },
];

const Navbar = () => {
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotification();

  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const filteredApps = searchQuery ? appItems.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase())) : [];

  useEffect(() => {
    // Check local storage or system preference
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="DailyClub" className="w-9 h-9 rounded-xl object-contain" />
            <span className="font-bold text-lg tracking-tight text-slate-500 dark:text-slate-400">DailyClub</span>
          </Link>

          {/* Right side icons */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full hover:bg-secondary transition-colors relative overflow-hidden group"
              aria-label="Toggle Theme"
            >
              <div className="relative w-5 h-5">
                <Sun
                  className={`w-5 h-5 text-amber-500 absolute top-0 left-0 transition-all duration-300 transform ${isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`}
                />
                <Moon
                  className={`w-5 h-5 text-indigo-500 dark:text-sky-300 absolute top-0 left-0 transition-all duration-300 transform ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`}
                />
              </div>
            </button>

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
                            onClick={() => markAsRead(n.id)}
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
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`p-2.5 rounded-full transition-colors ${menuOpen ? "bg-secondary" : "hover:bg-secondary"
                  }`}
              >
                <Grid3X3 className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* App Menu Dropdown */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-[320px] bg-white rounded-2xl shadow-xl border border-gray-200/80 p-3 animate-scale-in origin-top-right">
                  <div className="grid grid-cols-3 gap-1">
                    {appItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMenuOpen(false)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 group hover:bg-gray-50 ${location.pathname === item.path ? "bg-gray-50" : ""
                          }`}
                      >
                        <div className={`w-11 h-11 rounded-full ${item.color} flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-200`}>
                          <item.icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                          {item.label}
                        </span>
                      </Link>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <Link
                      to="/"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      View all apps
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            <button className="ml-1 w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold hover:shadow-md transition-shadow">
              JD
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
