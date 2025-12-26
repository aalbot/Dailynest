import React, { useState, useEffect } from "react";
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
    Sparkles,
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
    Edit
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { toast } from "sonner";

// Re-using the same list as AppGrid for consistency
const initialAppsList = [
    { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: TrendingUp },
    { id: "employee-management", label: "Employee Management", path: "/employee-management", icon: Users },
    { id: "overview", label: "Report", path: "/overview", icon: LayoutDashboard },
    { id: "chat", label: "AI Chat", path: "/chat", icon: Sparkles },
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
    const [customApps, setCustomApps] = useState<any[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const [newStaff, setNewStaff] = useState({
        name: "",
        role: "Staff",
        username: "",
        password: "",
        allowedApps: [] as string[]
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editStaffId, setEditStaffId] = useState<string | null>(null);
    const [aiBannerEnabled, setAiBannerEnabled] = useState(true);

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

        // Listen for settings
        const settingsRef = db.ref("root/settings/aiBannerEnabled");
        settingsRef.on("value", (snapshot) => {
            const val = snapshot.val();
            if (val !== null) setAiBannerEnabled(val);
        });

        return () => {
            staffRef.off();
            appsRef.off();
            settingsRef.off();
        };
    }, []);

    const toggleAiBanner = (enabled: boolean) => {
        setAiBannerEnabled(enabled);
        firebase.database().ref("root/settings/aiBannerEnabled").set(enabled);
        toast.success(enabled ? "AI Banner enabled" : "AI Banner disabled");
    };

    const handleEditClick = (staff: any) => {
        setNewStaff({
            name: staff.name,
            role: staff.role,
            username: staff.username,
            password: staff.password,
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
            allowedApps: []
        });
        setIsEditing(false);
        setEditStaffId(null);
    };

    const allAvailableApps = [
        ...initialAppsList,
        ...customApps.map(app => ({
            id: app.id,
            label: app.name,
            path: app.path,
            icon: Package // Default icon for custom apps in list
        }))
    ];

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

    const filteredStaff = staffMembers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                        <CardContent className="p-6 flex items-center gap-4 border-l-4 border-emerald-500">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {staffMembers.filter(s => s.status === "Active").length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-none shadow-sm h-full rounded-2xl overflow-hidden">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Latest Join</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">
                                    {staffMembers.length > 0 ? staffMembers[staffMembers.length - 1].name.split(' ')[0] : 'N/A'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-none shadow-sm h-full rounded-2xl overflow-hidden relative group">
                        <CardContent className="p-6 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">AI Banner</p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">{aiBannerEnabled ? 'Enabled' : 'Disabled'}</p>
                                </div>
                            </div>
                            <Button
                                variant={aiBannerEnabled ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleAiBanner(!aiBannerEnabled)}
                                className={`rounded-xl px-4 font-bold transition-all ${aiBannerEnabled ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                            >
                                {aiBannerEnabled ? 'Disable' : 'Enable'}
                            </Button>
                        </CardContent>
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-20" />
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
                                        <th className="px-6 py-4">Join Date</th>
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
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                <Badge variant="outline" className="rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-normal">
                                                    {staff.role}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                                {new Date(staff.joinDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
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
                            <div className="space-y-4">
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
