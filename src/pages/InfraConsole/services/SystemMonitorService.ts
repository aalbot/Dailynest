import { firebase } from "@/lib/firebase";

export interface SystemMetrics {
    cpu: number; // Percentage
    memory: number; // Percentage
    network: {
        inbound: number; // KB/s
        outbound: number; // KB/s
        latency: number; // ms
    };
    db: {
        activeConnections: number;
        transactionsPerSecond: number;
        storageUsage: number; // GB
    };
}

export interface AppUsageMetric {
    id: string;
    name: string;
    usage: number; // MB
    percentage: number;
    trend: 'up' | 'down' | 'stable';
    activeUsers: number;
}

export const SystemMonitorService = {
    // Cache for smoother transitions
    lastMetrics: {
        cpu: 10,
        memory: 30,
        network: { inbound: 0, outbound: 0, latency: 45 },
        db: { activeConnections: 0, transactionsPerSecond: 0, storageUsage: 0.5 }
    } as SystemMetrics,

    getLiveMetrics: async (): Promise<SystemMetrics> => {
        try {
            const db = firebase.database();

            // 1. DB Connections: active employees + admin (2)
            const empSnap = await db.ref("root/nexus_hr/employees").orderByChild("status").equalTo("Active").once("value");
            let activeConnections = 2;
            if (empSnap.exists()) {
                activeConnections += empSnap.numChildren();
            }

            // 2. Storage Usage: Estimate based on key count
            const productsRef = db.ref("root/products");
            const productsSnap = await productsRef.once("value");
            const productsCount = productsSnap.exists() ? productsSnap.numChildren() : 0;

            const ordersRef = db.ref("root/order");
            const ordersSnap = await ordersRef.limitToLast(100).once("value");
            const ordersCount = ordersSnap.exists() ? (ordersSnap.numChildren() * 5) : 0; // x5 Estimate history

            // Base usage + dynamic
            const estimatedGB = 0.1 + (productsCount * 0.005) + (ordersCount * 0.002);

            // 3. Network: Simulate based on activity
            const networkLoad = activeConnections * 25; // 25KB/s per user roughly

            // 4. CPU/RAM: Simulated load based on active users
            const loadFactor = Math.min(100, (activeConnections / 50) * 100);

            let cpu = 15 + (loadFactor * 0.5);
            let memory = 35 + (loadFactor * 0.3);

            // Optional: read real metrics if written by an agent
            const agentMetrics = await db.ref("root/system/metrics").once("value");
            if (agentMetrics.exists()) {
                const val = agentMetrics.val();
                if (val.cpu) cpu = val.cpu;
                if (val.memory) memory = val.memory;
            }

            const metrics = {
                cpu: Math.round(cpu * 10) / 10,
                memory: Math.round(memory * 10) / 10,
                network: {
                    inbound: Math.round(networkLoad * 0.8),
                    outbound: Math.round(networkLoad * 0.2),
                    latency: 45 + (activeConnections * 2),
                },
                db: {
                    activeConnections,
                    transactionsPerSecond: Math.max(1, Math.floor(activeConnections / 1.5)),
                    storageUsage: Math.round(estimatedGB * 100) / 100,
                }
            };
            return metrics;

        } catch (e) {
            console.error("Failed to fetch live metrics", e);
            return SystemMonitorService.lastMetrics;
        }
    },

    getAppUsageBreakdown: async (): Promise<AppUsageMetric[]> => {
        try {
            const db = firebase.database();

            // Inventory
            const prodSnap = await db.ref("root/products").once("value");
            const catSnap = await db.ref("root/categories").once("value");

            const prodCount = prodSnap.exists() ? prodSnap.numChildren() : 0;
            const catCount = catSnap.exists() ? catSnap.numChildren() : 0;
            const invSize = (prodCount * 0.5) + (catCount * 0.1);

            // HR
            const hrSnap = await db.ref("root/nexus_hr/employees").once("value");
            const hrCount = hrSnap.exists() ? hrSnap.numChildren() : 0;
            const activeHR = hrSnap.exists() && hrSnap.val() ? Object.values(hrSnap.val()).filter((e: any) => e.status === 'Active').length : 0;

            const hrSize = (hrCount * 2) + (hrCount * 5);

            // POS
            const posSnap = await db.ref("root/order").limitToLast(500).once("value");
            const posCount = posSnap.exists() ? posSnap.numChildren() : 0;
            const posSize = posCount * 0.2 * 10;

            // Admin
            const logsSnap = await db.ref("root/admin/logs").limitToLast(100).once("value");
            const adminSize = 50 + (logsSnap.exists() ? logsSnap.numChildren() * 0.05 : 0);

            const totalSize = invSize + hrSize + posSize + adminSize || 1;

            return [
                {
                    id: 'inventory',
                    name: 'Inventory Management',
                    usage: Math.round(invSize),
                    percentage: Math.round((invSize / totalSize) * 100),
                    trend: 'stable',
                    activeUsers: 12
                },
                {
                    id: 'hr',
                    name: 'HR & Payroll',
                    usage: Math.round(hrSize),
                    percentage: Math.round((hrSize / totalSize) * 100),
                    trend: 'stable',
                    activeUsers: activeHR
                },
                {
                    id: 'pos',
                    name: 'Point of Sale (Live)',
                    usage: Math.round(posSize),
                    percentage: Math.round((posSize / totalSize) * 100),
                    trend: 'up',
                    activeUsers: 8
                },
                {
                    id: 'admin',
                    name: 'Admin Console',
                    usage: Math.round(adminSize),
                    percentage: Math.round((adminSize / totalSize) * 100),
                    trend: 'stable',
                    activeUsers: 2
                },
            ];
        } catch (e) {
            console.error("Failed to fetch app usage", e);
            return [
                { id: 'inventory', name: 'Inventory Management', usage: 0, percentage: 0, trend: 'stable', activeUsers: 0 },
            ];
        }
    }
};
