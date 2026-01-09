import React, { useState, useEffect } from "react";
import SearchBar from "@/components/SearchBar";
import { Link } from "react-router-dom";
import { ChevronRight, Users, Settings } from "lucide-react";
import AppGrid from "@/components/AppGrid";
import NotificationWidget from "@/components/NotificationWidget";
import QuickActionCard from "@/components/QuickActionCard";
import Navbar from "@/components/Navbar";
import firebase from "firebase/compat/app";
import "firebase/compat/database";

const AppGallery = () => {
  const [isManaging, setIsManaging] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const role = sessionStorage.getItem("user_role");
    setUserRole(role);
  }, []);

  return (
    <div className="h-screen overflow-hidden gradient-bg flex flex-col">
      <Navbar />

      {/* Floating decorative elements & Noise */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute inset-0 bg-noise opacity-[0.03] z-[1] mix-blend-overlay"></div>

        <div className="absolute top-0 left-[-10%] w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px] animate-float opacity-70" />
        <div className="absolute bottom-0 right-[-10%] w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[120px] animate-float" style={{ animationDelay: "-5s" }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[100px] animate-glow-pulse" />
      </div>

      <div className="flex-1 relative z-10 p-4 md:p-6 pt-20 md:pt-24 flex flex-col overflow-hidden">
        <div className="w-full max-w-[1800px] mx-auto grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 min-h-0">

          {/* Left Sidebar - Notifications & Quick Actions */}
          <div className="hidden xl:flex xl:col-span-1 h-full min-h-0 animate-in fade-in slide-in-from-left-8 duration-700 delay-100 flex-col gap-4">
            <div className="flex-[2] min-h-0">
              <NotificationWidget />
            </div>
            <div className="flex-1">
              <QuickActionCard
                onSearch={setSearchQuery}
                isManaging={isManaging}
                setIsManaging={setIsManaging}
                userRole={userRole}
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3 flex flex-col gap-4 xl:gap-8 min-h-0">

            {/* Desktop-only Premium Search Bar */}
            <div className="hidden xl:block animate-in fade-in zoom-in duration-700 delay-200">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>

            {/* Mobile Admin Actions */}
            {userRole === "admin" && (
              <div className="grid grid-cols-2 xl:hidden items-center gap-3 mb-6">
                <Link
                  to="/staffes"
                  className="flex items-center justify-center gap-3 py-4 px-4 rounded-3xl bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg active:scale-95 transition-all"
                >
                  <Users size={18} className="text-indigo-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Staff</span>
                </Link>
                <button
                  onClick={() => setIsManaging(!isManaging)}
                  className={`flex items-center justify-center gap-3 py-4 px-4 rounded-3xl backdrop-blur-xl border shadow-lg active:scale-95 transition-all ${isManaging
                    ? "bg-blue-600 border-blue-500 text-white shadow-blue-500/20"
                    : "bg-white/70 dark:bg-slate-900/40 border-white/40 dark:border-white/10 text-slate-700 dark:text-slate-200"
                    }`}
                >
                  <Settings size={18} className={isManaging ? "animate-spin-slow" : "text-blue-500"} />
                  <span className="text-xs font-black uppercase tracking-wider">{isManaging ? "Done" : "Apps"}</span>
                </button>
              </div>
            )}


            <div className="flex-1 min-h-0">
              <AppGrid isManaging={isManaging} searchQuery={searchQuery} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AppGallery;
