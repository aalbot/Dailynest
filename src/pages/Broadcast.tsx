import React, { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Users, UserCircle, UserCheck, FileUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import BackButton from "@/components/BackButton";
import { CONFIG } from "@/config";
import * as XLSX from "xlsx";

const Broadcast = () => {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState("");
  const [recentBroadcasts, setRecentBroadcasts] = useState<any[]>([]);
  const [loadingSource, setLoadingSource] = useState<"customers" | "staffs" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const db = firebase.database();
    const ref = db.ref("root/whatsapp_broadcasts");
    const listener = ref.limitToLast(10).on("value", (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
        })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRecentBroadcasts(list);
      } else {
        setRecentBroadcasts([]);
      }
    });
    return () => ref.off("value", listener);
  }, []);

  /** Parse "number" or "number, name" per line; returns { to, name? }[] */
  const parseRecipients = (text: string): { to: string; name?: string }[] => {
    return text
      .split(/\n/)
      .map((line) => {
        const parts = line.split(/[,;]/).map((s) => s.trim());
        const to = (parts[0] || "").replace(/\D/g, "");
        const name = parts[1] || undefined;
        return { to, name: name || undefined };
      })
      .filter((r) => r.to.length >= 10);
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  /** Format lines as "number, name" for recipients textarea */
  const setRecipientLines = (rows: { to: string; name?: string }[]) => {
    const lines = rows
      .filter((r) => r.to && r.to.replace(/\D/g, "").length >= 10)
      .map((r) => (r.name ? `${r.to}, ${r.name}` : r.to));
    setRecipients((prev) => (prev.trim() ? prev + "\n" + lines.join("\n") : lines.join("\n")));
  };

  const loadCustomers = async () => {
    setLoadingSource("customers");
    try {
      const snap = await firebase.database().ref("root/customers").once("value");
      const data = snap.val();
      if (!data) {
        toast({ title: "No customers", description: "No customer data found.", variant: "destructive" });
        return;
      }
      const rows: { to: string; name?: string }[] = [];
      Object.values(data as Record<string, { phone?: string; name?: string }>).forEach((c: any) => {
        const phone = (c.phone || c.mobile || "").replace(/\D/g, "");
        if (phone.length >= 10) rows.push({ to: phone, name: c.name || c.customerName || undefined });
      });
      if (rows.length === 0) {
        toast({ title: "No valid contacts", description: "No customers with phone numbers found.", variant: "destructive" });
        return;
      }
      setRecipientLines(rows);
      toast({ title: "Customers loaded", description: `${rows.length} recipient(s) added.` });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to load customers.", variant: "destructive" });
    } finally {
      setLoadingSource(null);
    }
  };

  const loadStaffs = async () => {
    setLoadingSource("staffs");
    try {
      const snap = await firebase.database().ref("root/nexus_hr/employees").once("value");
      const data = snap.val();
      if (!data) {
        toast({ title: "No staff", description: "No employee data found.", variant: "destructive" });
        return;
      }
      const byPhone = new Map<string, string>();
      Object.values(data as Record<string, any>).forEach((e: any) => {
        const raw = e.contactNumber || e.phone || e.mobile || "";
        const num = raw.replace(/\D/g, "");
        if (num.length >= 10) {
          const name = [e.firstName, e.lastName].filter(Boolean).join(" ") || e.name || "";
          byPhone.set(num, name);
        }
      });
      const list = Array.from(byPhone.entries()).map(([to, name]) => ({ to, name: name || undefined }));
      if (list.length === 0) {
        toast({ title: "No valid contacts", description: "No staff with phone numbers found.", variant: "destructive" });
        return;
      }
      setRecipientLines(list);
      toast({ title: "Staff loaded", description: `${list.length} recipient(s) added.` });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to load staff.", variant: "destructive" });
    } finally {
      setLoadingSource(null);
    }
  };

  const parseCSVText = (text: string): { to: string; name?: string }[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    const rows: { to: string; name?: string }[] = [];
    const sep = lines[0].includes("\t") ? "\t" : ",";
    const lower = (s: string) => s.toLowerCase().replace(/\s/g, "");
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(sep).map((p) => p.replace(/^"|"$/g, "").trim());
      if (parts.every((p) => !p)) continue;
      let to = "";
      let name = "";
      if (i === 0 && parts.some((p) => /phone|number|contact|mobile|whatsapp/.test(lower(p)))) {
        const phoneIdx = parts.findIndex((p) => /phone|number|contact|mobile|whatsapp/.test(lower(p)));
        const nameIdx = parts.findIndex((p) => /name|customer|person/.test(lower(p)));
        if (phoneIdx === -1) continue; // skip header if no phone column
        for (let j = 1; j < lines.length; j++) {
          const cells = lines[j].split(sep).map((p) => p.replace(/^"|"$/g, "").trim());
          const num = (cells[phoneIdx] || "").replace(/\D/g, "");
          if (num.length >= 10) rows.push({ to: num, name: nameIdx >= 0 ? cells[nameIdx] : undefined });
        }
        return rows;
      }
      if (parts[0]) to = parts[0].replace(/\D/g, "");
      if (parts[1]) name = parts[1];
      if (to.length >= 10) rows.push({ to, name: name || undefined });
    }
    return rows;
  };

  const parseExcelFile = (file: File): Promise<{ to: string; name?: string }[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          const firstSheet = wb.SheetNames[0];
          if (!firstSheet) return resolve([]);
          const sheet = wb.Sheets[firstSheet];
          const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];
          if (rows.length === 0) return resolve([]);
          const header = rows[0].map((h) => String(h || "").toLowerCase().replace(/\s/g, ""));
          const phoneIdx = header.findIndex((h) => /phone|number|contact|mobile|whatsapp/.test(h));
          const nameIdx = header.findIndex((h) => /name|customer|person/.test(h));
          if (phoneIdx === -1) return resolve([]);
          const result: { to: string; name?: string }[] = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i] || [];
            const raw = row[phoneIdx];
            const num = String(raw ?? "").replace(/\D/g, "");
            if (num.length >= 10) result.push({ to: num, name: nameIdx >= 0 ? row[nameIdx] : undefined });
          }
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = (file.name || "").toLowerCase();
    const isCsv = ext.endsWith(".csv");
    const isExcel = ext.endsWith(".xlsx") || ext.endsWith(".xls");
    if (!isCsv && !isExcel) {
      toast({ title: "Unsupported file", description: "Use .csv, .xlsx or .xls", variant: "destructive" });
      return;
    }
    try {
      if (isCsv) {
        const text = await file.text();
        const rows = parseCSVText(text);
        if (rows.length === 0) {
          toast({ title: "No valid rows", description: "File must have a phone/number column and at least one row.", variant: "destructive" });
          return;
        }
        setRecipientLines(rows);
        toast({ title: "CSV imported", description: `${rows.length} recipient(s) added.` });
      } else {
        const rows = await parseExcelFile(file);
        if (rows.length === 0) {
          toast({ title: "No valid rows", description: "Sheet must have a phone/number column and at least one data row.", variant: "destructive" });
          return;
        }
        setRecipientLines(rows);
        toast({ title: "Excel imported", description: `${rows.length} recipient(s) added.` });
      }
    } catch (err: any) {
      toast({ title: "Import failed", description: err?.message || "Could not parse file.", variant: "destructive" });
    }
  };

  /** Send one custom text message via WhatsApp Graph API */
  const sendWhatsAppMessage = async (
    to: string,
    messageText: string,
    recipientName?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const whatsapp = CONFIG.WHATSAPP;
    const url = whatsapp.getMessagesUrl();
    const bodyText = recipientName
      ? `Hi ${recipientName},\n\n${messageText}`
      : messageText;
    const body = {
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { body: bodyText },
    };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsapp.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error?.message || res.statusText };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error" };
    }
  };

  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const list = parseRecipients(recipients);
    if (list.length === 0) {
      toast({
        title: "Invalid recipients",
        description: "Enter at least one WhatsApp number per line (e.g. 919876543210 or 919876543210, John).",
        variant: "destructive",
      });
      return;
    }
    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Enter the broadcast message.",
        variant: "destructive",
      });
      return;
    }

    const db = firebase.database();
    const messageText = message.trim();
    const delaySec = 2;

    const payload = {
      recipients: list.map((r) => ({ to: r.to, name: r.name })),
      message: messageText,
      status: "sending",
      createdAt: firebase.database.ServerValue.TIMESTAMP,
    };

    let pushRef: firebase.database.Reference | null = null;
    try {
      const ref = db.ref("root/whatsapp_broadcasts").push();
      await ref.set(payload);
      pushRef = ref;
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      toast({
        title: "Save skipped",
        description: `Could not save to history: ${errMsg}. Sending via WhatsApp anyway…`,
        variant: "destructive",
      });
      // Continue to send; we just won't have a Firebase record or "Recent broadcasts" entry
    }

    setSending(true);
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < list.length; i++) {
      const { to, name } = list[i];
      const result = await sendWhatsAppMessage(to, messageText, name);
      if (result.ok) sent++;
      else failed++;
      if (i < list.length - 1) await delay(delaySec * 1000);
    }

    if (pushRef) {
      try {
        await pushRef.update({
          status: failed === 0 ? "sent" : failed === list.length ? "failed" : "partial",
          sentCount: sent,
          failedCount: failed,
        });
      } catch (_) {
        // ignore update failure
      }
    }
    setSending(false);

    if (failed === 0) {
      toast({
        title: "Broadcast sent",
        description: `Message sent to ${sent} recipient(s).`,
      });
      setRecipients("");
      setMessage("");
    } else {
      toast({
        title: "Broadcast partially sent",
        description: `Sent: ${sent}, Failed: ${failed}. Check recent broadcasts for details.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8" style={{ marginTop: "120px" }}>
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </span>
              WhatsApp Broadcast
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Send a message to multiple WhatsApp numbers. Add numbers and message below.
            </p>
          </div>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Recipients (WhatsApp numbers)
            </CardTitle>
            <CardDescription>
              One recipient per line: number only (e.g. 919876543210) or number, name (e.g. 919876543210, John). Or load from customers/staff, or import CSV/Excel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadCustomers}
                disabled={!!loadingSource}
                className="gap-2"
              >
                <UserCircle className="w-4 h-4" />
                {loadingSource === "customers" ? "Loading…" : "Load customers"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadStaffs}
                disabled={!!loadingSource}
                className="gap-2"
              >
                <UserCheck className="w-4 h-4" />
                {loadingSource === "staffs" ? "Loading…" : "Load staff"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <FileUp className="w-4 h-4" />
                Import CSV / Excel
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileImport}
              />
            </div>
            <Textarea
              placeholder="917975339228&#10;919876543210, John&#10;918765432109, Jane"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              className="min-h-[120px] resize-y font-mono text-sm"
              rows={4}
            />
          </CardContent>
        </Card>

        <Card className="mt-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <CardTitle>Message</CardTitle>
            <CardDescription>
              The text that will be sent to all recipients. Supports plain text.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Type your broadcast message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[160px] resize-y"
              rows={6}
            />
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleSend}
            disabled={sending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? "Sending…" : "Send broadcast"}
          </Button>
        </div>

        {recentBroadcasts.length > 0 && (
          <Card className="mt-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Recent broadcasts</CardTitle>
              <CardDescription>Last 10 queued broadcasts (status depends on your WhatsApp integration).</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recentBroadcasts.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{b.message}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {Array.isArray(b.recipients) ? b.recipients.length : 0} recipients · {b.status || "pending"}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {b.createdAt ? new Date(b.createdAt).toLocaleString() : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Broadcast;
