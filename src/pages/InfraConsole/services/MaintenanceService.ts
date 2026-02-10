import { dataProvider } from "@/data";
import { storage } from "@/lib/firebase";
import { ref, listAll, deleteObject, getDownloadURL } from "firebase/storage";
import { BackupService } from "./BackupService";

export interface OrphanedFile {
    name: string;
    path: string;
    fullPath: string;
    size?: number;
    updatedAt?: string;
    type: "product" | "category" | "staff";
}

export class MaintenanceService {
    /**
     * Scans storage for files that are no longer referenced in the database
     */
    static async scanForOrphans(): Promise<OrphanedFile[]> {
        const orphans: OrphanedFile[] = [];

        try {
            // 1. Scan Products
            const dbProducts = await dataProvider.get("products") || {};
            const productCodes = new Set(Object.keys(dbProducts));
            const productOrphans = await this.checkPath("root/products", productCodes, "product");
            orphans.push(...productOrphans);

            // 2. Scan Categories
            const dbCategories = await dataProvider.get("category") || {};
            const categoryCodes = new Set(Object.keys(dbCategories));
            const categoryOrphans = await this.checkPath("root/categories", categoryCodes, "category");
            orphans.push(...categoryOrphans);

            return orphans;
        } catch (error) {
            console.error("[MaintenanceService] Scan failed:", error);
            throw error;
        }
    }

    /**
     * Helper to compare a storage path against a set of valid DB keys
     */
    private static async checkPath(storagePath: string, validKeys: Set<string>, type: OrphanedFile["type"]): Promise<OrphanedFile[]> {
        const folderRef = ref(storage, storagePath);
        const result = await listAll(folderRef);

        const orphaned: OrphanedFile[] = [];

        for (const item of result.items) {
            // Filenames usually match the code/id (e.g., 001.png or PRODUCT123.jpg)
            const id = item.name.split('.')[0];
            if (!validKeys.has(id)) {
                orphaned.push({
                    name: item.name,
                    path: storagePath,
                    fullPath: item.fullPath,
                    type
                });
            }
        }

        return orphaned;
    }

    /**
     * Deletes a specific orphaned file
     */
    static async deleteOrphan(file: OrphanedFile) {
        const fileRef = ref(storage, file.fullPath);
        await deleteObject(fileRef);
        await BackupService.logAction("DELETE_ORPHAN", { file: file.fullPath });
    }

    /**
     * Bulk deletes a list of orphaned files
     */
    static async bulkDeleteOrphans(files: OrphanedFile[]) {
        for (const file of files) {
            await this.deleteOrphan(file);
        }
        await BackupService.logAction("BULK_DELETE_ORPHANS", { count: files.length });
    }

    /**
     * Gets a download URL for a file
     */
    static async getFileUrl(fullPath: string) {
        const fileRef = ref(storage, fullPath);
        return await getDownloadURL(fileRef);
    }
}
