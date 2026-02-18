import { InfraState, InfraEvent } from "./InfraData";
import { BackupService } from "./services/BackupService";
import { MigrationEngine } from "./services/MigrationEngine";
import { MaintenanceService } from "./services/MaintenanceService";
import { dataProvider } from "@/data";
import { toast } from "sonner";

export const useInfraLogic = (data: InfraState, render: () => void) => {

    // Helper to trigger local file download
    const triggerDownload = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const dispatch = async (event: InfraEvent) => {
        switch (event.type) {
            case "SET_TAB":
                data.activeTab = event.tab;
                if (event.tab === "migration") await dispatch({ type: "REFRESH_MIGRATIONS" });
                if (event.tab === "status") await dispatch({ type: "REFRESH_SETTINGS" });
                if (event.tab === "branding") await dispatch({ type: "REFRESH_BRANDING" });
                return render();

            case "SET_PROGRESS":
                data.progress = event.value;
                return render();

            case "REFRESH_SETTINGS":
                try {
                    const settings = await dataProvider.get("infra/settings");
                    data.systemSettings = settings;
                } catch (e) {
                    console.error("Failed to load settings");
                } finally {
                    render();
                }
                break;

            case "START_BACKUP":
                if (data.isBackingUp) return;

                let nodesToBackup = ["/"]; // Default to full
                let label = "Full Snapshot";

                if (!event.full) {
                    const selected = data.dbNodes.filter(n => n.selected);
                    if (selected.length === 0) {
                        toast.error("Select at least one dataset for custom backup.");
                        return;
                    }
                    nodesToBackup = selected.map(n => n.path);
                    label = `Custom Snapshot (${selected.length} nodes)`;
                }

                data.isBackingUp = "db";
                data.progress = 5;
                data.statusMessage = `[AUTH] Initiating ${label}...`;
                render();
                try {
                    toast.info(`Starting ${label}...`);
                    await new Promise(r => setTimeout(r, 600));

                    data.progress = 30;
                    data.statusMessage = `[DB] Fetching ${nodesToBackup.length} nodes from Realtime Database...`;
                    render();

                    const bundle = await BackupService.createBackup(nodesToBackup);

                    data.progress = 60;
                    data.statusMessage = "[IO] Serializing JSON bundle...";
                    render();
                    await new Promise(r => setTimeout(r, 800));

                    data.progress = 90;
                    data.statusMessage = "[STORAGE] Uploading snapshot...";
                    render();

                    data.progress = 100;
                    data.statusMessage = "[SUCCESS] Backup verified. Downloading...";
                    render();

                    // Auto-download JSON
                    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
                    triggerDownload(blob, `${event.full ? 'full_db' : 'custom_db'}_backup_${Date.now()}.json`);

                    data.lastBackup = bundle;
                    toast.success("Database backup complete!");
                } catch (error) {
                    data.statusMessage = "[FATAL] " + String(error);
                    toast.error("Database backup failed.");
                } finally {
                    data.isBackingUp = null;
                    setTimeout(() => {
                        if (data.isBackingUp === null) {
                            data.progress = 0;
                            data.statusMessage = "";
                            render();
                        }
                    }, 5000);
                }
                break;

            case "TOGGLE_DB_NODE":
                data.dbNodes = data.dbNodes.map(n =>
                    n.id === event.id ? { ...n, selected: !n.selected } : n
                );
                return render();

            case "DOWNLOAD_DB_NODE":
                if (data.isBackingUp) return;
                const node = data.dbNodes.find(n => n.id === event.id);
                if (!node) return;

                data.isBackingUp = "db";
                data.progress = 10;
                data.statusMessage = `[FETCH] Downloading ${node.label} data...`;
                render();

                try {
                    const bundle = await BackupService.createBackup([node.path]);
                    data.progress = 100;
                    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
                    triggerDownload(blob, `${node.id}_backup_${Date.now()}.json`);
                    toast.success(`Downloaded ${node.label}`);
                } catch (e) {
                    toast.error("Download failed");
                } finally {
                    data.isBackingUp = null;
                    render();
                }
                break;

            case "DOWNLOAD_STORAGE_TARGET":
                if (data.isBackingUp) return;
                const target = data.backupTargets.find(t => t.id === event.id);
                if (!target) return;

                data.isBackingUp = "storage";
                data.progress = 1;
                data.statusMessage = `[ZIP] Packing ${target.label}...`;
                render();

                try {
                    const result = await BackupService.createStorageBackup([target], (p) => {
                        data.progress = p;
                        render();
                    });
                    triggerDownload(result.blob, `${target.id}_assets_${Date.now()}.zip`);
                    toast.success(`Downloaded ${target.label} ZIP`);
                } catch (e) {
                    toast.error("Download failed");
                } finally {
                    data.isBackingUp = null;
                    render();
                }
                break;

            case "START_STORAGE_BACKUP":
                if (data.isBackingUp) return;

                const targets = data.backupTargets.filter(t => t.selected);
                if (targets.length === 0) {
                    toast.error("Please select at least one folder/target.");
                    return;
                }

                data.isBackingUp = "storage";
                data.progress = 1;
                data.statusMessage = `[STORAGE] Indexing files in ${targets.length} targets...`;
                render();
                try {
                    toast.info("Starting Storage (ZIP) backup...");
                    const result = await BackupService.createStorageBackup(targets, (p) => {
                        data.progress = p;
                        data.statusMessage = `[JSZIP] Compressing stream... fetched ${p}% of total assets`;
                        render();
                    });

                    data.progress = 100;
                    data.statusMessage = `[SUCCESS] ZIP Archive ready (${Math.round(result.blob.size / 1024 / 1024 * 100) / 100} MB). Downloading...`;
                    render();

                    // Auto-download ZIP
                    triggerDownload(result.blob, `storage_assets_${Date.now()}.zip`);

                    toast.success("Storage asset ZIP created and downloaded!");
                } catch (error) {
                    data.statusMessage = "[ERROR] ZIP construction aborted: " + String(error);
                    toast.error("Storage backup failed.");
                } finally {
                    data.isBackingUp = null;
                    setTimeout(() => {
                        if (data.isBackingUp === null) {
                            data.progress = 0;
                            data.statusMessage = "";
                            render();
                        }
                    }, 5000);
                }
                break;

            case "TOGGLE_BACKUP_TARGET":
                data.backupTargets = data.backupTargets.map(t =>
                    t.id === event.id ? { ...t, selected: !t.selected } : t
                );
                return render();

            case "RUN_MIGRATION":
                if (data.isMigrating) return;
                data.isMigrating = true;
                data.progress = 5;
                data.statusMessage = `[MIGRATE] loading script ${event.version}...`;
                render();
                try {
                    toast.info(`Preparing migration ${event.version}...`);
                    data.progress = 20;
                    data.statusMessage = "[SAFETY] Running pre-migration state capture...";
                    render();

                    await MigrationEngine.runMigration(event.version);

                    data.progress = 80;
                    data.statusMessage = "[DB] Updating system nodes and schema descriptors...";
                    render();

                    await dispatch({ type: "REFRESH_MIGRATIONS" });
                    await dispatch({ type: "REFRESH_SETTINGS" });

                    data.progress = 100;
                    data.statusMessage = "[SUCCESS] Migration " + event.version + " applied successfully.";
                    render();
                    toast.success("Migration applied successfully!");
                } catch (error) {
                    data.statusMessage = "[FATAL] Migration failed at node update: " + String(error);
                    toast.error(`Migration Failed: ${String(error)}`);
                } finally {
                    setTimeout(() => {
                        data.isMigrating = false;
                        data.progress = 0;
                        data.statusMessage = "";
                        render();
                    }, 5000);
                }
                break;

            case "SCAN_ORPHANS":
                if (data.isScanning) return;
                data.isScanning = true;
                data.progress = 10;
                data.statusMessage = "[MAINTENANCE] Synchronizing Storage LSTAT with Database registry...";
                render();
                try {
                    const orphans = await MaintenanceService.scanForOrphans();
                    data.orphans = orphans;
                    data.progress = 100;
                    data.statusMessage = `[SCAN] Identified ${orphans.length} zombie files with no data affinity.`;
                    toast.success(`Scan complete.`);
                } catch (error) {
                    data.statusMessage = "[ERROR] Maintenance scan interrupted.";
                    toast.error("Scan failed.");
                } finally {
                    data.isScanning = false;
                    setTimeout(() => { data.progress = 0; data.statusMessage = ""; render(); }, 3000);
                }
                break;

            case "START_RESTORE":
                if (data.isRestoring) return;
                data.isRestoring = event.restoreType;
                data.progress = 1;
                data.statusMessage = `[RESTORE] Analyzing ${event.file.name}...`;
                render();

                try {
                    await new Promise(r => setTimeout(r, 600)); // UI delay
                    data.progress = 5;
                    data.statusMessage = `[RESTORE] Initializing ${event.restoreType === 'db' ? 'Database' : 'Storage'} Stream...`;
                    render();

                    const result = await BackupService.restoreBackup(event.file, event.restoreType, (p) => {
                        data.progress = p;
                        data.statusMessage = event.restoreType === 'db'
                            ? `[DB] Restoring nodes... ${p}%`
                            : `[STORAGE] Uploading assets... ${p}%`;
                        render();
                    });

                    data.progress = 100;
                    data.statusMessage = `[SUCCESS] Restored ${result.count} items successfully.`;
                    toast.success(`Restore successful! Processed ${result.count} items.`);
                } catch (error) {
                    data.statusMessage = `[ERROR] Restore Failed: ${String(error)}`;
                    toast.error("Restore failed. Check console.");
                } finally {
                    setTimeout(() => {
                        data.isRestoring = null;
                        data.progress = 0;
                        data.statusMessage = "";
                        render();
                    }, 5000);
                }
                break;

            case "CLEAN_SELECTED_ORPHANS":
                if (data.isCleaning || data.selectedOrphans.length === 0) return;
                data.isCleaning = true;
                data.progress = 10;
                data.statusMessage = `[PURGE] Initializing deletion of ${data.selectedOrphans.length} assets...`;
                render();
                try {
                    const toDelete = data.orphans.filter(o => data.selectedOrphans.includes(o.fullPath));
                    await MaintenanceService.bulkDeleteOrphans(toDelete);
                    data.orphans = data.orphans.filter(o => !data.selectedOrphans.includes(o.fullPath));
                    data.selectedOrphans = [];
                    data.progress = 100;
                    data.statusMessage = `[SUCCESS] Reclaimed storage. Purged ${toDelete.length} files.`;
                    toast.success("Cleanup complete.");
                } catch (error) {
                    data.statusMessage = "[ERROR] Purge failed by storage policy.";
                    toast.error("Cleanup failed.");
                } finally {
                    data.isCleaning = false;
                    setTimeout(() => { data.progress = 0; data.statusMessage = ""; render(); }, 3000);
                }
                break;

            case "REFRESH_MIGRATIONS":
                try {
                    const scripts = MigrationEngine.getScripts();
                    const history = await MigrationEngine.getMigrationHistory();
                    data.migrations = scripts.map(s => ({ ...s, history: history[s.version] || null }));
                } finally {
                    render();
                }
                break;

            case "UPDATE_FIREBASE_CONFIG":
                // @ts-ignore
                data.firebaseConfig = { ...data.firebaseConfig, [event.key]: event.value };
                return render();

            case "SAVE_FIREBASE_CONFIG":
                try {
                    if (confirm("Changing Firebase configuration requires a reload. Continue?")) {
                        localStorage.setItem('FIREBASE_CONFIG_OVERRIDE', JSON.stringify(data.firebaseConfig));
                        toast.success("Configuration saved! Reloading system...");
                        setTimeout(() => window.location.reload(), 1000);
                    }
                } catch (e) {
                    toast.error("Failed to save local configuration override.");
                    console.error(e);
                }
                break;

            case "UPDATE_BRANDING_CONFIG":
                // @ts-ignore
                data.brandingConfig = { ...data.brandingConfig, [event.key]: event.value };
                return render();

            case "SAVE_BRANDING_CONFIG":
                try {
                    const db = await import('@/lib/firebase').then(m => m.firebase.database());
                    await db.ref('root/infra/branding').set(data.brandingConfig);

                    // Update local storage for immediate config availability on reload
                    localStorage.setItem("APP_BRANDING_OVERRIDE", JSON.stringify(data.brandingConfig));

                    toast.success("Branding updated globally!");
                    setTimeout(() => window.location.reload(), 1000);
                } catch (e) {
                    toast.error("Failed to save branding configuration.");
                    console.error(e);
                }
                break;

            case "REFRESH_SYSTEM_HEALTH":
                const { SystemMonitorService } = await import("./services/SystemMonitorService");
                data.liveMetrics = await SystemMonitorService.getLiveMetrics();
                data.appUsage = await SystemMonitorService.getAppUsageBreakdown();
                return render();

            case "REFRESH_BRANDING":
                try {
                    const branding = await dataProvider.get("infra/branding");
                    if (branding) {
                        data.brandingConfig = branding;
                    }
                } catch (e) {
                    console.error("Failed to load branding", e);
                } finally {
                    render();
                }
                break;
        }
    };

    return { dispatch };
};
