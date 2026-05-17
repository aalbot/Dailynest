import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, Plus, Edit, Trash } from "lucide-react";
import AppIcon from "./AppIcon";
import { AddAppModal } from "./AddAppModal";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { iconMap } from "@/utils/appIcons";
import { useLang } from "@/contexts/LanguageContext";
import { normalizeDestinationUrl, isCustomAppExternalDestination } from "@/utils/destinationUrl";
import { GALLERY_APPS } from "@/config/apps";

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

const AppGrid = ({ isManaging = false, searchQuery = "" }: { isManaging?: boolean; searchQuery?: string }) => {
  const [customApps, setCustomApps] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAppToEdit, setCurrentAppToEdit] = useState<any>(null);
  const [appToDelete, setAppToDelete] = useState<string | null>(null);
  const { getTranslation } = useLang();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [allowedApps, setAllowedApps] = useState<string[]>([]);
  const [systemOverrides, setSystemOverrides] = useState<Record<string, any>>({});

  useEffect(() => {
    const role = sessionStorage.getItem("user_role");
    const allowed = JSON.parse(sessionStorage.getItem("allowed_apps") || "[]");
    setUserRole(role);
    setAllowedApps(allowed);

    const db = firebase.database();
    const appsRef = db.ref("root/apps");

    const onValueChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const loadedApps = Object.values(data).filter(
          (app: any) => app && typeof app === "object" && app.id && app.name
        );
        setCustomApps(loadedApps);
      } else {
        setCustomApps([]);
      }
    };

    appsRef.on("value", onValueChange);

    const overridesRef = db.ref("root/system_apps");
    const onOverridesChange = (snap: any) => setSystemOverrides(snap.val() || {});
    overridesRef.on("value", onOverridesChange);

    return () => {
      appsRef.off("value", onValueChange);
      overridesRef.off("value", onOverridesChange);
    };
  }, []);

  const handleDelete = async (appId: string) => {
    try {
      await firebase.database().ref(`root/apps/${appId}`).remove();
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const isAppVisible = (path: string, superadminOnly = false) => {
    if (superadminOnly && userRole !== "superadmin") return false;

    const override = systemOverrides[path.replace(/\//g, "_")];
    if (override?.isHidden) return false;

    if (userRole === "superadmin") return true;
    if (userRole === "admin") return path !== "/infra";
    if (userRole === "staff") return allowedApps.includes(path) && path !== "/infra";
    return false;
  };

  const filteredGalleryApps = GALLERY_APPS.filter((app) => {
    const override = systemOverrides[app.path.replace(/\//g, "_")];
    const finalLabel = override?.name || app.label;
    return (
      isAppVisible(app.path, app.superadminOnly) &&
      finalLabel.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredCustomApps = customApps.filter((app) => {
    const path = app.path || "/";
    return isAppVisible(path) && app.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col items-center relative h-full w-full">
      <div className="flex flex-col h-full w-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-2 sm:p-5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-12 justify-items-center">
            {filteredGalleryApps.map((app, index) => {
              const override = systemOverrides[app.path.replace(/\//g, "_")];
              const Icon =
                override?.icon && iconMap[override.icon] ? iconMap[override.icon] : app.icon;
              const finalLabel = override?.name || app.label;
              const finalColor = override?.color || app.colorClass;

              return (
                <div
                  key={app.id}
                  className={isManaging ? "opacity-50 pointer-events-none grayscale" : ""}
                >
                  <Link to={app.path}>
                    <AppIcon
                      icon={Icon}
                      label={getTranslation(app.key, {}, finalLabel)}
                      colorClass={finalColor}
                      delay={150 + index * 50}
                    />
                  </Link>
                </div>
              );
            })}

            {filteredCustomApps.map((app, index) => {
              const Icon = iconMap[app.icon] || Package;
              const colorClass = app.colorGradient || app.colorClass || "bg-blue-500";
              const path = app.path || "/";
              const openDestination = isCustomAppExternalDestination(path, app.type);
              const destinationHref = openDestination ? normalizeDestinationUrl(path) : path;
              const openNewTab = !isManaging && (openDestination || !!app.openInNewTab);

              const iconEl = (
                <AppIcon
                  icon={Icon}
                  label={app.name}
                  colorClass={colorClass}
                  delay={150 + (GALLERY_APPS.length + index) * 50}
                />
              );

              return (
                <div className="relative group/item" key={app.id}>
                  {isManaging ? (
                    <div className="cursor-default">{iconEl}</div>
                  ) : openDestination ? (
                    <a href={destinationHref} target="_blank" rel="noopener noreferrer">
                      {iconEl}
                    </a>
                  ) : (
                    <Link
                      to={path}
                      target={openNewTab ? "_blank" : undefined}
                      rel={openNewTab ? "noopener noreferrer" : undefined}
                    >
                      {iconEl}
                    </Link>
                  )}

                  {isManaging && (userRole === "admin" || userRole === "superadmin") && (
                    <div className="absolute -top-2 -right-2 flex gap-1 z-20 animate-in zoom-in-50 duration-200">
                      <button
                        onClick={() => {
                          setCurrentAppToEdit(app);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-md text-blue-500 hover:bg-blue-50 border border-slate-200 dark:border-slate-700"
                        title={getTranslation("manageApps.editTooltip")}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setAppToDelete(app.id)}
                        className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-md text-red-500 hover:bg-red-50 border border-slate-200 dark:border-slate-700"
                        title={getTranslation("manageApps.deleteTooltip")}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {(userRole === "admin" || userRole === "superadmin") && (
              <button
                onClick={() => {
                  setCurrentAppToEdit(null);
                  setIsModalOpen(true);
                }}
                className={`group flex flex-col items-center gap-2 cursor-pointer opacity-0 animate-fade-in ${isManaging ? "opacity-50" : ""}`}
                style={{ animationDelay: `${GALLERY_APPS.length * 50 + 150}ms` }}
              >
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-[1.5rem] bg-slate-100/50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-400 dark:group-hover:border-blue-500 group-hover:scale-110 group-active:scale-95 transition-all duration-300 shadow-sm hover:shadow-md backdrop-blur-sm">
                  <Plus className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium text-foreground/60 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-center leading-tight">
                  {getTranslation("manageApps.addApp")}
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
            <AlertDialogTitle>{getTranslation("manageApps.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {getTranslation("manageApps.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800">
              {getTranslation("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (appToDelete) handleDelete(appToDelete);
                setAppToDelete(null);
              }}
            >
              {getTranslation("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
export default AppGrid;
