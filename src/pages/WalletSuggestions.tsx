import React, { useCallback, useEffect, useMemo, useState } from "react";
import { firebase } from "@/lib/firebase";
import "firebase/compat/database";
import BackButton from "@/components/BackButton";
import {
    Lightbulb,
    Loader2,
    X,
    ChevronRight,
    User,
    Sparkles,
    Clock,
    Inbox,
    CheckCircle2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

/** Firebase node name as provided by backend / product spec */
const USER_SUGGES_PATH = "root/userSugges";

/** Written by this portal only; ignored in detail field list */
const PORTAL_READ_KEY = "_portalRead";
const PORTAL_READ_AT_KEY = "_portalReadAt";

function isSuggestionRead(raw: Record<string, unknown>): boolean {
    const v = raw[PORTAL_READ_KEY];
    return v === true || v === 1 || v === "true";
}

type SuggestionRow = {
    listKey: string;
    name: string;
    ts: number;
    raw: Record<string, unknown>;
    userKey?: string;
};

function parseSuggestionTs(o: Record<string, unknown>): number {
    const candidates = [o.timestamp, o.createdAt, o.time, o.updatedAt, o.date];
    for (const c of candidates) {
        if (typeof c === "number" && c > 0) return c;
        if (typeof c === "string" && c.trim()) {
            const n = Date.parse(c);
            if (!Number.isNaN(n)) return n;
        }
    }
    return 0;
}

function titleFromRecord(o: Record<string, unknown>, id: string): string {
    const n = o.name;
    if (typeof n === "string" && n.trim()) return n.trim();
    const t = o.title;
    if (typeof t === "string" && t.trim()) return t.trim();
    const topic = o.topic;
    if (typeof topic === "string" && topic.trim()) return topic.trim();
    return `Suggestion ${id.slice(0, 10)}`;
}

function looksLikeSuggestionLeaf(o: Record<string, unknown>): boolean {
    if (parseSuggestionTs(o) > 0) return true;
    if (typeof o.name === "string" && o.name.trim()) return true;
    if (typeof o.title === "string" && o.title.trim()) return true;
    if (typeof o.message === "string" && o.message.trim()) return true;
    if (typeof o.suggestion === "string" && o.suggestion.trim()) return true;
    if (typeof o.text === "string" && o.text.trim()) return true;
    return false;
}

function flattenUserSugges(raw: Record<string, unknown> | null): SuggestionRow[] {
    if (!raw) return [];
    const out: SuggestionRow[] = [];

    for (const [topId, val] of Object.entries(raw)) {
        if (val == null || typeof val !== "object" || Array.isArray(val)) continue;
        const top = val as Record<string, unknown>;

        const childEntries = Object.entries(top).filter(([, v]) => v != null && typeof v === "object" && !Array.isArray(v)) as [
            string,
            Record<string, unknown>,
        ][];

        const suggestionChildren = childEntries.filter(([, child]) => looksLikeSuggestionLeaf(child));
        const allChildrenAreSuggestionLeaves =
            suggestionChildren.length > 0 && suggestionChildren.length === childEntries.length;

        if (allChildrenAreSuggestionLeaves) {
            for (const [subId, child] of suggestionChildren) {
                out.push({
                    listKey: `${topId}/${subId}`,
                    name: titleFromRecord(child, subId),
                    ts: parseSuggestionTs(child),
                    raw: { ...child },
                    userKey: topId,
                });
            }
            continue;
        }

        out.push({
            listKey: topId,
            name: titleFromRecord(top, topId),
            ts: parseSuggestionTs(top),
            raw: top,
            userKey:
                (typeof top.userId === "string" && top.userId.trim()) ||
                (typeof top.phone === "string" && top.phone.trim()) ||
                (typeof top.uid === "string" && top.uid.trim())
                    ? String(top.userId || top.phone || top.uid)
                    : undefined,
        });
    }

    return out.sort((a, b) => b.ts - a.ts);
}

function formatDetailValue(v: unknown): string {
    if (v == null) return "—";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
    try {
        return JSON.stringify(v, null, 2);
    } catch {
        return String(v);
    }
}

function isMultilineValue(v: unknown): boolean {
    if (v == null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        if (typeof v === "string" && v.includes("\n")) return true;
        return typeof v === "string" && v.length > 80;
    }
    return true;
}

function previewBody(o: Record<string, unknown>): string | null {
    for (const k of ["message", "suggestion", "text", "body", "description", "note"]) {
        const v = o[k];
        if (typeof v === "string" && v.trim()) {
            const t = v.trim();
            return t.length > 140 ? `${t.slice(0, 140)}…` : t;
        }
    }
    return null;
}

function relativeTime(ts: number): string {
    if (!ts) return "";
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 45) return "Just now";
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function WalletSuggestions() {
    const { toast } = useToast();
    const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<SuggestionRow | null>(null);
    const [markingReadKey, setMarkingReadKey] = useState<string | null>(null);

    const markAsRead = useCallback(
        async (row: SuggestionRow, e: React.MouseEvent) => {
            e.stopPropagation();
            if (isSuggestionRead(row.raw)) return;
            setMarkingReadKey(row.listKey);
            try {
                await firebase.database().ref(`${USER_SUGGES_PATH}/${row.listKey}`).update({
                    [PORTAL_READ_KEY]: true,
                    [PORTAL_READ_AT_KEY]: firebase.database.ServerValue.TIMESTAMP,
                });
                setSelected((prev) =>
                    prev && prev.listKey === row.listKey ? { ...prev, raw: { ...prev.raw, [PORTAL_READ_KEY]: true } } : prev,
                );
                toast({ title: "Marked as read" });
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Update failed";
                toast({ title: "Could not mark as read", description: msg, variant: "destructive" });
            } finally {
                setMarkingReadKey(null);
            }
        },
        [toast],
    );

    useEffect(() => {
        const ref = firebase.database().ref(USER_SUGGES_PATH);
        const onVal = (snap: { val: () => unknown }) => {
            const v = snap.val();
            setRaw(v && typeof v === "object" ? (v as Record<string, unknown>) : {});
            setLoading(false);
            setError(null);
        };
        const onErr = (err: Error) => {
            setError(err?.message || "Failed to load suggestions");
            setLoading(false);
            setRaw({});
        };
        ref.on("value", onVal, onErr);
        return () => ref.off("value", onVal);
    }, []);

    const rows = useMemo(() => flattenUserSugges(raw), [raw]);
    const withUserCount = useMemo(() => rows.filter((r) => r.userKey).length, [rows]);

    const closeDetail = useCallback(() => setSelected(null), []);

    const detailEntries = useMemo(() => {
        if (!selected) return [];
        const skip = new Set([PORTAL_READ_KEY, PORTAL_READ_AT_KEY]);
        return Object.entries(selected.raw)
            .filter(([k]) => !skip.has(k))
            .sort(([a], [b]) => {
                const pa = a.startsWith("_") ? 1 : 0;
                const pb = b.startsWith("_") ? 1 : 0;
                if (pa !== pb) return pa - pb;
                return a.localeCompare(b);
            });
    }, [selected]);

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[#070712] font-sans text-slate-100">
            {/* Ambient */}
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_60%_at_10%_-10%,rgba(139,92,246,0.22),transparent_55%)]" />
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_50%_at_100%_0%,rgba(251,191,36,0.12),transparent_50%)]" />
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.08),transparent_45%)]" />
            <div
                className="pointer-events-none fixed inset-0 opacity-[0.35]"
                style={{
                    backgroundImage: `linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)`,
                    backgroundSize: "48px 48px",
                }}
            />

            <div className="relative mx-auto w-full min-w-0 max-w-none px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8 xl:px-10 2xl:px-12">
                {/* Hero */}
                <header className="relative mb-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.08] via-violet-950/20 to-amber-950/10 p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.06] backdrop-blur-xl sm:p-8">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />

                    <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-4">
                            <div className="relative shrink-0">
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 opacity-90 blur-md" />
                                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 shadow-lg shadow-amber-900/40 ring-2 ring-white/20">
                                    <Lightbulb className="h-7 w-7 text-white drop-shadow" strokeWidth={1.75} />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
                                    <h1 className="min-w-0 bg-gradient-to-r from-white via-violet-100 to-amber-100/90 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
                                        Suggestions
                                    </h1>
                                    {!loading && rows.length > 0 ? (
                                        <div className="flex shrink-0 flex-wrap items-stretch justify-end gap-2 sm:gap-3">
                                            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 sm:px-4 sm:py-2.5">
                                                <Sparkles className="h-4 w-4 shrink-0 text-amber-300" />
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</p>
                                                    <p className="text-lg font-black tabular-nums text-white sm:text-xl">{rows.length}</p>
                                                </div>
                                            </div>
                                            {withUserCount > 0 ? (
                                                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 sm:px-4 sm:py-2.5">
                                                    <User className="h-4 w-4 shrink-0 text-sky-400" />
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Linked user</p>
                                                        <p className="text-lg font-black tabular-nums text-white sm:text-xl">{withUserCount}</p>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                        <div className="shrink-0 sm:pt-1">
                            <BackButton />
                        </div>
                    </div>
                </header>

                {error && (
                    <div
                        className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/50 px-4 py-3 text-sm text-rose-100 shadow-lg shadow-rose-950/30"
                        role="alert"
                    >
                        <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-rose-400" />
                        {error}
                    </div>
                )}

                {loading && raw === null ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-24">
                        <div className="relative">
                            <div className="h-14 w-14 rounded-full border-2 border-violet-500/30 border-t-amber-400 animate-spin" />
                            <Lightbulb className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-amber-300/80" />
                        </div>
                        <p className="text-sm font-medium text-slate-400">Gathering suggestions…</p>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent px-6 py-16 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                            <Inbox className="h-8 w-8 text-slate-500" strokeWidth={1.25} />
                        </div>
                        <p className="text-lg font-semibold text-white">No suggestions yet</p>
                        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">When users submit feedback, entries will appear here automatically.</p>
                    </div>
                ) : (
                    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/25 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.75)]">
                        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                            <table className="w-full min-w-[820px] border-collapse text-left text-sm md:min-w-0" role="grid">
                                <thead>
                                    <tr className="border-b border-white/[0.08] bg-white/[0.04] text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        <th className="whitespace-nowrap px-4 py-3 sm:px-5">#</th>
                                        <th className="min-w-[8rem] px-4 py-3 sm:min-w-[10rem] sm:px-5 md:w-[18%]">Name</th>
                                        <th className="whitespace-nowrap px-4 py-3 sm:px-5">Time</th>
                                        <th className="min-w-[6rem] px-4 py-3 sm:px-5 md:w-[12%]">User</th>
                                        <th className="min-w-[7rem] px-4 py-3 sm:px-5 md:w-[14%]">Key</th>
                                        <th className="min-w-[10rem] px-4 py-3 sm:px-5 md:w-[32%] xl:min-w-[12rem]">Preview</th>
                                        <th className="whitespace-nowrap px-3 py-3 text-center sm:px-3.5">Read</th>
                                        <th className="w-12 px-2 py-3 text-center" aria-label="Open details">
                                            <span className="sr-only">Details</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.06]">
                                    {rows.map((row, idx) => {
                                        const isActive = selected?.listKey === row.listKey;
                                        const preview = previewBody(row.raw);
                                        const read = isSuggestionRead(row.raw);
                                        const marking = markingReadKey === row.listKey;
                                        return (
                                            <tr
                                                key={row.listKey}
                                                role="row"
                                                className={`cursor-pointer transition-colors ${
                                                    isActive
                                                        ? "bg-violet-950/50"
                                                        : read
                                                          ? "bg-white/[0.02] hover:bg-white/[0.05]"
                                                          : "hover:bg-white/[0.04]"
                                                }`}
                                                onClick={() => setSelected(row)}
                                            >
                                                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-500 sm:px-5">{idx + 1}</td>
                                                <td className="min-w-0 max-w-[220px] px-4 py-3 font-semibold text-white sm:max-w-[280px] sm:px-5 md:max-w-none">
                                                    <span className="line-clamp-2 break-words">{row.name}</span>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-slate-400 sm:px-5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs tabular-nums text-slate-300">
                                                            {row.ts ? new Date(row.ts).toLocaleString() : "—"}
                                                        </span>
                                                        {row.ts ? (
                                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/80">
                                                                {relativeTime(row.ts)}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </td>
                                                <td className="min-w-0 max-w-[140px] px-4 py-3 sm:max-w-[180px] sm:px-5 md:max-w-[14rem]">
                                                    {row.userKey ? (
                                                        <span className="inline-flex max-w-full items-center gap-1 truncate rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 font-mono text-xs text-sky-100/90">
                                                            <User className="h-3 w-3 shrink-0 text-sky-400" />
                                                            <span className="truncate">{row.userKey}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-600">—</span>
                                                    )}
                                                </td>
                                                <td className="min-w-0 max-w-[160px] px-4 py-3 font-mono text-[11px] text-slate-500 sm:max-w-[200px] sm:px-5 md:max-w-none">
                                                    <span className="line-clamp-2 break-all">{row.listKey}</span>
                                                </td>
                                                <td className="min-w-0 max-w-[240px] px-4 py-3 text-slate-400 sm:max-w-[20rem] sm:px-5 md:max-w-none">
                                                    {preview ? <span className="line-clamp-2 text-xs leading-snug">{preview}</span> : <span className="text-slate-600">—</span>}
                                                </td>
                                                <td className="px-2 py-3 text-center sm:px-3" onClick={(e) => e.stopPropagation()}>
                                                    {read ? (
                                                        <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1.5 text-[11px] font-semibold text-emerald-200/95 sm:px-2.5">
                                                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={2} />
                                                            Read
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={marking}
                                                            onClick={(e) => void markAsRead(row, e)}
                                                            aria-busy={marking}
                                                            className="inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:border-amber-400/35 hover:bg-white/[0.08] hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {marking ? (
                                                                <>
                                                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-300" aria-hidden />
                                                                    <span>Saving…</span>
                                                                </>
                                                            ) : (
                                                                "Mark read"
                                                            )}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-2 py-3 text-center">
                                                    <span
                                                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                                                            isActive
                                                                ? "border-violet-400/40 bg-violet-500/20 text-violet-200"
                                                                : "border-white/10 bg-white/[0.03] text-slate-500 hover:border-amber-400/30 hover:text-amber-200"
                                                        }`}
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {selected && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="suggestion-detail-title"
                >
                    <button
                        type="button"
                        className="absolute inset-0 bg-[#030712]/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
                        aria-label="Close suggestion details"
                        onClick={closeDetail}
                    />
                    <div className="animate-in slide-in-from-bottom-4 fade-in zoom-in-95 relative z-10 flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-[#0c0f1a] shadow-[0_25px_80px_-20px_rgba(0,0,0,0.9)] duration-300 sm:max-h-[85vh] sm:rounded-3xl">
                        <div className="relative h-1.5 w-full shrink-0 bg-gradient-to-r from-amber-400 via-violet-500 to-sky-500" />
                        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
                            <div className="min-w-0 flex-1">
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/80">Suggestion</p>
                                <h2 id="suggestion-detail-title" className="text-xl font-black leading-tight tracking-tight text-white sm:text-2xl">
                                    {selected.name}
                                </h2>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    {selected.ts ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-xs text-slate-300">
                                            <Clock className="h-3.5 w-3.5 text-amber-400/90" />
                                            {new Date(selected.ts).toLocaleString()}
                                        </span>
                                    ) : null}
                                    {selected.userKey ? (
                                        <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-100/95">
                                            <User className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate font-mono">{selected.userKey}</span>
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-2 font-mono text-[10px] text-slate-600">#{selected.listKey}</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeDetail}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-400 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
                            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                <span className="h-px flex-1 max-w-[3rem] bg-gradient-to-r from-transparent to-white/20" />
                                All fields
                                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/20" />
                            </h3>
                            <dl className="space-y-2.5">
                                {detailEntries.map(([key, val]) => {
                                    const multiline = isMultilineValue(val);
                                    return (
                                        <div
                                            key={key}
                                            className="rounded-xl border border-white/[0.06] bg-black/25 p-3 transition-colors hover:border-white/10 hover:bg-black/35"
                                        >
                                            <dt className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wide text-violet-300/85">
                                                <span className="inline-block h-1 w-1 rounded-full bg-amber-400/80" />
                                                {key}
                                            </dt>
                                            <dd
                                                className={`mt-2 break-words text-sm leading-relaxed text-slate-200 ${
                                                    multiline
                                                        ? "max-h-48 overflow-auto rounded-lg border border-white/5 bg-[#050814] p-3 font-mono text-xs text-slate-300"
                                                        : ""
                                                }`}
                                            >
                                                {multiline ? (
                                                    <pre className="whitespace-pre-wrap">{formatDetailValue(val)}</pre>
                                                ) : (
                                                    formatDetailValue(val)
                                                )}
                                            </dd>
                                        </div>
                                    );
                                })}
                            </dl>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
