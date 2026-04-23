/** Canonical pipeline labels (dropdown + progress). */
export const ORDER_PROGRESS_STEPS = [
    "Order Placed",
    "Packed",
    "Out for Delivery",
    "Arriving",
    "Delivered",
] as const;

export const ORDER_STATUS_DROPDOWN_OPTIONS = [...ORDER_PROGRESS_STEPS, "Cancelled"] as string[];

/**
 * Maps Firebase `status` to the exact dropdown string (e.g. `"order placed"` / `""Order Placed""` → Order Placed).
 */
export function canonicalOrderStatusForUi(raw: unknown): string {
    if (raw === null || raw === undefined) return "Order Placed";
    let s = String(raw).trim();
    while (s.length >= 2) {
        const dq = s.startsWith('"') && s.endsWith('"');
        const sq = s.startsWith("'") && s.endsWith("'");
        if (!dq && !sq) break;
        s = s.slice(1, -1).trim();
    }
    if (!s) return "Order Placed";

    const lower = s.toLowerCase();
    for (const opt of ORDER_STATUS_DROPDOWN_OPTIONS) {
        if (opt.toLowerCase() === lower) return opt;
    }
    if (lower === "accepted by store") return "Order Placed";

    return s;
}

const LEGACY_STATUS_PROGRESS_INDEX: Record<string, number> = {
    "Order Placed": 0,
    "Accepted by Store": 0,
    "Packing Order": 1,
    Packed: 1,
    "Ready for Pickup": 2,
    "Out for Delivery": 2,
    "On the Way": 3,
    Arrival: 3,
    Arriving: 3,
    Delivered: 4,
};

export function getOrderProgressStepIndex(status: string | null | undefined): number {
    const s0 = typeof status === "string" ? status.trim() : "";
    if (s0.toLowerCase() === "cancelled") return -1;
    if (LEGACY_STATUS_PROGRESS_INDEX[s0] !== undefined) return LEGACY_STATUS_PROGRESS_INDEX[s0];
    const lower = s0.toLowerCase();
    const legacyHit = Object.keys(LEGACY_STATUS_PROGRESS_INDEX).find((k) => k.toLowerCase() === lower);
    if (legacyHit) return LEGACY_STATUS_PROGRESS_INDEX[legacyHit];
    return 0;
}
