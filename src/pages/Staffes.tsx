import React, { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import {
    Users,
    Clock,
    Calendar,
    ShieldCheck,
    Search,
    Filter,
    UserPlus,
    ArrowRight,
    Lock,
    Eye,
    EyeOff,
    Check,
    Package,
    TrendingUp,
    LayoutDashboard,
    ClipboardList,
    Truck,
    ShoppingBag,
    Building2,
    Crown,
    Star,
    Keyboard,
    Grid3X3,
    Bell,
    Trash2,
    Edit,
    Briefcase,
    LogIn,
    LogOut
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { toast } from "sonner";

// Re-using the same list as AppGrid for consistency
const initialAppsList = [
    { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: TrendingUp },
    { id: "employee-management", label: "Employee Management", path: "/employee-management", icon: Users },
    { id: "overview", label: "Report", path: "/overview", icon: LayoutDashboard },

    { id: "orders", label: "Orders", path: "/orders", icon: ClipboardList },
    { id: "delivery", label: "Delivery", path: "/delivery", icon: Truck },
    { id: "stock-entry", label: "Stocks", path: "/stock-entry", icon: Package },
    { id: "product-entry", label: "Products", path: "/product-entry", icon: ShoppingBag },
    { id: "back-office", label: "Purchase", path: "/back-office", icon: Building2 },
    { id: "premium-entry", label: "Wallet", path: "/premium-entry", icon: Crown },
    { id: "rating-entry", label: "Promotions", path: "/rating-entry", icon: Star },
    { id: "keyword-entry", label: "SEO", path: "/keyword-entry", icon: Keyboard },
    { id: "tasks", label: "Task Manager", path: "/tasks", icon: Grid3X3 },
    { id: "notifications", label: "Notification", path: "/notifications", icon: Bell },
    { id: "staffes", label: "Staff", path: "/staffes", icon: Users },
];

const Staffes = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [staffMembers, setStaffMembers] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [customApps, setCustomApps] = useState<any[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const [newStaff, setNewStaff] = useState({
        name: "",
        role: "Staff",
        username: "",
        password: "",
        employeeId: "",
        allowedApps: [] as string[]
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editStaffId, setEditStaffId] = useState<string | null>(null);

    useEffect(() => {
        const db = firebase.database();

        // Listen for staff
        const staffRef = db.ref("root/staff");
        staffRef.on("value", (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setStaffMembers(Object.values(data));
            } else {
                setStaffMembers([]);
            }
        });

        // Listen for custom apps
        const appsRef = db.ref("root/apps");
        appsRef.on("value", (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setCustomApps(Object.values(data));
            } else {
                setCustomApps([]);
            }
        });

        // Listen for employees
        const empRef = db.ref("root/nexus_hr/employees");
        empRef.on("value", (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setEmployees(Object.values(data));
            } else {
                setEmployees([]);
            }
        });

        // Listen for attendance
        const attendanceRef = db.ref("root/nexus_hr/attendance");
        attendanceRef.on("value", (snapshot) => {
            const data = snapshot.val();
            if (data) setAttendance(Object.values(data));
        });

        return () => {
            staffRef.off();
            appsRef.off();
            empRef.off();
            attendanceRef.off();
        };
    }, []);


    const handleEditClick = (staff: any) => {
        setNewStaff({
            name: staff.name,
            role: staff.role,
            username: staff.username,
            password: staff.password,
            employeeId: staff.employeeId || "",
            allowedApps: staff.allowedApps || []
        });
        setEditStaffId(staff.id);
        setIsEditing(true);
        setIsAddModalOpen(true);
    };

    const resetForm = () => {
        setNewStaff({
            name: "",
            role: "Staff",
            username: "",
            password: "",
            employeeId: "",
            allowedApps: []
        });
        setIsEditing(false);
        setEditStaffId(null);
    };

    const allAvailableApps = useMemo(() => [
        ...initialAppsList,
        ...customApps.map(app => ({
            id: app.id,
            label: app.name,
            path: app.path,
            icon: Package // Default icon for custom apps in list
        }))
    ], [customApps]);

    const toggleAppPermission = (appPath: string) => {
        setNewStaff(prev => ({
            ...prev,
            allowedApps: prev.allowedApps.includes(appPath)
                ? prev.allowedApps.filter(p => p !== appPath)
                : [...prev.allowedApps, appPath]
        }));
    };

    const handleAddStaff = async () => {
        if (!newStaff.name || !newStaff.username || !newStaff.password) {
            toast.error("Please fill in all required fields");
            return;
        }

        setLoading(true);
        try {
            const db = firebase.database();
            if (isEditing && editStaffId) {
                await db.ref(`root/staff/${editStaffId}`).update({
                    ...newStaff
                });
                toast.success("Staff profile updated");
            } else {
                const staffRef = db.ref("root/staff").push();
                await staffRef.set({
                    id: staffRef.key,
                    ...newStaff,
                    status: "Active",
                    joinDate: new Date().toISOString()
                });
                toast.success("Staff member added successfully");
            }

            setIsAddModalOpen(false);
            resetForm();
        } catch (error) {
            console.error(error);
            toast.error(isEditing ? "Failed to update staff" : "Failed to add staff member");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteStaff = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this staff member?")) {
            try {
                await firebase.database().ref(`root/staff/${id}`).remove();
                toast.success("Staff member removed");
            } catch (error) {
                toast.error("Failed to remove staff member");
            }
        }
    };

    // Manual attendance functions removed - handled via Quick Actions/Profile

    const filteredStaff = useMemo(() => staffMembers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.username.toLowerCase().includes(searchTerm.toLowerCase())
    ), [staffMembers, searchTerm]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                Staffes
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and view internal staff directory</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => setIsAddModalOpen(true)}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 px-6"
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Staff
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <Card className="bg-white dark:bg-slate-900 border-none shadow-sm h-full rounded-2xl overflow-hidden">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Staff</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{staffMembers.length}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-none shadow-sm h-full rounded-2xl overflow-hidden">
                        <CardContent className="p-6 flex items-center gap-4 border-l-4 border-indigo-500">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black">
                                <div className="relative">
                                    <Users className="w-6 h-6" />
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Currently In</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {staffMembers.filter(s => s.checkedIn).length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-none shadow-sm h-full rounded-2xl overflow-hidden">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Man-Hours</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {(() => {
                                        const today = new Date().toISOString().split('T')[0];
                                        const todayLaps = attendance.filter(a => a.dateString === today);
                                        const completed = todayLaps.reduce((acc, curr) => acc + parseFloat(curr.totalHours || "0"), 0);
                                        return completed.toFixed(1);
                                    })()}h
                                </p>
                            </div>
                        </CardContent>
                    </Card>


                </div>

                {/* Content Section */}
                <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 p-6">
                        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Staff Directory</CardTitle>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <Input
                                    placeholder="Search staff..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 h-10 bg-slate-50 dark:bg-slate-800 border-none rounded-xl"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Staff Member</th>
                                        <th className="px-6 py-4">Username</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Working Hours</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredStaff.map((staff) => (
                                        <tr key={staff.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="px-6 py-4 text-sm font-mono text-slate-500">{staff.id?.slice(-4)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-indigo-100 dark:border-indigo-800">
                                                        {staff.name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-900 dark:text-slate-100">{staff.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                                                            {staff.allowedApps?.length || 0} Apps Authorized
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 font-mono italic">@{staff.username}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-normal">
                                                    {staff.role}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                {staff.checkedIn ? (
                                                    <div className="flex flex-col gap-1">
                                                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-3 py-1 flex items-center gap-1.5 w-fit">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                            Currently In
                                                        </Badge>
                                                        <span className="text-[10px] text-slate-400 font-medium ml-1">
                                                            In since {new Date(staff.lastCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1 text-slate-400">
                                                        <Badge variant="outline" className="text-slate-400 bg-slate-50 border-slate-200">
                                                            Off-duty
                                                        </Badge>
                                                        {staff.lastCheckOut && (
                                                            <span className="text-[10px] font-medium ml-1 text-slate-300">
                                                                Last seen {new Date(staff.lastCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const today = new Date().toISOString().split('T')[0];
                                                    const recordsToday = attendance.filter(a =>
                                                        a.employeeId === staff.employeeId &&
                                                        a.dateString === today
                                                    );

                                                    // Sum up completed sessions
                                                    let totalSeconds = recordsToday.reduce((acc, curr) => {
                                                        return acc + (parseFloat(curr.totalHours || "0") * 3600);
                                                    }, 0);

                                                    // Add current session if active
                                                    if (staff.checkedIn && staff.lastCheckIn) {
                                                        const startTime = new Date(staff.lastCheckIn).getTime();
                                                        const diff = Math.floor((currentTime.getTime() - startTime) / 1000);
                                                        totalSeconds += Math.max(0, diff);
                                                    }

                                                    if (totalSeconds === 0) return <span className="text-slate-300">No logs today</span>;

                                                    const h = Math.floor(totalSeconds / 3600);
                                                    const m = Math.floor((totalSeconds % 3600) / 60);
                                                    const s = Math.floor(totalSeconds % 60);

                                                    return (
                                                        <div className="flex flex-col">
                                                            <span className={`text-sm font-bold ${staff.checkedIn ? 'text-indigo-600 animate-pulse' : 'text-slate-700'}`}>
                                                                {h}h {m}m {s}s
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">
                                                                {staff.checkedIn ? 'Active Session' : 'Daily Total'}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEditClick(staff)}
                                                        className="rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteStaff(staff.id)}
                                                        className="rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredStaff.length === 0 && (
                            <div className="py-20 text-center text-slate-400">
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>No staff members found matching your search.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            {/* Add Staff Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-3xl bg-white dark:bg-slate-900 border-none shadow-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="p-2">
                        <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                                {isEditing ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                            </div>
                            {isEditing ? "Edit Staff Account" : "Create New Staff Account"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
                        {/* Profile Info */}
                        <div className="space-y-6">
                            {!isEditing && (
                                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Briefcase className="w-3.5 h-3.5" />
                                        Employee Selection
                                    </h3>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold ml-1">Select from HR Records (Optional)</Label>
                                        <Select
                                            onValueChange={(val) => {
                                                const emp = employees.find(e => e.id === val);
                                                if (emp) {
                                                    setNewStaff({
                                                        ...newStaff,
                                                        employeeId: val,
                                                        name: `${emp.firstName} ${emp.lastName}`,
                                                        role: emp.role || newStaff.role
                                                    });
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-800 border-none">
                                                <SelectValue placeholder="Choose an employee..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                {employees
                                                    .filter(emp => emp.role !== 'Ride' && emp.department !== 'Logistics')
                                                    .map((emp) => (
                                                        <SelectItem key={emp.id} value={emp.id} className="rounded-xl">
                                                            {emp.firstName} {emp.lastName} ({emp.role})
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-slate-400 italic px-1">Selecting an employee will auto-fill name and role.</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5" />
                                    Identity Details
                                </h3>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold ml-1">Full Name</Label>
                                    <Input
                                        placeholder="Enter staff name"
                                        value={newStaff.name}
                                        onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                                        className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-800 border-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold ml-1">Staff Role</Label>
                                    <Input
                                        placeholder="e.g. Sales Associate"
                                        value={newStaff.role}
                                        onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                                        className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-800 border-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Lock className="w-3.5 h-3.5" />
                                    Access Credentials
                                </h3>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold ml-1">Username</Label>
                                    <Input
                                        placeholder="staff_username"
                                        value={newStaff.username}
                                        onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                        className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-800 border-none font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold ml-1">Security Password</Label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={newStaff.password}
                                            onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                                            className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-800 border-none pr-12"
                                        />
                                        <button
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* App Permissions */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Authorized Applications
                            </h3>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-4 h-[320px] overflow-y-auto space-y-2 custom-scrollbar border border-slate-100 dark:border-slate-700">
                                {allAvailableApps.map((app) => (
                                    <div
                                        key={app.id}
                                        onClick={() => toggleAppPermission(app.path)}
                                        className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${newStaff.allowedApps.includes(app.path)
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                                            : 'bg-white dark:bg-slate-900 border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${newStaff.allowedApps.includes(app.path) ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                <app.icon size={16} />
                                            </div>
                                            <span className="text-sm font-bold">{app.label}</span>
                                        </div>
                                        {newStaff.allowedApps.includes(app.path) && <Check className="w-4 h-4" />}
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest text-center px-4">
                                Staff members can only view selected apps in their gallery
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="mt-8 gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setIsAddModalOpen(false);
                                resetForm();
                            }}
                            className="rounded-2xl h-12 px-8 font-bold text-slate-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddStaff}
                            disabled={loading}
                            className="rounded-2xl h-12 px-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-xl shadow-indigo-600/30 grow md:grow-0"
                        >
                            {loading ? (isEditing ? "Updating..." : "Registering...") : (isEditing ? "Save Profile Changes" : "Assign & Register Staff")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Staffes;
