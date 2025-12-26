import React, { useState, useEffect } from "react";
import SearchBar from "@/components/SearchBar";
import { Link } from "react-router-dom";
import { Sparkles, ChevronRight, Users, Settings } from "lucide-react";
import AppGrid from "@/components/AppGrid";
import NotificationWidget from "@/components/NotificationWidget";
import QuickActionCard from "@/components/QuickActionCard";
import Navbar from "@/components/Navbar";
import firebase from "firebase/compat/app";
import "firebase/compat/database";

const AppGallery = () => {
  const [aiBannerEnabled, setAiBannerEnabled] = useState(true);
  const [isManaging, setIsManaging] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const role = sessionStorage.getItem("user_role");
    setUserRole(role);

    const db = firebase.database();
    const settingsRef = db.ref("root/settings/aiBannerEnabled");
    settingsRef.on("value", (snapshot) => {
      const val = snapshot.val();
      if (val !== null) setAiBannerEnabled(val);
    });
    return () => settingsRef.off();
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
        <div className="w-full max-w-[1800px] mx-auto grid grid-cols-1 xl:grid-cols-5 gap-6 flex-1 min-h-0">

          {/* Left Sidebar - Quick Actions */}
          <div className="hidden xl:block xl:col-span-1 h-full min-h-0 animate-in fade-in slide-in-from-left-8 duration-700 delay-100">
            <QuickActionCard onSearch={setSearchQuery} />
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3 flex flex-col gap-4 min-h-0">
            {aiBannerEnabled && (
              <div className="flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
                <Link to="/chat?autoPrompt=todays business overview" className="group relative block w-full bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600 rounded-2xl p-4 md:p-5 shadow-xl shadow-blue-500/20 overflow-hidden transition-all duration-500 hover:shadow-blue-500/40 hover:-translate-y-1">

                  {/* Decorative Background Elements */}
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />
                  <div className="absolute right-20 top-10 w-16 h-16 bg-blue-400/20 rounded-full blur-xl" />

                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>

                  <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-2 max-w-xl">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-blue-50 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm shadow-sm">
                        <Sparkles className="w-3 h-3 text-blue-200 animate-pulse" />
                        <span>DailyClub</span>
                      </div>

                      <div className="space-y-1">
                        <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight drop-shadow-sm">
                          Whats the business today?
                        </h2>
                        <p className="text-blue-100 text-xs sm:text-sm leading-relaxed font-medium line-clamp-1 sm:line-clamp-none">
                          Chat with our advanced AI to analyze sales, check stock instantly.
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 hidden sm:block">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 group-hover:bg-white text-white group-hover:text-blue-600 transition-all duration-300 shadow-lg">
                        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}


            {/* Admin Controls - Mobile Only (Top of Container) */}
            {userRole === "admin" && (
              <div className="grid grid-cols-2 gap-3 mb-4 xl:hidden animate-in fade-in slide-in-from-top-4 duration-700">
                <Link
                  to="/staffes"
                  className="group relative flex items-center justify-center gap-3 p-3 h-14 rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 hover:border-indigo-500/50 transition-all duration-300 shadow-sm"
                >
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20">
                    <Users className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Staff
                  </span>
                </Link>

                <button
                  onClick={() => setIsManaging(!isManaging)}
                  className={`group relative flex items-center justify-center gap-3 p-3 h-14 rounded-2xl backdrop-blur-md border transition-all duration-300 shadow-sm ${isManaging
                    ? "bg-indigo-600 border-indigo-500 shadow-indigo-500/30 text-white"
                    : "bg-white/10 dark:bg-white/5 border-white/20 text-slate-700 dark:text-slate-200"
                    }`}
                >
                  <div className={`p-1.5 rounded-lg ${isManaging ? "bg-white/20" : "bg-blue-500/10"}`}>
                    <Settings className={`w-4 h-4 ${isManaging ? "text-white animate-spin-slow" : "text-blue-500"}`} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {isManaging ? "Done" : "Apps"}
                  </span>
                </button>
              </div>
            )}

            <div className="flex-1 min-h-0">
              <AppGrid isManaging={isManaging} searchQuery={searchQuery} />
            </div>
          </div>

          {/* Right Sidebar - Notifications & Admin Tools */}
          <div className="xl:col-span-1 h-full min-h-0 animate-in fade-in slide-in-from-right-8 duration-700 delay-200 flex flex-col gap-4">

            {/* Admin Controls - Desktop Only */}
            {userRole === "admin" && (
              <div className="hidden xl:grid grid-cols-1 gap-3 flex-shrink-0 animate-in fade-in slide-in-from-right-4 duration-700 delay-300">
                <Link
                  to="/staffes"
                  className="group relative flex items-center gap-4 p-4 h-16 rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 hover:border-indigo-500/50 transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1 overflow-hidden"
                >
                  <div className="relative p-2.5 rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-all duration-300">
                    <Users className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <span className="relative text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wide group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                    Manage Staff
                  </span>
                </Link>

                <button
                  onClick={() => setIsManaging(!isManaging)}
                  className={`group relative flex items-center gap-4 p-4 h-16 rounded-2xl backdrop-blur-md border transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1 overflow-hidden ${isManaging
                    ? "bg-indigo-600 border-indigo-500 shadow-indigo-500/30 text-white"
                    : "bg-white/10 dark:bg-white/5 border-white/20 hover:border-blue-500/50 hover:shadow-blue-500/20"
                    }`}
                >
                  <div className={`relative p-2.5 rounded-xl transition-all duration-300 ${isManaging ? "bg-white/20" : "bg-blue-500/10"}`}>
                    <Settings className={`w-5 h-5 ${isManaging ? "text-white animate-spin-slow" : "text-blue-500 dark:text-blue-400"}`} />
                  </div>
                  <span className={`relative text-sm font-bold tracking-wide transition-colors ${isManaging ? "text-white" : "text-slate-700 dark:text-slate-200 group-hover:text-blue-500"}`}>
                    {isManaging ? "Done Editing" : "Manage Apps"}
                  </span>
                </button>
              </div>
            )}

            <div className="hidden xl:block flex-1 min-h-0">
              <NotificationWidget />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AppGallery;
