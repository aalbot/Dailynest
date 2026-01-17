import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/ui/use-toast";
import { firebase } from "@/lib/firebase";
import {
    Activity,
    CheckCircle,
    ClipboardList,
    Clock,
    FileText,
    Truck,
    Users,
    Briefcase,
    BadgeDollarSign,
    Hash,
    MessageSquare,
    Search,
    Bell,
    HelpCircle,
    Plus,
    Menu,
    ChevronDown,
    PanelLeftClose,
    X,
    MoreHorizontal,
    Trash2,
    Image as ImageIcon,
    Camera,
    Settings,
    UserPlus,
    Lock,
    Pencil,
    Check
} from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BackButton from "@/components/BackButton";

// --- Types & Constants ---
const STAGES = ['Office', 'Engineer', 'Purchase', 'Delivery', 'Finance'];

const StageIcons: Record<string, any> = {
    'Office': Briefcase,
    'Engineer': Users,
    'Purchase': ClipboardList,
    'Delivery': Truck,
    'Finance': BadgeDollarSign,
};

const TaskCard = ({ task, employees, onClick }: { task: any, employees: any[], onClick: () => void }) => {
    const assignee = employees.find(e => e.id === task.assignedEmployeeId);

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'In Progress': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'Testing': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'On Hold': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div
            onClick={onClick}
            className="group flex flex-col p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer shadow-sm hover:shadow transition-all relative overflow-hidden"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <Badge variant={task.priority === 'High' ? 'destructive' : 'secondary'} className="rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                        {task.priority || 'Normal'}
                    </Badge>
                    <span className="text-xs text-slate-500 font-mono">{task.taskId}</span>
                </div>
                {task.status === 'Completed' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                    <Badge variant="outline" className={`text-[9px] uppercase font-bold px-1.5 py-0 ${getStatusStyles(task.status)}`}>
                        {task.status === 'Testing' ? 'QA Testing' : (task.status || 'Pending')}
                    </Badge>
                )}
            </div>

            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">{task.title}</h3>

            <div className="flex items-center gap-2 text-xs text-slate-500 mt-auto pt-3">
                <div className="flex items-center gap-2 overflow-hidden w-full">
                    {task.status === 'Testing' && task.testerId ? (
                        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md border border-purple-100 dark:border-purple-800 w-full overflow-hidden">
                            <Avatar className="w-4 h-4 shrink-0">
                                <AvatarImage src={employees.find(e => e.id === task.testerId)?.photoUrl} />
                                <AvatarFallback className="text-[6px] bg-purple-100 text-purple-700">
                                    {employees.find(e => e.id === task.testerId)?.firstName?.[0] || 'T'}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-purple-700 dark:text-purple-300 truncate">
                                QA: {employees.find(e => e.id === task.testerId)?.firstName || 'Unknown'}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="flex -space-x-1.5 overflow-hidden">
                                {(task.assignedEmployeeIds || []).slice(0, 3).map((id: string) => {
                                    const emp = employees.find(e => e.id === id);
                                    return (
                                        <Avatar key={id} className="w-5 h-5 border border-white dark:border-slate-900">
                                            <AvatarImage src={emp?.photoUrl} />
                                            <AvatarFallback className="text-[8px] bg-emerald-100 text-emerald-700">
                                                {emp?.firstName?.[0] || 'E'}
                                            </AvatarFallback>
                                        </Avatar>
                                    );
                                })}
                                {(task.assignedEmployeeIds || []).length > 3 && (
                                    <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                        +{(task.assignedEmployeeIds || []).length - 3}
                                    </div>
                                )}
                            </div>
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px]">
                                {task.assignedEmployeeIds?.length > 0
                                    ? (task.assignedEmployeeIds.length === 1
                                        ? employees.find(e => e.id === task.assignedEmployeeIds[0])?.firstName
                                        : `${task.assignedEmployeeIds.length} Assignees`)
                                    : 'Unassigned'}
                            </span>
                        </div>
                    )}
                </div>
                <span className="mx-1 ms-auto">•</span>
                <Clock className="w-3 h-3" />
                <span className="shrink-0">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No Date'}</span>
            </div>

            {/* Minimal Status Line */}
            <div className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ${task.status === 'Completed' ? 'bg-emerald-500 w-full' :
                task.status === 'Testing' ? 'bg-purple-500 w-3/4' :
                    task.status === 'In Progress' ? 'bg-indigo-500 w-1/2' :
                        task.status === 'On Hold' ? 'bg-amber-500 w-1/4' : 'bg-slate-200 w-0'
                }`} />
        </div>
    );
};

const SidebarItem = ({ icon: Icon, label, active, onClick, count }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 font-medium ${active
            ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 animate-in fade-in duration-300'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
            }`}
    >
        <div className="flex items-center gap-3">
            <Icon className={`w-4 h-4 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
            <span className="truncate max-w-[140px]">{label}</span>
        </div>
        {count !== undefined && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                {count}
            </span>
        )}
    </button>
);

const TaskManager = () => {
    const { toast } = useToast();
    const [tasks, setTasks] = useState<any[]>([]);
    const [filterRole, setFilterRole] = useState<string>("All");
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    // Default open on desktop (md = 768px), closed on mobile
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Form State
    const [newTask, setNewTask] = useState({
        priority: 'Normal',
        dueDate: '',
        assignedEmployeeIds: [] as string[],
        testerId: '' as string,
        items: [{ title: '', description: '', images: [] as string[] }]
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [employees, setEmployees] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [selectedDept, setSelectedDept] = useState<string>("All");
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string>("");
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [selectedTeamFilter, setSelectedTeamFilter] = useState<string | null>(null);
    const [completionNote, setCompletionNote] = useState("");
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [tempStatus, setTempStatus] = useState<string | null>(null);
    const [isAssignPopoverOpen, setIsAssignPopoverOpen] = useState(false);
    const [isTesterPopoverOpen, setIsTesterPopoverOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isTeamDeleteModalOpen, setIsTeamDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<any>(null);
    const [isReassignOpen, setIsReassignOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const activeTask = tasks.find(t => t.id === selectedTask?.id) || selectedTask;

    // Team Creation State
    const [newTeam, setNewTeam] = useState({
        name: '',
        department: '',
        memberIds: [] as string[]
    });

    useEffect(() => {
        const db = firebase.database();
        const employeesRef = db.ref('root/nexus_hr/employees');
        const departmentsRef = db.ref('root/nexus_hr/departments');
        const teamsRef = db.ref('root/nexus_hr/teams');

        employeesRef.on('value', snap => setEmployees(snap.val() ? Object.values(snap.val()) : []));
        departmentsRef.on('value', snap => setDepartments(snap.val() ? Object.values(snap.val()) : []));
        teamsRef.on('value', snap => setTeams(snap.val() ? Object.values(snap.val()) : []));

        return () => {
            employeesRef.off();
            departmentsRef.off();
            teamsRef.off();
        };
    }, []);

    useEffect(() => {
        const db = firebase.database();
        const tasksRef = db.ref('root/nexus_hr/tasks');

        const onValueChange = (snap: any) => {
            const data = snap.val();
            if (data) {
                setTasks(Object.values(data));
            } else {
                setTasks([]);
            }
        };

        const limitedTasksQuery = tasksRef.limitToLast(200);
        limitedTasksQuery.on('value', onValueChange);
        return () => limitedTasksQuery.off('value', onValueChange);
    }, []);

    const handleCreateTeam = () => {
        if (!newTeam.name || !newTeam.department) {
            toast({ title: "Error", description: "Team name and department are required", variant: "destructive" });
            return;
        }
        const teamId = editingTeamId || 'TEAM-' + Date.now();
        const teamData = { ...newTeam, id: teamId };

        firebase.database().ref(`root/nexus_hr/teams/${teamId}`).set(teamData)
            .then(() => {
                setNewTeam({ name: '', department: '', memberIds: [] });
                setEditingTeamId(null);
                setIsTeamModalOpen(false);
                toast({ title: "Success", description: editingTeamId ? "Team updated successfully" : "Team created successfully" });
            });
    };

    const handleDeleteTask = (taskId: string) => {
        setItemToDelete(taskId);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteTask = () => {
        if (!itemToDelete) return;

        firebase.database().ref(`root/nexus_hr/tasks/${itemToDelete}`).remove()
            .then(() => {
                setIsDetailOpen(false);
                setSelectedTask(null);
                setIsDeleteModalOpen(false);
                setItemToDelete(null);
                toast({ title: "Deleted", description: "Task has been removed" });
            })
            .catch((error) => {
                console.error("Error deleting task:", error);
                toast({
                    title: "Error",
                    description: "Unable to delete task. Please check permissions.",
                    variant: "destructive"
                });
            });
    };

    const handleDeleteTeam = (teamId: string) => {
        setItemToDelete(teamId);
        setIsTeamDeleteModalOpen(true);
    };

    const confirmDeleteTeam = () => {
        if (!itemToDelete) return;

        firebase.database().ref(`root/nexus_hr/teams/${itemToDelete}`).remove()
            .then(() => {
                setIsTeamDeleteModalOpen(false);
                setItemToDelete(null);
                toast({ title: "Deleted", description: "Team has been removed" });
            })
            .catch((error) => {
                console.error("Error deleting team:", error);
                toast({
                    title: "Error",
                    description: "Unable to delete team. Please check permissions.",
                    variant: "destructive"
                });
            });
    };

    const handleCreateTask = () => {
        const validTasks = newTask.items.filter(item => item.title.trim() !== '');
        if (validTasks.length === 0) {
            toast({ title: "Error", description: "At least one task title is required", variant: "destructive" });
            return;
        }
        if (!newTask.assignedEmployeeIds || newTask.assignedEmployeeIds.length === 0) {
            toast({ title: "Error", description: "Please assign at least one member", variant: "destructive" });
            return;
        }

        const batchId = 'BATCH-' + Date.now();
        const createdNow = new Date().toISOString();
        const db = firebase.database();

        const promises = validTasks.map((item, index) => {
            const taskId = 'TSK-' + Date.now() + '-' + index;
            const initialStages: any = {};
            STAGES.forEach(s => initialStages[s.toLowerCase()] = { status: 'Pending', notes: '' });
            initialStages['office'].status = 'In Progress';
            initialStages['office'].startedAt = createdNow;

            const taskData = {
                id: taskId,
                taskId,
                batchId,
                title: item.title,
                description: item.description,
                images: item.images || [],
                priority: newTask.priority,
                dueDate: newTask.dueDate,
                assignedEmployeeIds: newTask.assignedEmployeeIds,
                testerId: newTask.testerId,
                teamId: selectedTeamId,
                createdAt: createdNow,
                stages: initialStages,
                currentStage: 'Office',
                status: 'Pending' // Default to pending
            };

            return db.ref(`root/nexus_hr/tasks/${taskId}`).set(taskData);
        });

        Promise.all(promises).then(() => {
            setIsCreateOpen(false);
            setNewTask({
                priority: 'Normal',
                dueDate: '',
                assignedEmployeeIds: [],
                testerId: '',
                items: [{ title: '', description: '', images: [] }]
            });
            setSelectedTeamId("");
            toast({ title: "Success", description: `Created ${validTasks.length} tasks successfully` });
        });
    };

    const handleTaskImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.src = reader.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const maxSize = 800; // Larger for task photos
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
                    const base64 = canvas.toDataURL('image/jpeg', 0.7);

                    const updatedItems = [...newTask.items];
                    updatedItems[index].images = [...(updatedItems[index].images || []), base64];
                    setNewTask({ ...newTask, items: updatedItems });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleStatusUpdate = (taskId: string, newStatus: string) => {
        if (newStatus === 'Completed') {
            setTempStatus(newStatus);
            setIsCompletionModalOpen(true);
            return;
        }

        const updates: any = { status: newStatus };
        firebase.database().ref(`root/nexus_hr/tasks/${taskId}`).update(updates)
            .then(() => {
                toast({ title: "Updated", description: `Task marked as ${newStatus}` });
            });
    };

    const confirmCompletion = () => {
        if (!selectedTask || !tempStatus) return;

        const isTransitionToTesting = selectedTask.testerId && selectedTask.status !== 'Testing';
        const finalStatus = isTransitionToTesting ? 'Testing' : tempStatus;

        const updates: any = {
            status: finalStatus,
            completedAt: new Date().toISOString(),
            completionNote: completionNote
        };

        firebase.database().ref(`root/nexus_hr/tasks/${selectedTask.id}`).update(updates)
            .then(() => {
                toast({
                    title: isTransitionToTesting ? "Sent for Testing" : "Success",
                    description: isTransitionToTesting ? "Task has been sent to the tester." : "Task completed with note"
                });
                setIsCompletionModalOpen(false);
                setCompletionNote("");
                setTempStatus(null);
                setIsDetailOpen(false);
            });
    };

    const [filterStatus, setFilterStatus] = useState<string>("All");

    const filteredTasks = tasks.filter(t => {
        const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
        const matchesTeam = !selectedTeamFilter || t.teamId === selectedTeamFilter;
        const matchesSearch = !searchQuery ||
            t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.taskId?.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesStatus && matchesTeam && matchesSearch;
    });

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            <Navbar />

            <div className="flex flex-1 overflow-hidden pt-16">
                {/* SIDEBAR */}
                <div className={`${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col fixed md:relative inset-y-0 left-0 z-40 top-16 md:top-0 h-[calc(100vh-4rem)] md:h-auto overflow-hidden`}>
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <h1 className="font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate pl-1">Workspace</h1>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" onClick={() => setIsCreateOpen(true)}>
                                    <Plus className="w-5 h-5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:flex hidden" onClick={() => setSidebarOpen(false)}>
                                    <PanelLeftClose className="w-5 h-5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden flex" onClick={() => setSidebarOpen(false)}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 py-4 px-3">
                        <div className="mb-8">
                            <div className="flex items-center justify-between px-3 mb-2 group">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filters</span>
                            </div>
                            <div className="space-y-1">
                                <SidebarItem
                                    icon={ClipboardList}
                                    label="All Tasks"
                                    active={filterStatus === 'All' && !selectedTeamFilter}
                                    onClick={() => {
                                        setFilterStatus('All');
                                        setSelectedTeamFilter(null);
                                    }}
                                    count={tasks.length}
                                />
                                <SidebarItem icon={Clock} label="Pending" active={filterStatus === 'Pending'} onClick={() => setFilterStatus('Pending')} count={tasks.filter(t => t.status === 'Pending').length} />
                                <SidebarItem icon={Activity} label="In Progress" active={filterStatus === 'In Progress'} onClick={() => setFilterStatus('In Progress')} count={tasks.filter(t => t.status === 'In Progress').length} />
                                <SidebarItem icon={Plus} label="Testing" active={filterStatus === 'Testing'} onClick={() => setFilterStatus('Testing')} count={tasks.filter(t => t.status === 'Testing').length} />
                                <SidebarItem icon={CheckCircle} label="Completed" active={filterStatus === 'Completed'} onClick={() => setFilterStatus('Completed')} count={tasks.filter(t => t.status === 'Completed').length} />
                                <SidebarItem icon={Lock} label="On Hold" active={filterStatus === 'On Hold'} onClick={() => setFilterStatus('On Hold')} count={tasks.filter(t => t.status === 'On Hold').length} />
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex items-center justify-between px-3 mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Teams</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-slate-400 hover:text-indigo-600"
                                    onClick={() => setIsTeamModalOpen(true)}
                                >
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </div>
                            <div className="space-y-1">
                                {teams.map(team => (
                                    <SidebarItem
                                        key={team.id}
                                        icon={Users}
                                        label={team.name}
                                        active={selectedTeamFilter === team.id}
                                        onClick={() => {
                                            setSelectedTeamFilter(team.id);
                                            setFilterStatus('All'); // Optional: reset status filter when picking team
                                        }}
                                        count={tasks.filter(t => t.teamId === team.id).length}
                                    />
                                ))}
                                {teams.length === 0 && (
                                    <p className="text-[10px] text-slate-400 px-3 italic">No teams created</p>
                                )}
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex items-center justify-between px-3 mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Management</span>
                            </div>
                            <SidebarItem icon={Settings} label="Manage Teams" active={isTeamModalOpen} onClick={() => setIsTeamModalOpen(true)} />
                        </div>
                    </ScrollArea>

                    {/* User Profile Footer */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"></div>
                            <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">System Online</span>
                        </div>
                    </div>
                </div>

                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* MAIN CONTENT */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900 h-full relative">
                    {/* Header */}
                    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            {/* Toggle Sidebar - Only visible when sidebar is closed on desktop, or always on mobile if we want (but logically, if sidebar covers screen on mobile, we don't need this when open) */}
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className={`${sidebarOpen ? 'md:hidden' : 'block'}`}
                            >
                                <Menu className="w-5 h-5 text-slate-600" />
                            </button>

                            <div className="flex items-center gap-2">
                                <BackButton />
                                <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                                    <Hash className="w-4 h-4 text-slate-400" />
                                    {selectedTeamFilter ? teams.find(t => t.id === selectedTeamFilter)?.name.toLowerCase() : (filterStatus === 'All' ? 'all-tasks' : filterStatus.toLowerCase())}
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 max-w-md w-full mx-4 hidden md:flex">
                            <div className="relative w-full">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder={`Search in ${selectedTeamFilter ? 'team' : filterStatus.toLowerCase()}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 pl-9 bg-slate-100 dark:bg-slate-800 border-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 h-9 w-9 md:hidden"
                                onClick={() => setIsCreateOpen(true)}
                            >
                                <Plus className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-slate-500"><HelpCircle className="w-5 h-5" /></Button>
                        </div>
                    </header>

                    {/* Content Area */}
                    <ScrollArea className="flex-1 p-6">
                        <div className="max-w-5xl mx-auto">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                        {filterStatus === 'All' ? 'Overview' : `${filterStatus} Tasks`}
                                    </h1>
                                    <p className="text-slate-500 text-sm mt-1">
                                        {filteredTasks.length} active tasks in this view
                                    </p>
                                </div>
                                <Button onClick={() => setIsCreateOpen(true)} className="bg-[#007a5a] hover:bg-[#007a5a]/90 text-white w-full sm:w-auto">
                                    <Plus className="w-4 h-4 mr-2 sm:hidden" />
                                    New Task
                                </Button>
                            </div>

                            {filterStatus === 'All' ? (
                                <div className="space-y-12">
                                    {['Pending', 'In Progress', 'Testing', 'On Hold', 'Completed'].map(status => {
                                        const tasksInStatus = filteredTasks.filter(t => (t.status || 'Pending') === status);
                                        if (tasksInStatus.length === 0) return null;

                                        return (
                                            <div key={status} className="space-y-4">
                                                <div className="flex items-center gap-2 px-1">
                                                    <div className={`w-3 h-3 rounded-sm ${status === 'Completed' ? 'bg-emerald-500' :
                                                        status === 'Testing' ? 'bg-purple-500' :
                                                            status === 'In Progress' ? 'bg-indigo-500' :
                                                                status === 'On Hold' ? 'bg-amber-500' : 'bg-slate-300'
                                                        }`} />
                                                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                                                        {status === 'Testing' ? 'QA Testing' : status}
                                                    </h2>
                                                    <Badge variant="secondary" className="rounded-full h-5 min-w-[20px] px-1.5">{tasksInStatus.length}</Badge>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {tasksInStatus.map(task => (
                                                        <TaskCard
                                                            key={task.id}
                                                            task={task}
                                                            employees={employees}
                                                            onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredTasks.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            employees={employees}
                                            onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                                        />
                                    ))}
                                </div>
                            )}

                            {filteredTasks.length === 0 && (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center">
                                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <h3 className="text-slate-900 dark:text-slate-100 font-medium">No tasks found</h3>
                                    <p className="text-slate-500 text-sm mb-4">There are no tasks in this view.</p>
                                    <Button onClick={() => setIsCreateOpen(true)} className="bg-[#007a5a] hover:bg-[#007a5a]/90 text-white">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create New Task
                                    </Button>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* CREATE TASK DIALOG */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create New Task</DialogTitle>
                            <DialogDescription>Initiate a new workflow chain.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Select Team</Label>
                                    <Select value={selectedTeamId} onValueChange={(val) => {
                                        setSelectedTeamId(val);
                                        setNewTask({ ...newTask, assignedEmployeeIds: [] }); // Reset assignment on team change
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a team..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teams.map(team => (
                                                <SelectItem key={team.id} value={team.id}>{team.name} ({team.department})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedTeamId && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Assign Members</Label>
                                            <Popover open={isAssignPopoverOpen} onOpenChange={setIsAssignPopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-between h-10 border-slate-200 dark:border-slate-800">
                                                        <span className="text-slate-500 font-normal">Search and assign members...</span>
                                                        <Search className="w-4 h-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                                    <div className="flex items-center justify-between p-2 border-b bg-slate-50 dark:bg-slate-900">
                                                        <span className="text-[10px] font-bold uppercase text-slate-500 ml-1">Assign Members</span>
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="h-7 px-3 text-[11px] font-bold"
                                                            onClick={() => setIsAssignPopoverOpen(false)}
                                                        >
                                                            Done
                                                        </Button>
                                                    </div>
                                                    <Command>
                                                        <CommandInput placeholder="Search employee name..." />
                                                        <CommandList>
                                                            <CommandEmpty>No employee found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {employees
                                                                    .filter(emp => {
                                                                        const team = teams.find(t => t.id === selectedTeamId);
                                                                        return team?.memberIds?.includes(emp.id);
                                                                    })
                                                                    .map(emp => (
                                                                        <CommandItem
                                                                            key={emp.id}
                                                                            onSelect={() => {
                                                                                const current = newTask.assignedEmployeeIds || [];
                                                                                const updated = current.includes(emp.id)
                                                                                    ? current.filter(id => id !== emp.id)
                                                                                    : [...current, emp.id];
                                                                                setNewTask({ ...newTask, assignedEmployeeIds: updated });
                                                                            }}
                                                                            className="flex items-center gap-2"
                                                                        >
                                                                            <div className={`flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${newTask.assignedEmployeeIds?.includes(emp.id) ? 'bg-primary text-primary-foreground' : 'opacity-50'}`}>
                                                                                {newTask.assignedEmployeeIds?.includes(emp.id) && <Check className="h-3 w-3" />}
                                                                            </div>
                                                                            <Avatar className="w-6 h-6">
                                                                                <AvatarImage src={emp.photoUrl} />
                                                                                <AvatarFallback className="text-[8px]">{emp.firstName?.[0]}</AvatarFallback>
                                                                            </Avatar>
                                                                            <span className="text-xs font-bold">{emp.firstName} {emp.lastName}</span>
                                                                        </CommandItem>
                                                                    ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>

                                            {/* Assigned Badges */}
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {(newTask.assignedEmployeeIds || []).map(id => {
                                                    const emp = employees.find(e => e.id === id);
                                                    if (!emp) return null;
                                                    return (
                                                        <Badge key={id} variant="secondary" className="pl-1 pr-2 py-0.5 gap-2 rounded-full">
                                                            <Avatar className="w-4 h-4">
                                                                <AvatarImage src={emp.photoUrl} />
                                                                <AvatarFallback className="text-[6px]">{emp.firstName?.[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-[10px] font-medium">{emp.firstName}</span>
                                                            <button
                                                                onClick={() => setNewTask({ ...newTask, assignedEmployeeIds: newTask.assignedEmployeeIds.filter(mid => mid !== id) })}
                                                                className="hover:text-red-500"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Select Tester</Label>
                                            <Popover open={isTesterPopoverOpen} onOpenChange={setIsTesterPopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-between h-10 border-slate-200 dark:border-slate-800">
                                                        <span className="text-slate-500 font-normal">
                                                            {newTask.testerId ? employees.find(e => e.id === newTask.testerId)?.firstName + ' ' + employees.find(e => e.id === newTask.testerId)?.lastName : 'Search and choose a tester...'}
                                                        </span>
                                                        <Search className="w-4 h-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                                    <div className="flex items-center justify-between p-2 border-b bg-slate-50 dark:bg-slate-900">
                                                        <span className="text-[10px] font-bold uppercase text-slate-500 ml-1">Select Tester</span>
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="h-7 px-3 text-[11px] font-bold"
                                                            onClick={() => setIsTesterPopoverOpen(false)}
                                                        >
                                                            Done
                                                        </Button>
                                                    </div>
                                                    <Command>
                                                        <CommandInput placeholder="Search employee name..." />
                                                        <CommandList>
                                                            <CommandEmpty>No employee found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {employees
                                                                    .filter(emp => {
                                                                        const team = teams.find(t => t.id === selectedTeamId);
                                                                        return team?.memberIds?.includes(emp.id);
                                                                    })
                                                                    .map(emp => (
                                                                        <CommandItem
                                                                            key={emp.id}
                                                                            onSelect={() => {
                                                                                setNewTask({ ...newTask, testerId: newTask.testerId === emp.id ? '' : emp.id });
                                                                            }}
                                                                            className="flex items-center gap-2"
                                                                        >
                                                                            <div className={`flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${newTask.testerId === emp.id ? 'bg-primary text-primary-foreground' : 'opacity-50'}`}>
                                                                                {newTask.testerId === emp.id && <Check className="h-3 w-3" />}
                                                                            </div>
                                                                            <Avatar className="w-6 h-6">
                                                                                <AvatarImage src={emp.photoUrl} />
                                                                                <AvatarFallback className="text-[8px]">{emp.firstName?.[0]}</AvatarFallback>
                                                                            </Avatar>
                                                                            <span className="text-xs font-bold">{emp.firstName} {emp.lastName}</span>
                                                                        </CommandItem>
                                                                    ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Priority</Label>
                                    <Select value={newTask.priority} onValueChange={v => setNewTask({ ...newTask, priority: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Normal">Normal</SelectItem>
                                            <SelectItem value="High">High</SelectItem>
                                            <SelectItem value="Urgent">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Due Date</Label>
                                    <Input
                                        type="date"
                                        value={newTask.dueDate}
                                        onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <Label className="text-sm font-bold uppercase tracking-wider text-slate-500">Tasks</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setNewTask({ ...newTask, items: [...newTask.items, { title: '', description: '', images: [] }] })}
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Add More
                                    </Button>
                                </div>

                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                    {newTask.items.map((item, idx) => (
                                        <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3 relative">
                                            {idx > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 h-8 w-8"
                                                    onClick={() => {
                                                        const updated = newTask.items.filter((_, i) => i !== idx);
                                                        setNewTask({ ...newTask, items: updated });
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Title</Label>
                                                <Input
                                                    placeholder="Task title..."
                                                    value={item.title}
                                                    onChange={e => {
                                                        const updated = [...newTask.items];
                                                        updated[idx].title = e.target.value;
                                                        setNewTask({ ...newTask, items: updated });
                                                    }}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Description</Label>
                                                <Input
                                                    placeholder="Details..."
                                                    value={item.description}
                                                    onChange={e => {
                                                        const updated = [...newTask.items];
                                                        updated[idx].description = e.target.value;
                                                        setNewTask({ ...newTask, items: updated });
                                                    }}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Attachments</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {item.images?.map((img, imgIdx) => (
                                                        <div key={imgIdx} className="relative group">
                                                            <img src={img} alt="task" className="w-12 h-12 object-cover rounded-md border" />
                                                            <button
                                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => {
                                                                    const updated = [...newTask.items];
                                                                    updated[idx].images = updated[idx].images.filter((_, i) => i !== imgIdx);
                                                                    setNewTask({ ...newTask, items: updated });
                                                                }}
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <label className="w-12 h-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-md cursor-pointer hover:border-slate-400 transition-colors">
                                                        <Camera className="w-4 h-4 text-slate-400" />
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={(e) => handleTaskImageUpload(idx, e)}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateTask} className="bg-[#007a5a] hover:bg-[#007a5a]/90 text-white">Create Tasks</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* TASK DETAIL SHEET */}
                <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <SheetContent className="w-full sm:max-w-xl overflow-y-auto pt-10">
                        {activeTask && (
                            <div className="flex flex-col h-full">
                                <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-mono">{activeTask.id}</Badge>
                                            <Badge className={
                                                activeTask.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                                                    activeTask.status === 'In Progress' ? 'bg-indigo-100 text-indigo-800' :
                                                        activeTask.status === 'Testing' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-amber-100 text-amber-800'
                                            }>
                                                {activeTask.status}
                                            </Badge>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-slate-400 hover:text-red-500 h-8 w-8"
                                            onClick={() => handleDeleteTask(activeTask.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <h1 className="text-2xl font-bold mb-1">{activeTask.title}</h1>
                                </div>

                                <div className="py-6 space-y-6">
                                    {/* Action Status Block */}
                                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold uppercase text-slate-500 mb-1">Current Status</p>
                                                <Badge className={
                                                    activeTask.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                                                        activeTask.status === 'In Progress' ? 'bg-indigo-100 text-indigo-800' :
                                                            activeTask.status === 'Testing' ? 'bg-purple-100 text-purple-800' :
                                                                activeTask.status === 'On Hold' ? 'bg-amber-100 text-amber-800' :
                                                                    'bg-slate-100 text-slate-800'
                                                }>
                                                    {activeTask.status}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Update To</Label>
                                                <Select
                                                    value={activeTask.status}
                                                    onValueChange={(val) => handleStatusUpdate(activeTask.id, val)}
                                                >
                                                    <SelectTrigger className="w-[140px] h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Pending">Pending</SelectItem>
                                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                                        <SelectItem value="On Hold">On Hold</SelectItem>
                                                        <SelectItem value="Testing">In Testing</SelectItem>
                                                        <SelectItem value="Completed">{activeTask.status === 'Testing' ? 'Pass & Complete' : 'Mark Completed'}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Task Attributes */}
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Priority</p>
                                            <p className="font-medium">{activeTask.priority}</p>
                                        </div>
                                    </div>

                                    {activeTask.completionNote && (
                                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-xl p-4">
                                            <p className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                                                <FileText className="w-3 h-3" />
                                                Completion Note
                                            </p>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">"{activeTask.completionNote}"</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Due Date</p>
                                        <p className="font-medium">{activeTask.dueDate || 'None'}</p>
                                    </div>
                                    {activeTask.testerId && (
                                        <div className="col-span-2 mt-2">
                                            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2">Assigned Tester</p>
                                            <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 p-1 pr-3 rounded-full shadow-sm w-fit">
                                                <Avatar className="w-6 h-6">
                                                    <AvatarImage src={employees.find(e => e.id === activeTask.testerId)?.photoUrl} />
                                                    <AvatarFallback className="text-[10px] text-purple-700">
                                                        {employees.find(e => e.id === activeTask.testerId)?.firstName?.[0] || 'T'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                                    {(() => {
                                                        const tester = employees.find(e => e.id === activeTask.testerId);
                                                        return tester ? `${tester.firstName} ${tester.lastName}` : 'Unknown Tester';
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="col-span-2 mt-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Assigned To</p>
                                            <Popover open={isReassignOpen} onOpenChange={setIsReassignOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 gap-1.5 rounded-full">
                                                        <UserPlus className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-bold">REASSIGN</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[300px] p-0" align="end">
                                                    <div className="flex items-center justify-between p-2 border-b bg-slate-50 dark:bg-slate-900">
                                                        <span className="text-[10px] font-bold uppercase text-slate-500 ml-1">Reassign Task</span>
                                                        <Button variant="secondary" size="sm" className="h-7 px-3 text-[11px] font-bold" onClick={() => setIsReassignOpen(false)}>Done</Button>
                                                    </div>
                                                    <Command>
                                                        <CommandInput placeholder="Search team member..." />
                                                        <CommandList>
                                                            <CommandEmpty>No member found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {employees
                                                                    .filter(emp => {
                                                                        const team = teams.find(t => t.id === activeTask.teamId);
                                                                        return team?.memberIds?.includes(emp.id);
                                                                    })
                                                                    .map(emp => (
                                                                        <CommandItem
                                                                            key={emp.id}
                                                                            onSelect={() => {
                                                                                const current = activeTask.assignedEmployeeIds || [];
                                                                                const updated = current.includes(emp.id)
                                                                                    ? current.filter(id => id !== emp.id)
                                                                                    : [...current, emp.id];
                                                                                firebase.database().ref(`root/nexus_hr/tasks/${activeTask.id}`).update({
                                                                                    assignedEmployeeIds: updated
                                                                                });
                                                                            }}
                                                                            className="flex items-center gap-2"
                                                                        >
                                                                            <div className={`flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${activeTask.assignedEmployeeIds?.includes(emp.id) ? 'bg-primary text-primary-foreground' : 'opacity-50'}`}>
                                                                                {activeTask.assignedEmployeeIds?.includes(emp.id) && <Check className="h-3 w-3" />}
                                                                            </div>
                                                                            <Avatar className="w-6 h-6">
                                                                                <AvatarImage src={emp.photoUrl} />
                                                                                <AvatarFallback className="text-[8px] font-bold">{emp.firstName?.[0]}</AvatarFallback>
                                                                            </Avatar>
                                                                            <span className="text-xs font-bold">{emp.firstName} {emp.lastName}</span>
                                                                        </CommandItem>
                                                                    ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {activeTask.assignedEmployeeIds && activeTask.assignedEmployeeIds.length > 0 ? (
                                                activeTask.assignedEmployeeIds.map((id: string) => {
                                                    const emp = employees.find(e => e.id === id);
                                                    return (
                                                        <div key={id} className="flex items-center gap-2 bg-white dark:bg-slate-800 border p-1 pr-3 rounded-full shadow-sm">
                                                            <Avatar className="w-6 h-6">
                                                                <AvatarImage src={emp?.photoUrl} />
                                                                <AvatarFallback className="text-[10px] font-bold">
                                                                    {emp?.firstName?.[0] || 'E'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-xs font-medium">
                                                                {emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-sm text-slate-500 italic">No employees assigned</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-span-2 mt-2">
                                        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Description</p>
                                        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{activeTask.description || 'No description provided.'}</p>
                                    </div>
                                    {activeTask.images && activeTask.images.length > 0 && (
                                        <div className="col-span-2 mt-4">
                                            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2">Attachments</p>
                                            <div className="flex flex-wrap gap-2">
                                                {activeTask.images.map((img: string, i: number) => (
                                                    <img
                                                        key={i}
                                                        src={img}
                                                        alt="Attachment"
                                                        className="w-24 h-24 object-cover rounded-lg border shadow-sm hover:scale-105 transition-transform cursor-pointer"
                                                        onClick={() => setPreviewImage(img)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </SheetContent>
                </Sheet>

                {/* TEAM MANAGEMENT DIALOG */}
                <Dialog open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Manage Teams</DialogTitle>
                            <DialogDescription>Create and organize your teams.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Team Name</Label>
                                    <Input
                                        placeholder="e.g. Frontend Team"
                                        value={newTeam.name}
                                        onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Department</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="e.g. Development"
                                            value={newTeam.department}
                                            onChange={e => setNewTeam({ ...newTeam, department: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label>Add Team Members</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-10 border-slate-200 dark:border-slate-800">
                                            <span className="text-slate-500 font-normal">Search and add members...</span>
                                            <Search className="w-4 h-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search employee name..." />
                                            <CommandList>
                                                <CommandEmpty>No employee found.</CommandEmpty>
                                                <CommandGroup>
                                                    {employees
                                                        .filter(emp => emp.role !== 'Ride' && emp.department !== 'Logistics')
                                                        .map(emp => (
                                                            <CommandItem
                                                                key={emp.id}
                                                                onSelect={() => {
                                                                    const current = newTeam.memberIds;
                                                                    const updated = current.includes(emp.id)
                                                                        ? current.filter(id => id !== emp.id)
                                                                        : [...current, emp.id];
                                                                    setNewTeam({ ...newTeam, memberIds: updated });
                                                                }}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <div className={`flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${newTeam.memberIds.includes(emp.id) ? 'bg-primary text-primary-foreground' : 'opacity-50'}`}>
                                                                    {newTeam.memberIds.includes(emp.id) && <Check className="h-3 w-3" />}
                                                                </div>
                                                                <Avatar className="w-6 h-6">
                                                                    <AvatarImage src={emp.photoUrl} />
                                                                    <AvatarFallback className="text-[8px]">{emp.firstName?.[0]}</AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-xs font-bold truncate">{emp.firstName} {emp.lastName}</span>
                                                                    <span className="text-[10px] text-slate-500 truncate">{emp.role}</span>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>

                                {/* Selected Members Display */}
                                <div className="border rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/50 min-h-[60px]">
                                    <div className="flex flex-wrap gap-2">
                                        {newTeam.memberIds.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic py-2">No members selected yet</p>
                                        ) : (
                                            newTeam.memberIds.map(id => {
                                                const emp = employees.find(e => e.id === id);
                                                if (!emp) return null;
                                                return (
                                                    <Badge key={id} variant="secondary" className="pl-1 pr-2 py-1 gap-2 rounded-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                        <Avatar className="w-5 h-5">
                                                            <AvatarImage src={emp.photoUrl} />
                                                            <AvatarFallback className="text-[8px]">{emp.firstName?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-xs font-medium">{emp.firstName}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setNewTeam({ ...newTeam, memberIds: newTeam.memberIds.filter(mid => mid !== id) });
                                                            }}
                                                            className="hover:text-red-500 transition-colors"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </Badge>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <Label className="text-xs font-bold uppercase text-slate-400 mb-3 block">Existing Teams</Label>
                                <div className="grid grid-cols-2 gap-3 max-h-[150px] overflow-y-auto">
                                    {teams.map(team => (
                                        <div key={team.id} className="p-3 bg-white dark:bg-slate-800 border rounded-lg flex items-center justify-between group">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold truncate">{team.name}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{team.department} • {team.memberIds?.length || 0} members</p>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                                    onClick={() => {
                                                        setEditingTeamId(team.id);
                                                        setNewTeam({
                                                            name: team.name,
                                                            department: team.department,
                                                            memberIds: team.memberIds || []
                                                        });
                                                    }}
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    onClick={() => handleDeleteTeam(team.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => {
                                setIsTeamModalOpen(false);
                                setEditingTeamId(null);
                                setNewTeam({ name: '', department: '', memberIds: [] });
                            }}>Cancel</Button>
                            <Button onClick={handleCreateTeam} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {editingTeamId ? 'Update Team' : 'Save Team'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {/* DELETE TASK CONFIRMATION DIALOG */}
                <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <Trash2 className="w-5 h-5" />
                                Confirm Deletion
                            </DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this task? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDeleteTask}>
                                Delete Task
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* DELETE TEAM CONFIRMATION DIALOG */}
                <Dialog open={isTeamDeleteModalOpen} onOpenChange={setIsTeamDeleteModalOpen}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <Trash2 className="w-5 h-5" />
                                Delete Team
                            </DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this team? All team data will be removed.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setIsTeamDeleteModalOpen(false)}>Cancel</Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDeleteTeam}>
                                Delete Team
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* COMPLETION NOTE DIALOG */}
                <Dialog open={isCompletionModalOpen} onOpenChange={setIsCompletionModalOpen}>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                                Complete Task
                            </DialogTitle>
                            <DialogDescription>
                                Add a note about the completion of this task.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label>Completion Note (Optional)</Label>
                                <textarea
                                    className="w-full h-32 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none resize-none"
                                    placeholder="Write any final details, challenges, or results..."
                                    value={completionNote}
                                    onChange={(e) => setCompletionNote(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCompletionModalOpen(false)}>Cancel</Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmCompletion}>
                                Finish & Mark Completed
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* IMAGE PREVIEW MODAL */}
                <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                    <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
                        <div className="relative group max-w-full max-h-full">
                            <img
                                src={previewImage || ''}
                                alt="Attachment Preview"
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl transition-all duration-300"
                            />
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20"
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = previewImage || '';
                                        link.download = `attachment-${Date.now()}.jpg`;
                                        link.click();
                                    }}
                                >
                                    Download
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20"
                                    onClick={() => setPreviewImage(null)}
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default TaskManager;
