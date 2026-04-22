import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { firebase } from "@/lib/firebase";
import "firebase/compat/database";
import { toast, Toaster } from "sonner";
import BackButton from "@/components/BackButton";
import {
    Crown,
    Loader2,
    UserPlus,
    Users,
    Pencil,
    Trash2,
    Sparkles,
    Wallet,
    Mail,
    Phone,
    CreditCard,
    Hash,
    Shield,
    X,
    PlusCircle,
    ArrowDownLeft,
    ArrowUpRight,
    History,
    ChevronDown,
    ChevronUp,
    Search,
} from "lucide-react";

const WALLET_USERS_PATH = "root/walletusers";
/** App / backend can append wallet lines here with `phone` (10 digits) + same fields as user `transactions`. */
const WALLET_TRANSACTIONS_PATH = "root/wallet_transactions";
/** Optional per-user mirror: `root/wallet/{phone}/transactions` or `refills` / `spends` / `history` etc. */
const WALLET_SHARD_PATH = "root/wallet";
const PREMIUM_MIN_CREDIT = 2000;

type WalletTxType = "refill" | "spend";

export type WalletTxSource = "embedded" | "global" | "shard";

export type WalletTxRow = {
    id: string;
    type: WalletTxType;
    amount: number;
    balanceAfter: number;
    note: string;
    at: number;
    source: WalletTxSource;
};

type WalletUser = {
    id: string;
    uid?: string;
    name?: string;
    phone?: string;
    email?: string;
    creditAmount?: number;
    walletBalance?: number;
    pin?: string;
    walletEnabled?: boolean;
    isPremium?: boolean;
    transactionsList?: WalletTxRow[];
    [key: string]: unknown;
};

type FormState = {
    uid: string;
    name: string;
    phone: string;
    email: string;
    credit: string;
    wallet: string;
    pin: string;
};

const emptyForm: FormState = {
    uid: "",
    name: "",
    phone: "",
    email: "",
    credit: "",
    wallet: "",
    pin: "",
};

function normalizePhoneKey(s: string): string {
    const d = String(s).replace(/\D/g, "");
    if (d.length <= 10) return d;
    return d.slice(-10);
}

function parseAtMs(t: Record<string, unknown>): number {
    const atRaw = t.at ?? t.createdAt ?? t.timestamp ?? t.time ?? t.date ?? t.updatedAt;
    if (typeof atRaw === "number" && atRaw > 0) return atRaw;
    if (atRaw && typeof atRaw === "object") {
        const o = atRaw as { _seconds?: number; seconds?: number };
        const sec = Number(o._seconds ?? o.seconds);
        if (sec > 0) return sec * 1000;
    }
    if (typeof atRaw === "string" && atRaw.trim()) {
        const n = Date.parse(atRaw);
        return Number.isNaN(n) ? 0 : n;
    }
    return 0;
}

function inferWalletTxType(t: Record<string, unknown>): WalletTxType {
    const typ = String(t.type || t.kind || t.txType || t.action || "").toLowerCase();
    const spendHints = ["spend", "usage", "debit", "deduct", "payment", "order", "purchase", "paid", "pay", "wallet_debit", "withdraw", "used", "spent"];
    if (spendHints.some((h) => typ === h || typ.includes(h))) return "spend";
    const refillHints = ["refill", "credit", "topup", "top_up", "recharge", "grant", "wallet_credit", "wallet_refill", "deposit", "bonus", "cashback", "upi"];
    if (refillHints.some((h) => typ === h || typ.includes(h))) return "refill";
    const dir = String(t.direction || "").toLowerCase();
    if (dir === "out" || dir === "debit") return "spend";
    if (dir === "in" || dir === "credit") return "refill";
    const delta = Number(t.delta);
    if (delta < 0) return "spend";
    const amt = Number(t.amount);
    if (amt < 0) return "spend";
    return "refill";
}

function mapRecordToWalletTx(id: string, raw: Record<string, unknown>, source: WalletTxSource): WalletTxRow | null {
    const amountRaw = Number(
        raw.amount ??
            raw.value ??
            raw.rupees ??
            raw.sum ??
            raw.rechargeAmount ??
            raw.topUpAmount ??
            raw.topupAmount ??
            raw.creditedAmount ??
            raw.walletRecharge ??
            raw.money ??
            raw.paid ??
            raw.rupee ??
            raw.amt ??
            raw.addedAmount ??
            raw.credit ??
            0
    );
    const amount = Math.abs(amountRaw);
    const note = String(raw.note ?? raw.description ?? raw.title ?? raw.memo ?? raw.orderId ?? raw.reference ?? "").trim();
    if (!amount && !note) return null;
    if (!amount) return null;
    const type = inferWalletTxType(raw);
    const at = parseAtMs(raw);
    const balanceAfter = Number(raw.balanceAfter ?? raw.balance ?? raw.walletBalanceAfter ?? 0) || 0;
    return { id, type, amount, balanceAfter, at, note, source };
}

function parseFlexibleLedger(raw: unknown, idPrefix: string, source: WalletTxSource): WalletTxRow[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw
            .map((item, i) => {
                if (!item || typeof item !== "object") return null;
                return mapRecordToWalletTx(`${idPrefix}-a${i}`, item as Record<string, unknown>, source);
            })
            .filter(Boolean) as WalletTxRow[];
    }
    if (typeof raw === "object") {
        return Object.entries(raw as Record<string, unknown>)
            .map(([k, v]) => {
                if (!v || typeof v !== "object") return null;
                return mapRecordToWalletTx(`${idPrefix}-${k}`, v as Record<string, unknown>, source);
            })
            .filter(Boolean) as WalletTxRow[];
    }
    return [];
}

function collectGlobalLedgerRows(val: unknown): { phone: string; tid: string; raw: Record<string, unknown> }[] {
    const rows: { phone: string; tid: string; raw: Record<string, unknown> }[] = [];
    if (!val || typeof val !== "object") return rows;
    const top = val as Record<string, unknown>;

    for (const [tid, raw] of Object.entries(top)) {
        if (!raw || typeof raw !== "object") continue;
        const t = raw as Record<string, unknown>;
        const phoneFromFields = normalizePhoneKey(
            String(t.phone || t.userPhone || t.userId || t.mobile || t.userKey || t.customerPhone || "")
        );
        if (phoneFromFields.length >= 10) {
            rows.push({ phone: phoneFromFields, tid, raw: t });
            continue;
        }

        const phoneFromKey = normalizePhoneKey(tid);
        if (phoneFromKey.length !== 10) continue;
        const nested = t as Record<string, unknown>;
        const childEntries = Object.entries(nested).filter(([, v]) => v != null && typeof v === "object");
        const amtTop = Number(
            t.amount ?? t.value ?? t.rupees ?? t.sum ?? t.rechargeAmount ?? t.topUpAmount ?? t.topupAmount ?? 0
        );
        const looksLikeSingleTx =
            amtTop !== 0 || Boolean(t.type || t.kind || t.note || t.description || t.txType || t.action);
        if (childEntries.length === 0 && looksLikeSingleTx) {
            rows.push({ phone: phoneFromKey, tid, raw: t });
            continue;
        }
        if (childEntries.length === 0) continue;
        for (const [innerId, innerRaw] of childEntries) {
            const inner = innerRaw as Record<string, unknown>;
            const innerPhone = normalizePhoneKey(String(inner.phone || inner.userPhone || inner.userId || inner.mobile || ""));
            const phone = innerPhone.length >= 10 ? innerPhone : phoneFromKey;
            rows.push({ phone, tid: `${tid}-${innerId}`, raw: inner });
        }
    }
    return rows;
}

function groupGlobalLedgerByUser(val: unknown): Record<string, WalletTxRow[]> {
    const out: Record<string, WalletTxRow[]> = {};
    for (const { phone, tid, raw } of collectGlobalLedgerRows(val)) {
        const pk = normalizePhoneKey(phone);
        if (pk.length < 10) continue;
        const row = mapRecordToWalletTx(`g-${tid}`, raw, "global");
        if (!row) continue;
        if (!out[pk]) out[pk] = [];
        out[pk].push(row);
    }
    return out;
}

function getShardNodeForUser(shard: Record<string, unknown> | null, userId: string): unknown {
    if (!shard || typeof shard !== "object") return null;
    if (shard[userId] != null) return shard[userId];
    const n = normalizePhoneKey(userId);
    for (const k of Object.keys(shard)) {
        if (normalizePhoneKey(k) === n) return shard[k];
    }
    return null;
}

const SHARD_LEDGER_KEYS = [
    "transactions",
    "refills",
    "refillHistory",
    "refill_history",
    "topups",
    "topupHistory",
    "recharges",
    "rechargeHistory",
    "credits",
    "spends",
    "spendHistory",
    "debits",
    "usage",
    "ledger",
    "history",
    "activity",
] as const;

/** Ledger collections stored directly on `root/walletusers/{phone}` (not only `transactions`). */
const WALLETUSER_LEDGER_KEYS = [
    "transactions",
    "refillHistory",
    "refill_history",
    "refills",
    "walletRefills",
    "topups",
    "topupHistory",
    "recharges",
    "rechargeHistory",
    "walletRechargeHistory",
] as const;

function parseEmbeddedWalletUserLedgers(row: Record<string, unknown>): WalletTxRow[] {
    const parts: WalletTxRow[] = [];
    for (const key of WALLETUSER_LEDGER_KEYS) {
        const raw = row[key];
        if (raw) parts.push(...parseFlexibleLedger(raw, `u-${String(key)}`, "embedded"));
    }
    return parts;
}

function parseWalletShardNode(node: unknown): WalletTxRow[] {
    if (node == null) return [];
    if (Array.isArray(node)) return parseFlexibleLedger(node, "sh", "shard");
    if (typeof node !== "object") return [];
    const o = node as Record<string, unknown>;
    const parts: WalletTxRow[] = [];
    for (const key of SHARD_LEDGER_KEYS) {
        if (o[key]) parts.push(...parseFlexibleLedger(o[key], `sh-${key}`, "shard"));
    }
    return parts;
}

function dedupeTransactions(rows: WalletTxRow[]): WalletTxRow[] {
    const m = new Map<string, WalletTxRow>();
    for (const tx of rows) {
        const key = `${tx.at}|${tx.type}|${tx.amount}|${(tx.note || "").slice(0, 80)}`;
        if (!m.has(key)) m.set(key, tx);
    }
    return [...m.values()].sort((a, b) => (b.at || 0) - (a.at || 0));
}

function txSourceLabel(source: WalletTxSource): string {
    if (source === "embedded") return "Portal";
    if (source === "global") return "App";
    return "Wallet";
}

function walletUserMatchesQuery(u: WalletUser, needle: string): boolean {
    const raw = needle.trim().toLowerCase();
    if (!raw) return true;
    const name = String(u.name || "").toLowerCase();
    if (name.includes(raw)) return true;
    const uid = String(u.uid || "").toLowerCase();
    if (uid.includes(raw)) return true;
    const digits = raw.replace(/\D/g, "");
    if (digits.length > 0) {
        const idDigits = normalizePhoneKey(u.id);
        const phoneDigits = normalizePhoneKey(String(u.phone || ""));
        if (idDigits.includes(digits) || phoneDigits.includes(digits)) return true;
    }
    return false;
}

function formatTxDateTime(at: number): string {
    if (!at) return "—";
    try {
        return new Date(at).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        });
    } catch {
        return "—";
    }
}

const PremiumEntry = () => {
    const [rawWalletUsers, setRawWalletUsers] = useState<Record<string, unknown> | null>(null);
    const [rawGlobalLedger, setRawGlobalLedger] = useState<unknown>(null);
    const [rawWalletShard, setRawWalletShard] = useState<unknown>(null);
    const [loadingList, setLoadingList] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [emailTouched, setEmailTouched] = useState(false);
    const [walletPulse, setWalletPulse] = useState(false);
    const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [expandedTxUserId, setExpandedTxUserId] = useState<string | null>(null);
    const [ledgerModal, setLedgerModal] = useState<{ user: WalletUser; mode: "refill" | "spend" } | null>(null);
    const [ledgerAmount, setLedgerAmount] = useState("");
    const [ledgerNote, setLedgerNote] = useState("");
    const [ledgerSaving, setLedgerSaving] = useState(false);
    const [walletSearchInput, setWalletSearchInput] = useState("");
    const [walletSearchApplied, setWalletSearchApplied] = useState("");
    const [walletIntroOpen, setWalletIntroOpen] = useState(false);

    useEffect(() => {
        const r = firebase.database().ref(WALLET_USERS_PATH);
        const onVal = (snap: { val: () => unknown }) => {
            const v = snap.val();
            setRawWalletUsers(v && typeof v === "object" ? (v as Record<string, unknown>) : {});
            setLoadingList(false);
        };
        r.on("value", onVal);
        return () => r.off("value", onVal);
    }, []);

    useEffect(() => {
        const r = firebase.database().ref(WALLET_TRANSACTIONS_PATH);
        const onVal = (snap: { val: () => unknown }) => setRawGlobalLedger(snap.val());
        const onErr = () => setRawGlobalLedger(null);
        r.on("value", onVal, onErr);
        return () => r.off("value", onVal);
    }, []);

    useEffect(() => {
        const r = firebase.database().ref(WALLET_SHARD_PATH);
        const onVal = (snap: { val: () => unknown }) => setRawWalletShard(snap.val());
        const onErr = () => setRawWalletShard(null);
        r.on("value", onVal, onErr);
        return () => r.off("value", onVal);
    }, []);

    const globalByUser = useMemo(() => groupGlobalLedgerByUser(rawGlobalLedger), [rawGlobalLedger]);

    const users = useMemo(() => {
        if (!rawWalletUsers) return [];
        const shardObj = rawWalletShard && typeof rawWalletShard === "object" ? (rawWalletShard as Record<string, unknown>) : null;
        return Object.entries(rawWalletUsers)
            .map(([id, data]) => {
                const row = data as Record<string, unknown>;
                const embedded = parseEmbeddedWalletUserLedgers(row);
                const global = globalByUser[normalizePhoneKey(id)] || [];
                const shardNode = getShardNodeForUser(shardObj, id);
                const shard = parseWalletShardNode(shardNode);
                const transactionsList = dedupeTransactions([...embedded, ...global, ...shard]);
                return { id, ...row, transactionsList } as WalletUser;
            })
            .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
    }, [rawWalletUsers, rawWalletShard, globalByUser]);

    const filteredUsers = useMemo(() => {
        if (!walletSearchApplied.trim()) return users;
        return users.filter((u) => walletUserMatchesQuery(u, walletSearchApplied));
    }, [users, walletSearchApplied]);

    const applyWalletSearch = useCallback(() => {
        setWalletSearchApplied(walletSearchInput.trim());
    }, [walletSearchInput]);

    const clearWalletSearch = useCallback(() => {
        setWalletSearchInput("");
        setWalletSearchApplied("");
    }, []);

    const setField = useCallback((key: keyof FormState, value: string) => {
        setForm((f) => ({ ...f, [key]: value }));
    }, []);

    const onCreditChange = useCallback((raw: string) => {
        const digits = raw.replace(/\D/g, "");
        setForm((f) => ({ ...f, credit: digits }));
        if (syncTimeout.current) clearTimeout(syncTimeout.current);
        syncTimeout.current = setTimeout(() => {
            setForm((f) => ({ ...f, wallet: digits }));
            setWalletPulse(true);
            window.setTimeout(() => setWalletPulse(false), 350);
        }, 100);
    }, []);

    const isGmail = (e: string) => e.toLowerCase().trim().endsWith("@gmail.com");

    const resetForm = useCallback(() => {
        setForm(emptyForm);
        setEditingId(null);
        setEmailTouched(false);
    }, []);

    const openLedger = (user: WalletUser, mode: "refill" | "spend") => {
        setLedgerModal({ user, mode });
        setLedgerAmount("");
        setLedgerNote("");
    };

    const closeLedger = () => {
        setLedgerModal(null);
        setLedgerAmount("");
        setLedgerNote("");
        setLedgerSaving(false);
    };

    const applyLedger = async () => {
        if (!ledgerModal) return;
        const amt = parseInt(ledgerAmount.replace(/\D/g, ""), 10) || 0;
        if (amt <= 0) {
            toast.error("Enter a positive amount.");
            return;
        }
        const { user, mode } = ledgerModal;
        const cur = Number(user.walletBalance) || 0;
        const newBal = mode === "refill" ? cur + amt : cur - amt;
        if (mode === "spend" && newBal < 0) {
            toast.error("Insufficient wallet balance.");
            return;
        }

        const dbRoot = firebase.database().ref();
        const txKey = dbRoot.child(`${WALLET_USERS_PATH}/${user.id}/transactions`).push().key;
        const globalKey = dbRoot.child(WALLET_TRANSACTIONS_PATH).push().key;
        if (!txKey || !globalKey) {
            toast.error("Could not create transaction id.");
            return;
        }

        setLedgerSaving(true);
        try {
            const payload = {
                type: mode,
                amount: amt,
                balanceAfter: newBal,
                note: ledgerNote.trim() || (mode === "refill" ? "Wallet refill" : "Wallet usage"),
                at: firebase.database.ServerValue.TIMESTAMP,
            };
            const globalPayload = {
                ...payload,
                phone: user.id,
                userPhone: user.id,
                userKey: user.id,
                source: "portal",
            };
            const updates: Record<string, unknown> = {
                [`${WALLET_USERS_PATH}/${user.id}/walletBalance`]: newBal,
                [`${WALLET_USERS_PATH}/${user.id}/transactions/${txKey}`]: payload,
                [`${WALLET_TRANSACTIONS_PATH}/${globalKey}`]: globalPayload,
            };
            await dbRoot.update(updates);
            toast.success(mode === "refill" ? "Wallet refilled." : "Spend recorded.");
            closeLedger();
        } catch (e) {
            console.error(e);
            toast.error("Update failed.");
        } finally {
            setLedgerSaving(false);
        }
    };

    const startEdit = useCallback((u: WalletUser) => {
        setEditingId(u.id);
        const digits = u.phone?.replace(/^\+91\s?/, "").replace(/\D/g, "") || u.id;
        setForm({
            uid: String(u.uid || "").toUpperCase().slice(0, 6),
            name: String(u.name || "").replace(/[^a-zA-Z\s]/g, ""),
            phone: digits.slice(0, 10),
            email: String(u.email || ""),
            credit: String(u.creditAmount ?? ""),
            wallet: String(u.walletBalance ?? ""),
            pin: String(u.pin || "").replace(/\D/g, "").slice(0, 6),
        });
        setEmailTouched(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isGmail(form.email)) {
            setEmailTouched(true);
            toast.error("Use a Gmail address (@gmail.com).");
            return;
        }
        setEmailTouched(false);
        const phoneDigits = form.phone.replace(/\D/g, "").slice(0, 10);
        if (phoneDigits.length !== 10) {
            toast.error("Enter a valid 10-digit phone number.");
            return;
        }
        const creditVal = parseInt(form.credit, 10) || 0;
        const walletBal = parseInt(form.wallet, 10) || 0;
        const uid = form.uid.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
        if (!uid) {
            toast.error("Unique ID is required (max 6 characters).");
            return;
        }

        const base = {
            uid,
            name: form.name.trim(),
            phone: `+91 ${phoneDigits}`,
            email: form.email.toLowerCase().trim(),
            creditAmount: creditVal,
            walletBalance: walletBal,
            pin: form.pin.replace(/\D/g, ""),
        };

        const db = firebase.database().ref(WALLET_USERS_PATH);
        setSubmitting(true);
        try {
            if (editingId) {
                const existing = users.find((x) => x.id === editingId);
                if (!existing) {
                    toast.error("User not found.");
                    return;
                }
                const updated: Record<string, unknown> = {
                    ...existing,
                    ...base,
                    isPremium: creditVal < PREMIUM_MIN_CREDIT ? false : Boolean(existing.isPremium),
                };
                delete updated.id;
                delete updated.transactionsList;
                if (editingId !== phoneDigits) {
                    await db.child(editingId).remove();
                }
                await db.child(phoneDigits).set(updated);
                toast.success("User updated.");
                resetForm();
            } else {
                await db.child(phoneDigits).set({
                    ...base,
                    walletEnabled: false,
                    isPremium: false,
                });
                if (walletBal > 0) {
                    const txKey = db.child(`${phoneDigits}/transactions`).push().key;
                    const globalKey = firebase.database().ref(WALLET_TRANSACTIONS_PATH).push().key;
                    if (txKey && globalKey) {
                        const initialTx = {
                            type: "refill",
                            amount: walletBal,
                            balanceAfter: walletBal,
                            note: "Initial balance",
                            at: firebase.database.ServerValue.TIMESTAMP,
                        };
                        await firebase.database().ref().update({
                            [`${WALLET_USERS_PATH}/${phoneDigits}/transactions/${txKey}`]: initialTx,
                            [`${WALLET_TRANSACTIONS_PATH}/${globalKey}`]: {
                                ...initialTx,
                                phone: phoneDigits,
                                userPhone: phoneDigits,
                                userKey: phoneDigits,
                                source: "portal",
                            },
                        });
                    }
                }
                toast.success("User registered.");
                setForm(emptyForm);
            }
        } catch (err: unknown) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Save failed.");
        } finally {
            setSubmitting(false);
        }
    };

    const toggleWallet = async (u: WalletUser) => {
        try {
            await firebase.database().ref(`${WALLET_USERS_PATH}/${u.id}`).update({
                walletEnabled: !u.walletEnabled,
            });
            toast.success(u.walletEnabled ? "Wallet disabled." : "Wallet enabled.");
        } catch {
            toast.error("Could not update wallet.");
        }
    };

    const grantPremium = async (u: WalletUser) => {
        const credit = Number(u.creditAmount) || 0;
        if (credit < PREMIUM_MIN_CREDIT || !u.walletEnabled) return;
        try {
            await firebase.database().ref(`${WALLET_USERS_PATH}/${u.id}`).update({ isPremium: true });
            toast.success("Premium granted.");
        } catch {
            toast.error("Could not grant premium.");
        }
    };

    const deleteUser = (u: WalletUser) => {
        if (!window.confirm(`Permanently delete wallet user ${u.phone || u.id}?`)) return;
        firebase
            .database()
            .ref(`${WALLET_USERS_PATH}/${u.id}`)
            .remove()
            .then(() => {
                if (editingId === u.id) resetForm();
                if (expandedTxUserId === u.id) setExpandedTxUserId(null);
                toast.success("User removed.");
            })
            .catch(() => toast.error("Delete failed."));
    };

    const glass =
        "rounded-2xl border border-white/[0.12] bg-gradient-to-b from-white/[0.09] to-white/[0.03] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.04] backdrop-blur-xl sm:rounded-3xl";

    const inputClass =
        "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all";

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-slate-950 font-sans text-slate-100">
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,80,220,0.22),transparent)]" />
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(59,130,246,0.12),transparent_45%)]" />
            <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-950/95 to-indigo-950/80" />
            <Toaster richColors position="top-right" />

            <div className="relative mx-auto max-w-7xl px-3 pb-20 pt-4 sm:px-5 sm:pt-6 md:px-6">
                <header className={`${glass} mb-6 p-5 sm:mb-8 sm:p-6`}>
                    <h1 className="sr-only">Wallet &amp; premium</h1>
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                            <div className="relative shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-3.5 shadow-lg shadow-amber-500/20 ring-2 ring-white/10 ring-offset-2 ring-offset-slate-950">
                                <Crown className="h-8 w-8 text-white drop-shadow-md sm:h-9 sm:w-9" strokeWidth={1.75} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <details className="max-w-2xl rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-500 open:bg-black/30">
                                    <summary className="cursor-pointer select-none font-medium text-slate-400 hover:text-slate-300">Firebase paths merged for history</summary>
                                    <p className="mt-2 leading-relaxed">
                                        <code className="rounded bg-white/10 px-1 py-0.5 text-[10px] text-sky-300/90">{WALLET_USERS_PATH}</code> (per-user ledgers),{" "}
                                        <code className="rounded bg-white/10 px-1 py-0.5 text-[10px] text-sky-300/90">{WALLET_TRANSACTIONS_PATH}</code>,{" "}
                                        <code className="rounded bg-white/10 px-1 py-0.5 text-[10px] text-sky-300/90">{WALLET_SHARD_PATH}</code>.
                                    </p>
                                </details>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center md:pl-4">
                            <button
                                type="button"
                                id="wallet-premium-intro-toggle"
                                aria-expanded={walletIntroOpen}
                                aria-controls="wallet-premium-intro"
                                onClick={() => setWalletIntroOpen((o) => !o)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-gradient-to-r from-violet-600/80 to-indigo-600/80 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-950/40 transition hover:from-violet-500 hover:to-indigo-500"
                            >
                                Wallet &amp; premium
                                {walletIntroOpen ? <ChevronUp className="h-4 w-4 opacity-80" /> : <ChevronDown className="h-4 w-4 opacity-80" />}
                            </button>
                            <BackButton />
                        </div>
                    </div>
                    {walletIntroOpen && (
                        <div
                            id="wallet-premium-intro"
                            className="mt-5 border-t border-white/10 pt-5"
                            role="region"
                            aria-labelledby="wallet-premium-intro-toggle"
                        >
                            <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Wallet &amp; premium</h2>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/[0.12] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200/90">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                                    Live
                                </span>
                            </div>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                                Grant credit, manage wallet balance, and premium access. Activity merges portal actions with app ledger data.
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                                Premium when credit is at least{" "}
                                <span className="font-semibold text-slate-300">₹{PREMIUM_MIN_CREDIT.toLocaleString("en-IN")}</span> and wallet is enabled.
                            </p>
                        </div>
                    )}
                </header>

                <div className="grid grid-cols-1 items-start gap-6 lg:gap-8 xl:grid-cols-12">
                    <section className={`${glass} p-5 sm:p-6 xl:sticky xl:top-24 xl:col-span-5 xl:self-start`}>
                        <h2 className="mb-5 flex items-center gap-2 border-b border-white/10 pb-4 text-base font-semibold text-white sm:text-lg">
                            {editingId ? (
                                <Pencil className="h-5 w-5 text-violet-400" />
                            ) : (
                                <UserPlus className="h-5 w-5 text-sky-400" />
                            )}
                            {editingId ? "Edit user" : "Register new user"}
                        </h2>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                                        <Hash className="h-3.5 w-3.5 opacity-70" />
                                        Unique ID (max 6)
                                    </label>
                                    <input
                                        value={form.uid}
                                        onChange={(e) => setField("uid", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                                        required
                                        maxLength={6}
                                        placeholder="e.g. AB12CD"
                                        className={`${inputClass} font-mono tracking-widest`}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                                        <Users className="h-3.5 w-3.5 opacity-70" />
                                        Full name
                                    </label>
                                    <input
                                        value={form.name}
                                        onChange={(e) => setField("name", e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
                                        required
                                        placeholder="John Doe"
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                                    <Phone className="h-3.5 w-3.5 opacity-70" />
                                    Phone (10 digits)
                                </label>
                                <div className="flex overflow-hidden rounded-xl border border-white/10 bg-black/25 focus-within:border-blue-400/60 focus-within:ring-2 focus-within:ring-blue-500/40">
                                    <span className="border-r border-white/10 px-4 py-2.5 font-mono text-sm font-bold text-slate-400">+91</span>
                                    <input
                                        value={form.phone}
                                        onChange={(e) => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                                        inputMode="numeric"
                                        required
                                        maxLength={10}
                                        placeholder="0000000000"
                                        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm tracking-widest text-white placeholder:text-slate-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                                    <Mail className="h-3.5 w-3.5 opacity-70" />
                                    Email (Gmail)
                                </label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => {
                                        setField("email", e.target.value);
                                        setEmailTouched(false);
                                    }}
                                    required
                                    placeholder="user@gmail.com"
                                    className={`${inputClass} ${emailTouched && !isGmail(form.email) ? "border-rose-500/60 ring-2 ring-rose-500/30" : ""}`}
                                />
                                {emailTouched && !isGmail(form.email) && <p className="mt-1 text-xs text-rose-400">Must end with @gmail.com</p>}
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                                        <CreditCard className="h-3.5 w-3.5 opacity-70" />
                                        Credit amount
                                    </label>
                                    <input
                                        value={form.credit}
                                        onChange={(e) => onCreditChange(e.target.value)}
                                        inputMode="numeric"
                                        required
                                        placeholder="0"
                                        className={`${inputClass} focus:ring-emerald-500/40`}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 flex justify-between text-xs font-medium text-slate-300">
                                        <span className="flex items-center gap-1.5">
                                            <Wallet className="h-3.5 w-3.5 opacity-70" />
                                            Wallet (₹)
                                        </span>
                                        <span className="text-[10px] font-normal text-sky-400">Auto from credit</span>
                                    </label>
                                    <input
                                        value={form.wallet}
                                        onChange={(e) => setField("wallet", e.target.value.replace(/\D/g, ""))}
                                        inputMode="numeric"
                                        required
                                        className={`${inputClass} ${walletPulse ? "ring-2 ring-sky-400/50" : ""}`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                                    <Shield className="h-3.5 w-3.5 opacity-70" />
                                    PIN
                                </label>
                                <input
                                    value={form.pin}
                                    onChange={(e) => setField("pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    inputMode="numeric"
                                    required
                                    maxLength={6}
                                    placeholder="••••"
                                    className={`${inputClass} tracking-[0.3em]`}
                                />
                            </div>

                            <div className="mt-2 flex gap-3">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60 ${
                                        editingId
                                            ? "bg-gradient-to-r from-violet-600 to-purple-700 shadow-violet-500/25 hover:from-violet-500 hover:to-purple-600"
                                            : "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500"
                                    }`}
                                >
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Pencil className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                                    {editingId ? "Update user" : "Add user to system"}
                                </button>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                                    >
                                        <X className="h-4 w-4" />
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>

                    <section className={`${glass} flex min-h-[320px] flex-col overflow-hidden xl:col-span-7`}>
                        <div className="border-b border-white/10 bg-gradient-to-r from-emerald-500/[0.07] via-transparent to-violet-500/[0.07] px-4 py-4 sm:px-6 sm:py-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-white sm:text-lg">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/20">
                                            <Users className="h-5 w-5" />
                                        </span>
                                        Wallet users
                                    </h2>
                                    <p className="mt-1.5 text-xs text-slate-500">Search by name or phone, then use actions on each card.</p>
                                </div>
                                <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-semibold tabular-nums text-slate-200">
                                    {walletSearchApplied.trim() ? (
                                        <>
                                            <span className="text-emerald-300">{filteredUsers.length}</span>
                                            <span className="mx-1 text-slate-600">/</span>
                                            <span>{users.length}</span>
                                            <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-slate-500">shown</span>
                                        </>
                                    ) : (
                                        <>
                                            {users.length}
                                            <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-slate-500">total</span>
                                        </>
                                    )}
                                </span>
                            </div>
                            <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/25 p-1.5 sm:flex-row sm:items-stretch">
                                <div className="relative min-h-[44px] min-w-0 flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="search"
                                        value={walletSearchInput}
                                        onChange={(e) => setWalletSearchInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                applyWalletSearch();
                                            }
                                        }}
                                        placeholder="Name, phone, or UID…"
                                        className="h-full min-h-[44px] w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                        aria-label="Search wallet users by name or phone"
                                    />
                                </div>
                                <div className="flex shrink-0 gap-1.5 sm:pr-0.5">
                                    <button
                                        type="button"
                                        onClick={() => applyWalletSearch()}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/30 transition hover:from-violet-500 hover:to-indigo-500 sm:flex-none sm:px-5"
                                    >
                                        <Search className="h-4 w-4 shrink-0 opacity-90" />
                                        Search
                                    </button>
                                    {walletSearchApplied.trim() !== "" && (
                                        <button
                                            type="button"
                                            onClick={() => clearWalletSearch()}
                                            className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
                            {loadingList ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                                    <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
                                    <p className="text-sm">Loading users…</p>
                                </div>
                            ) : users.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-400">
                                    <Wallet className="h-14 w-14 opacity-40" />
                                    <p className="text-sm">No users yet. Add one from the form.</p>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-400">
                                    <Search className="h-12 w-12 opacity-40" />
                                    <p className="text-sm text-slate-300">
                                        No wallet users match{' '}
                                        <span className="font-medium text-white">&quot;{walletSearchApplied}&quot;</span>.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => clearWalletSearch()}
                                        className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                                    >
                                        Clear search
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {filteredUsers.map((u) => {
                                        const enabled = Boolean(u.walletEnabled);
                                        const credit = Number(u.creditAmount) || 0;
                                        const eligible = credit >= PREMIUM_MIN_CREDIT && enabled;
                                        const premiumActive = Boolean(u.isPremium && enabled);
                                        const txs = u.transactionsList || [];
                                        const expanded = expandedTxUserId === u.id;
                                        const initial = (u.name || u.uid || "?").trim().slice(0, 1).toUpperCase() || "?";

                                        return (
                                            <article
                                                key={u.id}
                                                className="group relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-4 shadow-lg transition duration-300 hover:border-violet-400/25 hover:shadow-violet-950/20 sm:p-5"
                                            >
                                                <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-violet-600/10 blur-2xl transition group-hover:bg-violet-500/15" />
                                                <div className="relative flex flex-wrap items-start justify-between gap-3">
                                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-md ring-1 ring-white/10">
                                                            {initial}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-base font-semibold capitalize tracking-tight text-white">{u.name || "—"}</p>
                                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                                <span className="rounded-md border border-white/10 bg-black/30 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-slate-300">
                                                                    {u.uid || "—"}
                                                                </span>
                                                                {premiumActive && (
                                                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                                                                        <Crown className="h-3 w-3" />
                                                                        Premium
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                                        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Wallet</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleWallet(u)}
                                                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                                                                enabled ? "bg-emerald-500 shadow-emerald-500/30" : "bg-slate-600/90"
                                                            }`}
                                                            aria-label={enabled ? "Disable wallet" : "Enable wallet"}
                                                        >
                                                            <span
                                                                className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
                                                                    enabled ? "translate-x-7" : "translate-x-1"
                                                                }`}
                                                            />
                                                        </button>
                                                        <span className="text-[10px] text-slate-500">{enabled ? "On" : "Off"}</span>
                                                    </div>
                                                </div>

                                                <div className="relative mt-4 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
                                                    <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Contact</p>
                                                        <p className="mt-0.5 truncate font-mono text-xs text-slate-200">{u.phone || u.id}</p>
                                                        <p className="mt-1 truncate text-xs text-slate-500" title={String(u.email || "")}>
                                                            {u.email || "—"}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Balances</p>
                                                        <p className="mt-0.5 text-sm font-medium text-emerald-300/90">Credit ₹{credit.toLocaleString("en-IN")}</p>
                                                        <p className="mt-0.5 text-sm font-bold text-sky-300">Wallet ₹{(Number(u.walletBalance) || 0).toLocaleString("en-IN")}</p>
                                                    </div>
                                                </div>

                                                <div className="relative mt-3 flex flex-wrap items-center gap-2">
                                                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">PIN</span>
                                                    <span className="rounded-lg border border-white/10 bg-black/35 px-2.5 py-1 font-mono text-xs tracking-[0.2em] text-slate-200">{u.pin || "—"}</span>
                                                </div>

                                                <div className="relative mt-4 flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openLedger(u, "refill")}
                                                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-md shadow-emerald-900/20 transition hover:from-teal-400 hover:to-emerald-500 min-[400px]:flex-none"
                                                    >
                                                        <PlusCircle className="h-3.5 w-3.5 shrink-0" />
                                                        Refill
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openLedger(u, "spend")}
                                                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:bg-white/10 min-[400px]:flex-none"
                                                    >
                                                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                                                        Spend
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedTxUserId(expanded ? null : u.id)}
                                                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-sky-200 transition hover:bg-sky-500/15 min-[400px]:flex-none"
                                                    >
                                                        <History className="h-3.5 w-3.5 shrink-0" />
                                                        {txs.length} activity
                                                        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                    </button>
                                                    {!premiumActive && (
                                                        <button
                                                            type="button"
                                                            disabled={!eligible || Boolean(u.isPremium && !enabled)}
                                                            onClick={() => grantPremium(u)}
                                                            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition min-[400px]:flex-none ${
                                                                eligible && !(u.isPremium && !enabled)
                                                                    ? "bg-gradient-to-r from-amber-400 to-amber-600 text-slate-900 shadow-md shadow-amber-900/20 hover:from-amber-300 hover:to-amber-500"
                                                                    : "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500 opacity-60"
                                                            }`}
                                                        >
                                                            {u.isPremium && !enabled ? "Wallet off" : "Premium"}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(u)}
                                                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-sky-300 transition hover:bg-white/5"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteUser(u)}
                                                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-500/20 px-3 py-2.5 text-xs font-semibold text-rose-300/90 transition hover:bg-rose-500/10"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Delete
                                                    </button>
                                                </div>

                                                {expanded && (
                                                    <div className="relative mt-4 border-t border-white/10 pt-4">
                                                        <div className="rounded-xl border border-white/10 bg-black/30 p-3 sm:p-4">
                                                            <h4 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                                <History className="h-4 w-4 shrink-0 text-sky-400" />
                                                                Wallet activity
                                                            </h4>
                                                            {txs.length === 0 ? (
                                                                <p className="text-sm leading-relaxed text-slate-500">
                                                                    No activity yet. App lines sync from{" "}
                                                                    <code className="rounded bg-white/10 px-1 text-[11px] text-sky-300/90">{WALLET_TRANSACTIONS_PATH}</code>. Use Refill or
                                                                    Spend for portal entries.
                                                                </p>
                                                            ) : (
                                                                <ul className="max-h-56 space-y-2 overflow-y-auto pr-1 custom-scrollbar sm:max-h-64">
                                                                    {txs.map((tx) => (
                                                                        <li
                                                                            key={tx.id}
                                                                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs"
                                                                        >
                                                                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                                                                {tx.type === "refill" ? (
                                                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                                                                                        <ArrowDownLeft className="h-4 w-4" />
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300">
                                                                                        <ArrowUpRight className="h-4 w-4" />
                                                                                    </span>
                                                                                )}
                                                                                <div className="min-w-0">
                                                                                    <p className="font-bold text-slate-200">
                                                                                        {tx.type === "refill" ? "Refill" : "Usage"}
                                                                                        <span className="ml-2 font-mono text-sky-300">
                                                                                            {tx.type === "refill" ? "+" : "−"}₹{tx.amount.toLocaleString("en-IN")}
                                                                                        </span>
                                                                                        <span className="ml-2 inline-block rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                                                                            {txSourceLabel(tx.source)}
                                                                                        </span>
                                                                                    </p>
                                                                                    <p className="mt-0.5 truncate text-slate-500" title={tx.note}>
                                                                                        {tx.note || "—"}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="shrink-0 text-right">
                                                                                <p className="font-mono text-[11px] font-semibold tabular-nums text-slate-300">
                                                                                    {formatTxDateTime(tx.at)}
                                                                                </p>
                                                                                <p className="text-[10px] text-slate-500">Bal ₹{tx.balanceAfter.toLocaleString("en-IN")}</p>
                                                                            </div>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {ledgerModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" onClick={closeLedger}>
                    <div
                        className="w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-b from-slate-900/98 to-slate-950/98 p-6 shadow-2xl shadow-black/50 ring-1 ring-white/10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">
                                {ledgerModal.mode === "refill" ? "Refill wallet" : "Manual spend (correction)"}
                            </h3>
                            <button type="button" onClick={closeLedger} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="mb-4 text-sm text-slate-400">
                            {ledgerModal.user.name} · {ledgerModal.user.phone || ledgerModal.user.id}
                            <br />
                            Current balance:{" "}
                            <span className="font-mono font-bold text-sky-300">₹{(Number(ledgerModal.user.walletBalance) || 0).toLocaleString("en-IN")}</span>
                            {ledgerModal.mode === "spend" && (
                                <>
                                    <br />
                                    <span className="text-xs text-slate-500">App-originated spends usually sync automatically; use this only when you need a manual adjustment.</span>
                                </>
                            )}
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Amount (₹)</label>
                                <input
                                    value={ledgerAmount}
                                    onChange={(e) => setLedgerAmount(e.target.value.replace(/\D/g, ""))}
                                    inputMode="numeric"
                                    className={inputClass}
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Note (optional)</label>
                                <input
                                    value={ledgerNote}
                                    onChange={(e) => setLedgerNote(e.target.value)}
                                    className={inputClass}
                                    placeholder={ledgerModal.mode === "refill" ? "e.g. UPI top-up" : "e.g. Order #1234"}
                                />
                            </div>
                            <button
                                type="button"
                                disabled={ledgerSaving}
                                onClick={() => void applyLedger()}
                                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-60 ${
                                    ledgerModal.mode === "refill"
                                        ? "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500"
                                        : "bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500"
                                }`}
                            >
                                {ledgerSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : ledgerModal.mode === "refill" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                {ledgerModal.mode === "refill" ? "Confirm refill" : "Confirm spend"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.06); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.28); }
            `}</style>
        </div>
    );
};

export default PremiumEntry;
