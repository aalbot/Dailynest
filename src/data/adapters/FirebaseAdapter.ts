import firebase from "firebase/compat/app"
import "firebase/compat/database"
import { IDatabaseAdapter } from "../core/IDatabaseAdapter"

export class FirebaseAdapter implements IDatabaseAdapter {
  private db = firebase.database()

  // Logical key → Firebase path
  private paths: Record<string, string> = {
    staff: "root/staff",
    employees: "root/nexus_hr/employees",
    attendance: "root/nexus_hr/attendance",
    roles: "root/nexus_hr/roles",
    departments: "root/nexus_hr/departments",
    apps: "root/apps"
  }

  async connect() {
    // Firebase auto-connects
    return
  }

  subscribe<T>(key: string, callback: (data: T) => void) {
    const path = this.paths[key]
    if (!path) throw new Error(`Unknown data key: ${key}`)

    const ref = this.db.ref(path)
    ref.on("value", snap => callback(snap.val() ?? {}))

    return () => ref.off()
  }

  async getOnce<T>(key: string): Promise<T> {
    const snap = await this.db.ref(this.paths[key]).get()
    return snap.val()
  }

  async set<T>(key: string, value: T) {
    await this.db.ref(this.paths[key]).set(value)
  }

  async update<T>(key: string, partial: Partial<T>) {
    await this.db.ref(this.paths[key]).update(partial)
  }

  async remove(key: string) {
    await this.db.ref(this.paths[key]).remove()
  }
}
