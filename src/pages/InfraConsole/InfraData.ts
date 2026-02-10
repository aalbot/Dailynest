import { OrphanedFile } from "./services/MaintenanceService";
import { CONFIG } from "@/config";

export interface InfraState {
    loading: boolean;
    isBackingUp: "db" | "storage" | null;
    isRestoring: "db" | "storage" | null;
    isScanning: boolean;
    isCleaning: boolean;
    isMigrating: boolean;
    activeTab: "status" | "backup" | "restore" | "cleanup" | "logs" | "migration" | "firebase" | "branding";
    lastBackup: any | null;
    migrations: any[];
    orphans: OrphanedFile[];
    selectedOrphans: string[];
    progress: number; // 0 to 100
    statusMessage: string;
    systemSettings: {
        version: string;
        lastSystemCheck: string;
        maintenanceMode: boolean;
    } | null;
    stats: {
        dbSize: string;
        nodeCount: number;
        storageCount: number;
    };
    confirmCode: string;
    backupTargets: BackupTarget[];
    dbNodes: DatabaseNode[];
    firebaseConfig: typeof CONFIG.FIREBASE;
    brandingConfig: typeof CONFIG.BRANDING;
    liveMetrics: {
        cpu: number;
        memory: number;
        network: { inbound: number; outbound: number; latency: number };
        db: { activeConnections: number; transactionsPerSecond: number; storageUsage: number };
    };
    appUsage: {
        id: string;
        name: string;
        usage: number; // MB
        percentage: number;
        trend: 'up' | 'down' | 'stable';
        activeUsers: number;
    }[];
}

export interface BackupTarget {
    id: string;
    label: string;
    type: "storage-folder" | "db-base64";
    path: string;
    selected: boolean;
}

export interface DatabaseNode {
    id: string;
    label: string;
    path: string;
    group: string;
    selected: boolean;
}

export const createInitialState = (): InfraState => ({
    loading: false,
    isBackingUp: null,
    isRestoring: null,
    isScanning: false,
    isCleaning: false,
    isMigrating: false,
    activeTab: "status",
    lastBackup: null,
    migrations: [],
    orphans: [],
    selectedOrphans: [],
    progress: 0,
    statusMessage: "",
    systemSettings: null,
    stats: {
        dbSize: "Analyzing...",
        nodeCount: 0,
        storageCount: 0
    },
    confirmCode: "",
    backupTargets: [
        { id: "products", label: "Products", type: "storage-folder", path: "root/products", selected: true },
        { id: "categories", label: "Categories", type: "storage-folder", path: "root/categories", selected: true },
        { id: "staff", label: "Staff Documents", type: "storage-folder", path: "root/staff", selected: true },
        { id: "emp_photos", label: "Employee Photos", type: "db-base64", path: "root/nexus_hr/employees", selected: true },
        { id: "task_attach", label: "Task Attachments", type: "db-base64", path: "root/nexus_hr/tasks", selected: true }
    ],
    dbNodes: [
        { id: "products", label: "Products", path: "products", group: "Inventory", selected: false },
        { id: "categories", label: "Categories", path: "categories", group: "Inventory", selected: false },
        { id: "employees", label: "Employees", path: "nexus_hr/employees", group: "HR", selected: false },
        { id: "attendance", label: "Attendance", path: "nexus_hr/attendance", group: "HR", selected: false },
        { id: "payroll", label: "Payroll", path: "nexus_hr/payroll", group: "HR", selected: false },
        { id: "tasks", label: "Tasks", path: "nexus_hr/tasks", group: "Operations", selected: false },
        { id: "roles", label: "Roles & Perms", path: "nexus_hr/roles", group: "Admin", selected: false },
        { id: "settings", label: "System Config", path: "infra/settings", group: "Admin", selected: false }
    ],
    firebaseConfig: { ...CONFIG.FIREBASE },
    brandingConfig: { ...CONFIG.BRANDING },
    liveMetrics: {
        cpu: 0,
        memory: 0,
        network: { inbound: 0, outbound: 0, latency: 0 },
        db: { activeConnections: 0, transactionsPerSecond: 0, storageUsage: 0 }
    },
    appUsage: []
});

export type InfraEvent =
    | { type: "SET_TAB"; tab: InfraState["activeTab"] }
    | { type: "START_BACKUP"; full?: boolean }
    | { type: "BACKUP_COMPLETE"; bundle: any }
    | { type: "SET_CONFIRM"; value: string }
    | { type: "REFRESH_STATS" }
    | { type: "REFRESH_MIGRATIONS" }
    | { type: "REFRESH_SETTINGS" }
    | { type: "SCAN_ORPHANS" }
    | { type: "CLEAN_ORPHANS" }
    | { type: "TOGGLE_ORPHAN_SELECTION"; path: string }
    | { type: "SELECT_ALL_ORPHANS"; selected: boolean }
    | { type: "CLEAN_SELECTED_ORPHANS" }
    | { type: "RUN_MIGRATION"; version: string }
    | { type: "SET_PROGRESS"; value: number }
    | { type: "START_STORAGE_BACKUP" }
    | { type: "TOGGLE_BACKUP_TARGET"; id: string }
    | { type: "TOGGLE_DB_NODE"; id: string }
    | { type: "DOWNLOAD_DB_NODE"; id: string }
    | { type: "DOWNLOAD_STORAGE_TARGET"; id: string }
    | { type: "START_RESTORE"; file: File; restoreType: "db" | "storage" }
    | { type: "UPDATE_FIREBASE_CONFIG"; key: string; value: string }
    | { type: "SAVE_FIREBASE_CONFIG" }
    | { type: "UPDATE_BRANDING_CONFIG"; key: string; value: string }
    | { type: "SAVE_BRANDING_CONFIG" }
    | { type: "REFRESH_SYSTEM_HEALTH" };
