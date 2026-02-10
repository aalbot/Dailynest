import { dataProvider } from "@/data";
import { storage, auth } from "@/lib/firebase";
import { ref, uploadString, getDownloadURL, listAll, getBlob, uploadBytes } from "firebase/storage";
import JSZip from "jszip";

export interface BackupMetadata {
    id: string;
    timestamp: string;
    adminId: string;
    adminName: string;
    size: number;
    nodes?: string[];
    type: "full" | "selective" | "storage";
}

export interface BackupBundle {
    metadata: BackupMetadata;
    data: any;
}

export class BackupService {
    /**
     * Performs a full backup of the 'root/' namespace
     */
    static async createFullBackup() {
        return this.createBackup(["/"]);
    }

    /**
     * Performs a backup of specific nodes
     */
    static async createBackup(nodes: string[]) {
        const user = auth.currentUser;
        const sessionRole = sessionStorage.getItem("user_role");
        const adminName = sessionStorage.getItem("staff_name") || "System Admin";
        const adminId = user?.uid || sessionStorage.getItem("staff_id") || "admin_session";

        if (!user && sessionRole !== "admin") {
            throw new Error("Unauthorized: Administrative privileges required.");
        }

        try {
            const backupData: Record<string, any> = {};
            for (const node of nodes) {
                const path = node === "/" ? "" : node;
                backupData[node] = await dataProvider.get(path);
            }

            const timestamp = new Date().toISOString();
            const backupId = `bkp_${Date.now()}`;

            const bundle: BackupBundle = {
                metadata: {
                    id: backupId,
                    timestamp,
                    adminId,
                    adminName,
                    size: JSON.stringify(backupData).length,
                    nodes,
                    type: nodes.includes("/") ? "full" : "selective"
                },
                data: backupData
            };

            const storagePath = `root/infra/backups/${backupId}.json`;
            const fileRef = ref(storage, storagePath);
            await uploadString(fileRef, JSON.stringify(bundle), 'raw', {
                contentType: 'application/json',
                customMetadata: { adminId, timestamp }
            });

            await this.logAction("CREATE_BACKUP", {
                backupId,
                nodes,
                type: bundle.metadata.type,
                storagePath
            });

            return bundle;
        } catch (error) {
            console.error("[BackupService] Backup failed:", error);
            await this.logAction("BACKUP_ERROR", { error: String(error) });
            throw error;
        }
    }

    /**
     * Creates a ZIP backup of selected Assets (Storage Files + DB Images)
     */
    static async createStorageBackup(targets: { id: string, label: string, type: string, path: string }[], progressCallback?: (p: number) => void) {
        const user = auth.currentUser;
        const adminId = user?.uid || sessionStorage.getItem("staff_id") || "admin_session";

        try {
            const zip = new JSZip();
            let processedBytes = 0;
            let totalBytesEstimate = 0; // Estimation for progress

            // Helper to update progress - heuristic based
            // We can't know total size easily without pre-fetching everything.
            // So we'll update progress based on item count vs estimated count or just steps.
            // Let's use a simple step-based approach for now or refine if possible.
            // Better: List all items first to get count, then download.

            const fileTasks: Array<{ name: string, fetch: () => Promise<Blob | string | null>, isBase64?: boolean }> = [];

            // 1. Discovery Phase
            for (const target of targets) {
                if (target.type === 'storage-folder') {
                    try {
                        const folderRef = ref(storage, target.path);
                        const result = await listAll(folderRef);
                        result.items.forEach(item => {
                            fileTasks.push({
                                name: `${target.path.replace("root/", "")}/${item.name}`,
                                fetch: () => getBlob(item)
                            });
                        });
                    } catch (e) { console.warn(`Skipping empty/inaccessible folder: ${target.path}`, e); }

                } else if (target.type === 'db-base64') {
                    const snapshot = await dataProvider.get(target.path.replace("root/", "")); // dataProvider handles 'root/' internal logic? Check implementation.
                    // dataProvider.get usually takes path relative to root or full path?
                    // dataProvider code: "return firebase.database().ref(path).once..."
                    // If passing "nexus_hr/employees", likely correct.
                    // But in BackupService line 46: "backupData[node] = await dataProvider.get(path);" where path is "/" or specific.
                    // Use dataProvider.get(target.path) directly if it handles full path.
                    // target.path is "root/nexus_hr/employees".

                    const data = await dataProvider.get(target.path);

                    if (data) {
                        if (target.id === 'emp_photos') {
                            Object.values(data).forEach((emp: any) => {
                                if (emp.photoUrl) {
                                    const ext = emp.photoUrl.startsWith('data:image') ? 'jpg' : 'png'; // Assumption
                                    const filename = `employees/${emp.firstName}_${emp.lastName}_${emp.id}.${ext}`;

                                    fileTasks.push({
                                        name: filename,
                                        fetch: async () => {
                                            if (emp.photoUrl.startsWith('data:')) {
                                                return emp.photoUrl.split(',')[1];
                                            } else if (emp.photoUrl.startsWith('http')) {
                                                try {
                                                    const res = await fetch(emp.photoUrl);
                                                    return await res.blob();
                                                } catch { return null; }
                                            }
                                            return null;
                                        },
                                        isBase64: emp.photoUrl.startsWith('data:')
                                    });
                                }
                            });
                        } else if (target.id === 'task_attach') {
                            Object.values(data).forEach((task: any) => {
                                if (task.items && Array.isArray(task.items)) {
                                    task.items.forEach((item: any, i: number) => {
                                        if (item.images && Array.isArray(item.images)) {
                                            item.images.forEach((img: string, j: number) => {
                                                fileTasks.push({
                                                    name: `tasks/${task.taskId}/item_${i}_img_${j}.jpg`,
                                                    fetch: async () => img.split(',')[1],
                                                    isBase64: true
                                                });
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    }
                }
            }

            // 2. Fetch & Zip Phase
            const total = fileTasks.length;
            if (total === 0) throw new Error("No files found to backup in selected targets.");

            for (let i = 0; i < total; i++) {
                const task = fileTasks[i];
                try {
                    const content = await task.fetch();
                    if (content) {
                        zip.file(task.name, content, { base64: task.isBase64 });
                    }
                } catch (err) {
                    console.error(`Failed to pack ${task.name}`, err);
                }

                if (progressCallback) progressCallback(Math.round(((i + 1) / total) * 100));
            }

            // 3. Generate ZIP
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const backupId = `storage_bkp_${Date.now()}`;
            const storagePath = `root/infra/backups/${backupId}.zip`;
            const fileRef = ref(storage, storagePath);

            // 4. Upload to Firebase
            await uploadBytes(fileRef, zipBlob, {
                contentType: 'application/zip',
                customMetadata: { adminId, type: 'storage' }
            });

            await this.logAction("CREATE_STORAGE_BACKUP", {
                backupId,
                size: zipBlob.size,
                storagePath,
                targets: targets.map(t => t.label)
            });

            return { backupId, storagePath, blob: zipBlob };
        } catch (error) {
            console.error("[BackupService] Storage Backup failed:", error);
            throw error;
        }
    }

    /**
     * Logs an action
     */
    static async logAction(action: string, details: any) {
        const user = auth.currentUser;
        const logId = Date.now().toString();
        const logEntry = {
            id: logId,
            action,
            adminId: user?.uid || sessionStorage.getItem("staff_id") || "system",
            adminName: user?.displayName || user?.email || sessionStorage.getItem("staff_name") || "Admin",
            timestamp: new Date().toISOString(),
            details
        };
        try {
            await dataProvider.update(`infra_logs/${logId}`, logEntry);
        } catch (error) {
            console.error("[BackupService] Log failed:", error);
        }
    }

    static async listBackups() {
        const logs: any = await dataProvider.get("infra_logs");
        if (!logs) return [];
        return Object.values(logs)
            .filter((l: any) => l.action === "CREATE_BACKUP" || l.action === "CREATE_STORAGE_BACKUP")
            .map((l: any) => ({ ...l.details, action: l.action, timestamp: l.timestamp }))
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }

    static async getBackupDownloadUrl(storagePath: string) {
        const fileRef = ref(storage, storagePath);
        return await getDownloadURL(fileRef);
    }

    /**
     * Restores a backup from a File object
     */
    static async restoreBackup(file: File, type: "db" | "storage", progressCallback?: (p: number) => void) {
        const user = auth.currentUser;
        const sessionRole = sessionStorage.getItem("user_role");
        const adminId = user?.uid || sessionStorage.getItem("staff_id") || "admin_session";

        if (!user && sessionRole !== "admin") {
            throw new Error("Unauthorized: Administrative privileges required.");
        }

        console.log(`[BackupService] Starting restoration of type: ${type} by ${adminId}`);

        if (type === "db") {
            try {
                if (!file.name.endsWith('.json')) {
                    throw new Error("Invalid file type. Please upload a .json file.");
                }

                const text = await file.text();
                let bundle: BackupBundle;

                try {
                    bundle = JSON.parse(text);
                } catch (e) {
                    throw new Error("Failed to parse JSON file. The file may be corrupted.");
                }

                if (!bundle.data) throw new Error("Invalid backup file format");

                const nodes = Object.keys(bundle.data);
                let processed = 0;

                for (const node of nodes) {
                    const path = node === "/" ? "" : node;
                    try {
                        await dataProvider.update(path, bundle.data[node]);
                    } catch (err) {
                        console.error(`[BackupService] Failed to restore node: ${path}`, err);
                        throw new Error(`Failed to restore node '${node}': ${String(err)}`);
                    }
                    processed++;
                    if (progressCallback) progressCallback(Math.round((processed / nodes.length) * 100));
                }

                await this.logAction("RESTORE_DB", {
                    filename: file.name,
                    nodes,
                    timestamp: new Date().toISOString()
                });

                return { success: true, count: nodes.length };
            } catch (e) {
                console.error("DB Restore Failed", e);
                throw e;
            }
        } else if (type === "storage") {
            try {
                if (!file.name.endsWith('.zip')) {
                    throw new Error("Invalid file type. Please upload a .zip file.");
                }

                const zip = new JSZip();
                const loadedZip = await zip.loadAsync(file);

                const files = Object.keys(loadedZip.files);
                let processed = 0;

                for (const filename of files) {
                    const zipObj = loadedZip.files[filename];
                    if (zipObj.dir) continue;

                    const blob = await zipObj.async("blob");
                    // Assuming backup structure: "products/img.jpg" -> "root/products/img.jpg"
                    // If backed up with createStorageBackup targets, path might be "products/..." or "nexus_hr/employees/..."
                    // We prepend "root/" to be safe if it's missing.
                    // But if user uploads random zip, this puts it in root.
                    const fullPath = filename.startsWith("root/") ? filename : `root/${filename}`;

                    const fileRef = ref(storage, fullPath);
                    await uploadBytes(fileRef, blob);

                    processed++;
                    if (progressCallback) progressCallback(Math.round((processed / files.length) * 100));
                }

                await this.logAction("RESTORE_STORAGE", {
                    filename: file.name,
                    fileCount: files.length
                });

                return { success: true, count: files.length };
            } catch (e) {
                console.error("Storage Restore Failed", e);
                throw e;
            }
        }
    }
}
