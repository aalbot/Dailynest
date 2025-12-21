import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/ui/use-toast";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
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
    MoreHorizontal
} from 'lucide-react';
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

const TaskCard = ({ task, onClick }: { task: any, onClick: () => void }) => {
    const completedStages = STAGES.filter(s => task.stages?.[s.toLowerCase()]?.status === 'Completed').length;
    const progress = Math.round((completedStages / STAGES.length) * 100);

    return (
        <div
            onClick={onClick}
            className="group flex flex-col p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer shadow-sm hover:shadow transition-all"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <Badge variant={task.priority === 'High' ? 'destructive' : 'secondary'} className="rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                        {task.priority || 'Normal'}
                    </Badge>
                    <span className="text-xs text-slate-500 font-mono">{task.taskId}</span>
                </div>
                {task.status === 'Completed' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
            </div>

            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-indigo-600 transition-colors">{task.title}</h3>

            <div className="flex items-center gap-2 text-xs text-slate-500 mt-auto pt-3">
                <Avatar className="w-5 h-5">
                    <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700">{task.clientName?.[0] || 'C'}</AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[100px]">{task.clientName || 'No Client'}</span>
                <span className="mx-1">•</span>
                <Clock className="w-3 h-3" />
                <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No Date'}</span>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

const SidebarItem = ({ icon: Icon, label, active, onClick, count }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 font-medium ${active
            ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
    >
        <div className="flex items-center gap-3">
            <Icon className={`w-4 h-4 ${active ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}`} />
            <span>{label}</span>
        </div>
        {count > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-violet-200 dark:bg-violet-800 text-violet-800 dark:text-violet-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
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
    const [sidebarOpen, setSidebarOpen] = useState(true); // Default open on desktop

    // Form State
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'Normal',
        dueDate: '',
        clientName: ''
    });

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

        tasksRef.on('value', onValueChange);
        return () => tasksRef.off('value', onValueChange);
    }, []);

    const handleCreateTask = () => {
        if (!newTask.title) {
            toast({ title: "Error", description: "Title is required", variant: "destructive" });
            return;
        }

        const taskId = 'TSK-' + Date.now();
        const createdNow = new Date().toISOString();

        const initialStages: any = {};
        STAGES.forEach(s => initialStages[s.toLowerCase()] = { status: 'Pending', notes: '' });
        initialStages['office'].status = 'In Progress';
        initialStages['office'].startedAt = createdNow;

        const taskData = {
            id: taskId,
            taskId,
            ...newTask,
            createdAt: createdNow,
            stages: initialStages,
            currentStage: 'Office',
            status: 'In Progress'
        };

        firebase.database().ref(`root/nexus_hr/tasks/${taskId}`).set(taskData)
            .then(() => {
                setIsCreateOpen(false);
                setNewTask({ title: '', description: '', priority: 'Normal', dueDate: '', clientName: '' });
                toast({ title: "Success", description: "Task created successfully" });
            });
    };

    const updateStageStatus = (taskId: string, stage: string, newStatus: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const stageKey = stage.toLowerCase();
        const updates: any = {};
        const now = new Date().toISOString();

        updates[`stages/${stageKey}/status`] = newStatus;
        if (newStatus === 'In Progress' && !task.stages[stageKey].startedAt) updates[`stages/${stageKey}/startedAt`] = now;

        if (newStatus === 'Completed') {
            updates[`stages/${stageKey}/completedAt`] = now;
            const currentStageIdx = STAGES.indexOf(stage);
            if (currentStageIdx < STAGES.length - 1) {
                const nextStage = STAGES[currentStageIdx + 1];
                updates[`currentStage`] = nextStage;
                updates[`stages/${nextStage.toLowerCase()}/status`] = 'In Progress';
                updates[`stages/${nextStage.toLowerCase()}/startedAt`] = now;
            } else {
                updates[`status`] = 'Completed';
                updates[`completedAt`] = now;
            }
        }

        firebase.database().ref(`root/nexus_hr/tasks/${taskId}`).update(updates);
    };

    const filteredTasks = filterRole === 'All'
        ? tasks
        : tasks.filter(t => t.currentStage === filterRole);

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            <Navbar />

            <div className="flex flex-1 overflow-hidden pt-16">
                {/* SIDEBAR */}
                <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col md:relative fixed inset-y-0 z-40 top-16`}>
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <h1 className="font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate pl-1">Workspace</h1>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" onClick={() => setIsCreateOpen(true)}>
                                <Plus className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 py-4 px-3">
                        <div className="mb-8">
                            <div className="flex items-center justify-between px-3 mb-2 group">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dashboards</span>
                            </div>
                            <div className="space-y-1">
                                <SidebarItem icon={Hash} label="All Tasks" active={filterRole === 'All'} onClick={() => setFilterRole('All')} count={tasks.length} />
                                <SidebarItem icon={Activity} label="In Progress" active={false} onClick={() => { }} count={tasks.filter(t => t.status === 'In Progress').length} />
                            </div>
                        </div>

                        <div className="mb-8">
                            <div className="flex items-center justify-between px-3 mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Workflow Stages</span>
                            </div>
                            <div className="space-y-1">
                                {STAGES.map(stage => (
                                    <SidebarItem
                                        key={stage}
                                        icon={Hash}
                                        label={stage}
                                        active={filterRole === stage}
                                        onClick={() => setFilterRole(stage)}
                                        count={tasks.filter(t => t.currentStage === stage).length}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex items-center justify-between px-3 mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Team</span>
                            </div>
                            <SidebarItem icon={Users} label="Team Chat" active={false} onClick={() => { }} count={0} />
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

                {/* MAIN CONTENT */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900 h-full relative">
                    {/* Header */}
                    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            {/* Toggle Sidebar (Mobile) */}
                            <button className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
                                <Menu className="w-5 h-5 text-slate-600" />
                            </button>

                            <div className="flex items-center gap-2">
                                <BackButton />
                                <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                                    <Hash className="w-4 h-4 text-slate-400" />
                                    {filterRole === 'All' ? 'all-tasks' : filterRole.toLowerCase()}
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 max-w-md w-full mx-4">
                            <div className="relative w-full">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder={`Search ${filterRole}...`}
                                    className="h-8 pl-9 bg-slate-100 dark:bg-slate-800 border-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" className="text-slate-500"><HelpCircle className="w-5 h-5" /></Button>
                        </div>
                    </header>

                    {/* Content Area */}
                    <ScrollArea className="flex-1 p-6">
                        <div className="max-w-5xl mx-auto">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                        {filterRole === 'All' ? 'All Tasks' : `${filterRole} Queue`}
                                    </h1>
                                    <p className="text-slate-500 text-sm mt-1">
                                        {filteredTasks.length} active tasks in this view
                                    </p>
                                </div>
                                <Button onClick={() => setIsCreateOpen(true)} className="bg-[#007a5a] hover:bg-[#007a5a]/90 text-white">
                                    New Task
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredTasks.map(task => (
                                    <TaskCard key={task.id} task={task} onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }} />
                                ))}
                                {filteredTasks.length === 0 && (
                                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                        <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                        <h3 className="text-slate-900 dark:text-slate-100 font-medium">No tasks found</h3>
                                        <p className="text-slate-500 text-sm">There are no tasks in this channel.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                {/* CREATE TASK DIALOG */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Create New Task</DialogTitle>
                            <DialogDescription>Initiate a new workflow chain.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Task Title</Label>
                                <Input
                                    placeholder="e.g. Electrical Wiring setup"
                                    value={newTask.title}
                                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Client Name</Label>
                                <Input
                                    placeholder="e.g. Acme Corp"
                                    value={newTask.clientName}
                                    onChange={e => setNewTask({ ...newTask, clientName: e.target.value })}
                                />
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
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input
                                    placeholder="Details..."
                                    value={newTask.description}
                                    onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateTask} className="bg-[#007a5a] hover:bg-[#007a5a]/90 text-white">Create</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* TASK DETAIL SHEET */}
                <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <SheetContent className="w-full sm:max-w-xl overflow-y-auto pt-10">
                        {selectedTask && (
                            <div className="flex flex-col h-full">
                                <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="font-mono">{selectedTask.id}</Badge>
                                        <Badge className={selectedTask.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                                            {selectedTask.status}
                                        </Badge>
                                    </div>
                                    <h1 className="text-2xl font-bold mb-1">{selectedTask.title}</h1>
                                    <p className="text-slate-500">{selectedTask.clientName}</p>
                                </div>

                                <div className="py-6 space-y-8">
                                    {/* Workflow Timeline */}
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Workflow Status</h4>
                                        <div className="relative pl-4 space-y-6 border-l-2 border-slate-100 dark:border-slate-800">
                                            {STAGES.map((stage, idx) => {
                                                const sKey = stage.toLowerCase();
                                                const sData = selectedTask.stages?.[sKey] || {};
                                                const isActive = selectedTask.currentStage === stage;
                                                const isCompleted = sData.status === 'Completed';
                                                const Icon = StageIcons[stage] || FileText;

                                                return (
                                                    <div key={stage} className={`relative pl-6 ${isActive || isCompleted ? 'opacity-100' : 'opacity-50'}`}>
                                                        {/* Timeline Dot */}
                                                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 bg-white dark:bg-slate-900 ${isCompleted ? 'border-emerald-500 bg-emerald-500' :
                                                            isActive ? 'border-indigo-500 animate-pulse' : 'border-slate-300'
                                                            }`} />

                                                        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 rounded-md ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                                    <Icon className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <h5 className="font-medium text-slate-900 dark:text-slate-100 text-sm">{stage}</h5>
                                                                    {sData.completedAt && <p className="text-[10px] text-slate-400">Done: {new Date(sData.completedAt).toLocaleDateString()}</p>}
                                                                </div>
                                                            </div>

                                                            {((isActive) || (isCompleted && idx === STAGES.length - 1)) && sData.status !== 'Completed' && (
                                                                <Button
                                                                    size="sm"
                                                                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                                                                    onClick={() => {
                                                                        if (confirm(`Mark ${stage} as Completed?`)) {
                                                                            updateStageStatus(selectedTask.id, stage, 'Completed');
                                                                            setIsDetailOpen(false);
                                                                        }
                                                                    }}
                                                                >
                                                                    Complete
                                                                </Button>
                                                            )}
                                                            {isCompleted && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Task Attributes */}
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Priority</p>
                                            <p className="font-medium">{selectedTask.priority}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Due Date</p>
                                            <p className="font-medium">{selectedTask.dueDate || 'None'}</p>
                                        </div>
                                        <div className="col-span-2 mt-2">
                                            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Description</p>
                                            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{selectedTask.description || 'No description provided.'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    );
};

export default TaskManager;
