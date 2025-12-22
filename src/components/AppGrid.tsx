import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Crown,
  Star,
  Package,
  ShoppingBag,
  Truck,
  LayoutDashboard,
  ClipboardList,
  Keyboard,
  Building2,
  TrendingUp,
  Sparkles,
  Plus,
  Edit,
  Trash,
  Settings,
  Users,
  Grid3X3,
  Bell,
} from "lucide-react";
import AppIcon from "./AppIcon";
import { AddAppModal } from "./AddAppModal";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { iconMap } from "@/utils/appIcons";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const initialApps = [
  { icon: TrendingUp, label: "Dashboard", colorClass: "app-icon-rose", path: "/dashboard" },
  { icon: Users, label: "Employee Management", colorClass: "app-icon-indigo", path: "/employee-management" },
  { icon: LayoutDashboard, label: "Overview", colorClass: "app-icon-cyan", path: "/overview" },
  { icon: Sparkles, label: "AI Chat", colorClass: "app-icon-blue", path: "/chat" },
  { icon: ClipboardList, label: "Order Management", colorClass: "app-icon-pink", path: "/orders" },
  { icon: Truck, label: "Delivery Screen", colorClass: "app-icon-green", path: "/delivery" },
  { icon: Package, label: "Stock Entry", colorClass: "app-icon-blue", path: "/stock-entry" },
  { icon: ShoppingBag, label: "Product Entry", colorClass: "app-icon-purple", path: "/product-entry" },
  { icon: Building2, label: "Back Office", colorClass: "app-icon-teal", path: "/back-office" },
  { icon: Crown, label: "Premium Entry", colorClass: "app-icon-yellow", path: "/premium-entry" },
  { icon: Star, label: "Rating Entry", colorClass: "app-icon-orange", path: "/rating-entry" },
  { icon: Keyboard, label: "Keyword Entry", colorClass: "app-icon-indigo", path: "/keyword-entry" },
  { icon: Grid3X3, label: "Task Manager", colorClass: "app-icon-violet", path: "/tasks" },
  { icon: Bell, label: "Notification", colorClass: "app-icon-red", path: "/notifications" },
  { icon: Users, label: "Staffes", colorClass: "app-icon-cyan", path: "/staffes" },
];

const AppGrid = () => {
  const [customApps, setCustomApps] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAppToEdit, setCurrentAppToEdit] = useState<any>(null);
  const [isManaging, setIsManaging] = useState(false);
  const [appToDelete, setAppToDelete] = useState<string | null>(null);

  // RBAC State
  const [userRole, setUserRole] = useState<string | null>(null);
  const [allowedApps, setAllowedApps] = useState<string[]>([]);

  useEffect(() => {
    // Check RBAC
    const role = localStorage.getItem("user_role");
    const allowed = JSON.parse(localStorage.getItem("allowed_apps") || "[]");
    setUserRole(role);
    setAllowedApps(allowed);

    const db = firebase.database();
    const appsRef = db.ref("root/apps");

    const onValueChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const loadedApps = Object.values(data);
        setCustomApps(loadedApps);
      } else {
        setCustomApps([]);
      }
    };

    appsRef.on("value", onValueChange);
    return () => {
      appsRef.off("value", onValueChange);
    };
  }, []);

  const handleDelete = async (appId: string) => {
    try {
      await firebase.database().ref(`root/apps/${appId}`).remove();
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  // Helper to check if an app should be visible
  const isAppVisible = (path: string) => {
    if (userRole === "admin") return true;
    if (userRole === "staff") return allowedApps.includes(path);
    return false; // For guests or undefined roles, hide all? 
    // Actually, maybe keep some defaults? For now, following user's rule: "only that apps should appear"
  };

  const filteredInitialApps = initialApps.filter(app => isAppVisible(app.path));
  const filteredCustomApps = customApps.filter(app => {
    const path = app.path || "/";
    return isAppVisible(path);
  });

  return (
    <div className="flex justify-center flex-col items-center relative">
      {/* Admin Action Buttons */}
      {userRole === "admin" && (
        <div className="absolute top-[-4rem] right-2 sm:right-4 flex gap-3">
          <Link
            to="/staffes"
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm border bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-md"
          >
            <Users size={16} />
            Manage Staffs
          </Link>

          <button
            onClick={() => setIsManaging(!isManaging)}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm border ${isManaging
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-lg scale-105'
              : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-md'
              }`}
          >
            <Settings size={16} className={isManaging ? "animate-spin-slow" : ""} />
            {isManaging ? 'Done Editing' : 'Manage Apps'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 sm:gap-8 md:gap-10">
        {filteredInitialApps.map((app, index) => (
          <div key={app.label} className={isManaging ? "opacity-50 pointer-events-none grayscale" : ""}>
            <Link
              to={app.path}
              target={app.path === '/delivery' ? "_blank" : undefined}
              rel={app.path === '/delivery' ? "noopener noreferrer" : undefined}
            >
              <AppIcon
                icon={app.icon}
                label={app.label}
                colorClass={app.colorClass}
                delay={150 + index * 50}
              />
            </Link>
          </div>
        ))}

        {filteredCustomApps.map((app, index) => {
          const Icon = iconMap[app.icon] || Package;
          const colorClass = app.colorGradient || app.colorClass || "bg-blue-500";
          const path = app.path || "/";

          return (
            <div className="relative group/item" key={app.id}>
              <Link to={isManaging ? "#" : path} onClick={(e) => isManaging && e.preventDefault()} className={isManaging ? "cursor-default" : ""}>
                <AppIcon
                  icon={Icon}
                  label={app.name}
                  colorClass={colorClass}
                  delay={150 + (initialApps.length + index) * 50}
                />
              </Link>

              {/* Edit/Delete Overlay */}
              {isManaging && userRole === "admin" && (
                <div className="absolute -top-2 -right-2 flex gap-1 z-20 animate-in zoom-in-50 duration-200">
                  <button
                    onClick={() => {
                      setCurrentAppToEdit(app);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-md text-blue-500 hover:bg-blue-50 border border-slate-200 dark:border-slate-700"
                    title="Edit App"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => setAppToDelete(app.id)}
                    className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-md text-red-500 hover:bg-red-50 border border-slate-200 dark:border-slate-700"
                    title="Delete App"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add App Button - Only for Admin */}
        {userRole === "admin" && (
          <button
            onClick={() => {
              setCurrentAppToEdit(null);
              setIsModalOpen(true);
            }}
            className={`group flex flex-col items-center gap-3 cursor-pointer opacity-0 animate-fade-in ${isManaging ? 'opacity-50' : ''}`}
            style={{ animationDelay: `${initialApps.length * 50 + 150}ms` }}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-400 dark:group-hover:border-blue-500 group-hover:scale-110 group-active:scale-95 transition-all duration-300 shadow-sm hover:shadow-md">
              <Plus className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-medium text-foreground/60 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-center leading-tight">
              Add App
            </span>
          </button>
        )}
      </div>

      <AddAppModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setCurrentAppToEdit(null);
        }}
        initialData={currentAppToEdit}
      />

      <AlertDialog open={!!appToDelete} onOpenChange={(open) => !open && setAppToDelete(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your custom app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (appToDelete) handleDelete(appToDelete);
                setAppToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
export default AppGrid;
