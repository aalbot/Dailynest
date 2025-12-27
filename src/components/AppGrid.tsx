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
  { icon: LayoutDashboard, label: "Report", colorClass: "app-icon-cyan", path: "/overview" },
  { icon: Sparkles, label: "AI Chat", colorClass: "app-icon-blue", path: "/chat" },
  { icon: ClipboardList, label: "Orders", colorClass: "app-icon-pink", path: "/orders" },
  { icon: Truck, label: "Delivery", colorClass: "app-icon-green", path: "/delivery" },
  { icon: Package, label: "Stocks", colorClass: "app-icon-blue", path: "/stock-entry" },
  { icon: ShoppingBag, label: "Products", colorClass: "app-icon-purple", path: "/product-entry" },
  { icon: Building2, label: "Purchase", colorClass: "app-icon-teal", path: "/back-office" },
  { icon: Crown, label: "Wallet", colorClass: "app-icon-yellow", path: "/premium-entry" },
  { icon: Star, label: "Promotions", colorClass: "app-icon-orange", path: "/rating-entry" },
  { icon: Keyboard, label: "SEO", colorClass: "app-icon-indigo", path: "/keyword-entry" },
  { icon: Grid3X3, label: "Task Manager", colorClass: "app-icon-violet", path: "/tasks" },
  { icon: Bell, label: "Notification", colorClass: "app-icon-red", path: "/notifications" },
  { icon: Users, label: "Staff", colorClass: "app-icon-cyan", path: "/staffes" },
];

const AppGrid = ({ isManaging = false, searchQuery = "" }: { isManaging?: boolean; searchQuery?: string }) => {
  const [customApps, setCustomApps] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAppToEdit, setCurrentAppToEdit] = useState<any>(null);
  const [appToDelete, setAppToDelete] = useState<string | null>(null);

  // RBAC State
  const [userRole, setUserRole] = useState<string | null>(null);
  const [allowedApps, setAllowedApps] = useState<string[]>([]);

  useEffect(() => {
    // Check RBAC
    const role = sessionStorage.getItem("user_role");
    const allowed = JSON.parse(sessionStorage.getItem("allowed_apps") || "[]");
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
    if (userRole === "delivery") return path === "/delivery";
    return false;
  };

  const filteredInitialApps = initialApps.filter(app =>
    isAppVisible(app.path) && app.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredCustomApps = customApps.filter(app => {
    const path = app.path || "/";
    return isAppVisible(path) && app.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col items-center relative h-full w-full">
      {/* Admin Action Buttons */}


      <div className="flex flex-col h-full w-full rounded-[2.5rem] bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-2xl transition-all duration-500 hover:shadow-3xl hover:bg-white/80 dark:hover:bg-slate-900/50 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8 justify-items-center">
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
                className={`group flex flex-col items-center gap-2 cursor-pointer opacity-0 animate-fade-in ${isManaging ? 'opacity-50' : ''}`}
                style={{ animationDelay: `${initialApps.length * 50 + 150}ms` }}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.75rem] bg-slate-100/50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-400 dark:group-hover:border-blue-500 group-hover:scale-110 group-active:scale-95 transition-all duration-300 shadow-sm hover:shadow-md backdrop-blur-sm">
                  <Plus className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium text-foreground/60 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-center leading-tight">
                  Add App
                </span>
              </button>
            )}
          </div>
        </div>
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
