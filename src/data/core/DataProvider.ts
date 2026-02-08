import { ref, onValue, update, remove, push, child } from "firebase/database";
import { db } from "@/lib/firebase";

export class DataProvider {
    private normalizePath(path: string): string {
        if (path.startsWith('root/')) return path;
        return `root/${path}`;
    }

    // Added generic <T> for better typing in logs
    observe<T>(path: string, defaultValue: any = null) {
        const fullPath = this.normalizePath(path);

        // LOG: Intent to listen. 
        // useful to see if we are over-fetching or listening to the same path multiple times.
        console.groupCollapsed(`[DataProvider] OBSERVE Request: ${fullPath}`);
        console.log("Default Value:", defaultValue);
        console.groupEnd();

        return {
            subscribe: (callback: (data: T) => void) => {
                const dbRef = ref(db, fullPath);

                // LOG: Actual Firebase Connection created
                console.log(`[DataProvider] CONNECTING Firebase listener: ${fullPath}`);

                const unsubscribe = onValue(dbRef, (snapshot) => {
                    const exists = snapshot.exists();
                    const rawValue = snapshot.val();
                    const data = exists ? rawValue : defaultValue;

                    // LOG: Network Data Ingress.
                    // Differentiates between a "null" value in DB vs "default" value used locally.
                    console.log(`[DataProvider] INCOMING Data for ${fullPath}`, {
                        exists,
                        payload: data,
                        source: exists ? 'Firebase' : 'DefaultValue'
                    });

                    callback(data);
                });

                // Return the cleanup function
                return () => {
                    // LOG: Network Disconnect.
                    console.log(`[DataProvider] DISCONNECTING Firebase listener: ${fullPath}`);
                    unsubscribe();
                };
            }
        };
    }

    async update(path: string, data: any) {
        const fullPath = this.normalizePath(path);
        const dbRef = ref(db, fullPath);

        // LOG: Data Mutation Request.
        console.log(`[DataProvider] WRITING Update to ${fullPath}`, data);

        try {
            await update(dbRef, data);
            // LOG: Success confirmation. Ensures the promise resolved.
            console.log(`[DataProvider] WRITE SUCCESS for ${fullPath}`);
        } catch (error) {
            // LOG: Error capturing. Critical for debugging failed writes.
            console.error(`[DataProvider] WRITE FAILED for ${fullPath}`, error);
            throw error;
        }
    }

    async remove(path: string) {
        const fullPath = this.normalizePath(path);
        const dbRef = ref(db, fullPath);

        // LOG: Destructive Action.
        console.warn(`[DataProvider] DELETING path ${fullPath}`);

        try {
            await remove(dbRef);
            console.log(`[DataProvider] DELETE SUCCESS for ${fullPath}`);
        } catch (error) {
            console.error(`[DataProvider] DELETE FAILED for ${fullPath}`, error);
            throw error;
        }
    }

    generateKey(path: string): string {
        const fullPath = this.normalizePath(path);
        const dbRef = ref(db, fullPath);
        const key = push(dbRef).key || crypto.randomUUID();

        // LOG: Utility action.
        console.debug(`[DataProvider] Generated Key for ${path}: ${key}`);
        return key;
    }

    async get(path: string, defaultValue: any = null) {
        const fullPath = this.normalizePath(path);
        const dbRef = ref(db, fullPath);
        const { get: firebaseGet } = await import("firebase/database");
        const snapshot = await firebaseGet(dbRef);
        return snapshot.exists() ? snapshot.val() : defaultValue;
    }
}

export const dataProvider = new DataProvider();