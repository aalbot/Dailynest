import React, { useState, useEffect, useMemo, useRef } from "react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import {
    Users,
    Clock,
    TrendingUp,
    LayoutDashboard,
    ClipboardList,
    Truck,
    Package,
    ShoppingBag,
    Building2,
    Crown,
    Star,
    Keyboard,
    Grid3X3,
    Bell,
    Trash2,
    Edit,
    Search,
    UserPlus,
    Briefcase,
    Lock,
    Eye,
    EyeOff,
    Check,
    ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { dataProvider } from "@/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
/* =====================================================
   ACTION REQUEST (LOCAL, FRAMEWORK-COMPATIBLE)
   ===================================================== */

type ActionResult<T = any> = {
    status: "success" | "cancelled" | "error";
    data?: T;
    feedback?: string;
};

type ActionResolver = (result: ActionResult) => void;

const actionRequestBus = {
    resolver: null as ActionResolver | null,

    request() {
        return new Promise<ActionResult>((resolve) => {
            actionRequestBus.resolver = resolve;
        });
    },

    resolve(result: ActionResult) {
        actionRequestBus.resolver?.(result);
        actionRequestBus.resolver = null;
    }
};

/* =====================================================
   CONSTANTS
   ===================================================== */

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
    { id: "staffes", label: "Onboard", path: "/staffes", icon: Users },
];
// Import the logger
import { logger } from "@/data/utils/LogManager";



/* =====================================================
   DATA LAYER
   ===================================================== */

type Staff = {
    id: string;
    name: string;
    role: string;
    username: string;
    password: string;
    employeeId?: string;
    allowedApps: string[];
    checkedIn?: boolean;
    lastCheckIn?: string;
    lastCheckOut?: string;
    status?: string;
    joinDate?: string;
};

type PageData = {
    staffMembers: Staff[];
    employees: any[];
    attendance: any[];
    customApps: any[];
    searchTerm: string;
    isAddModalOpen: boolean;
    showPassword: boolean;
    loading: boolean;
    currentTime: Date;
    form: Partial<Staff>;
    isEditing: boolean;
    pendingRequests: any[];
};

function createData(): PageData {
    return {
        staffMembers: [],
        employees: [],
        attendance: [],
        customApps: [],
        searchTerm: "",
        isAddModalOpen: false,
        showPassword: false,
        loading: false,
        currentTime: new Date(),
        form: {
            name: "",
            role: "Staff",
            username: "",
            password: "",
            employeeId: "",
            allowedApps: []
        },
        isEditing: false,
        pendingRequests: []
    };
}

/* =====================================================
   LOGIC LAYER
   ===================================================== */

type Event =
    | { type: "CREATE_VIEW" }
    | { type: "DISMISS" }
    | { type: "TICK" }
    | { type: "SET_SEARCH"; value: string }
    | { type: "OPEN_ADD" }
    | { type: "CLOSE_ADD" }
    | { type: "EDIT"; staff: Staff }
    | { type: "DELETE"; id: string }
    | { type: "SAVE" }
    | { type: "UPDATE_FORM"; patch: Partial<Staff> }
    | { type: "TOGGLE_APP"; path: string }
    | { type: "APPROVE"; request: any }
    | { type: "REJECT"; request: any }
    | { type: "TOGGLE_PASSWORD" };

function Logic(data: PageData, render: () => void) {
    let unsubs: (() => void)[] = [];

    function dispatch(e: Event) {
        if (e.type !== "TICK") {
            logger.info("Logic", `Dispatching Action: ${e.type}`, e);
        }

        switch (e.type) {
            case "CREATE_VIEW": return onCreate();
            case "DISMISS": return onDismiss();
            case "TICK": data.currentTime = new Date(); return render();
            case "SET_SEARCH": data.searchTerm = e.value; return render();
            case "OPEN_ADD":
                logger.info("Logic", "Opening Add Modal (Action Request)");
                data.form = { name: "", role: "Staff", username: "", password: "", employeeId: "", allowedApps: [] };
                data.isEditing = false;
                data.isAddModalOpen = true;
                return render();

            case "CLOSE_ADD":
                logger.info("Logic", "Action Cancelled");
                data.isAddModalOpen = false;

                actionRequestBus.resolve({
                    status: "cancelled",
                    feedback: "User cancelled staff action"
                });

                return render();

            case "EDIT":
                logger.info("Logic", "Editing Staff (Action Request)", e.staff);
                data.form = { ...e.staff };
                data.isEditing = true;
                data.isAddModalOpen = true;
                return render();

            case "DELETE": return remove(e.id);
            case "SAVE": return save();
            case "UPDATE_FORM":
                data.form = { ...data.form, ...e.patch };
                return render();
            case "TOGGLE_APP": return toggleApp(e.path);
            case "APPROVE": return approve(e.request);
            case "REJECT": return reject(e.request);
            case "TOGGLE_PASSWORD": data.showPassword = !data.showPassword; return render();
        }
    }

    function onCreate() {
        logger.info("Logic", "onCreate: Subscribing to data providers...");
        unsubs.push(
            dataProvider.observe("staff", {}).subscribe(v => {
                logger.info("Logic", "Data Received: 'staff'", Object.keys(v || {}).length + " records");
                data.staffMembers = Object.values(v || {});
                render();
            }),
            dataProvider.observe("apps", {}).subscribe(v => {
                logger.info("Logic", "Data Received: 'apps'", Object.keys(v || {}).length + " records");
                data.customApps = Object.values(v || {});
                render();
            }),
            dataProvider.observe("nexus_hr/employees", {}).subscribe(v => {
                logger.info("Logic", "Data Received: 'nexus_hr/employees'", Object.keys(v || {}).length + " records");
                data.employees = Object.values(v || {});
                render();
            }),
            dataProvider.observe("nexus_hr/attendance", {}).subscribe(v => {
                logger.info("Logic", "Data Received: 'nexus_hr/attendance'", Object.keys(v || {}).length + " records");
                data.attendance = Object.values(v || {});
                render();
            }),
            dataProvider.observe("delivery_users", {}).subscribe(v => { render(); }),
            dataProvider.observe("external_users", {}).subscribe(v => { render(); }),
            dataProvider.observe("notifications", {}).subscribe(v => {
                const pending = Object.values(v || {}).filter((n: any) => n.type === 'verification' && !n.read);
                data.pendingRequests = pending;
                render();
            })
        );
    }

    function onDismiss() {
        logger.info("Logic", "onDismiss: Cleaning up subscriptions");
        unsubs.forEach(u => u());
    }

    async function remove(id: string) {
        logger.info("Logic", `Attempting to delete staff: ${id}`);
        if (!confirm("Are you sure you want to delete this staff member?")) {
            logger.info("Logic", "Delete cancelled by user");
            return;
        }
        try {
            await dataProvider.remove(`staff/${id}`);
            logger.info("Logic", "Delete Success");
            toast.success("Staff member removed");
        } catch (error) {
            logger.error("Logic", "Delete Failed", error);
            toast.error("Failed to remove staff member");
        }
    }

    async function save() {
        logger.info("Logic", "Save triggered");
        const f = data.form;
        if (!f.name || !f.username || !f.password) {
            logger.warn("Logic", "Validation failed", f);
            toast.error("Please fill in all required fields");
            return;
        }

        data.loading = true;
        render();

        try {
            const id = data.isEditing ? f.id! : dataProvider.generateKey("staff");
            const payload = {
                ...f,
                id,
                status: f.status || "Active",
                joinDate: f.joinDate || new Date().toISOString(),
                allowedApps: f.allowedApps || []
            };

            logger.info("Logic", "Writing payload to DB", payload);
            await dataProvider.update("staff", { [id]: payload });
            logger.info("Logic", "Save Success");
            toast.success(data.isEditing ? "Staff profile updated" : "Staff member added successfully");
            data.isAddModalOpen = false;
            actionRequestBus.resolve({
                status: "success",
                data: payload,
                feedback: data.isEditing ? "Staff updated" : "Staff created"
            });
            render();
        } catch (error) {
            logger.error("Logic", "Save Failed", error);
            toast.error("Failed to save staff");
        } finally {
            data.loading = false;
            render();
        }
    }

    function toggleApp(path: string) {
        logger.info("Logic", `Toggle App: ${path}`);
        const list = data.form.allowedApps || [];
        data.form.allowedApps = list.includes(path)
            ? list.filter(p => p !== path)
            : [...list, path];
        render();
    }

    async function approve(request: any) {
        try {
            const db = dataProvider;
            const role = request.roleType;
            const userId = request.userId;

            let path = "";
            if (role === 'Staff') path = "staff";
            else if (role === 'Delivery') path = "delivery_users";
            else path = "external_users";

            const users = await db.get(path, {});
            const userKey = userId || Object.keys(users || {}).find(k => users[k].name === request.requesterName);

            if (userKey && users[userKey]) {
                const updatedUser = { ...users[userKey], status: 'Active' };
                await db.update(path, { [userKey]: updatedUser });

                // If it's a delivery partner, also activate in HR
                if (role === 'Delivery') {
                    const employees = await db.get("nexus_hr/employees", {});
                    const empKey = Object.keys(employees || {}).find(k => employees[k].deliveryUserId === userKey);
                    if (empKey) {
                        await db.update("nexus_hr/employees", { [empKey]: { ...employees[empKey], workStatus: 'Active' } });
                    }
                }

                // If staff, automatically create employee record if not exists
                if (role === 'Staff') {
                    if (!updatedUser.employeeId) {
                        const newEmpId = 'EMP-' + Date.now();
                        const nameParts = updatedUser.name ? updatedUser.name.split(' ') : ['Unknown', 'User'];
                        const firstName = nameParts[0];
                        const lastName = nameParts.slice(1).join(' ') || '';

                        const newEmployee = {
                            id: newEmpId,
                            firstName,
                            lastName,
                            email: updatedUser.email || '',
                            contactNumber: updatedUser.contactNumber || updatedUser.phone || '',
                            role: updatedUser.role || 'Staff',
                            department: 'General',
                            salary: 0,
                            status: 'Active',
                            joiningDate: new Date().toISOString().split('T')[0],
                            photoUrl: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random&color=fff&size=128`,
                            advanceBalance: 0,
                            staffUserId: userKey
                        };

                        await db.update(`nexus_hr/employees/${newEmpId}`, newEmployee);
                        updatedUser.employeeId = newEmpId;

                        // Update the staff record with the new employee ID
                        await db.update(path, { [userKey]: updatedUser });
                    }

                    dispatch({ type: "EDIT", staff: updatedUser });
                }

                await db.update(`notifications/${request.id}`, { read: true });
                toast.success(`${role} approved and added to employees successfully`);
            } else {
                toast.error("User not found for approval");
            }
            render();
        } catch (error) {
            toast.error("Approval failed");
        }
    }

    async function reject(request: any) {
        if (!confirm("Reject this request?")) return;
        await dataProvider.update(`notifications/${request.id}`, { read: true });
        render();
    }

    return { dispatch, data };
}

/* =====================================================
   UI LAYER
   ===================================================== */
type UIProps = {
    data: PageData;
    logic: any;
};

// Helper for UI Action Logging
function logUIEvent(action: string, payload?: any) {
    console.log(`[UI Action] ${action}`, payload || "");
}

function useUIActions(logic: any) {
    return {
        onAddStaffClick() {
            logUIEvent("onAddStaffClick");
            logic.dispatch({ type: "OPEN_ADD" });
        },

        onSearchChange(value: string) {
            logUIEvent("onSearchChange", value);
            logic.dispatch({ type: "SET_SEARCH", value });
        },

        onEditStaff(staff: any) {
            logUIEvent("onEditStaff", staff.id);
            logic.dispatch({ type: "EDIT", staff });
        },

        onDeleteStaff(id: string) {
            logUIEvent("onDeleteStaff", id);
            logic.dispatch({ type: "DELETE", id });
        },

        onCloseModal() {
            logUIEvent("onCloseModal");
            logic.dispatch({ type: "CLOSE_ADD" });
        },

        onSaveStaff() {
            logUIEvent("onSaveStaff");
            logic.dispatch({ type: "SAVE" });
        },

        onTogglePassword() {
            logUIEvent("onTogglePassword");
            logic.dispatch({ type: "TOGGLE_PASSWORD" });
        },

        onToggleApp(path: string) {
            logUIEvent("onToggleApp", path);
            logic.dispatch({ type: "TOGGLE_APP", path });
        },

        onFormPatch(patch: any) {
            // logUIEvent("onFormPatch", patch); // Optional: can be noisy
            logic.dispatch({ type: "UPDATE_FORM", patch });
        },

        onApprove(request: any) {
            logic.dispatch({ type: "APPROVE", request });
        },

        onReject(request: any) {
            logic.dispatch({ type: "REJECT", request });
        }
    };
}
function renderPageHeader(actions: any) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
                <BackButton />
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Onboard</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and view internal staff directory</p>
                </div>
            </div>

            <Button onClick={actions.onAddStaffClick}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Staff
            </Button>
        </div>
    );
}

function StatsGrid({ data }: { data: PageData }) {
    const totalStaff = data.staffMembers.length;
    const currentlyIn = data.staffMembers.filter(s => s.checkedIn).length;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Card className="bg-white dark:bg-slate-900 border-none shadow-sm h-full rounded-2xl overflow-hidden">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Staff</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalStaff}</p>
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
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{currentlyIn}</p>
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
                                const todayLaps = data.attendance.filter(a => a.dateString === today);
                                const completed = todayLaps.reduce((acc, curr) => acc + parseFloat(curr.totalHours || "0"), 0);

                                // Add live sessions
                                const liveSecs = data.staffMembers
                                    .filter(s => s.checkedIn && s.lastCheckIn)
                                    .reduce((acc, s) => {
                                        const start = new Date(s.lastCheckIn!).getTime();
                                        return acc + Math.max(0, (data.currentTime.getTime() - start) / 1000);
                                    }, 0);

                                return (completed + (liveSecs / 3600)).toFixed(1);
                            })()}h
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
function useDerivedUIData(data: PageData) {
    const filteredStaff = useMemo(() => {
        // console.log("[UI] Computing filtered staff..."); // Optional perf log
        return data.staffMembers.filter(s =>
            s.name?.toLowerCase().includes(data.searchTerm.toLowerCase()) ||
            s.role?.toLowerCase().includes(data.searchTerm.toLowerCase()) ||
            s.username?.toLowerCase().includes(data.searchTerm.toLowerCase())
        );
    }, [data.staffMembers, data.searchTerm]);

    const availableApps = useMemo(() => {
        return [
            ...initialAppsList,
            ...data.customApps.map(app => ({
                id: app.id,
                label: app.name,
                path: app.path,
                icon: Package
            }))
        ];
    }, [data.customApps]);

    return { filteredStaff, availableApps };
}
export function UI({ data, logic }: UIProps) {
    const actions = useUIActions(logic);
    const { filteredStaff, availableApps } = useDerivedUIData(data);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                {renderPageHeader(actions)}

                <StatsGrid data={data} />

                {/* Content Section */}
                <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 p-6">
                        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Staff Directory</CardTitle>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <Input
                                    placeholder="Search staff..."
                                    value={data.searchTerm}
                                    onChange={(e) => actions.onSearchChange(e.target.value)}
                                    className="pl-10 h-10 bg-slate-50 dark:bg-slate-800 border-none rounded-xl"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Tabs defaultValue="directory" className="w-full">
                            <div className="px-6 border-b border-slate-100 dark:border-slate-800">
                                <TabsList className="bg-transparent h-14 p-0 gap-8">
                                    <TabsTrigger value="directory" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none h-14 font-bold text-slate-500">
                                        Staff Directory
                                    </TabsTrigger>
                                    <TabsTrigger value="verification" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none h-14 font-bold text-slate-500 relative">
                                        Pending Verification
                                        {data.pendingRequests.length > 0 && (
                                            <span className="ml-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center animate-bounce">
                                                {data.pendingRequests.length}
                                            </span>
                                        )}
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="directory" className="p-0 mt-0">
                                <StaffTable
                                    staff={filteredStaff}
                                    attendance={data.attendance}
                                    currentTime={data.currentTime}
                                    onEdit={actions.onEditStaff}
                                    onDelete={actions.onDeleteStaff}
                                />
                            </TabsContent>

                            <TabsContent value="verification" className="p-0 mt-0">
                                <VerificationTable
                                    requests={data.pendingRequests}
                                    onApprove={actions.onApprove}
                                    onReject={actions.onReject}
                                />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Modal */}
                <StaffModal
                    data={data}
                    apps={availableApps}
                    actions={actions}
                />
            </main>
        </div>
    );
}

/* =====================================================
   PAGE ENTRY
   ===================================================== */

/* =====================================================
   COMPONENTS
   ===================================================== */

const VerificationTable = ({ requests, onApprove, onReject }: any) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">Requester</th>
                        <th className="px-6 py-4">Role Requested</th>
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4 text-right">Decision</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {requests.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                                <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                No pending verifications
                            </td>
                        </tr>
                    ) : (
                        requests.map((r: any) => (
                            <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                                            <UserPlus size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{r.message.split(' has')[0]}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">New Signup</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <Badge className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 uppercase text-[10px] tracking-widest font-black">
                                        {r.roleType}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500">
                                    {new Date(r.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-500 hover:bg-red-50 font-bold"
                                            onClick={() => onReject(r)}
                                        >
                                            Reject
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-lg shadow-indigo-500/20"
                                            onClick={() => onApprove(r)}
                                        >
                                            Approve Access
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

interface StaffTableProps {
    staff: Staff[];
    attendance: any[];
    currentTime: Date;
    onEdit: (staff: Staff) => void;
    onDelete: (id: string) => void;
}

const StaffTable = ({ staff, attendance, currentTime, onEdit, onDelete }: StaffTableProps) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">Staff Member</th>
                        <th className="px-6 py-4">Username</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Working Hours</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {staff.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                No staff members found
                            </td>
                        </tr>
                    ) : (
                        staff.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{s.name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{s.employeeId || 'System ID'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                        @{s.username}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <Badge variant="outline" className="rounded-lg border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium">
                                        {s.role}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${s.checkedIn ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-slate-700"}`} />
                                        <span className={`text-xs font-bold ${s.checkedIn ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>
                                            {s.checkedIn ? "Currently In" : "Offline"}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                        {(() => {
                                            const today = new Date().toISOString().split('T')[0];
                                            const todayLaps = attendance.filter(a => a.staffId === s.id && a.dateString === today);
                                            let totalSeconds = todayLaps.reduce((acc, curr) => acc + (parseFloat(curr.totalHours || "0") * 3600), 0);

                                            // Add live session
                                            if (s.checkedIn && s.lastCheckIn) {
                                                const start = new Date(s.lastCheckIn).getTime();
                                                totalSeconds += Math.max(0, (currentTime.getTime() - start) / 1000);
                                            }

                                            if (totalSeconds === 0) return <span className="text-slate-300">No logs today</span>;

                                            const h = Math.floor(totalSeconds / 3600);
                                            const m = Math.floor((totalSeconds % 3600) / 60);
                                            const ss = Math.floor(totalSeconds % 60);

                                            return `${h}h ${m}m ${ss}s`;
                                        })()}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 transition-opacity">
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(s)} className="h-8 w-8 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20">
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onDelete(s.id)} className="h-8 w-8 rounded-lg hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

interface StaffModalProps {
    data: PageData;
    apps: any[];
    actions: any;
}

const StaffModal = ({ data, apps, actions }: StaffModalProps) => {
    return (
        <Dialog open={data.isAddModalOpen} onOpenChange={actions.onCloseModal}>
            <DialogContent className="max-w-3xl rounded-[32px] border-none shadow-2xl p-0 overflow-hidden dark:bg-slate-900">
                <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                            {data.isEditing ? 'Save Profile Changes' : 'Register New Staff'}
                        </DialogTitle>
                        <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-1">Configure access and identity details</p>
                    </div>
                    <Crown className="absolute right-[-20px] top-[-20px] w-48 h-48 text-white/10 rotate-12" />
                </div>

                <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            {/* Employee Linkage */}
                            {!data.isEditing && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Briefcase className="w-3.5 h-3.5" />
                                        Link Employee Profile
                                    </h3>
                                    <div className="space-y-2">
                                        <Select
                                            value={data.form.employeeId}
                                            onValueChange={(val) => {
                                                const emp = data.employees.find(e => e.id === val);
                                                if (emp) {
                                                    actions.onFormPatch({
                                                        employeeId: val,
                                                        name: `${emp.firstName} ${emp.lastName}`,
                                                        role: emp.role || data.form.role
                                                    });
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-800 border-none">
                                                <SelectValue placeholder="Choose an employee..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                {data.employees
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
                                        value={data.form.name}
                                        onChange={(e) => actions.onFormPatch({ name: e.target.value })}
                                        className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-800 border-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold ml-1">Staff Role</Label>
                                    <Input
                                        placeholder="e.g. Sales Associate"
                                        value={data.form.role}
                                        onChange={(e) => actions.onFormPatch({ role: e.target.value })}
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
                                        value={data.form.username}
                                        onChange={(e) => actions.onFormPatch({ username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                        className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-800 border-none font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold ml-1">Security Password</Label>
                                    <div className="relative">
                                        <Input
                                            type={data.showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={data.form.password}
                                            onChange={(e) => actions.onFormPatch({ password: e.target.value })}
                                            className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-800 border-none pr-12"
                                        />
                                        <button
                                            onClick={actions.onTogglePassword}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            {data.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                                {apps.map((app) => (
                                    <div
                                        key={app.id}
                                        onClick={() => actions.onToggleApp(app.path)}
                                        className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${data.form.allowedApps?.includes(app.path)
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                                            : 'bg-white dark:bg-slate-900 border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${data.form.allowedApps?.includes(app.path) ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                <app.icon size={16} />
                                            </div>
                                            <span className="text-sm font-bold">{app.label}</span>
                                        </div>
                                        {data.form.allowedApps?.includes(app.path) && <Check className="w-4 h-4" />}
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest text-center px-4">
                                Staff members can only view selected apps in their gallery
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 pt-0 gap-3">
                    <Button
                        variant="ghost"
                        onClick={actions.onCloseModal}
                        className="rounded-2xl h-12 px-8 font-bold text-slate-500"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={actions.onSaveStaff}
                        disabled={data.loading}
                        className="rounded-2xl h-12 px-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-xl shadow-indigo-600/30 grow md:grow-0"
                    >
                        {data.loading ? (data.isEditing ? "Updating..." : "Registering...") : (data.isEditing ? "Save Profile Changes" : "Assign & Register Staff")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function Staffes() {
    const [, rerender] = useState(0);
    const dataRef = useRef<PageData>();
    const logicRef = useRef<any>();

    if (!dataRef.current) {
        dataRef.current = createData();
        logicRef.current = Logic(dataRef.current, () => rerender(x => x + 1));
    }

    useEffect(() => {
        logger.info("Staffes", "Page Mounted");
        logicRef.current.dispatch({ type: "CREATE_VIEW" });
        const timer = setInterval(() => logicRef.current.dispatch({ type: "TICK" }), 1000);
        return () => {
            logger.info("Staffes", "Page Unmounting");
            clearInterval(timer);
            logicRef.current.dispatch({ type: "DISMISS" });
        };
    }, []);

    return <UI data={dataRef.current!} logic={logicRef.current} />;
}
/* =====================================================
   ACTION REQUEST ENTRY (CALLABLE FROM ANYWHERE)
   ===================================================== */

export async function requestStaffAction(
    logic: any,
    mode: "create" | "edit",
    staff?: Staff
): Promise<ActionResult<Staff>> {

    if (mode === "create") {
        logic.dispatch({ type: "OPEN_ADD" });
    }

    if (mode === "edit" && staff) {
        logic.dispatch({ type: "EDIT", staff });
    }

    return actionRequestBus.request();
}
