import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import BackButton from "@/components/BackButton";
import { CONFIG } from "@/config";

const Broadcast = () => {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState("");
  const [recentBroadcasts, setRecentBroadcasts] = useState<any[]>([]);

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
              One recipient per line: number only (e.g. 919876543210) or number, name (e.g. 919876543210, John) for personalized greeting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
