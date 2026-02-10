import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/ui/use-toast";
import { firebase } from "@/lib/firebase";
import { sendPushNotification, sendCloudFunctionPush } from "@/utils/fcm";
import { sendTaskUpdateEmail } from "@/utils/emailService";
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
    Pin,
    Smile,
    CornerDownRight,
    ThumbsUp,
    Heart,
    Laugh,
    Meh,
    Frown,
    Angry,
    ArrowUp,
    UserPlus,
    Lock,
    Pencil,
    Check,
    Send,
    UserCircle,
    Calendar,
    Shield
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

import {
    TASK_TYPES,
    TASK_SUB_TYPES,
    TASK_COMPONENTS,
    TASK_PRIORITIES,
    ADMIN_STATUSES,
    EMP_STATUSES,
    DEFAULT_TASK_STATUS_ADMIN,
    DEFAULT_TASK_STATUS_EMP
} from "./TaskManager/constants";

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
            case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400';
            case 'In Progress': return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400';
            case 'Testing': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400';
            case 'On Hold': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400';
            default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
        }
    };

    const priorityGlow = task.priority === 'High' ? 'hover:shadow-red-500/20' :
        task.priority === 'Low' ? 'hover:shadow-slate-500/10' :
            'hover:shadow-indigo-500/20';

    return (
        <div
            onClick={onClick}
            className={`group relative flex flex-col p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 
                rounded-xl cursor-pointer shadow-sm hover:shadow-xl ${priorityGlow}
                transition-all duration-500 ease-out
                hover:-translate-y-2 hover:scale-[1.02]
                animate-in fade-in slide-in-from-bottom-4 duration-700
                overflow-hidden`}
        >
            {/* Gradient Overlay on Hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${task.priority === 'High' ? 'from-red-500/5 via-transparent to-transparent' :
                task.priority === 'Low' ? 'from-slate-500/5 via-transparent to-transparent' :
                    'from-indigo-500/5 via-transparent to-transparent'
                } opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            {/* Priority Side Stripe */}
            <div className={`absolute top-0 left-0 w-1 h-full transition-all duration-300 group-hover:w-1.5 ${task.priority === 'High' ? 'bg-gradient-to-b from-red-500 to-red-600' :
                task.priority === 'Low' ? 'bg-gradient-to-b from-slate-400 to-slate-500' :
                    'bg-gradient-to-b from-indigo-500 to-indigo-600'
                }`} />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <Badge
                            variant={task.priority === 'High' ? 'destructive' : 'secondary'}
                            className={`rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold
                                transition-all duration-300 group-hover:scale-110
                                ${task.priority === 'High' ? 'bg-red-50 text-red-600 ring-1 ring-red-500/20 dark:bg-red-950/30 dark:text-red-400' :
                                    task.priority === 'Low' ? 'bg-slate-50 text-slate-600 ring-1 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-400' :
                                        'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20 dark:bg-indigo-950/30 dark:text-indigo-400'}`}
                        >
                            {task.priority || 'Normal'}
                        </Badge>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-wide">{task.taskId}</span>
                    </div>
                    {task.status === 'Completed' ? (
                        <div className="p-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                    ) : (
                        <Badge variant="outline" className={`text-[9px] uppercase font-bold px-2 py-0.5 transition-all duration-300 group-hover:scale-105 ${getStatusStyles(task.status)}`}>
                            {task.status === 'Testing' ? 'QA Testing' : (task.status || 'Pending')}
                        </Badge>
                    )}
                </div>

                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300 line-clamp-2 leading-snug">
                    {task.title}
                </h3>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 overflow-hidden w-full">
                        {task.status === 'Testing' && task.testerId ? (
                            <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1.5 rounded-lg border border-purple-100 dark:border-purple-800 w-full overflow-hidden transition-all duration-300 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30">
                                <Avatar className="w-5 h-5 shrink-0 ring-2 ring-purple-200 dark:ring-purple-800">
                                    <AvatarImage src={employees.find(e => e.id === task.testerId)?.photoUrl} />
                                    <AvatarFallback className="text-[8px] bg-gradient-to-br from-purple-400 to-purple-600 text-white font-bold">
                                        {employees.find(e => e.id === task.testerId)?.firstName?.[0] || 'T'}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="font-bold text-purple-700 dark:text-purple-300 truncate text-xs">
                                    QA: {employees.find(e => e.id === task.testerId)?.firstName || 'Unknown'}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                <div className="flex -space-x-2 transition-all duration-300 group-hover:-space-x-1">
                                    {(task.assignedEmployeeIds || []).slice(0, 3).map((id: string) => {
                                        const emp = employees.find(e => e.id === id);
                                        return (
                                            <Avatar key={id} className="w-6 h-6 border-2 border-white dark:border-slate-900 transition-transform duration-300 group-hover:scale-110 ring-2 ring-transparent group-hover:ring-indigo-500/30">
                                                <AvatarImage src={emp?.photoUrl} />
                                                <AvatarFallback className="text-[9px] bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold">
                                                    {emp?.firstName?.[0] || 'E'}
                                                </AvatarFallback>
                                            </Avatar>
                                        );
                                    })}
                                    {(task.assignedEmployeeIds || []).length > 3 && (
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 transition-transform duration-300 group-hover:scale-110">
                                            +{(task.assignedEmployeeIds || []).length - 3}
                                        </div>
                                    )}
                                </div>
                                <span className="font-medium text-slate-700 dark:text-slate-300 truncate text-xs">
                                    {task.assignedEmployeeIds?.length > 0
                                        ? (task.assignedEmployeeIds.length === 1
                                            ? employees.find(e => e.id === task.assignedEmployeeIds[0])?.firstName
                                            : `${task.assignedEmployeeIds.length} Assignees`)
                                        : 'Unassigned'}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 transition-all duration-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 group-hover:scale-105">
                        <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors duration-300" />
                        <span className="text-xs font-medium">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No Date'}</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-700 ease-out rounded-full ${task.status === 'Completed' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 w-full shadow-lg shadow-emerald-500/50' :
                        task.status === 'Testing' ? 'bg-gradient-to-r from-purple-500 to-purple-600 w-3/4 shadow-lg shadow-purple-500/50' :
                            task.status === 'In Progress' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 w-1/2 shadow-lg shadow-indigo-500/50' :
                                task.status === 'On Hold' ? 'bg-gradient-to-r from-amber-500 to-amber-600 w-1/4 shadow-lg shadow-amber-500/50' :
                                    'bg-gradient-to-r from-slate-300 to-slate-400 w-0'
                        }`} />
                </div>
            </div>

            {/* Shine Effect on Hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>
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

    // User Role Check
    const isStaff = sessionStorage.getItem("user_role") === "staff";
    const loggedInEmpId = sessionStorage.getItem("employee_id");
    const loggedInName = sessionStorage.getItem("staff_name");

    // Form State
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'Normal',
        dueDate: '',
        assignedEmployeeIds: [] as string[],
        testerId: '' as string,
        items: [{ title: '', description: '', images: [] as string[] }], // Keeping for backward compatibility or batch? No, user wants single form. But keeping it to avoid breaking other logic temporarily, will refactor logic next.
        // New Fields
        taskType: '',
        taskSubType: '',
        taskComponent: '',
        version: '',
        effortDays: '',
        images: [] as string[],
        status: 'Open'
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
    const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string | null>(null);
    const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string | null>(null);
    const [completionNote, setCompletionNote] = useState("");
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [tempStatus, setTempStatus] = useState<string | null>(null);
    const [isAssignPopoverOpen, setIsAssignPopoverOpen] = useState(false);
    const [isTesterPopoverOpen, setIsTesterPopoverOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
    const [isTeamDeleteModalOpen, setIsTeamDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<any>(null);
    const [isReassignOpen, setIsReassignOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editTaskData, setEditTaskData] = useState<any>(null);
    const [commentText, setCommentText] = useState("");
    const [selectedCommenterId, setSelectedCommenterId] = useState<string>(loggedInEmpId || "");

    useEffect(() => {
        if (loggedInEmpId) {
            setSelectedCommenterId(loggedInEmpId);
        }
    }, [loggedInEmpId]);
    const [isCommenterPopoverOpen, setIsCommenterPopoverOpen] = useState(false);
    const [commenterSearch, setCommenterSearch] = useState("");

    const [subTaskInput, setSubTaskInput] = useState("");
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
    const [approveAssignee, setApproveAssignee] = useState("");
    const [approveEffort, setApproveEffort] = useState("");

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

    const sendTaskNotification = (targetIds: string[], title: string, message: string) => {
        if (!targetIds || targetIds.length === 0) return;
        const db = firebase.database();
        const notificationId = 'NOTIF-' + Date.now() + Math.random().toString(36).substr(2, 5);
        db.ref(`root/notifications/${notificationId}`).set({
            id: notificationId,
            title,
            message,
            timestamp: Date.now(),
            targetEmployeeIds: targetIds,
            type: 'info'
        });
    };

    const handleCreateTeam = () => {
        if (!newTeam.name || !newTeam.department) {
            toast({ title: "Error", description: "Workspace name and department are required", variant: "destructive" });
            return;
        }
        const teamId = editingTeamId || 'TEAM-' + Date.now();
        const teamData = { ...newTeam, id: teamId };

        firebase.database().ref(`root/nexus_hr/teams/${teamId}`).set(teamData)
            .then(() => {
                setNewTeam({ name: '', department: '', memberIds: [] });
                setEditingTeamId(null);
                setIsTeamModalOpen(false);
                toast({ title: "Success", description: editingTeamId ? "Workspace updated successfully" : "Workspace created successfully" });
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
                toast({ title: "Deleted", description: "Workspace has been removed" });
            })
            .catch((error) => {
                console.error("Error deleting team:", error);
                toast({
                    title: "Error",
                    description: "Unable to delete workspace. Please check permissions.",
                    variant: "destructive"
                });
            });
    };

    const handleCreateTask = () => {
        if (!newTask.title.trim()) {
            toast({ title: "Error", description: "Title is required", variant: "destructive" });
            return;
        }
        if (!selectedTeamId) {
            toast({ title: "Error", description: "Please select a workspace", variant: "destructive" });
            return;
        }

        // Admin validation: must assign
        if (!isStaff && (!newTask.assignedEmployeeIds || newTask.assignedEmployeeIds.length === 0)) {
            toast({ title: "Error", description: "Please assign at least one member", variant: "destructive" });
            return;
        }

        const taskId = 'TSK-' + Date.now();
        const createdNow = new Date().toISOString();
        const db = firebase.database();

        const taskData = {
            id: taskId,
            taskId,
            title: newTask.title,
            description: newTask.description,
            images: newTask.images || [],
            priority: newTask.priority,
            dueDate: newTask.dueDate,
            effortDays: newTask.effortDays,

            // Relational checks
            assignedEmployeeIds: newTask.assignedEmployeeIds || [],
            testerId: newTask.testerId || '',
            teamId: selectedTeamId,

            // Meta
            createdAt: createdNow,
            assignedDate: (newTask.assignedEmployeeIds?.length ?? 0) > 0 ? createdNow : null,
            createdBy: isStaff ? loggedInEmpId : 'admin',
            creatorName: isStaff ? loggedInName : 'Admin',

            // Taxonomy
            taskType: newTask.taskType,
            taskSubType: newTask.taskSubType,
            taskComponent: newTask.taskComponent,
            version: newTask.version,

            // Status Logic: Employee -> Raised, Admin -> Open (or selected)
            status: isStaff ? 'Raised' : (newTask.status || 'Open'),

            // Legacy / Default fields
            currentStage: 'Office'
        };

        db.ref(`root/nexus_hr/tasks/${taskId}`).set(taskData).then(() => {
            // Notifications
            const assignees = newTask.assignedEmployeeIds || [];
            if (assignees.length > 0) {
                // Email
                const recipients = assignees
                    .map(id => {
                        const emp = employees.find(e => e.id === id);
                        return emp && emp.email ? { email: emp.email } : null;
                    })
                    .filter((r): r is { email: string } => r !== null);

                if (recipients.length > 0) {
                    sendTaskUpdateEmail(
                        recipients,
                        newTask.title,
                        newTask.description,
                        (newTask.images || []).length > 0
                    );
                }

                // Cloud Function Push
                sendCloudFunctionPush(
                    assignees,
                    "New Task Assigned 📋",
                    `You have been assigned: ${newTask.title}`
                );
            }

            toast({ title: "Success", description: "Task created successfully" });
            setIsCreateOpen(false);

            // Reset Form (Preserve previous team/defaults if needed, but clearing mostly)
            setNewTask(prev => ({
                ...prev,
                title: '',
                description: '',
                priority: 'Normal',
                assignedEmployeeIds: [],
                testerId: '',
                taskType: '',
                taskSubType: '',
                taskComponent: '',
                version: '',
                effortDays: '',
                images: [],
                status: isStaff ? 'Raised' : 'Open'
            }));
        });
    };

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
                    const maxSize = 800;
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

                    setNewTask(prev => ({
                        ...prev,
                        images: [...(prev.images || []), base64]
                    }));
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

    const handleAddComment = async () => {
        if (!commentText.trim() || !activeTask) return;

        // For admin users, use 'Admin' as author
        const authorId = isStaff ? selectedCommenterId : 'admin';
        const authorName = isStaff
            ? (employees.find(e => e.id === selectedCommenterId) ? `${employees.find(e => e.id === selectedCommenterId)?.firstName} ${employees.find(e => e.id === selectedCommenterId)?.lastName}` : "Unknown")
            : "Admin";

        if (isStaff && !selectedCommenterId) {
            toast({ title: "Error", description: "Please select a commenter", variant: "destructive" });
            return;
        }

        const commentId = 'COM-' + Date.now();
        const newComment = {
            id: commentId,
            text: commentText,
            author: authorName,
            authorId: authorId,
            createdAt: new Date().toISOString()
        };

        try {
            await firebase.database().ref(`root/nexus_hr/tasks/${activeTask.id}/comments/${commentId}`).set(newComment);

            // Send email notifications to assigned employees
            const assignedIds = activeTask.assignedEmployeeIds || [];
            if (assignedIds.length > 0) {
                const recipients = assignedIds
                    .map(id => employees.find(e => e.id === id))
                    .filter(emp => emp && emp.email)
                    .map(emp => ({ email: emp.email }));

                if (recipients.length > 0) {
                    await sendTaskUpdateEmail(
                        recipients,
                        `${authorName} commented on your task`,
                        `<h2>${activeTask.title}</h2><p><strong>${authorName}</strong> commented:</p><p>${commentText}</p>`,
                        false,
                        `New comment on: ${activeTask.title}`
                    );
                }
            }

            setCommentText("");
            if (isStaff) {
                setSelectedCommenterId(loggedInEmpId || "");
            }
            toast({ title: "Comment added" });
        } catch (error) {
            console.error("Error adding comment:", error);
            toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
        }
    };


    const handleUpdateTask = () => {
        if (!editTaskData) return;
        firebase.database().ref(`root/nexus_hr/tasks/${editTaskData.id}`).update({
            title: editTaskData.title,
            description: editTaskData.description,
            priority: editTaskData.priority,
            dueDate: editTaskData.dueDate,
            testerId: editTaskData.testerId,
            assignedEmployeeIds: editTaskData.assignedEmployeeIds
        }).then(() => {
            // Send notification to newly assigned members
            const oldAssignees = activeTask?.assignedEmployeeIds || [];
            const newAssignees = editTaskData.assignedEmployeeIds || [];
            const newlyAdded = newAssignees.filter((id: string) => !oldAssignees.includes(id));

            if (newlyAdded.length > 0) {
                sendTaskNotification(
                    newlyAdded,
                    "Task Assigned to You",
                    `Task "${editTaskData.title}" has been assigned to you.`
                );

                // Send REAL FCM Push Notification to newly added via Cloud Function
                sendCloudFunctionPush(
                    newlyAdded,
                    "Task Assigned to You 📋",
                    `You have been assigned a task: ${editTaskData.title}`
                );
            }

            setIsEditOpen(false);
            toast({ title: "Task updated" });
        });
    };

    // --- Sub-Task Handlers ---
    const handleAddSubTask = () => {
        if (!subTaskInput.trim() || !activeTask) return;
        const newSubInfo = {
            id: Date.now().toString(),
            title: subTaskInput,
            completed: false
        };
        const currentSubs = activeTask.subTasks || [];
        const updatedSubs = [...currentSubs, newSubInfo];
        firebase.database().ref(`root/nexus_hr/tasks/${activeTask.id}`).update({ subTasks: updatedSubs });
        setSubTaskInput("");
    };

    const handleToggleSubTask = (subId: string) => {
        if (!activeTask) return;
        const currentSubs = activeTask.subTasks || [];
        const updatedSubs = currentSubs.map((s: any) => s.id === subId ? { ...s, completed: !s.completed } : s);
        firebase.database().ref(`root/nexus_hr/tasks/${activeTask.id}`).update({ subTasks: updatedSubs });
    };

    const handleDeleteSubTask = (subId: string) => {
        if (!activeTask) return;
        const currentSubs = activeTask.subTasks || [];
        const updatedSubs = currentSubs.filter((s: any) => s.id !== subId);
        firebase.database().ref(`root/nexus_hr/tasks/${activeTask.id}`).update({ subTasks: updatedSubs });
    };

    const handleApproveTask = () => {
        if (!activeTask || !approveAssignee) return;

        const updates = {
            status: 'Open',
            assignedEmployeeIds: [approveAssignee],
            assignedDate: new Date().toISOString(),
            effortDays: approveEffort
        };

        firebase.database().ref(`root/nexus_hr/tasks/${activeTask.id}`).update(updates);

        const assignee = employees.find(e => e.id === approveAssignee);
        if (assignee) {
            // Send Email
            sendTaskUpdateEmail(
                [{ email: assignee.email }],
                activeTask.title,
                activeTask.description,
                (activeTask.images || []).length > 0,
                "Task Approved & Assigned"
            );

            // Send Cloud Push Notification
            sendCloudFunctionPush(
                [assignee.id],
                "Task Approved & Assigned 📋",
                `You have been assigned the approved task: ${activeTask.title}`
            );
        }

        setIsApproveDialogOpen(false);
        setApproveAssignee("");
        setApproveEffort("");
        toast({ title: "Task Approved & Assigned" });
    };

    const [filterStatus, setFilterStatus] = useState<string>("All");

    const filteredTasks = tasks.filter(t => {
        const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
        const matchesTeam = !selectedTeamFilter || t.teamId === selectedTeamFilter;
        const matchesEmployee = !selectedEmployeeFilter || (t.assignedEmployeeIds || []).includes(selectedEmployeeFilter);
        const matchesPriority = !selectedPriorityFilter || t.priority === selectedPriorityFilter;
        const matchesSearch = !searchQuery ||
            t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.taskId?.toLowerCase().includes(searchQuery.toLowerCase());

        // Visibility Logic:
        // - Admins see all.
        // - Staff see tasks if:
        //   1. They created it.
        //   2. They are assigned to it.
        //   3. The task is NOT 'Raised' (i.e., it has been approved/opened).
        let isVisible = true;
        if (isStaff) {
            const isCreator = t.createdBy === loggedInEmpId;
            const isAssigned = (t.assignedEmployeeIds || []).includes(loggedInEmpId);
            const isPublic = t.status !== 'Raised'; // 'Raised' tasks are private to admin/creator

            if (!isCreator && !isAssigned && !isPublic) {
                isVisible = false;
            }
        }

        return matchesStatus && matchesTeam && matchesEmployee && matchesPriority && matchesSearch && isVisible;
    });

    // Segregate tasks into 'My Tasks' and 'Other Tasks'
    const myTasks = filteredTasks.filter(t => (t.assignedEmployeeIds || []).includes(loggedInEmpId));
    const otherTasks = filteredTasks.filter(t => !(t.assignedEmployeeIds || []).includes(loggedInEmpId));

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20 font-sans transition-colors duration-300">
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
                                <SidebarItem icon={FileText} label="Raised" active={filterStatus === 'Raised'} onClick={() => setFilterStatus('Raised')} count={tasks.filter(t => t.status === 'Raised').length} />
                                <SidebarItem icon={Clock} label="Open" active={filterStatus === 'Open'} onClick={() => setFilterStatus('Open')} count={tasks.filter(t => t.status === 'Open' || t.status === 'Pending').length} />
                                <SidebarItem icon={Activity} label="In Progress" active={filterStatus === 'In Progress'} onClick={() => setFilterStatus('In Progress')} count={tasks.filter(t => t.status === 'In Progress').length} />
                                <SidebarItem icon={Search} label="Testing" active={filterStatus === 'Testing'} onClick={() => setFilterStatus('Testing')} count={tasks.filter(t => t.status === 'Testing').length} />
                                <SidebarItem icon={Check} label="Resolved" active={filterStatus === 'Resolved'} onClick={() => setFilterStatus('Resolved')} count={tasks.filter(t => t.status === 'Resolved').length} />
                                <SidebarItem icon={Plus} label="Reopened" active={filterStatus === 'Reopened'} onClick={() => setFilterStatus('Reopened')} count={tasks.filter(t => t.status === 'Reopened').length} />
                                <SidebarItem icon={Lock} label="Hold" active={filterStatus === 'Hold' || filterStatus === 'On Hold'} onClick={() => setFilterStatus('Hold')} count={tasks.filter(t => t.status === 'Hold' || t.status === 'On Hold').length} />
                                <SidebarItem icon={CheckCircle} label="Completed" active={filterStatus === 'Completed'} onClick={() => setFilterStatus('Completed')} count={tasks.filter(t => t.status === 'Completed').length} />
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex items-center justify-between px-3 mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Workspaces</span>
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
                                    <p className="text-[10px] text-slate-400 px-3 italic">No workspaces created</p>
                                )}
                                <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                                    <SidebarItem
                                        icon={Plus}
                                        label="Create Workspace"
                                        onClick={() => {
                                            setEditingTeamId(null); // Ensure we are in create mode
                                            setNewTeam({ name: '', department: '', memberIds: [] });
                                            setIsTeamModalOpen(true);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex items-center justify-between px-3 mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Management</span>
                            </div>
                            <SidebarItem icon={Settings} label="Manage Workspaces" active={isTeamModalOpen} onClick={() => setIsTeamModalOpen(true)} />
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

                        {/* Employee Filter */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 border-slate-200 dark:border-slate-700 gap-2 text-xs whitespace-nowrap hidden md:flex"
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    {selectedEmployeeFilter
                                        ? employees.find(e => e.id === selectedEmployeeFilter)?.firstName || 'Employee'
                                        : 'All Employees'
                                    }
                                    <ChevronDown className="w-3 h-3 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search employees..." />
                                    <CommandList>
                                        <CommandEmpty>No employee found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                onSelect={() => setSelectedEmployeeFilter(null)}
                                                className="cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                                        <Users className="w-3 h-3 text-slate-600" />
                                                    </div>
                                                    <span className="font-medium">All Employees</span>
                                                </div>
                                                {!selectedEmployeeFilter && <Check className="ml-auto w-4 h-4" />}
                                            </CommandItem>
                                            {employees.filter(emp => emp.role !== 'Ride').map(emp => (
                                                <CommandItem
                                                    key={emp.id}
                                                    onSelect={() => setSelectedEmployeeFilter(emp.id)}
                                                    className="cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="w-6 h-6">
                                                            <AvatarImage src={emp.photoUrl} />
                                                            <AvatarFallback className="text-[8px]">
                                                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span>{emp.firstName} {emp.lastName}</span>
                                                    </div>
                                                    {selectedEmployeeFilter === emp.id && <Check className="ml-auto w-4 h-4" />}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {/* Priority Filter */}
                        <Select value={selectedPriorityFilter || "all"} onValueChange={(val) => setSelectedPriorityFilter(val === "all" ? null : val)}>
                            <SelectTrigger className="h-8 w-auto border-slate-200 dark:border-slate-700 gap-2 text-xs whitespace-nowrap hidden md:flex">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${selectedPriorityFilter === 'High' ? 'bg-red-500' :
                                        selectedPriorityFilter === 'Normal' ? 'bg-indigo-500' :
                                            selectedPriorityFilter === 'Low' ? 'bg-slate-400' :
                                                'bg-slate-300'
                                        }`} />
                                    <SelectValue placeholder="All Priorities" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="High">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                        High
                                    </div>
                                </SelectItem>
                                <SelectItem value="Normal">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                        Normal
                                    </div>
                                </SelectItem>
                                <SelectItem value="Low">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                                        Low
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>

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
                                <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto shadow-sm transition-all duration-200">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Task
                                </Button>
                            </div>

                            {filterStatus === 'All' ? (
                                <div className="space-y-12">
                                    {/* My Tasks Section */}
                                    {myTasks.length > 0 && (
                                        <div className="space-y-6">
                                            <div className="relative group animate-in fade-in slide-in-from-left-4 duration-700">
                                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                                                <div className="relative flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/50 dark:to-indigo-900/30 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50 backdrop-blur-sm shadow-lg shadow-indigo-500/10 hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-500">
                                                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg shadow-indigo-500/50 group-hover:scale-110 transition-transform duration-300">
                                                        <UserCircle className="w-5 h-5 text-white" />
                                                    </div>
                                                    <h2 className="text-lg font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-400 dark:to-indigo-600 bg-clip-text text-transparent">
                                                        My Tasks
                                                    </h2>
                                                    <Badge variant="secondary" className="ml-auto rounded-full h-6 min-w-[24px] px-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/50 group-hover:scale-110 transition-transform duration-300">
                                                        {myTasks.length}
                                                    </Badge>
                                                </div>
                                            </div>
                                            {['Raised', 'Open', 'Pending', 'In Progress', 'Testing', 'Resolved', 'Reopened', 'Hold', 'On Hold', 'Completed'].map(status => {
                                                const tasksInStatus = myTasks.filter(t => (t.status || 'Pending') === status);
                                                if (tasksInStatus.length === 0) return null;

                                                return (
                                                    <div key={`my-${status}`} className="space-y-4">
                                                        <div className="flex items-center gap-2 px-1">
                                                            <div className={`w-3 h-3 rounded-sm ${status === 'Completed' ? 'bg-emerald-500' :
                                                                status === 'Testing' ? 'bg-purple-500' :
                                                                    status === 'In Progress' ? 'bg-indigo-500' :
                                                                        status === 'On Hold' ? 'bg-amber-500' : 'bg-slate-300'
                                                                }`} />
                                                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                                                                {status === 'Testing' ? 'QA Testing' : status}
                                                            </h3>
                                                            <Badge variant="secondary" className="rounded-full h-5 min-w-[20px] px-1.5">{tasksInStatus.length}</Badge>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {tasksInStatus.map(task => (
                                                                <TaskCard
                                                                    key={task.id}
                                                                    task={task}
                                                                    employees={employees}
                                                                    onClick={() => window.open(`/tasks/${task.id}`, '_blank')}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Other Tasks Section */}
                                    {otherTasks.length > 0 && (
                                        <div className="space-y-6">
                                            {myTasks.length > 0 && (
                                                <div className="relative group animate-in fade-in slide-in-from-left-4 duration-700 delay-150">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-slate-500/10 to-slate-400/10 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                                                    <div className="relative flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm shadow-lg shadow-slate-500/10 hover:shadow-xl hover:shadow-slate-500/20 transition-all duration-500">
                                                        <div className="p-2 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg shadow-lg shadow-slate-500/50 group-hover:scale-110 transition-transform duration-300">
                                                            <Users className="w-5 h-5 text-white" />
                                                        </div>
                                                        <h2 className="text-lg font-bold uppercase tracking-wider bg-gradient-to-r from-slate-600 to-slate-800 dark:from-slate-400 dark:to-slate-600 bg-clip-text text-transparent">
                                                            Other Tasks
                                                        </h2>
                                                        <Badge variant="secondary" className="ml-auto rounded-full h-6 min-w-[24px] px-2.5 bg-gradient-to-r from-slate-500 to-slate-600 text-white font-bold shadow-lg shadow-slate-500/50 group-hover:scale-110 transition-transform duration-300">
                                                            {otherTasks.length}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )}
                                            {['Raised', 'Open', 'Pending', 'In Progress', 'Testing', 'Resolved', 'Reopened', 'Hold', 'On Hold', 'Completed'].map(status => {
                                                const tasksInStatus = otherTasks.filter(t => (t.status || 'Pending') === status);
                                                if (tasksInStatus.length === 0) return null;

                                                return (
                                                    <div key={`other-${status}`} className="space-y-4">
                                                        <div className="flex items-center gap-2 px-1">
                                                            <div className={`w-3 h-3 rounded-sm ${status === 'Completed' ? 'bg-emerald-500' :
                                                                status === 'Testing' ? 'bg-purple-500' :
                                                                    status === 'In Progress' ? 'bg-indigo-500' :
                                                                        status === 'On Hold' ? 'bg-amber-500' : 'bg-slate-300'
                                                                }`} />
                                                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                                                                {status === 'Testing' ? 'QA Testing' : status}
                                                            </h3>
                                                            <Badge variant="secondary" className="rounded-full h-5 min-w-[20px] px-1.5">{tasksInStatus.length}</Badge>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {tasksInStatus.map(task => (
                                                                <TaskCard
                                                                    key={task.id}
                                                                    task={task}
                                                                    employees={employees}
                                                                    onClick={() => window.open(`/tasks/${task.id}`, '_blank')}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    {/* My Tasks Section for filtered status */}
                                    {myTasks.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="relative group animate-in fade-in slide-in-from-left-4 duration-700">
                                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                                                <div className="relative flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/50 dark:to-indigo-900/30 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50 backdrop-blur-sm shadow-lg shadow-indigo-500/10 hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-500">
                                                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg shadow-indigo-500/50 group-hover:scale-110 transition-transform duration-300">
                                                        <UserCircle className="w-5 h-5 text-white" />
                                                    </div>
                                                    <h2 className="text-lg font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-400 dark:to-indigo-600 bg-clip-text text-transparent">
                                                        My Tasks
                                                    </h2>
                                                    <Badge variant="secondary" className="ml-auto rounded-full h-6 min-w-[24px] px-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/50 group-hover:scale-110 transition-transform duration-300">
                                                        {myTasks.length}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {myTasks.map(task => (
                                                    <TaskCard
                                                        key={task.id}
                                                        task={task}
                                                        employees={employees}
                                                        onClick={() => window.open(`/tasks/${task.id}`, '_blank')}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Other Tasks Section for filtered status */}
                                    {otherTasks.length > 0 && (
                                        <div className="space-y-4">
                                            {myTasks.length > 0 && (
                                                <div className="relative group animate-in fade-in slide-in-from-left-4 duration-700 delay-150">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-slate-500/10 to-slate-400/10 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                                                    <div className="relative flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm shadow-lg shadow-slate-500/10 hover:shadow-xl hover:shadow-slate-500/20 transition-all duration-500">
                                                        <div className="p-2 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg shadow-lg shadow-slate-500/50 group-hover:scale-110 transition-transform duration-300">
                                                            <Users className="w-5 h-5 text-white" />
                                                        </div>
                                                        <h2 className="text-lg font-bold uppercase tracking-wider bg-gradient-to-r from-slate-600 to-slate-800 dark:from-slate-400 dark:to-slate-600 bg-clip-text text-transparent">
                                                            Other Tasks
                                                        </h2>
                                                        <Badge variant="secondary" className="ml-auto rounded-full h-6 min-w-[24px] px-2.5 bg-gradient-to-r from-slate-500 to-slate-600 text-white font-bold shadow-lg shadow-slate-500/50 group-hover:scale-110 transition-transform duration-300">
                                                            {otherTasks.length}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {otherTasks.map(task => (
                                                    <TaskCard
                                                        key={task.id}
                                                        task={task}
                                                        employees={employees}
                                                        onClick={() => window.open(`/tasks/${task.id}`, '_blank')}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {filteredTasks.length === 0 && (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center">
                                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <h3 className="text-slate-900 dark:text-slate-100 font-medium">No tasks found</h3>
                                    <p className="text-slate-500 text-sm mb-4">There are no tasks in this view.</p>
                                    <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Task
                                    </Button>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* CREATE TASK DIALOG */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="sm:max-w-[700px] max-h-[85vh] p-0 overflow-hidden border-0 shadow-2xl bg-slate-50 dark:bg-slate-950 flex flex-col">
                        {/* Modern Gradient Header */}
                        <div className="relative p-6 shrink-0 bg-gradient-to-r from-indigo-600 to-purple-700 overflow-hidden">
                            <div className="absolute inset-0 bg-white/10 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                            <DialogHeader className="relative z-10 text-white">
                                <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm">
                                        <Plus className="w-5 h-5 text-white" />
                                    </div>
                                    Create New Task
                                </DialogTitle>
                                <DialogDescription className="text-indigo-100 font-medium opacity-90">
                                    Fill in the details below to create a new task.
                                </DialogDescription>
                            </DialogHeader>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Form Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="p-6 space-y-8">
                                {/* Core Info Section */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                        Core Details
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase text-slate-500">Task Title <span className="text-red-500">*</span></Label>
                                            <Input
                                                placeholder="What needs to be done?"
                                                value={newTask.title}
                                                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                                className="h-11 border-slate-200 dark:border-slate-800 focus:ring-indigo-500 font-medium text-lg placeholder:font-normal"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase text-slate-500">Workspace <span className="text-red-500">*</span></Label>
                                                <Select value={selectedTeamId} onValueChange={(val) => {
                                                    setSelectedTeamId(val);
                                                    setNewTask({ ...newTask, assignedEmployeeIds: [] });
                                                }}>
                                                    <SelectTrigger className="h-10">
                                                        <SelectValue placeholder="Select Workspace" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {teams.map(team => (
                                                            <SelectItem key={team.id} value={team.id} className="font-medium">{team.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase text-slate-500">Priority</Label>
                                                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                                                    <SelectTrigger className="h-10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {TASK_PRIORITIES.map(p => (
                                                            <SelectItem key={p} value={p}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${p === 'High' ? 'bg-red-500' : p === 'Normal' ? 'bg-indigo-500' : 'bg-slate-400'}`} />
                                                                    {p}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Technical Specs Section */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                                        Technical Specs
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase text-slate-500">Type</Label>
                                                <Select value={newTask.taskType} onValueChange={(v) => setNewTask({ ...newTask, taskType: v, taskSubType: '' })}>
                                                    <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                                    <SelectContent>
                                                        {TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase text-slate-500">Sub Type</Label>
                                                <Select
                                                    value={newTask.taskSubType}
                                                    onValueChange={(v) => setNewTask({ ...newTask, taskSubType: v })}
                                                    disabled={!newTask.taskType}
                                                >
                                                    <SelectTrigger><SelectValue placeholder="Select Sub Type" /></SelectTrigger>
                                                    <SelectContent>
                                                        {(TASK_SUB_TYPES[newTask.taskType] || []).map(st => (
                                                            <SelectItem key={st} value={st}>{st}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase text-slate-500">Component</Label>
                                                <Select value={newTask.taskComponent} onValueChange={(v) => setNewTask({ ...newTask, taskComponent: v })}>
                                                    <SelectTrigger><SelectValue placeholder="Select Component" /></SelectTrigger>
                                                    <SelectContent>
                                                        {TASK_COMPONENTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase text-slate-500">Version / Milestone</Label>
                                                <Input
                                                    placeholder="e.g. v2.0.1"
                                                    value={newTask.version}
                                                    onChange={e => setNewTask({ ...newTask, version: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Details & Extras */}
                                <div className="space-y-5">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase text-slate-500">Description</Label>
                                            <textarea
                                                className="w-full min-h-[120px] p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-y transition-all"
                                                placeholder="Describe the task requirements, acceptance criteria, and any other relevant details..."
                                                value={newTask.description}
                                                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase text-slate-500">Attachments</Label>
                                            <div className="flex flex-wrap gap-3">
                                                {(newTask.images || []).map((img, idx) => (
                                                    <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                                                        <img src={img} alt="attachment" className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={() => setNewTask(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                                                            className="absolute top-1 right-1 bg-red-500/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 backdrop-blur-sm"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-500 transition-all group">
                                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors">
                                                        <Plus className="w-4 h-4" />
                                                    </div>
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ADMIN ONLY SECTIONS */}
                                {!isStaff && (
                                    <div className="border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl p-5 space-y-5">
                                        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                                            <Shield className="w-5 h-5" />
                                            <span className="text-xs font-black uppercase tracking-widest">Admin Controls</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase text-slate-500">Assignee <span className="text-red-500">*</span></Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="w-full justify-between h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50">
                                                            {newTask.assignedEmployeeIds.length > 0
                                                                ? <span className="font-semibold text-indigo-600">{newTask.assignedEmployeeIds.length} Selected</span>
                                                                : <span className="text-slate-500">Select Employees</span>}
                                                            <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-md">
                                                                <Search className="h-3 w-3 opacity-50" />
                                                            </div>
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px] p-0" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="Search employee..." />
                                                            <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                                <CommandEmpty>No employee found.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {employees
                                                                        .filter(emp => emp.role !== 'Ride')
                                                                        .filter(emp => !selectedTeamId || teams.find(t => t.id === selectedTeamId)?.memberIds?.includes(emp.id))
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
                                                                                className="flex items-center gap-3 py-2"
                                                                            >
                                                                                <div className={`flex h-5 w-5 items-center justify-center rounded-md border border-primary transition-colors ${newTask.assignedEmployeeIds.includes(emp.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                                                                    {newTask.assignedEmployeeIds.includes(emp.id) && <Check className="h-3.5 w-3.5" />}
                                                                                </div>
                                                                                <Avatar className="w-8 h-8 border border-slate-200">
                                                                                    <AvatarImage src={emp.photoUrl} />
                                                                                    <AvatarFallback className="text-xs bg-indigo-50 text-indigo-700 font-bold">{emp.firstName?.[0]}</AvatarFallback>
                                                                                </Avatar>
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{emp.firstName} {emp.lastName}</span>
                                                                                    <span className="text-[10px] text-slate-500 uppercase font-mono">{emp.role}</span>
                                                                                </div>
                                                                            </CommandItem>
                                                                        ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase text-slate-500">Status</Label>
                                                <Select value={newTask.status} onValueChange={(v) => setNewTask({ ...newTask, status: v })}>
                                                    <SelectTrigger className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {ADMIN_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3 shrink-0">
                            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="hover:bg-slate-100">Cancel</Button>
                            <Button onClick={handleCreateTask} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] min-w-[140px]">
                                {isStaff ? 'Create Request' : 'Create Task'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* TASK DETAIL DIALOG */}
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="sm:max-w-4xl h-[85vh] p-0 border-0 overflow-hidden flex flex-col bg-white dark:bg-slate-950 shadow-2xl">
                        {activeTask && (
                            <div className="flex flex-col h-full relative">
                                {/* Modern Header */}
                                <div className="relative pt-12 pb-6 px-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white shadow-lg shrink-0">
                                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[150%] bg-white rounded-[100%] blur-3xl rotate-12" />
                                        <div className="absolute bottom-[-50%] right-[-10%] w-[50%] h-[150%] bg-indigo-200 rounded-[100%] blur-3xl" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="font-mono bg-white/10 border-white/20 text-indigo-50 backdrop-blur-md">
                                                    {activeTask.id}
                                                </Badge>
                                                <Badge className={
                                                    activeTask.status === 'Completed' ? 'bg-emerald-400/20 text-emerald-100 border-emerald-400/30' :
                                                        activeTask.status === 'In Progress' ? 'bg-indigo-400/20 text-indigo-100 border-indigo-400/30' :
                                                            activeTask.status === 'Testing' ? 'bg-purple-400/20 text-purple-100 border-purple-400/30' :
                                                                'bg-white/20 text-white border-white/30'
                                                }>
                                                    {activeTask.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 h-8 rounded-full px-4 text-xs font-bold transition-all"
                                                    onClick={() => {
                                                        // Pre-fill relevant data for subtask if needed, or just open form
                                                        setIsCreateOpen(true);
                                                        // Optional: You might want to set some context that this is a subtask
                                                        // setParentTaskId(activeTask.id); 
                                                    }}
                                                >
                                                    Create Subtask
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full"
                                                    onClick={() => {
                                                        setEditTaskData({ ...activeTask });
                                                        setIsEditOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-white/70 hover:text-red-300 hover:bg-red-400/10 h-8 w-8 rounded-full"
                                                    onClick={() => handleDeleteTask(activeTask.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="mb-6 flex items-start justify-between gap-4">
                                            <h1 className="text-3xl font-black leading-tight tracking-tight drop-shadow-md flex-1">
                                                {activeTask.title}
                                            </h1>

                                            {/* Assigned Users in Banner - Right Side */}
                                            <div className="flex items-center gap-3 shrink-0">
                                                <Popover open={isReassignOpen} onOpenChange={setIsReassignOpen}>
                                                    <PopoverTrigger asChild>
                                                        <div className="flex items-center gap-3 cursor-pointer group hover:opacity-80 transition-opacity bg-white/5 p-1.5 pr-4 rounded-full border border-white/10 backdrop-blur-sm">
                                                            <div className="flex -space-x-2">
                                                                {(activeTask.assignedEmployeeIds && activeTask.assignedEmployeeIds.length > 0) ? (
                                                                    activeTask.assignedEmployeeIds.map((id: string) => {
                                                                        const emp = employees.find(e => e.id === id);
                                                                        return (
                                                                            <Avatar key={id} className="w-8 h-8 border-2 border-indigo-600 ring-2 ring-white/20 shadow-lg">
                                                                                <AvatarImage src={emp?.photoUrl} />
                                                                                <AvatarFallback className="bg-white/10 text-white text-[10px] font-bold backdrop-blur-sm">
                                                                                    {emp?.firstName?.[0]}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
                                                                        <UserCircle className="w-4 h-4 text-white/50" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {(activeTask.assignedEmployeeIds && activeTask.assignedEmployeeIds.length > 0) ? (
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-white group-hover:text-indigo-200 transition-colors">
                                                                        {employees.find(e => e.id === activeTask.assignedEmployeeIds[0])?.firstName}
                                                                        {activeTask.assignedEmployeeIds.length > 1 && ` +${activeTask.assignedEmployeeIds.length - 1}`}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs font-bold text-white/50">Unassigned</span>
                                                            )}
                                                        </div>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px] p-0 shadow-2xl rounded-3xl border-slate-100 overflow-hidden" align="end">
                                                        <div className="p-4 border-b bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                                                            <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Team Workspace</span>
                                                            <Button variant="secondary" size="sm" className="h-8 rounded-xl text-xs font-bold" onClick={() => setIsReassignOpen(false)}>Close</Button>
                                                        </div>
                                                        <div className="flex flex-col" onWheel={(e) => e.stopPropagation()}>
                                                            <Command className="bg-transparent">
                                                                <CommandInput placeholder="Search member..." className="h-12 shrink-0" />
                                                                <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar-thick">
                                                                    <CommandEmpty>No results found.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        {employees.filter(emp => teams.find(t => t.id === activeTask.teamId)?.memberIds?.includes(emp.id)).map(emp => (
                                                                            <CommandItem
                                                                                key={emp.id}
                                                                                onSelect={() => {
                                                                                    const current = activeTask.assignedEmployeeIds || [];
                                                                                    const updated = current.includes(emp.id) ? current.filter(id => id !== emp.id) : [...current, emp.id];
                                                                                    firebase.database().ref(`root/nexus_hr/tasks/${activeTask.id}`).update({ assignedEmployeeIds: updated });
                                                                                }}
                                                                                className="flex items-center justify-between py-3 cursor-pointer"
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <Avatar className="w-8 h-8 ring-1 ring-slate-100">
                                                                                        <AvatarImage src={emp.photoUrl} />
                                                                                        <AvatarFallback>{emp.firstName[0]}</AvatarFallback>
                                                                                    </Avatar>
                                                                                    <span className="text-sm font-bold text-slate-700">{emp.firstName} {emp.lastName}</span>
                                                                                </div>
                                                                                {(activeTask.assignedEmployeeIds || []).includes(emp.id) && (
                                                                                    <Check className="w-4 h-4 text-indigo-600" />
                                                                                )}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                        {/* ADMIN APPROVE BUTTON */}
                                        {!isStaff && activeTask.status === 'Raised' && (
                                            <div className="mt-4">
                                                <Button
                                                    onClick={() => setIsApproveDialogOpen(true)}
                                                    className="w-full bg-white text-indigo-700 hover:bg-indigo-50 font-bold shadow-lg animate-pulse transition-all hover:scale-105"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Approve & Assign Task
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Main Content scrollable area */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-950 p-6 space-y-6">
                                    {/* Description Block */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-[11px] uppercase font-black text-slate-400 tracking-[0.2em] px-1">
                                            <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                            Description
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm/5 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
                                            {activeTask.description || 'No description provided.'}
                                        </div>
                                    </div>

                                    {/* Attachments Section */}
                                    {activeTask.images && activeTask.images.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-[11px] uppercase font-black text-slate-400 tracking-[0.2em] px-1">
                                                <Camera className="w-3.5 h-3.5 text-indigo-500" />
                                                Attachments ({activeTask.images.length})
                                            </div>
                                            <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 custom-scrollbar">
                                                {activeTask.images.map((img: string, i: number) => (
                                                    <div key={i} className="group relative shrink-0">
                                                        <img
                                                            src={img}
                                                            alt="Attachment"
                                                            className="w-28 h-28 object-cover rounded-2xl border-2 border-white dark:border-slate-800 shadow-md transition-all hover:scale-105 cursor-pointer ring-1 ring-slate-200 dark:ring-slate-800"
                                                            onClick={() => setPreviewImage(img)}
                                                        />
                                                        <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-all flex items-center justify-center pointer-events-none backdrop-blur-[1px]">
                                                            <div className="bg-white/95 p-2 rounded-xl shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                                                <Search className="w-4 h-4 text-indigo-600" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}



                                    {/* Process Block: Status, Priority, Due Date */}
                                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                        <div className="grid grid-cols-2">
                                            {/* Status Trigger */}
                                            <div className="p-4 border-r border-slate-100 dark:border-slate-800 bg-slate-50/30">
                                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 block">Current Phase</label>
                                                <Select
                                                    value={activeTask.status}
                                                    onValueChange={(val) => handleStatusUpdate(activeTask.id, val)}
                                                >
                                                    <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-xs font-bold">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${activeTask.status === 'Completed' ? 'bg-emerald-500' :
                                                                activeTask.status === 'In Progress' ? 'bg-indigo-500' :
                                                                    activeTask.status === 'Open' ? 'bg-blue-500' :
                                                                        activeTask.status === 'Pending' ? 'bg-slate-500' :
                                                                            activeTask.status === 'Testing' ? 'bg-orange-500' :
                                                                                'bg-amber-500'
                                                                }`} />
                                                            <SelectValue />
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        <SelectItem value="Open">Open</SelectItem>
                                                        <SelectItem value="Pending">Pending</SelectItem>
                                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                                        <SelectItem value="On Hold">On Hold</SelectItem>
                                                        <SelectItem value="Testing">In Testing</SelectItem>
                                                        <SelectItem value="Completed">Completed</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Priority/Date Display */}
                                            <div className="p-4 flex flex-col justify-between">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1">Priority</span>
                                                        <Badge className={
                                                            activeTask.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                activeTask.priority === 'Normal' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                                    'bg-slate-50 text-slate-600 border-slate-100'
                                                        }>
                                                            {activeTask.priority}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1">Due</span>
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                            {activeTask.dueDate || 'None'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>



                                    {/* Discussion Section */}
                                    <div className="space-y-4 pt-4">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2 text-[11px] uppercase font-black text-slate-400 tracking-[0.2em]">
                                                <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                                                Discussion
                                            </div>

                                        </div>

                                        {/* Integrated Comment Composer (Main) */}
                                        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-[2rem] p-3 shadow-inner">
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full py-1.5 px-3 shadow-sm">
                                                        <Avatar className="w-5 h-5 border border-slate-100">
                                                            <AvatarImage src={isStaff ? employees.find(e => e.id === loggedInEmpId)?.photoUrl : undefined} />
                                                            <AvatarFallback className="text-[9px] bg-indigo-50 text-indigo-600 font-bold">
                                                                {isStaff ? (loggedInName ? loggedInName[0] : 'U') : 'A'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                            {isStaff ? (loggedInName || 'Unknown User') : 'Admin'}
                                                        </span>
                                                        <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider ml-1">
                                                            (You)
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 relative">
                                                        <Input
                                                            placeholder="Say something meaningful..."
                                                            value={commentText}
                                                            onChange={(e) => setCommentText(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                                            className="h-10 bg-transparent border-none focus-visible:ring-0 shadow-none text-sm placeholder:text-slate-400 font-medium"
                                                        />
                                                    </div>

                                                    <Button
                                                        size="icon"
                                                        onClick={handleAddComment}
                                                        disabled={!commentText.trim() || (isStaff && !selectedCommenterId)}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.2rem] h-10 w-10 shrink-0 shadow-lg shadow-indigo-100 dark:shadow-none transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Toggle Comments Button (Moved Below Composer) */}
                                        <div className="flex justify-end pr-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowComments(!showComments)}
                                                className="h-7 px-3 text-[10px] text-slate-500 hover:text-indigo-600 font-bold uppercase tracking-wider hover:bg-slate-100 rounded-full border border-transparent hover:border-slate-200 transition-all"
                                            >
                                                {showComments ? 'Hide Comments' : 'Show Comments'}
                                                <Badge className="ml-2 bg-slate-200 text-slate-600 hover:bg-slate-300 border-none h-4 px-1">
                                                    {activeTask.comments ? Object.keys(activeTask.comments).length : 0}
                                                </Badge>
                                            </Button>
                                        </div>

                                        {/* Discussion List */}
                                        {showComments && (
                                            <div className="space-y-6 pb-20 mt-4 h-auto animate-in fade-in slide-in-from-top-4 duration-300">
                                                {activeTask.comments ? (
                                                    Object.values(activeTask.comments)
                                                        .sort((a: any, b: any) => {
                                                            // Sort by pinned first, then new to old
                                                            if (a.isPinned && !b.isPinned) return -1;
                                                            if (!a.isPinned && b.isPinned) return 1;
                                                            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                                                        })
                                                        .map((comment: any) => (
                                                            <div key={comment.id} className={`relative flex flex-col gap-2 p-3 rounded-2xl transition-all ${comment.isPinned ? 'bg-amber-50/50 border border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20' : ''}`}>
                                                                {comment.isPinned && (
                                                                    <div className="absolute -top-2 left-4 px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full flex items-center gap-1 shadow-sm">
                                                                        <Pin className="w-3 h-3 fill-amber-700" /> Pinned
                                                                    </div>
                                                                )}

                                                                <div className="flex items-start gap-4">
                                                                    <div className="flex flex-col items-center shrink-0 pt-2">
                                                                        <Avatar className="w-10 h-10 border-4 border-white dark:border-slate-950 shadow-md ring-1 ring-slate-100 dark:ring-slate-800 z-10">
                                                                            <AvatarImage src={employees.find(e => e.id === comment.authorId)?.photoUrl} />
                                                                            <AvatarFallback className="bg-indigo-50 text-indigo-600 text-[10px] font-black">
                                                                                {comment.author?.[0]}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <div className="w-[2px] flex-1 bg-slate-100 dark:bg-slate-800 mt-2 rounded-full opacity-50 min-h-[20px]" />
                                                                    </div>

                                                                    <div className="flex flex-col gap-2 w-full">
                                                                        {/* Comment Header */}
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">
                                                                                    {comment.author}
                                                                                </span>
                                                                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                                                    {new Date(comment.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-amber-500" onClick={() => firebase.database().ref(`root/nexus_hr/tasks/${activeTask.id}/comments/${comment.id}`).update({ isPinned: !comment.isPinned })}>
                                                                                    <Pin className={`w-3.5 h-3.5 ${comment.isPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
                                                                                </Button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Comment Body */}
                                                                        <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl rounded-tl-none border border-slate-100/50 dark:border-slate-800/50 text-sm text-slate-600 dark:text-slate-300 leading-relaxed shadow-sm/5 relative group">
                                                                            {comment.text}

                                                                            {/* Reactions Display (Detailed) */}
                                                                            {comment.reactions && Object.keys(comment.reactions).length > 0 && (
                                                                                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                                                                                    {Object.entries(comment.reactions).flatMap(([emoji, users]: [string, any]) =>
                                                                                        (users as string[]).map(userId => {
                                                                                            const reactor = employees.find(e => e.id === userId);
                                                                                            return (
                                                                                                <div key={`${emoji}-${userId}`}
                                                                                                    className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 shadow-sm transition-all hover:scale-105 cursor-pointer"
                                                                                                    onClick={() => {
                                                                                                        const currentUsers = (users as string[]) || [];
                                                                                                        const updated = currentUsers.includes(loggedInEmpId!)
                                                                                                            ? currentUsers.filter(id => id !== loggedInEmpId)
                                                                                                            : [...currentUsers, loggedInEmpId];
                                                                                                        firebase.database().ref(`root/nexus_hr/tasks/${activeTask.id}/comments/${comment.id}/reactions/${emoji}`).set(updated);
                                                                                                    }}
                                                                                                >
                                                                                                    <span className="text-sm">{emoji}</span>
                                                                                                    <Avatar className="w-4 h-4 ring-1 ring-slate-100">
                                                                                                        <AvatarImage src={reactor?.photoUrl} />
                                                                                                        <AvatarFallback className="text-[6px]">{reactor?.firstName?.[0] || '?'}</AvatarFallback>
                                                                                                    </Avatar>
                                                                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{reactor?.firstName || (userId === loggedInEmpId ? 'You' : 'Unknown')}</span>
                                                                                                </div>
                                                                                            );
                                                                                        })
                                                                                    )}
                                                                                </div>
                                                                            )}                                    </div>

                                                                        {/* Comment Actions */}
                                                                        <div className="flex items-center gap-3 mt-1 ml-2">
                                                                            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-bold text-slate-400 hover:text-indigo-600 gap-1" onClick={() => setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id)}>
                                                                                <CornerDownRight className="w-3 h-3" /> Reply
                                                                            </Button>

                                                                            <Popover open={showEmojiPickerFor === comment.id} onOpenChange={(open) => setShowEmojiPickerFor(open ? comment.id : null)}>
                                                                                <PopoverTrigger asChild>
                                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-amber-500 rounded-full">
                                                                                        <Smile className="w-3.5 h-3.5" />
                                                                                    </Button>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent className="w-auto p-1 flex gap-1 bg-white dark:bg-slate-900 shadow-xl border-slate-100 rounded-full" align="start">
                                                                                    {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
                                                                                        <button key={emoji} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-full text-lg transition-transform hover:scale-110"
                                                                                            onClick={() => {
                                                                                                const path = `root/nexus_hr/tasks/${activeTask.id}/comments/${comment.id}/reactions/${emoji}`;
                                                                                                const currentReactions = comment.reactions?.[emoji] || [];
                                                                                                const updated = currentReactions.includes(loggedInEmpId)
                                                                                                    ? currentReactions.filter((id: string) => id !== loggedInEmpId)
                                                                                                    : [...currentReactions, loggedInEmpId];
                                                                                                firebase.database().ref(path).set(updated);
                                                                                                setShowEmojiPickerFor(null);
                                                                                            }}>
                                                                                            {emoji}
                                                                                        </button>
                                                                                    ))}
                                                                                </PopoverContent>
                                                                            </Popover>
                                                                        </div>

                                                                        {/* Reply Input */}
                                                                        {replyingToCommentId === comment.id && (
                                                                            <div className="mt-2 pl-4 animate-in fade-in slide-in-from-top-2">
                                                                                <div className="flex items-center gap-2">
                                                                                    <Input
                                                                                        autoFocus
                                                                                        placeholder="Write a reply..."
                                                                                        value={replyText}
                                                                                        onChange={(e) => setReplyText(e.target.value)}
                                                                                        className="h-8 text-xs bg-slate-100 dark:bg-slate-800 border-slate-200 focus-visible:ring-offset-0"
                                                                                        onKeyDown={async (e) => {
                                                                                            if (e.key === 'Enter' && replyText.trim()) {
                                                                                                const replyId = 'RPL-' + Date.now();
                                                                                                const replierName = isStaff ? loggedInName : 'Admin';
                                                                                                const replyData = {
                                                                                                    id: replyId,
                                                                                                    text: replyText,
                                                                                                    authorId: isStaff ? loggedInEmpId : 'admin',
                                                                                                    author: replierName,
                                                                                                    createdAt: new Date().toISOString()
                                                                                                };

                                                                                                try {
                                                                                                    await firebase.database().ref(`root/nexus_hr/tasks/${activeTask.id}/comments/${comment.id}/replies/${replyId}`).set(replyData);

                                                                                                    // Send email to original commenter
                                                                                                    const originalCommenter = employees.find(e => e.id === comment.authorId);
                                                                                                    if (originalCommenter && originalCommenter.email) {
                                                                                                        await sendTaskUpdateEmail(
                                                                                                            [{ email: originalCommenter.email }],
                                                                                                            `${replierName} replied to your comment`,
                                                                                                            `<h2>${activeTask.title}</h2><p><strong>${replierName}</strong> replied to your comment:</p><p><em>Your comment: "${comment.text}"</em></p><p><strong>Reply:</strong> ${replyText}</p>`,
                                                                                                            false,
                                                                                                            `New reply on: ${activeTask.title}`
                                                                                                        );
                                                                                                    }

                                                                                                    setReplyText("");
                                                                                                    setReplyingToCommentId(null);
                                                                                                } catch (error) {
                                                                                                    console.error("Error adding reply:", error);
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                    <Button size="sm" className="h-8 w-8 p-0 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                                                                                        onClick={async () => {
                                                                                            if (replyText.trim()) {
                                                                                                const replyId = 'RPL-' + Date.now();
                                                                                                const replierName = isStaff ? loggedInName : 'Admin';
                                                                                                const replyData = {
                                                                                                    id: replyId,
                                                                                                    text: replyText,
                                                                                                    authorId: isStaff ? loggedInEmpId : 'admin',
                                                                                                    author: replierName,
                                                                                                    createdAt: new Date().toISOString()
                                                                                                };

                                                                                                try {
                                                                                                    await firebase.database().ref(`root/nexus_hr/tasks/${activeTask.id}/comments/${comment.id}/replies/${replyId}`).set(replyData);

                                                                                                    // Send email to original commenter
                                                                                                    const originalCommenter = employees.find(e => e.id === comment.authorId);
                                                                                                    if (originalCommenter && originalCommenter.email) {
                                                                                                        await sendTaskUpdateEmail(
                                                                                                            [{ email: originalCommenter.email }],
                                                                                                            `${replierName} replied to your comment`,
                                                                                                            `<h2>${activeTask.title}</h2><p><strong>${replierName}</strong> replied to your comment:</p><p><em>Your comment: "${comment.text}"</em></p><p><strong>Reply:</strong> ${replyText}</p>`,
                                                                                                            false,
                                                                                                            `New reply on: ${activeTask.title}`
                                                                                                        );
                                                                                                    }

                                                                                                    setReplyText("");
                                                                                                    setReplyingToCommentId(null);
                                                                                                } catch (error) {
                                                                                                    console.error("Error adding reply:", error);
                                                                                                }
                                                                                            }
                                                                                        }}>
                                                                                        <ArrowUp className="w-3 h-3" />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Nested Replies */}
                                                                        {comment.replies && Object.values(comment.replies).length > 0 && (
                                                                            <div className="mt-2 space-y-3 pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-2">
                                                                                {Object.values(comment.replies).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((reply: any) => (
                                                                                    <div key={reply.id} className="flex gap-3">
                                                                                        <Avatar className="w-6 h-6 border-2 border-white dark:border-slate-950 shadow-sm shrink-0">
                                                                                            <AvatarImage src={employees.find(e => e.id === reply.authorId)?.photoUrl} />
                                                                                            <AvatarFallback className="bg-slate-100 text-slate-600 text-[8px] font-bold">
                                                                                                {reply.author?.[0]}
                                                                                            </AvatarFallback>
                                                                                        </Avatar>
                                                                                        <div className="flex flex-col gap-1 w-full">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{reply.author}</span>
                                                                                                <span className="text-[9px] text-slate-400">{new Date(reply.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                                                            </div>
                                                                                            <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50/50 p-2 rounded-lg rounded-tl-none border border-slate-100/50">
                                                                                                {reply.text}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                ) : (
                                                    <div className="text-center py-16 bg-slate-50/50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                                                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                                            <MessageSquare className="w-8 h-8 text-slate-200" />
                                                        </div>
                                                        <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Quiet Room</h3>
                                                        <p className="text-[11px] text-slate-400 font-bold mt-1">No feedback loops recorded yet.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>


                {/* TEAM MANAGEMENT DIALOG */}
                < Dialog open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen} >
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Manage Workspaces</DialogTitle>
                            <DialogDescription>Create and organize your workspaces.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Workspace Name</Label>
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
                                <Label>Add Workspace Members</Label>
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
                                            <CommandList className="max-h-[300px] overflow-y-auto">
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
                                <Label className="text-xs font-bold uppercase text-slate-400 mb-3 block">Existing Workspaces</Label>
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
                                {editingTeamId ? 'Update Workspace' : 'Save Workspace'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog >
                {/* DELETE TASK CONFIRMATION DIALOG */}
                < Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen} >
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
                </Dialog >

                {/* DELETE TEAM CONFIRMATION DIALOG */}
                < Dialog open={isTeamDeleteModalOpen} onOpenChange={setIsTeamDeleteModalOpen} >
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <Trash2 className="w-5 h-5" />
                                Delete Workspace
                            </DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this workspace? All workspace data will be removed.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setIsTeamDeleteModalOpen(false)}>Cancel</Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDeleteTeam}>
                                Delete Workspace
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog >

                {/* COMPLETION NOTE DIALOG */}
                < Dialog open={isCompletionModalOpen} onOpenChange={setIsCompletionModalOpen} >
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
                </Dialog >

                {/* IMAGE PREVIEW MODAL */}
                < Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
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
                </Dialog >

                {/* EDIT TASK DIALOG */}
                < Dialog open={isEditOpen} onOpenChange={setIsEditOpen} >
                    <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Task</DialogTitle>
                            <DialogDescription>Modify task details and assignments.</DialogDescription>
                        </DialogHeader>
                        {editTaskData && (
                            <div className="space-y-6 py-4">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Title</Label>
                                        <Input
                                            value={editTaskData.title}
                                            onChange={e => setEditTaskData({ ...editTaskData, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <textarea
                                            className="w-full min-h-[100px] p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={editTaskData.description}
                                            onChange={e => setEditTaskData({ ...editTaskData, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Priority</Label>
                                            <Select value={editTaskData.priority} onValueChange={v => setEditTaskData({ ...editTaskData, priority: v })}>
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
                                                value={editTaskData.dueDate}
                                                onChange={e => setEditTaskData({ ...editTaskData, dueDate: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Assigned Members</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-between h-10 border-slate-200 dark:border-slate-800">
                                                    <span className="text-slate-500 font-normal">Manage members...</span>
                                                    <Search className="w-4 h-4 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search employee..." />
                                                    <CommandList className="max-h-[300px] overflow-y-auto">
                                                        <CommandEmpty>No employee found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {employees
                                                                .filter(emp => {
                                                                    const team = teams.find(t => t.id === editTaskData.teamId);
                                                                    return team?.memberIds?.includes(emp.id);
                                                                })
                                                                .map(emp => (
                                                                    <CommandItem
                                                                        key={emp.id}
                                                                        onSelect={() => {
                                                                            const current = editTaskData.assignedEmployeeIds || [];
                                                                            const updated = current.includes(emp.id)
                                                                                ? current.filter((id: string) => id !== emp.id)
                                                                                : [...current, emp.id];
                                                                            setEditTaskData({ ...editTaskData, assignedEmployeeIds: updated });
                                                                        }}
                                                                        className="flex items-center gap-2"
                                                                    >
                                                                        <div className={`flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${editTaskData.assignedEmployeeIds?.includes(emp.id) ? 'bg-primary text-primary-foreground' : 'opacity-50'}`}>
                                                                            {editTaskData.assignedEmployeeIds?.includes(emp.id) && <Check className="h-3 w-3" />}
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

                                    <div className="space-y-2">
                                        <Label>Tester</Label>
                                        <Select value={editTaskData.testerId} onValueChange={v => setEditTaskData({ ...editTaskData, testerId: v })}>
                                            <SelectTrigger><SelectValue placeholder="Select tester" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No Tester</SelectItem>
                                                {employees
                                                    .filter(emp => {
                                                        const team = teams.find(t => t.id === editTaskData.teamId);
                                                        return team?.memberIds?.includes(emp.id);
                                                    })
                                                    .map(emp => (
                                                        <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                            <Button onClick={handleUpdateTask} className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog >

                {/* APPROVE TASK DIALOG */}
                < Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen} >
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle>Approve & Assign Task</DialogTitle>
                            <DialogDescription>
                                Select an employee to assign this task to. Once approved, the task will be visible to everyone.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-slate-500">Assign Employee</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-10 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                            {approveAssignee
                                                ? (() => {
                                                    const e = employees.find(em => em.id === approveAssignee);
                                                    return e ? `${e.firstName} ${e.lastName}` : "Employee not found";
                                                })()
                                                : "Select Assignee"}
                                            <Search className="h-3 w-3 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search employee..." />
                                            <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                <CommandEmpty>No employee found.</CommandEmpty>
                                                <CommandGroup>
                                                    {employees
                                                        .filter(emp => emp.role !== 'Ride')
                                                        .map(emp => (
                                                            <CommandItem
                                                                key={emp.id}
                                                                onSelect={() => setApproveAssignee(emp.id)}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <Avatar className="w-6 h-6">
                                                                    <AvatarImage src={emp.photoUrl} />
                                                                    <AvatarFallback className="text-[9px]">{emp.firstName?.[0]}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-xs font-bold">{emp.firstName} {emp.lastName}</span>
                                                                {approveAssignee === emp.id && <Check className="ml-auto h-3 w-3 text-indigo-600" />}
                                                            </CommandItem>
                                                        ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-slate-500">Effort (Days)</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 5"
                                    value={approveEffort}
                                    onChange={(e) => setApproveEffort(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleApproveTask} disabled={!approveAssignee} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                Confirm Approval
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog >
            </div >
        </div >
    );
};

export default TaskManager;
