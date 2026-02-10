import { dataProvider } from "@/data";
import { BackupService } from "./BackupService";

export interface MigrationScript {
    version: string;
    description: string;
    up: (data: any) => Promise<void>;
}

export interface MigrationLog {
    version: string;
    description: string;
    executedAt: string;
    adminId: string;
    status: "SUCCESS" | "FAILED";
    error?: string;
}

/**
 * MigrationEngine handles versioned schema or data transformations
 */
export class MigrationEngine {
    private static MIGRATIONS_PATH = "infra/migrations";

    /**
     * Define your versioned migration scripts here
     */
    private static scripts: MigrationScript[] = [
        {
            version: "20240209_001_INIT_INFRA",
            description: "Initialize infrastructure nodes and basic settings",
            up: async () => {
                // Example: Ensure infra node exists
                await dataProvider.update("infra/settings", {
                    version: "1.0.0",
                    lastSystemCheck: new Date().toISOString(),
                    maintenanceMode: false
                });
            }
        },
        {
            version: "20240209_002_STAFF_FIELD_FIX",
            description: "Cleanup staff nodes - ensuring username is lowercase",
            up: async () => {
                const staff = await dataProvider.get("staff");
                if (!staff) return;

                const updates: Record<string, any> = {};
                Object.entries(staff).forEach(([id, data]: [string, any]) => {
                    if (data.username && data.username !== data.username.toLowerCase()) {
                        updates[`staff/${id}/username`] = data.username.toLowerCase();
                    }
                });

                if (Object.keys(updates).length > 0) {
                    await dataProvider.update("/", updates);
                }
            }
        }
    ];

    /**
     * Returns all registered migration scripts
     */
    static getScripts() {
        return this.scripts;
    }

    /**
     * Gets the history of executed migrations
     */
    static async getMigrationHistory(): Promise<Record<string, MigrationLog>> {
        const history = await dataProvider.get(this.MIGRATIONS_PATH);
        return history || {};
    }

    /**
     * Executes a specific migration script by version
     */
    static async runMigration(version: string) {
        const script = this.scripts.find(s => s.version === version);
        if (!script) throw new Error(`Migration script for version ${version} not found.`);

        const history = await this.getMigrationHistory();
        if (history[version] && history[version].status === "SUCCESS") {
            throw new Error(`Migration ${version} has already been successfully executed.`);
        }

        const adminId = (await import("@/lib/firebase")).auth.currentUser?.uid || sessionStorage.getItem("staff_id") || "admin_session";

        // 1. Automatic pre-migration backup for safety
        await BackupService.logAction("PRE_MIGRATION_BACKUP", { version });
        await BackupService.createBackup(["/"]);

        try {
            // 2. Execute the migration logic
            await script.up(null);

            // 3. Log success
            const log: MigrationLog = {
                version: script.version,
                description: script.description,
                executedAt: new Date().toISOString(),
                adminId,
                status: "SUCCESS"
            };

            await dataProvider.update(`${this.MIGRATIONS_PATH}/${version}`, log);
            await BackupService.logAction("MIGRATION_SUCCESS", { version });

            return log;
        } catch (error) {
            console.error(`[MigrationEngine] Migration ${version} failed:`, error);

            const log: MigrationLog = {
                version: script.version,
                description: script.description,
                executedAt: new Date().toISOString(),
                adminId,
                status: "FAILED",
                error: String(error)
            };

            await dataProvider.update(`${this.MIGRATIONS_PATH}/${version}`, log);
            await BackupService.logAction("MIGRATION_FAILED", { version, error: String(error) });

            throw error;
        }
    }

    /**
     * Runs all pending migrations in order
     */
    static async runPendingMigrations() {
        const history = await this.getMigrationHistory();
        const results = [];

        for (const script of this.scripts) {
            if (!history[script.version] || history[script.version].status !== "SUCCESS") {
                const result = await this.runMigration(script.version);
                results.push(result);
            }
        }

        return results;
    }
}
