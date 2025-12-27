import { Search, Moon, Sun, Settings, LogOut, ClipboardList, Truck, User, Users, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { useTheme } from "@/contexts/ThemeContext";

const QuickActionCard = ({
    onSearch,
    isManaging,
    setIsManaging,
    userRole
}: {
    onSearch: (query: string) => void;
    isManaging: boolean;
    setIsManaging: (val: boolean) => void;
    userRole: string | null;
}) => {
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();

    return (
        <Card className="h-full border-white/40 dark:border-white/10 shadow-xl bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl transition-colors duration-500 overflow-hidden flex flex-col">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
                {/* Main Action Buttons */}
                <div className="space-y-3">
                    {userRole === "admin" && (
                        <>
                            <Link
                                to="/staffes"
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 border border-white/20 dark:border-white/10 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                        <Users size={18} />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Manage Staff</span>
                                </div>
                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <button
                                onClick={() => setIsManaging(!isManaging)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all group ${isManaging
                                    ? "bg-blue-600 border-blue-500 text-white"
                                    : "bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 border-white/20 dark:border-white/10"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg transition-colors ${isManaging ? "bg-white/20" : "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white"
                                        }`}>
                                        <Settings size={18} className={isManaging ? "animate-spin-slow" : ""} />
                                    </div>
                                    <span className={`text-sm font-semibold ${isManaging ? "text-white" : "text-slate-700 dark:text-slate-300"}`}>
                                        {isManaging ? "Done Editing" : "Manage Apps"}
                                    </span>
                                </div>
                                {!isManaging && <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />}
                            </button>
                        </>
                    )}

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
                </div>

                {/* Sign Out - Bottom */}
                <div className="mt-auto">
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
