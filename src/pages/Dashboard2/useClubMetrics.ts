import { useEffect, useMemo, useState, useRef } from "react";
import { firebase } from "@/lib/firebase";

export type ClubTimeRange = "today" | "7d" | "30d" | "all";

function parseOrderTotal(o: any): { amount: number; method: string } {
    const t = o?.total;
    if (t == null || t === "") return { amount: 0, method: "Other" };
    if (typeof t === "number" && !Number.isNaN(t)) return { amount: t, method: "Other" };
    const s = String(t).trim();
    const numPart = (str: string) => parseFloat(str.replace(/[,₹\s]/g, "")) || 0;
    if (s.includes("-")) {
        const idx = s.indexOf("-");
        const amount = numPart(s.slice(0, idx));
        const rest = s.slice(idx + 1).toLowerCase();
        if (rest.includes("cod")) return { amount, method: "COD" };
        if (rest.includes("wallet")) return { amount, method: "Wallet" };
        if (rest.includes("upi")) return { amount, method: "UPI" };
        if (rest.includes("card") || rest.includes("razorpay")) return { amount, method: "Card" };
        return { amount, method: "Other" };
    }
    return { amount: numPart(s), method: "Other" };
}

/** Parsed variant quantity; negatives preserved so we can treat ≤0 as out of stock. */
function parseVariantQuantity(v: any): number {
    const n = parseInt(String(v?.quantity ?? "").trim(), 10);
    return Number.isFinite(n) ? n : 0;
}

function orderStatusBucket(status: string): "delivered" | "cancelled" | "pending" {
    const st = (status || "").toLowerCase();
    if (st.includes("deliver") || st.includes("complete")) return "delivered";
    if (st.includes("cancel")) return "cancelled";
    return "pending";
}

/** Best-effort sort / filter time (matches fields used in Order Management). */
function orderSortTs(o: any): number {
    const candidates = [o.timestamp, o.createdAt, o.last_updated, o.status_updated_at];
    for (const c of candidates) {
        if (typeof c === "number" && c > 0) return c;
        if (typeof c === "string" && c.trim()) {
            const n = Date.parse(c);
            if (!Number.isNaN(n)) return n;
        }
    }
    return 0;
}

export type ClubOrderTableRow = {
    id: string;
    customerName: string;
    phone: string;
    address: string;
    items: string;
    sortTime: number;
    timeLabel: string;
    statusRaw: string;
    statusBucket: ReturnType<typeof orderStatusBucket>;
    amount: number;
    paymentMethod: string;
    deliveryPartner: string;
    totalRaw: unknown;
};

function mapOrderTableRow(o: any): ClubOrderTableRow {
    const st = orderSortTs(o);
    const itemKeys = Object.keys(o)
        .filter((k) => k.startsWith("item") && o[k])
        .sort((a, b) => a.localeCompare(b));
    const items = itemKeys.map((k) => String(o[k])).join(" · ") || "—";
    const { amount, method } = parseOrderTotal(o);
    const addr = o.adrs;
    const address = typeof addr === "string" ? addr : addr != null ? String(addr) : "—";
    const partner =
        String(o.delivery_partner_name || o.delivery_partner || "").trim() ||
        (o.delivery_partner_id ? `Partner ${o.delivery_partner_id}` : "—");
    return {
        id: String(o.id ?? ""),
        customerName: String(o.customerName || o.name || "—"),
        phone: String(o.phone || o.phnm || "—"),
        address,
        items,
        sortTime: st,
        timeLabel: st ? new Date(st).toLocaleString() : "—",
        statusRaw: String(o.status ?? "—"),
        statusBucket: orderStatusBucket(o.status),
        amount,
        paymentMethod: method,
        deliveryPartner: partner,
        totalRaw: o.total,
    };
}

export function useClubMetrics() {
    const [raw, setRaw] = useState<{
        order: Record<string, any>;
        products: Record<string, any>;
        stock: Record<string, any>;
        category: Record<string, any>;
        fcm_tokens: Record<string, any>;
        employees: Record<string, any>;
        notifications: Record<string, any>;
        supportTickets: Record<string, any>;
    }>({
        order: {},
        products: {},
        stock: {},
        category: {},
        fcm_tokens: {},
        employees: {},
        notifications: {},
        supportTickets: {},
    });
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
    const [dbError, setDbError] = useState<string | null>(null);
    const readyRef = useRef<Record<string, boolean>>({});

    useEffect(() => {
        const db = firebase.database();
        const root = db.ref("root");
        const hr = db.ref("root/nexus_hr");
        const CORE = ["order", "products", "stock", "category", "fcm_tokens"] as const;

        const touchSync = () => {
            setLastSyncedAt(Date.now());
            setDbError(null);
        };

        const mark = (n: string) => {
            if (!CORE.includes(n as (typeof CORE)[number])) return;
            readyRef.current[n] = true;
            if (CORE.every((k) => readyRef.current[k])) {
                setLoading(false);
                setConnected(true);
            }
        };

        const onFail =
            (label: string) =>
            (err: Error) => {
                console.warn(`[Dashboard2] Firebase ${label}:`, err?.message);
                setDbError(err?.message || label);
            };

        const upd = (key: string, val: any) => {
            touchSync();
            setRaw((p) => ({ ...p, [key]: val ?? {} }));
            mark(key);
        };

        const onOrder = (s: any) => upd("order", s.val());
        const onProducts = (s: any) => upd("products", s.val());
        const onStock = (s: any) => upd("stock", s.val());
        const onCategory = (s: any) => upd("category", s.val());
        const onFcm = (s: any) => upd("fcm_tokens", s.val());
        const onEmployees = (s: any) => {
            touchSync();
            setRaw((p) => ({ ...p, employees: s.val() ?? {} }));
        };
        const onNotifications = (s: any) => {
            touchSync();
            setRaw((p) => ({ ...p, notifications: s.val() ?? {} }));
        };
        const onTickets = (s: any) => {
            touchSync();
            setRaw((p) => ({ ...p, supportTickets: s.val() ?? {} }));
        };

        root.child("order").on("value", onOrder, onFail("order"));
        root.child("products").on("value", onProducts, onFail("products"));
        root.child("stock").on("value", onStock, onFail("stock"));
        root.child("category").on("value", onCategory, onFail("category"));
        root.child("fcm_tokens").on("value", onFcm, onFail("fcm_tokens"));
        hr.child("employees").on("value", onEmployees, onFail("nexus_hr/employees"));

        const notifQuery = root.child("notifications").limitToLast(150);
        notifQuery.on("value", onNotifications, () => {
            /* optional node — ignore denied */
        });

        const ticketsQuery = root.child("support_tickets").limitToLast(100);
        ticketsQuery.on("value", onTickets, () => {
            /* optional node */
        });

        const t = window.setTimeout(() => {
            setLoading(false);
            if (!CORE.every((k) => readyRef.current[k])) {
                setDbError((prev) => prev || "Timed out waiting for Firebase data");
            }
        }, 8000);
        return () => {
            root.child("order").off("value", onOrder);
            root.child("products").off("value", onProducts);
            root.child("stock").off("value", onStock);
            root.child("category").off("value", onCategory);
            root.child("fcm_tokens").off("value", onFcm);
            hr.child("employees").off("value", onEmployees);
            notifQuery.off("value", onNotifications);
            ticketsQuery.off("value", onTickets);
            window.clearTimeout(t);
        };
    }, []);

    const metrics = useMemo(() => {
        const now = Date.now();
        const startToday = new Date().setHours(0, 0, 0, 0);
        const d7 = now - 7 * 86400000;
        const d30 = now - 30 * 86400000;

        const allOrders = Object.entries(raw.order || {}).map(([id, v]) => ({ id, ...v }));

        const inRange = (o: any, range: ClubTimeRange) => {
            const ts = orderSortTs(o);
            if (!ts) return range === "all";
            if (range === "today") return ts >= startToday;
            if (range === "7d") return ts >= d7;
            if (range === "30d") return ts >= d30;
            return true;
        };

        const buildFor = (range: ClubTimeRange) => {
            const list = allOrders.filter((o) => inRange(o, range));
            let delivered = 0,
                pending = 0,
                cancelled = 0,
                revenue = 0;
            const methodTotals: Record<string, number> = {};
            const hourRevenue = new Array(24).fill(0);
            const hourOrders = new Array(24).fill(0);
            const productSales: Record<string, number> = {};

            list.forEach((o) => {
                const b = orderStatusBucket(o.status);
                const { amount, method } = parseOrderTotal(o);
                if (b === "delivered") {
                    delivered++;
                    revenue += amount;
                    methodTotals[method] = (methodTotals[method] || 0) + amount;
                } else if (b === "cancelled") cancelled++;
                else pending++;

                const ts = orderSortTs(o);
                if (ts) {
                    const h = new Date(ts).getHours();
                    hourOrders[h]++;
                    if (b === "delivered") hourRevenue[h] += amount;
                }
                Object.keys(o).forEach((k) => {
                    if (k.startsWith("item") && o[k]) productSales[String(o[k])] = (productSales[String(o[k])] || 0) + 1;
                });
            });

            const ordersTable: ClubOrderTableRow[] = list
                .map((o) => mapOrderTableRow(o))
                .sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0) || String(b.id).localeCompare(String(a.id)));

            return {
                list,
                delivered,
                pending,
                cancelled,
                revenue,
                methodTotals,
                hourRevenue,
                hourOrders,
                productSales,
                ordersTable,
            };
        };

        const today = buildFor("today");
        const week = buildFor("7d");
        const month = buildFor("30d");
        const all = buildFor("all");

        /** Same variant-level model as `Dashboard.tsx` → Inventory & Stocks (`allStockItems`, value by offer/MRP). */
        const allStockItems = Object.entries(raw.stock || {}).flatMap(([pid, variants]: [string, any]) => {
            const pInfo = raw.products?.[pid];
            const cat =
                pInfo && raw.category?.[pInfo.categoryCode] ? raw.category[pInfo.categoryCode].name : "Uncategorized";
            return Object.entries(variants || {}).map(([vid, v]: [string, any]) => ({
                id: pid,
                variantId: vid,
                name: pInfo?.name || "Unknown",
                category: cat,
                categoryCode: pInfo?.categoryCode || "",
                quantity: parseVariantQuantity(v),
                price: parseFloat(v?.offerPrice) || parseFloat(v?.mrp) || 0,
                pic: pInfo?.pic || "",
                variantRaw: v,
            }));
        });

        let stockVal = 0,
            stockQty = 0,
            outCount = 0,
            okCount = 0,
            lowCount = 0;
        const inventoryByCat: Record<string, number> = {};
        allStockItems.forEach((row) => {
            stockVal += row.quantity * row.price;
            stockQty += row.quantity;
            inventoryByCat[row.category] = (inventoryByCat[row.category] || 0) + row.quantity * row.price;
            if (row.quantity <= 0) outCount++;
            else if (row.quantity <= 5) lowCount++;
            else okCount++;
        });
        const lowStockProducts = allStockItems.filter((i) => i.quantity >= 1 && i.quantity <= 5);
        const outOfStockSkus = allStockItems.filter((i) => i.quantity <= 0).length;
        const inventoryChartData = {
            labels: Object.keys(inventoryByCat),
            values: Object.values(inventoryByCat),
        };
        const lowStockRows = lowStockProducts.slice(0, 12).map((p) => ({
            name: p.variantId ? `${p.name} (${p.variantId})` : p.name,
            warehouse: "Main",
            qty: p.quantity,
        }));

        const topToday = Object.entries(today.productSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, sold]) => ({ name, sold }));

        const dayRev: Record<string, number> = {};
        week.list.forEach((o) => {
            if (orderStatusBucket(o.status) !== "delivered") return;
            const ts = o.timestamp || o.createdAt;
            if (!ts) return;
            const key = new Date(ts).toISOString().slice(0, 10);
            dayRev[key] = (dayRev[key] || 0) + parseOrderTotal(o).amount;
        });
        const dayKeys = Object.keys(dayRev).sort().slice(-7);
        const weekDailyRevenue = {
            labels: dayKeys.map((k) =>
                new Date(k + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
            ),
            values: dayKeys.map((k) => dayRev[k]),
        };

        const methodLabels = Object.keys(week.methodTotals).filter((k) => week.methodTotals[k] > 0);
        const methodValues = methodLabels.map((k) => week.methodTotals[k]);
        const methodTotalSum = methodValues.reduce((a, b) => a + b, 0) || 1;
        const methodPct = methodValues.map((v) => Math.round((v / methodTotalSum) * 100));

        const empList: any[] = raw.employees
            ? Array.isArray(raw.employees)
                ? raw.employees.map((e: any, i: number) => ({ ...e, id: e?.id ?? String(i) }))
                : Object.entries(raw.employees).map(([id, e]: [string, any]) => ({ ...e, id: e?.id ?? id }))
            : [];
        const riders = empList.filter(
            (e: any) => e?.role === "Ride" || e?.department === "Logistics" || e?.role === "Delivery Partner"
        );
        const onlineRiders = riders.filter((e: any) => {
            const s = (e?.status || "").toLowerCase();
            return s === "active" || s === "online";
        }).length;

        const catalogRows: { code: string; name: string; category: string; price: number; qty: number; status: string }[] = [];
        Object.entries(raw.products || {}).forEach(([code, p]: [string, any]) => {
            const cat = raw.category?.[p?.categoryCode]?.name || "—";
            let qty = 0;
            const vars = raw.stock?.[code];
            if (vars && typeof vars === "object") {
                Object.values(vars).forEach((v: any) => {
                    qty += parseVariantQuantity(v);
                });
            }
            const price = parseFloat(p?.unit) || 0;
            const status = qty <= 0 ? "Out of stock" : qty <= 5 ? "Low" : "In stock";
            catalogRows.push({ code, name: p?.name || code, category: cat, price, qty, status });
        });

        const usersList = Object.entries(raw.fcm_tokens || {})
            .filter(([k]) => k !== "anonymous")
            .map(([id, u]: [string, any]) => ({
                id,
                phone: u?.phone || u?.email || "—",
                platform: u?.platform || "—",
                updatedAt: u?.updatedAt || 0,
            }))
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, 80);

        const slots = [8, 10, 12, 14, 16, 18, 20];
        const salesTrend = {
            labels: slots.map((h) => `${h}:00`),
            values: slots.map((h) => Math.round(today.hourRevenue[h] || 0)),
        };

        const notifEntries = Object.entries(raw.notifications || {});
        const notificationsRecent = notifEntries
            .map(([id, n]: [string, any]) => ({
                id,
                title: n?.title || "—",
                message: String(n?.message || "").slice(0, 200),
                type: String(n?.type || "info").toLowerCase(),
                ts: typeof n?.timestamp === "number" ? n.timestamp : 0,
            }))
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 40);

        const typeMap: Record<string, number> = {};
        notifEntries.forEach(([_, n]: [string, any]) => {
            const ty = String(n?.type || "info").toLowerCase();
            typeMap[ty] = (typeMap[ty] || 0) + 1;
        });
        const typeLabels = Object.keys(typeMap);
        const typeValues = typeLabels.map((k) => typeMap[k]);
        const typeSum = typeValues.reduce((a, b) => a + b, 0) || 1;
        const notificationTypeSplit = {
            labels: typeLabels.map((l) => (l ? l.charAt(0).toUpperCase() + l.slice(1) : "—")),
            values: typeValues,
            pct: typeValues.map((v) => Math.round((v / typeSum) * 100)),
        };

        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const volLabels: string[] = [];
        const volValues: number[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(dayStart);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            volLabels.push(d.toLocaleDateString(undefined, { weekday: "short" }));
            let c = 0;
            notifEntries.forEach(([_, n]: [string, any]) => {
                const ts = n?.timestamp;
                if (typeof ts !== "number") return;
                if (new Date(ts).toISOString().slice(0, 10) === key) c++;
            });
            volValues.push(c);
        }
        const notificationVolumeWeek = { labels: volLabels, values: volValues };

        const deliveredByDay: Record<string, number> = {};
        week.list.forEach((o) => {
            if (orderStatusBucket(o.status) !== "delivered") return;
            const ts = o.timestamp || o.createdAt;
            if (!ts) return;
            const key = new Date(ts).toISOString().slice(0, 10);
            deliveredByDay[key] = (deliveredByDay[key] || 0) + 1;
        });
        const resLabels: string[] = [];
        const resValues: number[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(dayStart);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            resLabels.push(d.toLocaleDateString(undefined, { weekday: "short" }));
            resValues.push(deliveredByDay[key] || 0);
        }
        const resolutionTrend = { labels: resLabels, values: resValues };

        const ticketEntries = Object.entries(raw.supportTickets || {});
        const supportTicketsRecent = ticketEntries
            .map(([id, t]: [string, any]) => ({
                id,
                title: t?.title || t?.subject || t?.topic || id.slice(0, 8),
                status: String(t?.status || "open"),
                ts: typeof t?.createdAt === "number" ? t.createdAt : typeof t?.timestamp === "number" ? t.timestamp : 0,
            }))
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 25);

        return {
            today,
            week,
            month,
            all,
            salesTrend,
            lowStockRows,
            lowStockAlerts: outOfStockSkus + lowStockProducts.length,
            stockHealth: { ok: okCount, low: lowCount, out: outCount },
            stockValue: stockVal,
            totalStockQuantity: stockQty,
            totalVariantSkus: allStockItems.length,
            outOfStockSkus,
            inventoryChartData,
            allStockItems,
            lowStockProducts,
            topToday,
            onlineRiders,
            fleetSize: riders.length,
            weekDailyRevenue,
            methodSplit: { labels: methodLabels, values: methodValues, pct: methodPct },
            ridersSample: riders.slice(0, 12),
            catalogRows: catalogRows.slice(0, 60),
            usersList,
            ordersTables: {
                today: today.ordersTable,
                week: week.ordersTable,
                month: month.ordersTable,
                all: all.ordersTable,
            },
            totalOrderCount: allOrders.length,
            productCount: Object.keys(raw.products || {}).length,
            notificationTypeSplit,
            notificationVolumeWeek,
            notificationsRecent,
            resolutionTrend,
            supportTicketsRecent,
            ticketCount: ticketEntries.length,
            notificationCount: notifEntries.length,
        };
    }, [raw]);

    return { loading, connected, lastSyncedAt, dbError, raw, metrics };
}
