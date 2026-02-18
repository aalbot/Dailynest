import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import {
    Calendar, Clock, User, Users, CheckCircle2, AlertCircle,
    Paperclip, Send, X, ChevronLeft, ChevronRight, Flag,
    MessageSquare, FileText, Tag, ArrowLeft, Pencil, Trash2,
    Plus, Pin, Smile, Reply, ArrowUp, Camera, Search, MoreVertical, Filter, List,
    ZoomIn, ZoomOut, RotateCcw, FolderOpen, Maximize, Share2, Download, Copy, Link,
    Menu, PanelLeftClose, PanelRightClose, Image, ThumbsUp
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { sendTaskUpdateEmail } from "@/utils/emailService";
import { sendCloudFunctionPush } from "@/utils/fcm";
import jsPDF from "jspdf";

const TaskDetail = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    const [task, setTask] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editTaskData, setEditTaskData] = useState<any>(null);
    const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
    const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isReassignOpen, setIsReassignOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedReassignEmployee, setSelectedReassignEmployee] = useState<string>("");
    const [showAttachmentsFolder, setShowAttachmentsFolder] = useState(false);
    const [imageZoom, setImageZoom] = useState(1);
    const [imageTransform, setImageTransform] = useState({ x: 0, y: 0 });
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [commentAttachments, setCommentAttachments] = useState<string[]>([]);
    const [visibleCommentsCount, setVisibleCommentsCount] = useState<number>(3);

    // Filters
    const [filterEmployee, setFilterEmployee] = useState<string>("all");
    const [filterPriority, setFilterPriority] = useState<string>("all");

    // Mobile view toggles
    const [showMobileComments, setShowMobileComments] = useState(false);
    const [showMobileTasks, setShowMobileTasks] = useState(false);

    const loggedInEmpId = sessionStorage.getItem("employee_id") || "";
    const loggedInName = sessionStorage.getItem("staff_name") || "";
    const isStaff = sessionStorage.getItem("user_role") === "staff";

    // Ref for auto-scroll
    const chatContainerRef = useRef<HTMLDivElement>(null);

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
            const employeesList = data ? Object.values(data).map((emp: any) => ({
                ...emp,
                name: emp.name || `${emp.firstName} ${emp.lastName}`.trim() || "Unknown"
            })) : [];
            setEmployees(employeesList);
        });

        return () => {
            tasksRef.off();
            empRef.off();
        };
    }, [taskId]);

    // Auto-scroll to top when comments change (since newest are at top)
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = 0;
        }
    }, [task?.comments]);

    const handleAddComment = async () => {
        if (!newComment.trim() && commentAttachments.length === 0) return;

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
            replies: {},
            replyTo: replyingTo ? {
                id: replyingTo.id,
                author: replyingTo.author,
                text: replyingTo.text
            } : null,
            attachments: commentAttachments
        });

        // Send email notification to involved users
        const involvedUserIds = new Set<string>();

        // Add assignees
        if (task.assignedEmployeeIds) {
            task.assignedEmployeeIds.forEach((id: string) => involvedUserIds.add(id));
        }

        // Add author
        if (task.authorId) {
            involvedUserIds.add(task.authorId);
        }

        // Add tester
        if (task.testerId) {
            involvedUserIds.add(task.testerId);
        }

        // Remove current user
        involvedUserIds.delete(loggedInEmpId);

        const recipients = Array.from(involvedUserIds)
            .map(id => employees.find(e => e.id === id))
            .filter(e => e && e.email)
            .map(e => ({ email: e.email }));

        if (recipients.length > 0) {
            await sendTaskUpdateEmail(
                recipients,
                `New comment on: ${task.title}`,
                `<h2>${task.title}</h2>
                 <p><strong>${authorName}</strong> commented:</p>
                 <div style="background-color: #f3f4f6; padding: 12px; border-radius: 8px; margin: 10px 0;">
                    ${newComment}
                 </div>
                 <p><a href="${window.location.href}">View Task</a></p>`,
                false,
                `New comment on: ${task.title}`
            );
        }

        setNewComment("");
        setReplyingTo(null);
        setCommentAttachments([]);
        toast.success("Comment added");
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setCommentAttachments(prev => [...prev, base64String]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!task) return;
        const db = firebase.database();
        await db.ref(`root/nexus_hr/tasks/${taskId}`).update({ status: newStatus });
        toast.success("Status updated");
    };

    const handleDeleteTask = () => {
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        const db = firebase.database();
        await db.ref(`root/nexus_hr/tasks/${taskId}`).remove();
        setIsDeleteOpen(false);
        toast.success("Task deleted");
        navigate("/tasks");
    };

    const handleUpdateTask = async () => {
        if (!editTaskData) return;
        const db = firebase.database();
        try {
            // For approval flow, if status was raised, force it to Open if user didn't change it to something else
            const newStatus = (task.status === 'Raised' && editTaskData.status === 'Raised') ? 'Open' : editTaskData.status;

            await db.ref(`root/nexus_hr/tasks/${taskId}`).update({
                title: editTaskData.title,
                description: editTaskData.description,
                priority: editTaskData.priority,
                dueDate: editTaskData.dueDate || null,
                assignedEmployeeIds: editTaskData.assignedEmployeeIds || [],
                status: newStatus,
                effortDays: editTaskData.effortDays || null
            });

            // Notifications for new assignees
            const oldAssignees = task.assignedEmployeeIds || [];
            const newAssignees = editTaskData.assignedEmployeeIds || [];
            const newlyAdded = newAssignees.filter((id: string) => !oldAssignees.includes(id));

            if (newlyAdded.length > 0) {
                // Email
                const recipients = newlyAdded
                    .map((id: string) => employees.find(e => e.id === id))
                    .filter((e: any) => e && e.email)
                    .map((e: any) => ({ email: e.email }));

                if (recipients.length > 0) {
                    sendTaskUpdateEmail(
                        recipients,
                        "Task Assigned to You",
                        `<h2>Task Assigned</h2><p>You have been assigned to: <strong>${editTaskData.title}</strong></p>`,
                        false,
                        `New Assignment: ${editTaskData.title}`
                    );
                }

                // Push
                sendCloudFunctionPush(
                    newlyAdded,
                    "New Task Assigned 📋",
                    `You have been assigned: ${editTaskData.title}`
                );
            }

            toast.success(task.status === 'Raised' ? "Task approved & updated" : "Task updated successfully");
            setIsEditOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update task");
        }
    };

    const handleReassign = async () => {
        if (!selectedReassignEmployee) {
            toast.error("Please select an employee");
            return;
        }

        const db = firebase.database();
        try {
            const currentAssignees = task.assignedEmployeeIds || [];

            // Track reassignment history
            const reassignmentHistory = task.reassignmentHistory || [];
            reassignmentHistory.push({
                from: currentAssignees,
                to: selectedReassignEmployee,
                timestamp: new Date().toISOString(),
                reassignedBy: loggedInEmpId || "admin"
            });

            await db.ref(`root/nexus_hr/tasks/${taskId}`).update({
                assignedEmployeeIds: [selectedReassignEmployee],
                reassignmentHistory: reassignmentHistory
            });

            // Send email notification
            const newAssignee = employees.find(e => e.id === selectedReassignEmployee);
            if (newAssignee && newAssignee.email) {
                await sendTaskUpdateEmail(
                    [{ email: newAssignee.email }],
                    "Task Reassigned to You",
                    `<h2>Task Reassigned</h2><p>You have been reassigned to: <strong>${task.title}</strong></p><p>Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}</p>`,
                    false,
                    `Task Reassigned: ${task.title}`
                );

                // Send push notification
                await sendCloudFunctionPush(
                    [selectedReassignEmployee],
                    "Task Reassigned 🔄",
                    `You have been reassigned: ${task.title}`
                );
            }

            toast.success("Task reassigned successfully");
            setIsReassignOpen(false);
            setSelectedReassignEmployee("");
        } catch (error) {
            console.error(error);
            toast.error("Failed to reassign task");
        }
    };

    const handleShareTask = async () => {
        const shareUrl = `${window.location.origin}/tasks/${taskId}`;

        try {
            if (navigator.share) {
                // Use Web Share API if available
                await navigator.share({
                    title: task.title,
                    text: `Check out this task: ${task.title}`,
                    url: shareUrl
                });
                toast.success("Shared successfully!");
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(shareUrl);
                toast.success("Link copied to clipboard!");
            }
        } catch (error) {
            console.error("Share failed:", error);
        }
    };

    const handleCopyLink = async () => {
        const shareUrl = `${window.location.origin}/tasks/${taskId}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Link copied to clipboard!");
        } catch (error) {
            toast.error("Failed to copy link");
        }
    };

    const handleExportPDF = () => {
        try {
            const pdf = new jsPDF();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            let yPos = 20;

            // Header with gradient effect (simulated with rectangles)
            pdf.setFillColor(99, 102, 241); // Indigo
            pdf.rect(0, 0, pageWidth, 40, 'F');

            // Title
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(24);
            pdf.setFont(undefined, 'bold');
            pdf.text('Task Report', pageWidth / 2, 25, { align: 'center' });

            yPos = 50;

            // Task Title Section
            pdf.setFillColor(241, 245, 249);
            pdf.rect(10, yPos, pageWidth - 20, 15, 'F');
            pdf.setTextColor(30, 41, 59);
            pdf.setFontSize(18);
            pdf.setFont(undefined, 'bold');
            pdf.text(task.title, 15, yPos + 10);
            yPos += 25;

            // Task ID and Date
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(100, 116, 139);
            pdf.text(`Task ID: ${task.id}`, 15, yPos);
            pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 15, yPos, { align: 'right' });
            yPos += 15;

            // Status and Priority Badges
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');

            // Status Badge
            const statusColors: any = {
                'Open': [59, 130, 246],
                'In Progress': [251, 191, 36],
                'Testing': [168, 85, 247],
                'Completed': [34, 197, 94],
                'On Hold': [239, 68, 68],
                'Pending': [156, 163, 175]
            };
            const statusColor: [number, number, number] = statusColors[task.status] || [100, 116, 139];
            pdf.setFillColor(...statusColor);
            pdf.roundedRect(15, yPos - 5, 35, 8, 2, 2, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.text(task.status, 17, yPos);

            // Priority Badge
            const priorityColors: any = {
                'High': [239, 68, 68],
                'Medium': [251, 191, 36],
                'Low': [34, 197, 94]
            };
            const priorityColor: [number, number, number] = priorityColors[task.priority] || [156, 163, 175];
            pdf.setFillColor(...priorityColor);
            pdf.roundedRect(55, yPos - 5, 35, 8, 2, 2, 'F');
            pdf.text(task.priority, 57, yPos);

            yPos += 20;

            // Section: Task Details
            pdf.setFillColor(99, 102, 241);
            pdf.rect(10, yPos - 3, 3, 8, 'F');
            pdf.setTextColor(30, 41, 59);
            pdf.setFontSize(14);
            pdf.setFont(undefined, 'bold');
            pdf.text('Task Details', 18, yPos + 3);
            yPos += 12;

            // Details Grid
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            const details = [
                { label: 'Created', value: new Date(task.createdAt).toLocaleString() },
                { label: 'Due Date', value: task.dueDate ? new Date(task.dueDate).toLocaleString() : 'Not set' },
                { label: 'Author', value: author ? `${author.firstName} ${author.lastName}` : 'Unknown' },
                { label: 'Tester', value: tester ? tester.name : 'Not assigned' }
            ];

            details.forEach((detail) => {
                pdf.setTextColor(100, 116, 139);
                pdf.setFont(undefined, 'bold');
                pdf.text(`${detail.label}:`, 15, yPos);
                pdf.setTextColor(30, 41, 59);
                pdf.setFont(undefined, 'normal');
                pdf.text(detail.value, 50, yPos);
                yPos += 7;
            });

            yPos += 8;

            // Description Section
            if (task.description) {
                pdf.setFillColor(99, 102, 241);
                pdf.rect(10, yPos - 3, 3, 8, 'F');
                pdf.setTextColor(30, 41, 59);
                pdf.setFontSize(14);
                pdf.setFont(undefined, 'bold');
                pdf.text('Description', 18, yPos + 3);
                yPos += 12;

                pdf.setFontSize(10);
                pdf.setFont(undefined, 'normal');
                pdf.setTextColor(51, 65, 85);
                const descLines = pdf.splitTextToSize(task.description, pageWidth - 30);
                pdf.text(descLines, 15, yPos);
                yPos += descLines.length * 5 + 10;
            }

            // Check for new page
            if (yPos > pageHeight - 40) {
                pdf.addPage();
                yPos = 20;
            }

            // Assigned Employees Section
            if (assignedEmployees.length > 0) {
                pdf.setFillColor(99, 102, 241);
                pdf.rect(10, yPos - 3, 3, 8, 'F');
                pdf.setTextColor(30, 41, 59);
                pdf.setFontSize(14);
                pdf.setFont(undefined, 'bold');
                pdf.text('Assigned Employees', 18, yPos + 3);
                yPos += 12;

                assignedEmployees.forEach((emp) => {
                    pdf.setFontSize(10);
                    pdf.setFont(undefined, 'normal');
                    pdf.setTextColor(51, 65, 85);
                    pdf.text(`• ${emp.name}`, 15, yPos);
                    pdf.setTextColor(100, 116, 139);
                    pdf.setFontSize(9);
                    pdf.text(emp.email || '', 25, yPos + 4);
                    yPos += 10;
                });
                yPos += 5;
            }

            // Check for new page
            if (yPos > pageHeight - 40) {
                pdf.addPage();
                yPos = 20;
            }

            // Comments Section
            if (task.comments && Object.keys(task.comments).length > 0) {
                pdf.setFillColor(99, 102, 241);
                pdf.rect(10, yPos - 3, 3, 8, 'F');
                pdf.setTextColor(30, 41, 59);
                pdf.setFontSize(14);
                pdf.setFont(undefined, 'bold');
                pdf.text('Comments', 18, yPos + 3);
                yPos += 12;

                Object.values(task.comments).forEach((comment: any, index: number) => {
                    if (yPos > pageHeight - 40) {
                        pdf.addPage();
                        yPos = 20;
                    }

                    pdf.setFillColor(248, 250, 252);
                    pdf.roundedRect(15, yPos - 3, pageWidth - 30, 20, 2, 2, 'F');

                    pdf.setFontSize(10);
                    pdf.setFont(undefined, 'bold');
                    pdf.setTextColor(30, 41, 59);
                    pdf.text(comment.author, 20, yPos + 3);

                    pdf.setFontSize(8);
                    pdf.setFont(undefined, 'normal');
                    pdf.setTextColor(100, 116, 139);
                    pdf.text(new Date(comment.createdAt).toLocaleString(), pageWidth - 20, yPos + 3, { align: 'right' });

                    pdf.setFontSize(9);
                    pdf.setTextColor(51, 65, 85);
                    const commentLines = pdf.splitTextToSize(comment.text, pageWidth - 40);
                    pdf.text(commentLines, 20, yPos + 10);

                    yPos += 25;
                });
            }

            // Footer
            const footerY = pageHeight - 15;
            pdf.setFontSize(8);
            pdf.setTextColor(156, 163, 175);
            pdf.setFont(undefined, 'italic');
            pdf.text(`DailyClub Portal • Task Report • ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY, { align: 'center' });

            // Save PDF
            pdf.save(`task_${task.id}_${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success("PDF exported successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to export PDF");
        }
    };

    const handleUpvoteComment = async (commentId: string) => {
        const db = firebase.database();
        const commentRef = db.ref(`root/nexus_hr/tasks/${taskId}/comments/${commentId}/upvotes/${loggedInEmpId}`);
        const snapshot = await commentRef.once('value');
        if (snapshot.exists()) {
            await commentRef.remove();
        } else {
            await commentRef.set(true);
        }
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

            // Send notifications
            const comment = task.comments?.[commentId];
            const originalCommenter = employees.find(e => e.id === comment?.authorId);

            // Build set of recipients (involved users + original commenter)
            const involvedUserIds = new Set<string>();

            if (task.assignedEmployeeIds) task.assignedEmployeeIds.forEach((id: string) => involvedUserIds.add(id));
            if (task.authorId) involvedUserIds.add(task.authorId);
            if (task.testerId) involvedUserIds.add(task.testerId);
            if (comment?.authorId) involvedUserIds.add(comment.authorId);

            // Remove replier
            involvedUserIds.delete(loggedInEmpId);

            const recipients = Array.from(involvedUserIds)
                .map(id => employees.find(e => e.id === id))
                .filter(e => e && e.email)
                .map(e => ({ email: e.email }));

            if (recipients.length > 0) {
                await sendTaskUpdateEmail(
                    recipients,
                    `New reply on: ${task.title}`,
                    `<h2>${task.title}</h2>
                     <p><strong>${replierName}</strong> replied to a comment by <strong>${comment?.author || 'someone'}</strong>:</p>
                     <div style="background-color: #f3f4f6; padding: 12px; border-radius: 8px; margin: 10px 0;">
                        <p style="margin: 0 0 8px 0; font-size: 0.9em; color: #666;">On "${comment?.text}":</p>
                        <p style="margin: 0; font-weight: bold;">${replyText}</p>
                     </div>
                     <p><a href="${window.location.href}">View Task</a></p>`,
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
        // Close mobile views when navigating
        setShowMobileComments(false);
        setShowMobileTasks(false);
    };

    // Filter tasks
    const filteredTasks = tasks.filter(t => {
        if (filterEmployee !== "all" && !t.assignedEmployeeIds?.includes(filterEmployee)) return false;
        if (filterPriority !== "all" && t.priority !== filterPriority) return false;
        return true;
    });

    const currentTaskIndex = filteredTasks.findIndex(t => t.id === taskId);
    const prevTask = currentTaskIndex > 0 ? filteredTasks[currentTaskIndex - 1] : null;
    const nextTask = currentTaskIndex < filteredTasks.length - 1 ? filteredTasks[currentTaskIndex + 1] : null;

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
    const author = task.authorId === 'admin'
        ? { name: 'Admin', photoUrl: '', id: 'admin' }
        : employees.find(e => e.id === task.authorId);
    const tester = employees.find(e => e.id === task.testerId);

    // Sort comments: pinned first, then by upvotes (highest first), then by date (newest first)
    const sortedComments = task.comments
        ? Object.values(task.comments).sort((a: any, b: any) => {
            // 1. Pinned
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;

            // 2. Upvotes
            const aUpvotes = a.upvotes ? Object.keys(a.upvotes).length : 0;
            const bUpvotes = b.upvotes ? Object.keys(b.upvotes).length : 0;
            if (bUpvotes !== aUpvotes) return bUpvotes - aUpvotes;

            // 3. Date (Newest first)
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        : [];

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20">
            <Navbar />

            {/* Mobile Action Buttons */}
            <div className="md:hidden fixed bottom-4 right-4 z-40 flex gap-2">
                <Button
                    onClick={() => {
                        setShowMobileTasks(!showMobileTasks);
                        setShowMobileComments(false);
                    }}
                    className="rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 h-14 w-14"
                >
                    <List className="w-6 h-6" />
                </Button>
                <Button
                    onClick={() => {
                        setShowMobileComments(!showMobileComments);
                        setShowMobileTasks(false);
                    }}
                    className="rounded-full shadow-lg bg-purple-600 hover:bg-purple-700 h-14 w-14 relative"
                >
                    <MessageSquare className="w-6 h-6" />
                    {sortedComments.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {sortedComments.length}
                        </span>
                    )}
                </Button>
            </div>

            <div className="flex flex-1 overflow-hidden pt-16">
                {/* Left Sidebar - Task List */}
                <div className={`${isSidebarCollapsed ? 'w-0' : 'w-80'
                    } ${showMobileTasks ? 'fixed inset-0 z-50 w-full md:relative md:w-80' : 'hidden md:flex'
                    } transition-all duration-300 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex-col`}>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100">All Tasks</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                                    {filteredTasks.length}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden h-8 w-8"
                                    onClick={() => setShowMobileTasks(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="space-y-2">
                            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Filter by Employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Employees</SelectItem>
                                    {employees.filter(emp => emp.role !== 'Ride' && emp.department !== 'Logistics').map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={filterPriority} onValueChange={setFilterPriority}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Filter by Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priorities</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Normal">Normal</SelectItem>
                                    <SelectItem value="Low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filteredTasks.map((t) => {
                            const taskAssignees = employees.filter(e => t.assignedEmployeeIds?.includes(e.id));
                            return (
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
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(t.status)}`}></div>
                                        <span className="text-xs text-slate-600 dark:text-slate-400">{t.status}</span>
                                    </div>
                                    {/* Task Date & Assigned Employees */}
                                    <div className="flex items-center justify-between gap-2 mt-2">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-slate-400" />
                                            <span className="text-[10px] text-slate-500">
                                                {t.dueDate ? new Date(t.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'No date'}
                                            </span>
                                        </div>
                                        {taskAssignees.length > 0 && (
                                            <div className="flex items-center -space-x-2">
                                                {taskAssignees.slice(0, 3).map((emp, idx) => (
                                                    <div key={emp.id} className="relative" style={{ zIndex: 3 - idx }}>
                                                        {emp.photoUrl ? (
                                                            <img
                                                                src={emp.photoUrl}
                                                                alt={emp.name}
                                                                className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 object-cover"
                                                                title={emp.name}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[8px] font-bold border-2 border-white dark:border-slate-900"
                                                                title={emp.name}
                                                            >
                                                                {emp.name.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {taskAssignees.length > 3 && (
                                                    <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold border-2 border-white dark:border-slate-900">
                                                        +{taskAssignees.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Toggle Sidebar Button - Desktop Only */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-r-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-lg"
                    style={{ left: isSidebarCollapsed ? '0' : '320px' }}
                >
                    {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                {/* Main Content - Task Details */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
                        {/* Navigation */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => navigate("/tasks")}
                                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                                size="sm"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">Back to Tasks</span>
                                <span className="sm:hidden">Back</span>
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
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 md:p-8">
                            <div className="flex flex-col md:flex-row items-start justify-between mb-6 gap-4">
                                <div className="flex-1 w-full">
                                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                                        <Badge className={`${getPriorityColor(task.priority)} text-xs px-3 py-1`}>
                                            <Flag className="w-3 h-3 mr-1" />
                                            {task.priority}
                                        </Badge>
                                        <Badge className={`${getStatusColor(task.status)} text-white text-xs px-3 py-1`}>
                                            {task.status}
                                        </Badge>
                                    </div>
                                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 mb-2">
                                        {task.title}
                                    </h1>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Task ID: {task.id}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    {!isStaff && task.status === 'Raised' && (
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-200 dark:shadow-none flex-1 md:flex-initial"
                                            onClick={() => {
                                                setEditTaskData({ ...task, status: 'Open' }); // Default to Open when approving
                                                setIsEditOpen(true);
                                            }}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Approve
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open("/tasks", "_blank")}
                                        className="rounded-xl flex-1 md:flex-initial"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        <span className="hidden sm:inline">Create Subtask</span>
                                        <span className="sm:hidden">Subtask</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setIsShareOpen(true)}
                                        className="rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                        title="Share Task"
                                    >
                                        <Share2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleExportPDF}
                                        className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                                        title="Export as PDF"
                                    >
                                        <Download className="w-4 h-4" />
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

                            {/* Task Meta Info - Single Row with Assigned, Created, Due Date */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 mt-6">
                                {/* Assigned To with Reassign Button */}
                                <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                    <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Assigned To</p>
                                        {assignedEmployees.length > 0 ? (
                                            <div className="flex items-center gap-1.5">
                                                {assignedEmployees[0].photoUrl ? (
                                                    <img src={assignedEmployees[0].photoUrl} alt={assignedEmployees[0].name} className="w-5 h-5 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[8px] font-bold">
                                                        {assignedEmployees[0].name.charAt(0)}
                                                    </div>
                                                )}
                                                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                    {assignedEmployees[0].name}
                                                </span>
                                                {assignedEmployees.length > 1 && (
                                                    <span className="text-[10px] text-slate-500 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                                                        +{assignedEmployees.length - 1}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400">Not assigned</p>
                                        )}
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => setIsReassignOpen(true)}
                                        className="h-7 px-2 text-[10px] bg-indigo-600 hover:bg-indigo-700 shrink-0"
                                    >
                                        Reassign
                                    </Button>
                                </div>

                                {/* Created Date */}
                                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Created</p>
                                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                            {new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Due Date */}
                                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Due Date</p>
                                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : "Not set"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Status & Attachments Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {/* Status Dropdown - Reduced Width */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Status</label>
                                    <Select value={task.status} onValueChange={handleStatusUpdate}>
                                        <SelectTrigger className="w-full h-11 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800 font-semibold">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`}></div>
                                                <SelectValue />
                                            </div>
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

                                {/* Attachments Folder */}
                                {task.images && task.images.length > 0 && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                                            Attachments
                                        </label>
                                        <button
                                            onClick={() => setShowAttachmentsFolder(!showAttachmentsFolder)}
                                            className="w-full h-11 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between px-4 hover:shadow-lg transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                                    <Paperclip className="w-4 h-4 text-white" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                                        {task.images.length} {task.images.length === 1 ? 'File' : 'Files'}
                                                    </p>
                                                    <p className="text-[9px] text-slate-500">Click to view</p>
                                                </div>
                                            </div>
                                            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showAttachmentsFolder ? 'rotate-90' : ''}`} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Attachments Folder Content */}
                            {showAttachmentsFolder && task.images && task.images.length > 0 && (
                                <div className="mb-6 p-4 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 animate-in slide-in-from-top-2">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {task.images.map((img: string, i: number) => (
                                            <div key={i} className="group relative">
                                                <img
                                                    src={img}
                                                    alt={`Attachment ${i + 1}`}
                                                    className="w-full aspect-square object-cover rounded-xl border-2 border-white dark:border-slate-800 shadow-md transition-all hover:scale-105 cursor-pointer ring-1 ring-slate-200 dark:ring-slate-700"
                                                    onClick={() => setPreviewImage(img)}
                                                />
                                                {/* Expand Button Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-all flex items-center justify-center">
                                                    <button
                                                        onClick={() => setPreviewImage(img)}
                                                        className="bg-white/90 hover:bg-white text-slate-900 p-3 rounded-full shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-200"
                                                        title="Expand Image"
                                                    >
                                                        <Maximize className="w-5 h-5" />
                                                    </button>
                                                </div>
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

                            {/* Premium Ticketing-Style Comments Section */}
                            <div className="mb-6 flex flex-col h-[600px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                {/* Header */}
                                <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
                                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">Discussion</h3>
                                    <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                        {sortedComments.length}
                                    </span>
                                </div>

                                {/* Input Box - Top (Fixed) */}
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 z-10">
                                    {/* Reply Preview Bar */}
                                    {replyingTo && (
                                        <div className="mb-3 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border-l-2 border-indigo-500 flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-0.5 uppercase tracking-wide">
                                                    Replying to {replyingTo.author}
                                                </div>
                                                <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 italic">
                                                    "{replyingTo.text}"
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setReplyingTo(null)}
                                                className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 ml-2"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Attachment Previews */}
                                    {commentAttachments.length > 0 && (
                                        <div className="mb-3 flex flex-wrap gap-2">
                                            {commentAttachments.map((img, idx) => (
                                                <div key={idx} className="relative group">
                                                    <img
                                                        src={img}
                                                        alt={`Preview ${idx}`}
                                                        className="w-12 h-12 rounded md:rounded-lg object-cover shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                                                    />
                                                    <button
                                                        onClick={() => setCommentAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                        className="absolute -top-1.5 -right-1.5 bg-white text-slate-500 hover:text-red-500 rounded-full p-0.5 shadow-md border border-slate-100 opacity-0 group-hover:opacity-100 transition-all transform scale-90 active:scale-95"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-start gap-3">
                                        <Avatar className="w-8 h-8 mt-1 border border-slate-100 dark:border-slate-800 shadow-sm hidden md:block">
                                            <AvatarImage src={employees.find(e => e.id === loggedInEmpId)?.photoUrl} />
                                            <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs font-bold">
                                                {loggedInName?.[0]}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 relative group">
                                            <textarea
                                                value={newComment}
                                                onChange={(e) => {
                                                    setNewComment(e.target.value);
                                                    const target = e.target as HTMLTextAreaElement;
                                                    target.style.height = 'auto';
                                                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                                                }}
                                                placeholder="Add a comment... (Markdown supported)"
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none min-h-[42px] max-h-32 custom-scrollbar placeholder:text-slate-400"
                                                rows={1}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        if (newComment.trim() || commentAttachments.length > 0) {
                                                            handleAddComment();
                                                            const target = e.target as HTMLTextAreaElement;
                                                            target.style.height = 'auto';
                                                        }
                                                    }
                                                }}
                                            />

                                            <div className="absolute right-2 bottom-2 flex items-center gap-1">
                                                <label className="cursor-pointer p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-all">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        className="hidden"
                                                        onChange={handleImageUpload}
                                                    />
                                                    <Paperclip className="w-4 h-4" />
                                                </label>
                                                <Button
                                                    onClick={() => {
                                                        handleAddComment();
                                                        const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                                                        if (textarea) textarea.style.height = 'auto';
                                                    }}
                                                    disabled={!newComment.trim() && commentAttachments.length === 0}
                                                    size="sm"
                                                    className="h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-medium"
                                                >
                                                    Send
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Comments List - Ticketing Style */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
                                    {sortedComments.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 opacity-60">
                                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                                <MessageSquare className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-500">No comments yet</p>
                                        </div>
                                    ) : (
                                        <>
                                            {sortedComments.slice(0, visibleCommentsCount).map((comment: any) => {
                                                const commentAuthor = employees.find(e => e.id === comment.authorId);
                                                const isOwnMessage = comment.authorId === loggedInEmpId || comment.author === loggedInName;
                                                const upvotesCount = comment.upvotes ? Object.keys(comment.upvotes).length : 0;
                                                const isUpvoted = comment.upvotes && comment.upvotes[loggedInEmpId];

                                                return (
                                                    <div key={comment.id} id={`msg-${comment.id}`} className="group px-6 py-4 border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                                                        <div className="flex items-start gap-3">
                                                            <Avatar className="w-8 h-8 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                                                                <AvatarImage src={commentAuthor?.photoUrl} />
                                                                <AvatarFallback className="bg-indigo-50 text-indigo-600 text-[10px] font-bold">
                                                                    {comment.author?.[0]}
                                                                </AvatarFallback>
                                                            </Avatar>

                                                            <div className="flex-1 min-w-0">
                                                                {/* Meta Row */}
                                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                                        {comment.author}
                                                                    </span>
                                                                    <span className="text-xs text-slate-400 font-medium">
                                                                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    {comment.isPinned && (
                                                                        <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-wider">
                                                                            <Pin className="w-2.5 h-2.5 fill-current" /> Pinned
                                                                        </span>
                                                                    )}
                                                                    {isOwnMessage && (
                                                                        <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">You</span>
                                                                    )}
                                                                </div>

                                                                {/* Attached Images - Inline Grid */}
                                                                {comment.attachments && comment.attachments.length > 0 && (
                                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                                        {comment.attachments.map((img: string, idx: number) => (
                                                                            <img
                                                                                key={idx}
                                                                                src={img}
                                                                                alt="Attached"
                                                                                onClick={() => setPreviewImage(img)}
                                                                                className="h-16 w-auto rounded border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition-opacity"
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Reply Context (Compact) */}
                                                                {comment.replyTo && (
                                                                    <div
                                                                        onClick={() => {
                                                                            const originalMsg = document.getElementById(`msg-${comment.replyTo.id}`);
                                                                            if (originalMsg) {
                                                                                originalMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                                originalMsg.classList.add('bg-indigo-50/50');
                                                                                setTimeout(() => originalMsg.classList.remove('bg-indigo-50/50'), 2000);
                                                                            }
                                                                        }}
                                                                        className="mb-1 text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 border-l-2 border-slate-300 pl-2 py-1 cursor-pointer hover:text-indigo-600 truncate"
                                                                    >
                                                                        <Reply className="w-3 h-3 inline mr-1 -mt-0.5" />
                                                                        Replying to <span className="font-semibold">{comment.replyTo.author}</span>: {comment.replyTo.text}
                                                                    </div>
                                                                )}

                                                                {/* Message Body - Clean Text (End of text actions) */}
                                                                <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                                                                    {comment.text}

                                                                    {/* Inline Actions (Float/Inline-Flex at end) */}
                                                                    <span className="inline-flex items-center gap-3 ml-3 align-middle select-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                        <button
                                                                            onClick={() => handleUpvoteComment(comment.id)}
                                                                            className={`flex items-center gap-1 transition-colors ${isUpvoted ? 'text-indigo-600 font-semibold' : 'text-slate-400 hover:text-indigo-600'}`}
                                                                            title="Upvote"
                                                                        >
                                                                            <ThumbsUp className={`w-3.5 h-3.5 ${isUpvoted ? 'fill-current' : ''}`} />
                                                                            {upvotesCount > 0 && <span className="text-[10px]">{upvotesCount}</span>}
                                                                        </button>

                                                                        <button
                                                                            onClick={() => setReplyingTo(comment)}
                                                                            className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                                                            title="Reply"
                                                                        >
                                                                            <Reply className="w-3.5 h-3.5" />
                                                                        </button>

                                                                        {(!isStaff || task.authorId === loggedInEmpId) && (
                                                                            <button
                                                                                onClick={() => handlePinComment(comment.id, comment.isPinned)}
                                                                                className={`transition-colors ${comment.isPinned ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
                                                                                title={comment.isPinned ? "Unpin" : "Pin"}
                                                                            >
                                                                                <Pin className={`w-3.5 h-3.5 ${comment.isPinned ? 'fill-current' : ''}`} />
                                                                            </button>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Pagination Logic */}
                                            {sortedComments.length > visibleCommentsCount && (
                                                <div className="p-2 flex justify-center bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setVisibleCommentsCount(prev => prev + 5)}
                                                        className="text-xs text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 shadow-sm border border-transparent hover:border-slate-200 transition-all px-4"
                                                    >
                                                        Show more comments ({sortedComments.length - visibleCommentsCount} remaining)
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Task Participants & Full Comments */}
                <div className={`${isRightSidebarCollapsed ? 'w-0' : 'w-96'
                    } ${showMobileComments ? 'fixed inset-0 z-50 w-full md:relative md:w-96' : 'hidden md:flex'
                    } transition-all duration-300 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex-col`}>
                    {/* Task Participants Section */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Task Participants</h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden h-8 w-8"
                                onClick={() => setShowMobileComments(false)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {/* Creator */}
                            {author && (
                                <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Creator</p>
                                        <div className="flex items-center gap-1.5">
                                            {author.photoUrl ? (
                                                <img src={author.photoUrl} alt={author.name} className="w-4 h-4 rounded-full" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-bold">
                                                    {author.name.charAt(0)}
                                                </div>
                                            )}
                                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                {author.name}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Approved By (if status changed from Raised) */}
                            {task.status !== 'Raised' && task.approvedBy && (
                                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Approved By</p>
                                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                            Admin
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Current Assignees */}
                            {assignedEmployees.length > 0 && (
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                                            <Users className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                            Assigned ({assignedEmployees.length})
                                        </p>
                                    </div>
                                    <div className="space-y-1.5 pl-10">
                                        {assignedEmployees.map((emp) => (
                                            <div key={emp.id} className="flex items-center gap-1.5">
                                                {emp.photoUrl ? (
                                                    <img src={emp.photoUrl} alt={emp.name} className="w-4 h-4 rounded-full" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[8px] font-bold">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                )}
                                                <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                                                    {emp.name}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reassignment History */}
                            {task.reassignmentHistory && task.reassignmentHistory.length > 0 && (
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                            <ArrowUp className="w-4 h-4 text-purple-600 rotate-45" />
                                        </div>
                                        <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                                            Reassignment History
                                        </p>
                                    </div>
                                    <div className="space-y-1.5 pl-10">
                                        {task.reassignmentHistory.map((history: any, idx: number) => {
                                            const reassignedEmployee = employees.find(e => e.id === history.to);
                                            return (
                                                <div key={idx} className="text-xs text-slate-600 dark:text-slate-400">
                                                    <p className="truncate">→ {reassignedEmployee?.name || 'Unknown'}</p>
                                                    <p className="text-[9px] text-slate-400">
                                                        {new Date(history.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Tester */}
                            {tester && (
                                <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Tester</p>
                                        <div className="flex items-center gap-1.5">
                                            {tester.photoUrl ? (
                                                <img src={tester.photoUrl} alt={tester.name} className="w-4 h-4 rounded-full" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px] font-bold">
                                                    {tester.name.charAt(0)}
                                                </div>
                                            )}
                                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                {tester.name}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Subtask indicator - placeholder for future implementation */}
                            {task.parentTaskId && (
                                <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border-l-4 border-slate-400">
                                    <span className="text-xs text-slate-600 dark:text-slate-400">
                                        📌 Subtask of #{task.parentTaskId.slice(-6)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>



                    {/* Right Sidebar Toggle Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden md:flex fixed top-1/2 z-30 -translate-y-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-l-xl rounded-r-none shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        onClick={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
                        style={{ right: isRightSidebarCollapsed ? '0' : '384px' }}
                    >
                        {isRightSidebarCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* Enhanced Image Preview Modal with Zoom */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
                    onClick={() => {
                        setPreviewImage(null);
                        setImageZoom(1);
                        setImageTransform({ x: 0, y: 0 });
                    }}
                >
                    {/* Close Button */}
                    <button
                        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-sm z-10"
                        onClick={() => {
                            setPreviewImage(null);
                            setImageZoom(1);
                            setImageTransform({ x: 0, y: 0 });
                        }}
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>

                    {/* Zoom Controls */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl z-10">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setImageZoom(prev => Math.max(0.5, prev - 0.25));
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut className="w-5 h-5 text-white" />
                        </button>

                        <div className="px-3 py-1 bg-white/10 rounded-lg min-w-[80px] text-center">
                            <span className="text-sm font-semibold text-white">{Math.round(imageZoom * 100)}%</span>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setImageZoom(prev => Math.min(5, prev + 0.25));
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn className="w-5 h-5 text-white" />
                        </button>

                        <div className="w-px h-6 bg-white/20"></div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setImageZoom(1);
                                setImageTransform({ x: 0, y: 0 });
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Reset Zoom"
                        >
                            <RotateCcw className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Image Container */}
                    <div
                        className="relative w-full h-full flex items-center justify-center overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                        onWheel={(e) => {
                            e.preventDefault();
                            const delta = e.deltaY > 0 ? -0.1 : 0.1;
                            setImageZoom(prev => Math.max(0.5, Math.min(5, prev + delta)));
                        }}
                    >
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="w-screen h-screen object-contain cursor-move select-none"
                            style={{
                                transform: `scale(${imageZoom}) translate(${imageTransform.x}px, ${imageTransform.y}px)`,
                                transition: 'transform 0.1s ease-out'
                            }}
                            draggable={false}
                            onMouseDown={(e) => {
                                if (imageZoom <= 1) return;
                                e.preventDefault();
                                const startX = e.clientX;
                                const startY = e.clientY;
                                const startTransformX = imageTransform.x;
                                const startTransformY = imageTransform.y;

                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                    const deltaX = (moveEvent.clientX - startX) / imageZoom;
                                    const deltaY = (moveEvent.clientY - startY) / imageZoom;
                                    setImageTransform({
                                        x: startTransformX + deltaX,
                                        y: startTransformY + deltaY
                                    });
                                };

                                const handleMouseUp = () => {
                                    document.removeEventListener('mousemove', handleMouseMove);
                                    document.removeEventListener('mouseup', handleMouseUp);
                                };

                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                            }}
                        />
                    </div>

                    {/* Instructions */}
                    <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg">
                        <p className="text-xs text-slate-300">
                            <span className="font-semibold text-white">Scroll</span> to zoom •
                            <span className="font-semibold text-white"> Drag</span> to pan
                        </p>
                    </div>
                </div>
            )}

            {/* Edit/Approve Task Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle>{task?.status === 'Raised' ? 'Approve & Edit Task' : 'Edit Task'}</DialogTitle>
                        <DialogDescription>Make changes to the task details below.</DialogDescription>
                    </DialogHeader>

                    {editTaskData && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input
                                        value={editTaskData.title}
                                        onChange={(e) => setEditTaskData({ ...editTaskData, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Priority</Label>
                                    <Select
                                        value={editTaskData.priority}
                                        onValueChange={(val) => setEditTaskData({ ...editTaskData, priority: val })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Low">Low</SelectItem>
                                            <SelectItem value="Normal">Normal</SelectItem>
                                            <SelectItem value="High">High</SelectItem>
                                            <SelectItem value="Crucial">Crucial</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:border-slate-700"
                                    value={editTaskData.description}
                                    onChange={(e) => setEditTaskData({ ...editTaskData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Due Date</Label>
                                    <Input
                                        type="date"
                                        value={editTaskData.dueDate ? new Date(editTaskData.dueDate).toISOString().split('T')[0] : ''}
                                        onChange={(e) => setEditTaskData({ ...editTaskData, dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Effort (Days)</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 2"
                                        value={editTaskData.effortDays || ''}
                                        onChange={(e) => setEditTaskData({ ...editTaskData, effortDays: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={editTaskData.status}
                                    onValueChange={(val) => setEditTaskData({ ...editTaskData, status: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Raised">Raised</SelectItem>
                                        <SelectItem value="Open">Open</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Testing">Testing</SelectItem>
                                        <SelectItem value="Completed">Completed</SelectItem>
                                        <SelectItem value="On Hold">On Hold</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Assigned Employees</Label>
                                <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1 dark:border-slate-700 custom-scrollbar">
                                    {employees.filter(emp => emp.role !== 'Ride' && emp.department !== 'Logistics').map(emp => (
                                        <div key={emp.id} className="flex items-center space-x-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                                            <input
                                                type="checkbox"
                                                id={`assign-${emp.id}`}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={(editTaskData.assignedEmployeeIds || []).includes(emp.id)}
                                                onChange={(e) => {
                                                    const current = editTaskData.assignedEmployeeIds || [];
                                                    if (e.target.checked) {
                                                        setEditTaskData({ ...editTaskData, assignedEmployeeIds: [...current, emp.id] });
                                                    } else {
                                                        setEditTaskData({ ...editTaskData, assignedEmployeeIds: current.filter((id: string) => id !== emp.id) });
                                                    }
                                                }}
                                            />
                                            <label htmlFor={`assign-${emp.id}`} className="text-sm cursor-pointer select-none flex-1">
                                                {emp.firstName} {emp.lastName}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateTask}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reassign Dialog */}
            <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle>Reassign Task</DialogTitle>
                        <DialogDescription>
                            Select a new employee to assign this task to. They will receive an email notification.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Label className="mb-2 block">Select Employee</Label>
                        <Select value={selectedReassignEmployee} onValueChange={setSelectedReassignEmployee}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose an employee..." />
                            </SelectTrigger>
                            <SelectContent>
                                <div className="max-h-60 overflow-y-auto">
                                    {employees
                                        .filter(emp => emp.role?.toLowerCase() === 'staff')
                                        .map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                <div className="flex items-center gap-2">
                                                    {emp.photoUrl ? (
                                                        <img src={emp.photoUrl} alt={emp.name} className="w-5 h-5 rounded-full" />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[8px] font-bold">
                                                            {emp.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <span>{emp.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                </div>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setIsReassignOpen(false);
                            setSelectedReassignEmployee("");
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleReassign} disabled={!selectedReassignEmployee}>
                            Reassign Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Share Dialog */}
            <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-blue-600" />
                            Share Task
                        </DialogTitle>
                        <DialogDescription>
                            Share this task with team members or copy the link
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {/* Task Preview */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-1 truncate">
                                        {task.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {task.status} • {task.priority} Priority
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Share Link */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Share Link</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={`${window.location.origin}/tasks/${taskId}`}
                                    readOnly
                                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-xs font-mono"
                                />
                                <Button
                                    size="sm"
                                    onClick={handleCopyLink}
                                    className="shrink-0 bg-indigo-600 hover:bg-indigo-700"
                                >
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copy
                                </Button>
                            </div>
                        </div>

                        {/* Share Options */}
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                onClick={handleShareTask}
                                className="w-full justify-start"
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const subject = encodeURIComponent(`Task: ${task.title}`);
                                    const body = encodeURIComponent(`Check out this task: ${window.location.origin}/tasks/${taskId}`);
                                    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                                }}
                                className="w-full justify-start"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Email
                            </Button>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsShareOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="w-5 h-5" />
                            Delete Task
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 dark:text-slate-400">
                            Are you sure you want to delete this task? This action cannot be undone and will permanently remove the task and all its data.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteOpen(false)}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TaskDetail;
