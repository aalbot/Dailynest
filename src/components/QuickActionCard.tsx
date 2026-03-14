import { Search, Moon, Sun, Settings, LogOut, ClipboardList, Truck, User, Users, ChevronRight, LogIn, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";

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
    const { getTranslation } = useLang();
    const [currentStaff, setCurrentStaff] = useState<any>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [liveTimer, setLiveTimer] = useState("00:00:00");

    const staffId = sessionStorage.getItem("staff_id");

    useEffect(() => {
        if (!staffId) return;

        const db = firebase.database();
        const staffRef = db.ref(`root/staff/${staffId}`);
        const attendanceRef = db.ref("root/nexus_hr/attendance");

        staffRef.on("value", (snapshot) => {
            setCurrentStaff(snapshot.val());
        });

        attendanceRef.on("value", (snapshot) => {
            const data = snapshot.val();
            if (data) setAttendance(Object.values(data));
        });

        return () => {
            staffRef.off();
            attendanceRef.off();
        };
    }, [staffId]);

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
            const record = {
                id: attId,
                employeeId: currentStaff.employeeId,
                dateString: date,
                status: "Present",
                checkInTime: time,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };

            await db.ref(`root/nexus_hr/attendance/${attId}`).set(record);
            await db.ref(`root/staff/${staffId}`).update({
                checkedIn: true,
                currentAttendanceId: attId,
                lastCheckIn: now.toISOString()
            });

            toast.success(getTranslation("attendance.checkInSuccess", { time }));
        } catch (error) {
            toast.error(getTranslation("attendance.checkInFailed"));
        }
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
            if (attData && attData.checkInTime) {
                const [inH, inM] = attData.checkInTime.split(':').map(Number);
                const inDate = new Date();
                inDate.setHours(inH, inM, 0);
                const diffMs = now.getTime() - inDate.getTime();
                totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
            }

            await db.ref(`root/nexus_hr/attendance/${currentStaff.currentAttendanceId}`).update({
                checkOutTime: time,
                totalHours: totalHours
            });

            await db.ref(`root/staff/${staffId}`).update({
                checkedIn: false,
                currentAttendanceId: null,
                lastCheckOut: now.toISOString()
            });

            toast.success(getTranslation("attendance.checkOutSuccess", { time, totalHours }));
        } catch (error) {
            toast.error(getTranslation("attendance.checkOutFailed"));
        }
    };

    return (
        <Card className="h-full border-white/40 dark:border-white/10 shadow-xl bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl transition-colors duration-500 overflow-hidden flex flex-col">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    {getTranslation("appGallery.sidebar.quickActions")}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
                {/* Main Action Buttons */}
                <div className="space-y-3">
                    {(userRole === "admin" || userRole === "superadmin") && (
                        <>
                            <Link
                                to="/staffes"
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 border border-white/20 dark:border-white/10 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                        <Users size={18} />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{getTranslation("appGallery.sidebar.manageStaff")}</span>
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
                                        {isManaging ? getTranslation("appGallery.sidebar.doneEditing") : getTranslation("appGallery.sidebar.manageApps")}
                                    </span>
                                </div>
                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </>
                    )}
                    {userRole === "staff" && (
                        <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-4 mb-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${currentStaff?.checkedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    {currentStaff?.checkedIn ? getTranslation("common.onDuty") : getTranslation("common.offDuty")}
                                </span>
                                {liveTimer !== "00:00:00" && (
                                    <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-full border ml-auto ${currentStaff?.checkedIn ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/10' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                        {liveTimer}
                                    </span>
                                )}
                            </div>

                            {currentStaff?.checkedIn ? (
                                <button
                                    onClick={handleCheckOut}
                                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                                >
                                    <LogOut size={18} />
                                    {getTranslation("common.checkOut")}
                                </button>
                            ) : (
                                <button
                                    onClick={handleCheckIn}
                                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                >
                                    <LogIn size={18} />
                                    {getTranslation("common.checkIn")}
                                </button>
                            )}
                        </div>
                    )}

                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 border border-white/20 dark:border-white/10 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                {isDark ? <Moon size={18} /> : <Sun size={18} />}
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{getTranslation("appGallery.sidebar.darkMode")}</span>
                        </div>
                        <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ${isDark ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </button>

                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 border border-white/20 dark:border-white/10 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                <Settings size={18} />
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{getTranslation("appGallery.sidebar.portalSettings")}</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Sign Out - Bottom */}
                <div className="mt-auto">
                    <button
                        onClick={() => {
                            sessionStorage.clear();
                            toast.success(getTranslation("feedback.signedOut"));
                            navigate("/");
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/20 text-red-600 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                <LogOut size={18} />
                            </div>
                            <span className="text-sm font-semibold text-red-700 dark:text-red-400">{getTranslation("appGallery.sidebar.signOut")}</span>
                        </div>
                    </button>
                </div>
            </CardContent>
        </Card >
    );
};

export default QuickActionCard;
