import { Grid3X3, Settings, Users, Sparkles, type LucideIcon } from "lucide-react";

export const CORE_APP_PATHS = [
    "/employee-management",
    "/tasks",
    "/staffes",
    "/infra",
] as const;

export type CoreAppPath = (typeof CORE_APP_PATHS)[number];

export interface GalleryAppDefinition {
    id: string;
    path: string;
    label: string;
    key: string;
    defaultIcon: string;
    defaultColor: string;
    colorClass: string;
    icon: LucideIcon;
    /** When true, only visible to superadmin on the app gallery. */
    superadminOnly?: boolean;
}

export type CoreAppDefinition = GalleryAppDefinition & { path: CoreAppPath };

export const CORE_APPS: CoreAppDefinition[] = [
    {
        id: "_employee-management",
        path: "/employee-management",
        label: "Employee Management",
        key: "apps.employeeManagement",
        defaultIcon: "Users",
        defaultColor: "bg-indigo-600",
        colorClass: "app-icon-indigo",
        icon: Users,
    },
    {
        id: "_tasks",
        path: "/tasks",
        label: "Task Manager",
        key: "apps.taskManager",
        defaultIcon: "Grid3X3",
        defaultColor: "bg-violet-600",
        colorClass: "app-icon-violet",
        icon: Grid3X3,
    },
    {
        id: "_staffes",
        path: "/staffes",
        label: "Onboard",
        key: "apps.staff",
        defaultIcon: "Users",
        defaultColor: "bg-cyan-600",
        colorClass: "app-icon-cyan",
        icon: Users,
    },
    {
        id: "_infra",
        path: "/infra",
        label: "Infra",
        key: "apps.infra",
        defaultIcon: "Settings",
        defaultColor: "bg-slate-800",
        colorClass: "app-icon-red",
        icon: Settings,
    },
];

/** All tiles shown on /apps (core apps + Generate App for superadmin). */
export const GALLERY_APPS: GalleryAppDefinition[] = [
    ...CORE_APPS,
    {
        id: "_generate-app",
        path: "/generate-app",
        label: "Generate App",
        key: "apps.generateApp",
        defaultIcon: "Sparkles",
        defaultColor: "bg-violet-500",
        colorClass: "app-icon-violet",
        icon: Sparkles,
        superadminOnly: true,
    },
];

/** Apps assignable to staff in Onboard (excludes Infra). */
export const STAFF_ASSIGNABLE_APPS = CORE_APPS.filter((app) => app.path !== "/infra");
