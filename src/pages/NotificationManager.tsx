import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Send, CheckCircle, AlertTriangle, Info, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { ScrollArea } from "@/components/ui/scroll-area";
import BackButton from "@/components/BackButton";
import { useLang } from "@/contexts/LanguageContext";

const NotificationManager = () => {
    const { toast } = useToast();
    const { getTranslation } = useLang();
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState("info");
    const [serverKey, setServerKey] = useState(""); // FCM Server Key
    const [recentBroadcasts, setRecentBroadcasts] = useState<any[]>([]);

    useEffect(() => {
        const db = firebase.database();
        const ref = db.ref("root/notifications");

        const listener = ref.limitToLast(10).on("value", (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.entries(data).map(([id, val]: [string, any]) => ({
                    id,
                    ...val
                })).sort((a, b) => b.timestamp - a.timestamp);
                setRecentBroadcasts(list);
            } else {
                setRecentBroadcasts([]);
            }
        });

        return () => ref.off("value", listener);
    }, []);

    const handleSend = async () => {
        if (!title || !message) {
            toast({ title: getTranslation("common.error"), description: getTranslation("notificationCenter.messages.missingFields"), variant: "destructive" });
            return;
        }

        // 1. Send via Firebase Cloud Messaging (if Key is provided)
        if (serverKey) {
            try {
                const response = await fetch('https://fcm.googleapis.com/fcm/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `key=${serverKey}`
                    },
                    body: JSON.stringify({
                        to: "/topics/dailyclub_all", // Target all subscribed users
                        notification: {
                            title: title,
                            body: message,
                            icon: "/logo.png",
                            click_action: "https://dailyclub.in"
                        },
                        data: {
                            type: type,
                            title: title,
                            message: message
                        }
                    })
                });

                if (!response.ok) {
                    console.error("FCM Error", await response.text());
                    toast({ title: "FCM Warning", description: getTranslation("notificationCenter.messages.fcmError"), variant: "destructive" });
                }
            } catch (error) {
                console.error("FCM Fetch Error", error);
            }
        }

        // 2. Save to Database (Original Logic) - Keeps history
        const db = firebase.database();
        const newRef = db.ref("root/notifications").push();

        newRef.set({
            title,
            message,
            type,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            sender: "Admin"
        }).then(() => {
            toast({ title: getTranslation("notificationCenter.messages.sendSuccess"), description: getTranslation("notificationCenter.messages.sendSuccessDesc") });
            setTitle("");
            setMessage("");
            setType("info");
        });
    };

    const handleDelete = (id: string) => {
        if (confirm(getTranslation("notificationCenter.messages.deleteConfirm"))) {
            firebase.database().ref(`root/notifications/${id}`).remove();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <Navbar />

            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8" style={{ marginTop: '120px' }}>
                <div className="flex items-center gap-3 mb-8">
                    <BackButton />
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                            <Bell className="w-8 h-8 text-indigo-600" />
                            {getTranslation("notificationCenter.title")}
                        </h1>
                        <p className="text-slate-500 mt-1">{getTranslation("notificationCenter.subtitle")}</p>
                    </div>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                    <Card className="border-slate-200 dark:border-slate-800 h-fit">
                        <CardHeader>
                            <CardTitle>{getTranslation("notificationCenter.composeTitle")}</CardTitle>
                            <CardDescription>{getTranslation("notificationCenter.composeSubtitle")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>{getTranslation("notificationCenter.form.title")}</Label>
                                <Input
                                    placeholder={getTranslation("notificationCenter.form.titlePlaceholder")}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{getTranslation("notificationCenter.form.type")}</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">
                                            <div className="flex items-center gap-2">
                                                <Info className="w-4 h-4 text-blue-500" /> {getTranslation("common.info")}
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="warning">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-500" /> {getTranslation("common.warning")}
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="success">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-emerald-500" /> {getTranslation("common.success")}
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{getTranslation("notificationCenter.form.message")}</Label>
                                <Textarea
                                    placeholder={getTranslation("notificationCenter.form.messagePlaceholder")}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="min-h-[120px]"
                                />
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div>
                                    <Label className="text-xs text-slate-500 font-semibold">{getTranslation("notificationCenter.form.serverKey")}</Label>
                                    <Input
                                        type="password"
                                        placeholder={getTranslation("notificationCenter.form.serverKeyPlaceholder")}
                                        value={serverKey}
                                        onChange={(e) => setServerKey(e.target.value)}
                                        className="text-xs font-mono mt-1"
                                    />
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800/50 text-[10px] text-amber-800 dark:text-amber-200 leading-relaxed">
                                    <strong>Important:</strong> You must Enable the <u>Cloud Messaging API (Legacy)</u> in Firebase Console:
                                    <ol className="list-decimal pl-4 mt-1 space-y-0.5">
                                        <li>Go to Project Settings &gt; Cloud Messaging.</li>
                                        <li>If "Legacy" is Disabled, click the 3 dots &gt; "Manage API in Google Cloud Console".</li>
                                        <li>Click <strong>ENABLE</strong>. Refresh Firebase Console.</li>
                                        <li>Copy the <strong>Server Key</strong> (not Sender ID).</li>
                                    </ol>
                                </div>
                            </div>

                            <Button onClick={handleSend} className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2">
                                <Send className="w-4 h-4" /> {getTranslation("notificationCenter.form.sendButton")}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-800 flex flex-col h-[500px]">
                        <CardHeader>
                            <CardTitle>{getTranslation("notificationCenter.recentBroadcasts")}</CardTitle>
                            <CardDescription>{getTranslation("notificationCenter.recentSubtitle")}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0">
                            <ScrollArea className="h-full px-6 pb-6">
                                <div className="space-y-4">
                                    {recentBroadcasts.map((item) => (
                                        <div key={item.id} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    {item.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                                    {item.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                                    {item.type === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                                                    <span className="font-semibold">{item.title}</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleDelete(item.id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{item.message}</p>
                                            <p className="text-xs text-slate-400">
                                                {new Date(item.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    ))}
                                    {recentBroadcasts.length === 0 && (
                                        <div className="text-center py-12 text-slate-500">
                                            {getTranslation("notificationCenter.messages.noBroadcasts")}
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default NotificationManager;
