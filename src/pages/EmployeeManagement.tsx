import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import {
    Users,
    Clock,
    FileText,
    PieChart,
    Plus,
    Search,
    ChevronRight,
    HandCoins,
    DollarSign,
    Menu,
    Briefcase,
    Mail,
    Phone,
    Settings,
    Shield,
    Trash2,
    Edit2,
    X,
    Building2, // Added for Sidebar logo area
    Calendar,
    CheckCircle
} from 'lucide-react';
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { useToast } from "@/components/ui/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

const StatCard = ({ label, value, icon: Icon, color, subtext }: any) => (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</h3>
                    </div>
                    {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
                </div>
                <div className={`p-3 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20`}>
                    <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
                </div>
            </div>
        </CardContent>
    </Card>
);

const EmployeeManagement = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [payroll, setPayroll] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar state
    const { toast } = useToast();

    // Dialog States
    const [isAddEmpOpen, setIsAddEmpOpen] = useState(false);
    const [isEditEmpOpen, setIsEditEmpOpen] = useState(false);
    const [isMarkAttOpen, setIsMarkAttOpen] = useState(false);
    const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
    const [isPayrollOpen, setIsPayrollOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Role Mgmt State
    const [newRoleName, setNewRoleName] = useState("");
    const [newDeptName, setNewDeptName] = useState("");
    const [previewImage, setPreviewImage] = useState<string>("");

    // Edit Role/Dept State
    const [editItem, setEditItem] = useState<{ id: string, name: string, type: 'role' | 'dept' } | null>(null);

    useEffect(() => {
        const db = firebase.database();
        const basePath = 'root/nexus_hr';

        const empRef = db.ref(`${basePath}/employees`);
        const attRef = db.ref(`${basePath}/attendance`);
        const payRef = db.ref(`${basePath}/payroll`);
        const rolesRef = db.ref(`${basePath}/roles`);
        const deptRef = db.ref(`${basePath}/departments`);

        empRef.on('value', snap => setEmployees(snap.val() ? Object.values(snap.val()) : []));
        attRef.on('value', snap => setAttendance(snap.val() ? Object.values(snap.val()) : []));
        payRef.on('value', snap => setPayroll(snap.val() ? Object.values(snap.val()) : []));
        rolesRef.on('value', snap => setRoles(snap.val() ? Object.values(snap.val()) : []));
        deptRef.on('value', snap => setDepartments(snap.val() ? Object.values(snap.val()) : []));

        return () => {
            empRef.off();
            attRef.off();
            payRef.off();
            rolesRef.off();
            deptRef.off();
        };
    }, []);

    // Reset preview when dialog opens/closes
    useEffect(() => {
        if (isEditEmpOpen && selectedEmp) {
            setPreviewImage(selectedEmp.photoUrl || "");
        } else if (!isAddEmpOpen && !isEditEmpOpen) {
            setPreviewImage("");
        }
    }, [isEditEmpOpen, isAddEmpOpen, selectedEmp]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.src = reader.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const maxSize = 256;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    ctx?.drawImage(img, 0, 0, width, height);
                    setPreviewImage(canvas.toDataURL('image/jpeg', 0.8));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveEmployee = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const data = new FormData(form);
        const isEdit = !!selectedEmp && isEditEmpOpen;

        const firstName = data.get('firstName') as string;
        const lastName = data.get('lastName') as string;

        if (!firstName || !lastName) {
            toast({ title: "Error", description: "Name fields are required", variant: "destructive" });
            return;
        }

        const defaultPhoto = `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random&color=fff&size=128`;

        const empData = {
            id: isEdit ? selectedEmp.id : 'EMP-' + Date.now(),
            firstName,
            lastName,
            email: data.get('email'),
            contactNumber: data.get('contactNumber'),
            role: data.get('role'),
            department: data.get('department'),
            salary: Number(data.get('salary')),
            status: data.get('status') || 'Active',
            joiningDate: isEdit ? selectedEmp.joiningDate : new Date().toISOString().split('T')[0],
            photoUrl: previewImage || (isEdit ? selectedEmp.photoUrl : defaultPhoto),
            advanceBalance: isEdit ? (selectedEmp.advanceBalance || 0) : 0
        };

        firebase.database().ref(`root/nexus_hr/employees/${empData.id}`).update(empData)
            .then(() => {
                if (isEdit) setIsEditEmpOpen(false);
                else setIsAddEmpOpen(false);
                toast({ title: isEdit ? "Updated" : "Created", description: `Employee ${empData.firstName} saved.` });
            });
    };

    const handleAddRole = () => {
        if (!newRoleName.trim()) return;
        const id = 'ROLE-' + Date.now();
        firebase.database().ref(`root/nexus_hr/roles/${id}`).set({ id, name: newRoleName, permissions: ['read'] })
            .then(() => {
                setNewRoleName("");
                toast({ title: "Role Added", description: `${newRoleName} is now available.` });
            });
    };

    const handleDeleteRole = (id: string) => {
        firebase.database().ref(`root/nexus_hr/roles/${id}`).remove();
    };

    const handleAddDepartment = () => {
        if (!newDeptName.trim()) return;
        const id = 'DEPT-' + Date.now();
        firebase.database().ref(`root/nexus_hr/departments/${id}`).set({ id, name: newDeptName })
            .then(() => {
                setNewDeptName("");
                toast({ title: "Department Added", description: `${newDeptName} is now available.` });
            });
    };

    const handleDeleteDepartment = (id: string) => {
        firebase.database().ref(`root/nexus_hr/departments/${id}`).remove();
    };

    const handleUpdateItem = () => {
        if (!editItem || !editItem.name.trim()) return;
        const path = editItem.type === 'role' ? 'roles' : 'departments';
        firebase.database().ref(`root/nexus_hr/${path}/${editItem.id}`).update({ name: editItem.name })
            .then(() => {
                setEditItem(null);
                toast({ title: "Updated", description: "Item updated successfully." });
            });
    };

    const handleMarkAttendance = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const data = new FormData(form);
        const empId = data.get('employeeId') as string;
        markEmployeeAttendance(empId, data.get('status') as string, data.get('time') as string, data.get('date') as string);
        setIsMarkAttOpen(false);
    };

    const markEmployeeAttendance = (empId: string, status: string, time: string = "09:00", date: string = new Date().toISOString().split('T')[0]) => {
        const record = {
            id: 'ATT-' + Date.now() + Math.random().toString(36).substr(2, 9),
            employeeId: empId,
            dateString: date,
            status: status,
            checkInTime: time,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        firebase.database().ref(`root/nexus_hr/attendance/${record.id}`).set(record)
            .then(() => {
                toast({ title: "Attendance Marked", description: `Marked as ${status}` });
            });
    };

    const handleIssueAdvance = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const data = new FormData(form);
        const empId = data.get('employeeId') as string;
        const amount = Number(data.get('amount'));
        const updates: any = {};
        const emp = employees.find(e => e.id === empId);
        if (emp) {
            updates[`root/nexus_hr/employees/${empId}/advanceBalance`] = (emp.advanceBalance || 0) + amount;
            firebase.database().ref().update(updates).then(() => {
                setIsAdvanceOpen(false);
                toast({ title: "Advance Issued", description: `$${amount} credited.` });
            });
        }
    };

    const handleProcessPayroll = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const data = new FormData(form);
        const empId = data.get('employeeId') as string;
        const emp = employees.find(e => e.id === empId);
        if (!emp) return;

        const baseSalary = Number(data.get('calculatedBase'));
        const bonus = Number(data.get('bonus'));
        const advance = Number(data.get('advance'));
        const netPay = baseSalary + bonus - advance;
        const month = data.get('month') as string;
        const [y, m] = month.split('-');
        const monthStr = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'short', year: 'numeric' });

        const payRecord = {
            id: 'PAY-' + Date.now(),
            employeeId: empId,
            baseSalary,
            bonus,
            advance,
            netPay,
            month,
            monthStr,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        const updates: any = {};
        updates[`root/nexus_hr/payroll/${payRecord.id}`] = payRecord;
        if (advance > 0) {
            updates[`root/nexus_hr/employees/${empId}/advanceBalance`] = Math.max(0, (emp.advanceBalance || 0) - advance);
        }
        firebase.database().ref().update(updates).then(() => {
            setIsPayrollOpen(false);
            toast({ title: "Payroll Processed", description: `Net Pay: $${netPay}` });
        });
    };

    const filteredEmployees = employees.filter(e =>
        e.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sidebar Items
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: PieChart },
        { id: 'employees', label: 'Employees', icon: Users },
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'payroll', label: 'Payroll', icon: DollarSign },
        { id: 'manage', label: 'Manage', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans">
            {/* Navbar (Fixed) */}
            <div className="fixed top-0 left-0 right-0 z-50">
                <Navbar />
            </div>

            {/* Sidebar - Desktop */}
            <aside className="w-64 hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pt-20 pb-6 fixed top-0 bottom-0 left-0 z-40 transition-all">
                <div className="px-6 mb-6">
                    <BackButton />
                </div>

                <div className="px-6 mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Building2 className="w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-wider">HR Portal</span>
                </div>

                <nav className="flex-1 space-y-1 px-4">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${activeTab === item.id
                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 font-semibold shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>

                <div className="px-6 mt-auto">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                        <p className="text-xs font-semibold opacity-80 mb-1">Total Staff</p>
                        <h3 className="text-2xl font-bold">{employees.length}</h3>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 pt-16 h-full overflow-hidden flex flex-col relative w-full">

                {/* Mobile Header Toggle */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <BackButton />
                        <span className="font-bold text-lg text-slate-900 dark:text-slate-100">HR Portal</span>
                    </div>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600">
                        <Menu size={20} />
                    </button>
                </div>

                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)}>
                        <div className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 p-6 flex flex-col h-full shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-bold dark:text-white">Menu</h2>
                                <button onClick={() => setSidebarOpen(false)}><X className="text-slate-500 dark:text-slate-400" /></button>
                            </div>
                            <nav className="space-y-2">
                                {menuItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'}`}
                                    >
                                        <item.icon size={18} /> {item.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>
                )}


                <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 capitalize">{activeTab}</h1>
                            <p className="text-sm text-slate-500">Manage your organization.</p>
                        </div>
                        <div className="flex gap-2">
                            {/* Contextual Actions based on Tab */}
                            {activeTab === 'employees' && (
                                <Button onClick={() => setIsAddEmpOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                                    <Plus className="w-4 h-4 mr-2" /> Add Employee
                                </Button>
                            )}
                        </div>
                    </div>

                    <Tabs value={activeTab} className="space-y-6">

                        {/* DASHBOARD */}
                        <TabsContent value="dashboard" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard label="Total Employees" value={employees.length} icon={Users} color="bg-blue-600" subtext="+2 this month" />
                                <StatCard label="Present Today" value={attendance.filter(a => a.dateString === new Date().toISOString().split('T')[0] && a.status === 'Present').length} icon={CheckCircle} color="bg-emerald-500" subtext={`${Math.round((attendance.filter(a => a.dateString === new Date().toISOString().split('T')[0] && a.status === 'Present').length / (employees.length || 1)) * 100)}% Attendance`} />
                                <StatCard label="Payroll" value={`$${payroll.reduce((a, b) => a + (b.netPay || 0), 0).toLocaleString()}`} icon={DollarSign} color="bg-indigo-500" subtext="Last 30 days" />
                                <StatCard label="Advances" value={`$${employees.reduce((a, b) => a + (b.advanceBalance || 0), 0).toLocaleString()}`} icon={HandCoins} color="bg-amber-500" subtext="Outstanding" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 shadow-sm">
                                    <CardHeader>
                                        <CardTitle>Recent Activity</CardTitle>
                                        <CardDescription>Latest updates from your team.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {attendance.slice(-5).reverse().map((att, i) => {
                                                const emp = employees.find(e => e.id === att.employeeId);
                                                return (
                                                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                                        <Avatar className="h-9 w-9 border border-slate-200">
                                                            <AvatarImage src={emp?.photoUrl} />
                                                            <AvatarFallback>{emp?.firstName?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'}</p>
                                                            <p className="text-xs text-slate-500">Marked as {att.status} • {att.checkInTime}</p>
                                                        </div>
                                                        <Badge variant={att.status === 'Present' ? 'default' : 'destructive'} className={att.status === 'Present' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                                                            {att.status}
                                                        </Badge>
                                                    </div>
                                                )
                                            })}
                                            {attendance.length === 0 && <p className="text-sm text-slate-500 py-4 text-center">No recent activity.</p>}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-indigo-600 text-white">
                                    <CardHeader>
                                        <CardTitle className="text-white">Quick Actions</CardTitle>
                                        <CardDescription className="text-indigo-100">Common tasks for HR.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-3">
                                        <Button variant="secondary" className="w-full justify-start hover:bg-indigo-50 text-indigo-700 border-0" onClick={() => setIsMarkAttOpen(true)}>
                                            <Clock className="mr-2 h-4 w-4" /> Mark Attendance
                                        </Button>
                                        <Button variant="secondary" className="w-full justify-start hover:bg-indigo-50 text-indigo-700 border-0" onClick={() => setIsAdvanceOpen(true)}>
                                            <HandCoins className="mr-2 h-4 w-4" /> Issue Advance
                                        </Button>
                                        <Button variant="secondary" className="w-full justify-start hover:bg-indigo-50 text-indigo-700 border-0" onClick={() => setIsPayrollOpen(true)}>
                                            <FileText className="mr-2 h-4 w-4" /> Run Payroll
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* EMPLOYEES LIST */}
                        <TabsContent value="employees" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-7">
                                    <div className="space-y-1">
                                        <CardTitle>Directory</CardTitle>
                                        <CardDescription>Manage your employee records.</CardDescription>
                                    </div>
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                        <Input
                                            placeholder="Search employees..."
                                            className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                            <TableRow>
                                                <TableHead className="pl-6">Employee</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right pr-6">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredEmployees.map((emp) => (
                                                <TableRow key={emp.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900" onClick={() => { setSelectedEmp(emp); setIsProfileOpen(true); }}>
                                                    <TableCell className="pl-6 font-medium">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9 border border-slate-200">
                                                                <AvatarImage src={emp.photoUrl} />
                                                                <AvatarFallback>{emp.firstName?.[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{emp.firstName} {emp.lastName}</span>
                                                                <span className="text-xs text-slate-500">{emp.email}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{emp.role}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-normal">{emp.department}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="default" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-none">Active</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500">
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ATTENDANCE */}
                        <TabsContent value="attendance" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Today's Sheet */}
                            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle>Attendance Sheet</CardTitle>
                                            <CardDescription>Mark attendance for today ({new Date().toLocaleDateString()}).</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {employees.map(emp => {
                                            const today = new Date().toISOString().split('T')[0];
                                            const todayRecord = attendance.find(a => a.employeeId === emp.id && a.dateString === today);

                                            return (
                                                <div key={emp.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10 border border-slate-200">
                                                            <AvatarImage src={emp.photoUrl} />
                                                            <AvatarFallback>{emp.firstName?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{emp.firstName} {emp.lastName}</p>
                                                            <p className="text-xs text-slate-500">{emp.role}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {todayRecord ? (
                                                            <Badge variant={todayRecord.status === 'Present' ? 'default' : todayRecord.status === 'Late' ? 'secondary' : 'destructive'}
                                                                className={`h-8 px-3 ${todayRecord.status === 'Present' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 shadow-none' : ''}`}>
                                                                {todayRecord.status}
                                                            </Badge>
                                                        ) : (
                                                            <>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" title="Present" onClick={() => markEmployeeAttendance(emp.id, 'Present')}>
                                                                    <CheckCircle className="w-5 h-5" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-500 hover:bg-amber-50 hover:text-amber-600" title="Late" onClick={() => markEmployeeAttendance(emp.id, 'Late')}>
                                                                    <Clock className="w-5 h-5" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600" title="Absent" onClick={() => markEmployeeAttendance(emp.id, 'Absent')}>
                                                                    <X className="w-5 h-5" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {employees.length === 0 && <p className="text-sm text-slate-500 col-span-full text-center py-4">No employees found.</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* History Table */}
                            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-8">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">History Log</h3>
                                <Button onClick={() => setIsMarkAttOpen(true)} size="sm" variant="outline">
                                    <Plus className="w-4 h-4 mr-2" /> Manual Entry
                                </Button>
                            </div>
                            <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="pl-6">Date</TableHead>
                                            <TableHead>Employee</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right pr-6">Time</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attendance.slice().reverse().map((a, i) => {
                                            const emp = employees.find(e => e.id === a.employeeId);
                                            return (
                                                <TableRow key={i}>
                                                    <TableCell className="pl-6 font-medium text-slate-500">{a.dateString}</TableCell>
                                                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarImage src={emp?.photoUrl} />
                                                                <AvatarFallback>{emp?.firstName?.[0]}</AvatarFallback>
                                                            </Avatar>
                                                            {emp?.firstName} {emp?.lastName}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={a.status === 'Present' ? 'default' : a.status === 'Late' ? 'secondary' : 'destructive'}
                                                            className={a.status === 'Present' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : ''}>
                                                            {a.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6 font-mono text-xs">{a.checkInTime}</TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </Card>
                        </TabsContent>

                        {/* PAYROLL */}
                        <TabsContent value="payroll" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col md:flex-row gap-4">
                                <Card className="flex-1 bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none shadow-md">
                                    <CardContent className="p-6">
                                        <p className="text-indigo-100 font-medium">Total Disbursement</p>
                                        <h2 className="text-3xl font-bold mt-2">${payroll.reduce((acc, c) => acc + (c.netPay || 0), 0).toLocaleString()}</h2>
                                        <p className="text-xs text-indigo-200 mt-1">Lifetime total</p>
                                    </CardContent>
                                </Card>
                                <Card className="flex-1 border-slate-200 dark:border-slate-800 shadow-sm hidden md:block">
                                    <CardContent className="p-6">
                                        <p className="text-slate-500 dark:text-slate-400 font-medium">Next Pay Run</p>
                                        <h2 className="text-3xl font-bold mt-2 text-slate-800 dark:text-slate-100">Oct 31</h2>
                                        <p className="text-xs text-slate-400 mt-1">Estimated: $12,400</p>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsAdvanceOpen(true)} className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100">
                                    <HandCoins className="mr-2 h-4 w-4" /> Issue Advance
                                </Button>
                                <Button onClick={() => setIsPayrollOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 hover:text-white">
                                    <DollarSign className="mr-2 h-4 w-4" /> Process Payroll
                                </Button>
                            </div>
                            <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="pl-6">Month</TableHead>
                                            <TableHead>Employee</TableHead>
                                            <TableHead>Base Salary</TableHead>
                                            <TableHead>Bonus</TableHead>
                                            <TableHead>Deductions</TableHead>
                                            <TableHead className="text-right pr-6">Net Pay</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payroll.slice().reverse().map((p, i) => {
                                            const emp = employees.find(e => e.id === p.employeeId);
                                            return (
                                                <TableRow key={i}>
                                                    <TableCell className="pl-6 font-medium text-slate-500">{p.monthStr}</TableCell>
                                                    <TableCell className="font-semibold text-slate-800 dark:text-slate-100">{emp?.firstName} {emp?.lastName}</TableCell>
                                                    <TableCell>${p.baseSalary?.toLocaleString()}</TableCell>
                                                    <TableCell className="text-emerald-600">+{p.bonus}</TableCell>
                                                    <TableCell className="text-red-500">{p.advance > 0 ? `-${p.advance}` : '-'}</TableCell>
                                                    <TableCell className="text-right pr-6 font-bold text-slate-900 dark:text-slate-100">${p.netPay?.toLocaleString()}</TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </Card>
                        </TabsContent>

                        {/* MANAGE / SETTINGS */}
                        <TabsContent value="manage" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Role Management */}
                                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Shield className="w-5 h-5 text-indigo-500" /> Roles & Permissions
                                        </CardTitle>
                                        <CardDescription>Define roles for your organization.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="New Role Name (e.g. Manager)"
                                                value={newRoleName}
                                                onChange={(e) => setNewRoleName(e.target.value)}
                                            />
                                            <Button onClick={handleAddRole} size="icon"><Plus className="w-4 h-4" /></Button>
                                        </div>
                                        <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                            {roles.length === 0 && <p className="text-sm text-slate-500">No custom roles defined.</p>}
                                            {roles.map(role => (
                                                <div key={role.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                                    <span className="font-medium text-slate-800 dark:text-slate-100">{role.name}</span>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => setEditItem({ id: role.id, name: role.name, type: 'role' })}>
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-500 hover:bg-red-50" onClick={() => handleDeleteRole(role.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                    <CardHeader className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <CardTitle className="flex items-center gap-2">
                                            <Briefcase className="w-5 h-5 text-indigo-500" /> Departments
                                        </CardTitle>
                                        <CardDescription>Manage organization departments.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="New Dept Name (e.g. IT)"
                                                value={newDeptName}
                                                onChange={(e) => setNewDeptName(e.target.value)}
                                            />
                                            <Button onClick={handleAddDepartment} size="icon"><Plus className="w-4 h-4" /></Button>
                                        </div>
                                        <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                            {departments.length === 0 && <p className="text-sm text-slate-500">No departments defined.</p>}
                                            {departments.map(dept => (
                                                <div key={dept.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                                    <span className="font-medium text-slate-800 dark:text-slate-100">{dept.name}</span>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => setEditItem({ id: dept.id, name: dept.name, type: 'dept' })}>
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-500 hover:bg-red-50" onClick={() => handleDeleteDepartment(dept.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Employee Editor */}
                                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Edit2 className="w-5 h-5 text-indigo-500" /> Edit Employee Details
                                        </CardTitle>
                                        <CardDescription>Update information for existing staff.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[300px]">
                                            <Table>
                                                <TableBody>
                                                    {employees.map(emp => (
                                                        <TableRow key={emp.id}>
                                                            <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                                                            <TableCell className="text-slate-500 text-xs">{emp.role}</TableCell>
                                                            <TableCell className="text-right">
                                                                <Button size="sm" variant="outline" onClick={() => { setSelectedEmp(emp); setIsEditEmpOpen(true); }}>
                                                                    Edit
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            {/* PROFILE SHEET (Unchanged, mainly) */}
            <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                    {selectedEmp && (
                        <div className="flex flex-col h-full">
                            <SheetHeader className="pb-6 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex flex-col items-center text-center">
                                    <Avatar className="h-24 w-24 border-4 border-slate-100 dark:border-slate-800 mb-4 shadow-sm">
                                        <AvatarImage src={selectedEmp.photoUrl} />
                                        <AvatarFallback className="text-2xl">{selectedEmp.firstName?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <SheetTitle className="text-2xl">{selectedEmp.firstName} {selectedEmp.lastName}</SheetTitle>
                                    <SheetDescription className="text-base">{selectedEmp.role}</SheetDescription>
                                    <Badge className="mt-2 bg-emerald-50 text-emerald-700 border-emerald-100 shadow-none">Active Employee</Badge>
                                </div>
                            </SheetHeader>
                            <div className="py-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
                                        <span className="text-xs font-medium text-slate-500 uppercase">Department</span>
                                        <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                            <Briefcase className="w-4 h-4 text-indigo-500" /> {selectedEmp.department}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
                                        <span className="text-xs font-medium text-slate-500 uppercase">Salary</span>
                                        <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-emerald-500" /> ${selectedEmp.salary?.toLocaleString()}/yr
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b pb-2">Contact Information</h3>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-700 dark:text-slate-300">{selectedEmp.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-700 dark:text-slate-300">{selectedEmp.contactNumber || 'No contact info'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-700 dark:text-slate-300">Joined on {selectedEmp.joiningDate}</span>
                                    </div>
                                </div>
                                <div className="flex justify-center mt-6">
                                    <Button variant="default" className="w-full bg-slate-900 text-white" onClick={() => { setIsProfileOpen(false); setIsEditEmpOpen(true); }}>
                                        Edit This Profile
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* ADD EMPLOYEE MODAL (Reused for Edit with logic) */}
            <Dialog open={isAddEmpOpen || isEditEmpOpen} onOpenChange={(open) => { if (!open) { setIsAddEmpOpen(false); setIsEditEmpOpen(false); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditEmpOpen ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveEmployee} className="space-y-4 pt-4">
                        <div className="flex justify-center mb-4">
                            <div className="relative group cursor-pointer">
                                <Avatar className="h-24 w-24 border-2 border-slate-200 shadow-sm transition-opacity group-hover:opacity-90">
                                    <AvatarImage src={previewImage} />
                                    <AvatarFallback className="text-2xl bg-slate-100 text-slate-400">
                                        <Users className="w-8 h-8" />
                                    </AvatarFallback>
                                </Avatar>
                                <Label
                                    htmlFor="photo-upload"
                                    className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full cursor-pointer hover:bg-indigo-700 shadow-md transition-transform hover:scale-105"
                                >
                                    <Plus className="w-4 h-4" />
                                </Label>
                                <Input
                                    id="photo-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>First Name</Label><Input name="firstName" required defaultValue={isEditEmpOpen ? selectedEmp?.firstName : ''} /></div>
                            <div className="space-y-2"><Label>Last Name</Label><Input name="lastName" required defaultValue={isEditEmpOpen ? selectedEmp?.lastName : ''} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" required defaultValue={isEditEmpOpen ? selectedEmp?.email : ''} /></div>
                            <div className="space-y-2"><Label>Contact No</Label><Input name="contactNumber" type="tel" placeholder="+1234567890" defaultValue={isEditEmpOpen ? selectedEmp?.contactNumber : ''} /></div>
                        </div>

                        {/* Status for Edit Mode */}
                        {isEditEmpOpen && (
                            <div className="space-y-2"><Label>Status</Label>
                                <Select name="status" defaultValue={selectedEmp?.status || "Active"}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                        <SelectItem value="On Leave">On Leave</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2"><Label>Job Role</Label>
                            <div className="flex gap-2">
                                <Input name="role" required defaultValue={isEditEmpOpen ? selectedEmp?.role : ''} list="roles-list" />
                                <datalist id="roles-list">
                                    {roles.map(r => <option key={r.id} value={r.name} />)}
                                </datalist>
                            </div>
                        </div>
                        <div className="space-y-2"><Label>Department</Label>
                            <Select name="department" defaultValue={isEditEmpOpen ? selectedEmp?.department : "Engineering"}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {departments.length === 0 && <SelectItem value="General">General</SelectItem>}
                                    {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><Label>Annual Salary ($)</Label><Input name="salary" type="number" required defaultValue={isEditEmpOpen ? selectedEmp?.salary : ''} /></div>
                        <DialogFooter className="pt-4">
                            <Button variant="outline" type="button" onClick={() => { setIsAddEmpOpen(false); setIsEditEmpOpen(false); }}>Cancel</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{isEditEmpOpen ? "Update Changes" : "Save Employee"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ATTENDANCE MODAL */}
            <Dialog open={isMarkAttOpen} onOpenChange={setIsMarkAttOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Mark Attendance</DialogTitle></DialogHeader>
                    <form onSubmit={handleMarkAttendance} className="space-y-4 pt-4">
                        <div className="space-y-2"><Label>Employee</Label>
                            <Select name="employeeId" required>
                                <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                                <SelectContent>
                                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} /></div>
                            <div className="space-y-2"><Label>Status</Label>
                                <Select name="status" defaultValue="Present">
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Present">Present</SelectItem>
                                        <SelectItem value="Late">Late</SelectItem>
                                        <SelectItem value="Absent">Absent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2"><Label>Check-in Time</Label><Input name="time" type="time" defaultValue="09:00" /></div>
                        <DialogFooter className="pt-4">
                            <Button variant="outline" type="button" onClick={() => setIsMarkAttOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Save Record</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ADVANCE MODAL */}
            <Dialog open={isAdvanceOpen} onOpenChange={setIsAdvanceOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Issue Advance</DialogTitle></DialogHeader>
                    <form onSubmit={handleIssueAdvance} className="space-y-4 pt-4">
                        <div className="space-y-2"><Label>Employee</Label>
                            <Select name="employeeId" required>
                                <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                                <SelectContent>
                                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><Label>Amount ($)</Label><Input name="amount" type="number" required min="1" /></div>
                        <DialogFooter className="pt-4">
                            <Button variant="outline" type="button" onClick={() => setIsAdvanceOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white">Issue Advance</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* PAYROLL MODAL */}
            <Dialog open={isPayrollOpen} onOpenChange={setIsPayrollOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Process Payroll</DialogTitle></DialogHeader>
                    <form onSubmit={handleProcessPayroll} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Employee</Label>
                                <Select name="employeeId" required>
                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                        {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2"><Label>Month</Label><Input name="month" type="month" required /></div>
                        </div>
                        <div className="space-y-2"><Label>Base Salary ($)</Label><Input name="calculatedBase" type="number" required placeholder="Monthly Base" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Bonus ($)</Label><Input name="bonus" type="number" defaultValue="0" /></div>
                            <div className="space-y-2"><Label>Advance Deduction ($)</Label><Input name="advance" type="number" defaultValue="0" className="text-red-500" /></div>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button variant="outline" type="button" onClick={() => setIsPayrollOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">Process Payout</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* EDIT ROLE/DEPT DIALOG */}
            <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Edit {editItem?.type === 'role' ? 'Role' : 'Department'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <Label>Name</Label>
                        <Input
                            value={editItem?.name || ''}
                            onChange={(e) => setEditItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                        <Button onClick={handleUpdateItem} className="bg-indigo-600 text-white hover:bg-indigo-700">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default EmployeeManagement;
