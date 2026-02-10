import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import {
    Calendar, Clock, User, Users, CheckCircle2, AlertCircle,
    Paperclip, Send, X, ChevronLeft, ChevronRight, Flag,
    MessageSquare, FileText, Tag, ArrowLeft, Pencil, Trash2,
    Plus, Pin, Smile, Reply, ArrowUp, Camera, Search, MoreVertical
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sendTaskUpdateEmail } from "@/utils/emailService";

const TaskDetail = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    const [task, setTask] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editTaskData, setEditTaskData] = useState<any>(null);
    const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
    const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const loggedInEmpId = sessionStorage.getItem("employee_id") || "";
    const loggedInName = sessionStorage.getItem("staff_name") || "";
    const isStaff = sessionStorage.getItem("user_role") === "staff";

    useEffect(() => {
        const db = firebase.database();

        // Load all tasks
        const tasksRef = db.ref("root/nexus_hr/tasks");
        tasksRef.on("value", (snapshot) => {
            const data = snapshot.val();
            const tasksList = data ? Object.values(data) : [];
            setTasks(tasksList);

            // Find current task
            const currentTask = tasksList.find((t: any) => t.id === taskId);
            setTask(currentTask);
            setLoading(false);
        });

        // Load employees
        const empRef = db.ref("root/nexus_hr/employees");
        empRef.on("value", (snapshot) => {
            const data = snapshot.val();
            setEmployees(data ? Object.values(data) : []);
        });

        return () => {
            tasksRef.off();
            empRef.off();
        };
    }, [taskId]);

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        const db = firebase.database();
        const commentId = `CMT-${Date.now()}`;
        const authorName = isStaff ? loggedInName : "Admin";

        await db.ref(`root/nexus_hr/tasks/${taskId}/comments/${commentId}`).set({
            id: commentId,
            taskId: taskId,
            authorId: loggedInEmpId,
            author: authorName,
            text: newComment,
            createdAt: new Date().toISOString(),
            isPinned: false,
            reactions: {},
            replies: {}
        });

        setNewComment("");
        toast.success("Comment added");
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!task) return;
        const db = firebase.database();
        await db.ref(`root/nexus_hr/tasks/${taskId}`).update({ status: newStatus });
        toast.success("Status updated");
    };

    const handlePriorityUpdate = async (newPriority: string) => {
        if (!task) return;
        const db = firebase.database();
        await db.ref(`root/nexus_hr/tasks/${taskId}`).update({ priority: newPriority });
        toast.success("Priority updated");
    };

    const handleDeleteTask = async () => {
        if (!confirm("Are you sure you want to delete this task?")) return;
        const db = firebase.database();
        await db.ref(`root/nexus_hr/tasks/${taskId}`).remove();
        toast.success("Task deleted");
        navigate("/tasks");
    };

    const handlePinComment = async (commentId: string, currentPinned: boolean) => {
        const db = firebase.database();
        await db.ref(`root/nexus_hr/tasks/${taskId}/comments/${commentId}`).update({
            isPinned: !currentPinned
        });
    };

    const handleReaction = async (commentId: string, emoji: string) => {
        const db = firebase.database();
        const comment = task.comments?.[commentId];
        if (!comment) return;

        const currentReactions = comment.reactions?.[emoji] || [];
        const updated = currentReactions.includes(loggedInEmpId)
            ? currentReactions.filter((id: string) => id !== loggedInEmpId)
            : [...currentReactions, loggedInEmpId];

        await db.ref(`root/nexus_hr/tasks/${taskId}/comments/${commentId}/reactions/${emoji}`).set(updated);
        setShowEmojiPickerFor(null);
    };

    const handleReply = async (commentId: string) => {
        if (!replyText.trim()) return;

        const replyId = `RPL-${Date.now()}`;
        const replierName = isStaff ? loggedInName : "Admin";
        const replyData = {
            id: replyId,
            text: replyText,
            authorId: isStaff ? loggedInEmpId : "admin",
            author: replierName,
            createdAt: new Date().toISOString()
        };

        try {
            const db = firebase.database();
            await db.ref(`root/nexus_hr/tasks/${taskId}/comments/${commentId}/replies/${replyId}`).set(replyData);

            // Send email to original commenter
            const comment = task.comments?.[commentId];
            const originalCommenter = employees.find(e => e.id === comment?.authorId);
            if (originalCommenter?.email) {
                await sendTaskUpdateEmail(
                    [{ email: originalCommenter.email }],
                    `${replierName} replied to your comment`,
                    `<h2>${task.title}</h2><p><strong>${replierName}</strong> replied to your comment:</p><p><em>Your comment: "${comment.text}"</em></p><p><strong>Reply:</strong> ${replyText}</p>`,
                    false,
                    `New reply on: ${task.title}`
                );
            }

            setReplyText("");
            setReplyingToCommentId(null);
            toast.success("Reply sent");
        } catch (error) {
            console.error("Error adding reply:", error);
            toast.error("Failed to send reply");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Completed": return "bg-emerald-500";
            case "In Progress": return "bg-indigo-500";
            case "On Hold": return "bg-amber-500";
            case "Testing": return "bg-purple-500";
            case "Open": return "bg-blue-500";
            case "Pending": return "bg-slate-500";
            default: return "bg-slate-300";
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "High": return "text-red-600 bg-red-50 dark:bg-red-900/20";
            case "Normal": return "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20";
            case "Low": return "text-slate-600 bg-slate-50 dark:bg-slate-900/20";
            default: return "text-slate-600 bg-slate-50 dark:bg-slate-900/20";
        }
    };

    const navigateToTask = (newTaskId: string) => {
        navigate(`/tasks/${newTaskId}`);
    };

    const currentTaskIndex = tasks.findIndex(t => t.id === taskId);
    const prevTask = currentTaskIndex > 0 ? tasks[currentTaskIndex - 1] : null;
    const nextTask = currentTaskIndex < tasks.length - 1 ? tasks[currentTaskIndex + 1] : null;

    if (loading) {
        return (
            <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20">
                <Navbar />
                <div className="flex-1 flex items-center justify-center pt-16">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-600 dark:text-slate-400">Loading task...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20">
                <Navbar />
                <div className="flex-1 flex items-center justify-center pt-16">
                    <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Task Not Found</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">The task you're looking for doesn't exist.</p>
                        <Button onClick={() => navigate("/tasks")} className="bg-indigo-600 hover:bg-indigo-700">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Tasks
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const assignedEmployees = employees.filter(e => task.assignedEmployeeIds?.includes(e.id));
    const author = employees.find(e => e.id === task.authorId);
    const tester = employees.find(e => e.id === task.testerId);

    // Sort comments: pinned first, then by date
    const sortedComments = task.comments
        ? Object.values(task.comments).sort((a: any, b: any) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        : [];

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20">
            <Navbar />

            <div className="flex flex-1 overflow-hidden pt-16">
                {/* Left Sidebar - Task List */}
                <div className={`${isSidebarCollapsed ? 'w-0' : 'w-80'} transition-all duration-300 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col`}>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">All Tasks</h3>
                        <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                            {tasks.length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {tasks.map((t) => (
                            <div
                                key={t.id}
                                onClick={() => navigateToTask(t.id)}
                                className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${t.id === taskId ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500' : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2">
                                        {t.title}
                                    </h4>
                                    <Badge className={`${getPriorityColor(t.priority)} text-[10px] px-1.5 py-0.5 shrink-0`}>
                                        {t.priority}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${getStatusColor(t.status)}`}></div>
                                    <span className="text-xs text-slate-600 dark:text-slate-400">{t.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Toggle Sidebar Button */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-r-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-lg"
                    style={{ left: isSidebarCollapsed ? '0' : '320px' }}
                >
                    {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                {/* Main Content - Task Details */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-4xl mx-auto p-6 space-y-6">
                        {/* Navigation */}
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                onClick={() => navigate("/tasks")}
                                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Tasks
                            </Button>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => prevTask && navigateToTask(prevTask.id)}
                                    disabled={!prevTask}
                                    className="rounded-xl"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => nextTask && navigateToTask(nextTask.id)}
                                    disabled={!nextTask}
                                    className="rounded-xl"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Task Header */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Badge className={`${getPriorityColor(task.priority)} text-xs px-3 py-1`}>
                                            <Flag className="w-3 h-3 mr-1" />
                                            {task.priority}
                                        </Badge>
                                        <Badge className={`${getStatusColor(task.status)} text-white text-xs px-3 py-1`}>
                                            {task.status}
                                        </Badge>
                                    </div>
                                    <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-2">
                                        {task.title}
                                    </h1>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Task ID: {task.id}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            window.open("/tasks", "_blank");
                                        }}
                                        className="rounded-xl"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Subtask
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            setEditTaskData({ ...task });
                                            setIsEditOpen(true);
                                        }}
                                        className="rounded-xl"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleDeleteTask}
                                        className="rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Task Meta Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                    <Calendar className="w-5 h-5 text-indigo-500" />
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Created</p>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {new Date(task.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                    <Clock className="w-5 h-5 text-amber-500" />
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Due Date</p>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                                        </p>
                                    </div>
                                </div>

                                {author && (
                                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                        <User className="w-5 h-5 text-emerald-500" />
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Author</p>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                {author.name}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {tester && (
                                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                        <CheckCircle2 className="w-5 h-5 text-purple-500" />
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Tester</p>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                {tester.name}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Status and Priority Controls */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Status</label>
                                    <Select value={task.status} onValueChange={handleStatusUpdate}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Open">Open</SelectItem>
                                            <SelectItem value="In Progress">In Progress</SelectItem>
                                            <SelectItem value="Testing">Testing</SelectItem>
                                            <SelectItem value="On Hold">On Hold</SelectItem>
                                            <SelectItem value="Completed">Completed</SelectItem>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Priority</label>
                                    <Select value={task.priority} onValueChange={handlePriorityUpdate}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Low">Low</SelectItem>
                                            <SelectItem value="Normal">Normal</SelectItem>
                                            <SelectItem value="High">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Assigned Employees */}
                            {assignedEmployees.length > 0 && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Users className="w-4 h-4 text-slate-500" />
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            Assigned To ({assignedEmployees.length})
                                        </h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {assignedEmployees.map((emp) => (
                                            <div
                                                key={emp.id}
                                                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800"
                                            >
                                                {emp.photoUrl ? (
                                                    <img src={emp.photoUrl} alt={emp.name} className="w-6 h-6 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                )}
                                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                    {emp.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText className="w-4 h-4 text-slate-500" />
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Description</h3>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                        {task.description || "No description provided."}
                                    </p>
                                </div>
                            </div>

                            {/* Attachments */}
                            {task.images && task.images.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Camera className="w-4 h-4 text-slate-500" />
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            Attachments ({task.images.length})
                                        </h3>
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 custom-scrollbar">
                                        {task.images.map((img: string, i: number) => (
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
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Comments */}
                <div className="w-96 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-indigo-500" />
                            <h3 className="font-bold text-slate-900 dark:text-slate-100">Comments</h3>
                            <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                                {sortedComments.length}
                            </span>
                        </div>
                    </div>

                    {/* Comments List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                        {sortedComments.length === 0 ? (
                            <div className="text-center py-12">
                                <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                <p className="text-sm text-slate-500 dark:text-slate-400">No comments yet</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">Be the first to comment!</p>
                            </div>
                        ) : (
                            sortedComments.map((comment: any) => {
                                const commentAuthor = employees.find(e => e.id === comment.authorId);
                                return (
                                    <div
                                        key={comment.id}
                                        className={`relative flex flex-col gap-2 p-3 rounded-2xl transition-all ${comment.isPinned ? 'bg-amber-50/50 border border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20' : ''
                                            }`}
                                    >
                                        {comment.isPinned && (
                                            <div className="absolute -top-2 left-4 px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full flex items-center gap-1 shadow-sm">
                                                <Pin className="w-3 h-3 fill-amber-700" /> Pinned
                                            </div>
                                        )}

                                        <div className="flex items-start gap-3">
                                            <Avatar className="w-8 h-8 border-2 border-white dark:border-slate-900 shadow-md">
                                                <AvatarImage src={commentAuthor?.photoUrl} />
                                                <AvatarFallback className="bg-indigo-50 text-indigo-600 text-xs font-bold">
                                                    {comment.author?.[0]}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                                            {comment.author}
                                                        </span>
                                                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                        <span className="text-[10px] text-slate-400">
                                                            {new Date(comment.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-slate-400 hover:text-amber-500"
                                                        onClick={() => handlePinComment(comment.id, comment.isPinned)}
                                                    >
                                                        <Pin className={`w-3.5 h-3.5 ${comment.isPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
                                                    </Button>
                                                </div>

                                                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none text-sm text-slate-700 dark:text-slate-300">
                                                    {comment.text}

                                                    {/* Reactions Display */}
                                                    {comment.reactions && Object.keys(comment.reactions).length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                                            {Object.entries(comment.reactions).flatMap(([emoji, users]: [string, any]) =>
                                                                (users as string[]).map(userId => {
                                                                    const reactor = employees.find(e => e.id === userId);
                                                                    return (
                                                                        <div
                                                                            key={`${emoji}-${userId}`}
                                                                            className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full px-2 py-1 text-xs"
                                                                        >
                                                                            <span>{emoji}</span>
                                                                            <span className="text-[10px] text-slate-600 dark:text-slate-400">
                                                                                {reactor?.name?.split(' ')[0] || 'Unknown'}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Comment Actions */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Popover open={showEmojiPickerFor === comment.id} onOpenChange={(open) => setShowEmojiPickerFor(open ? comment.id : null)}>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-500 hover:text-indigo-600">
                                                                <Smile className="w-3 h-3 mr-1" />
                                                                React
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-1 flex gap-1 bg-white dark:bg-slate-900 shadow-xl border-slate-100 rounded-full" align="start">
                                                            {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
                                                                <button
                                                                    key={emoji}
                                                                    className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-lg transition-transform hover:scale-110"
                                                                    onClick={() => handleReaction(comment.id, emoji)}
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </PopoverContent>
                                                    </Popover>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-xs text-slate-500 hover:text-indigo-600"
                                                        onClick={() => setReplyingToCommentId(comment.id)}
                                                    >
                                                        <Reply className="w-3 h-3 mr-1" />
                                                        Reply
                                                    </Button>
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
                                                                className="h-8 text-xs bg-slate-100 dark:bg-slate-800"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && replyText.trim()) {
                                                                        handleReply(comment.id);
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                size="sm"
                                                                className="h-8 w-8 p-0 bg-indigo-600 hover:bg-indigo-700"
                                                                onClick={() => handleReply(comment.id)}
                                                            >
                                                                <ArrowUp className="w-3 h-3" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0"
                                                                onClick={() => {
                                                                    setReplyingToCommentId(null);
                                                                    setReplyText("");
                                                                }}
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Replies */}
                                                {comment.replies && Object.keys(comment.replies).length > 0 && (
                                                    <div className="mt-3 pl-4 space-y-2 border-l-2 border-slate-200 dark:border-slate-700">
                                                        {Object.values(comment.replies).map((reply: any) => {
                                                            const replyAuthor = employees.find(e => e.id === reply.authorId);
                                                            return (
                                                                <div key={reply.id} className="flex items-start gap-2">
                                                                    <Avatar className="w-6 h-6">
                                                                        <AvatarImage src={replyAuthor?.photoUrl} />
                                                                        <AvatarFallback className="text-[10px]">
                                                                            {reply.author?.[0]}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex-1">
                                                                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                                                                            <p className="text-[10px] font-bold text-slate-900 dark:text-slate-100 mb-1">
                                                                                {reply.author}
                                                                            </p>
                                                                            <p className="text-xs text-slate-700 dark:text-slate-300">
                                                                                {reply.text}
                                                                            </p>
                                                                        </div>
                                                                        <span className="text-[9px] text-slate-400 mt-1 block">
                                                                            {new Date(reply.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Comment Input */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex gap-2">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                rows={3}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                        handleAddComment();
                                    }
                                }}
                            />
                        </div>
                        <Button
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 rounded-2xl"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            Send Comment
                        </Button>
                    </div>
                </div>
            </div>

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        onClick={() => setPreviewImage(null)}
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                    <img
                        src={previewImage}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default TaskDetail;
