import { ref, onValue, update, remove, push, child } from "firebase/database";
import { db } from "@/lib/firebase";

export class DataProvider {
    private normalizePath(path: string): string {
        // If path already starts with root/, don't prepend it again
        if (path.startsWith('root/')) return path;
        return `root/${path}`;
    }

    observe(path: string, defaultValue: any = null) {
        return {
            subscribe: (callback: (data: any) => void) => {
                const dbRef = ref(db, this.normalizePath(path));
                const unsubscribe = onValue(dbRef, (snapshot) => {
                    const data = snapshot.exists() ? snapshot.val() : defaultValue;
                    callback(data);
                });
                return unsubscribe;
            }
        };
    }

    async update(path: string, data: any) {
        const dbRef = ref(db, this.normalizePath(path));
        return update(dbRef, data);
    }

    async remove(path: string) {
        const dbRef = ref(db, this.normalizePath(path));
        return remove(dbRef);
    }

    generateKey(path: string): string {
        const dbRef = ref(db, this.normalizePath(path));
        return push(dbRef).key || crypto.randomUUID();
    }
}

export const dataProvider = new DataProvider();
