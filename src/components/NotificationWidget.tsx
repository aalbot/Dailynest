import React from "react";
import { Bell, Info, CheckCheck, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNotification } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";

const NotificationWidget = () => {
    const { notifications, markAllAsRead, clearNotifications, markAsRead } = useNotification();
    const { getTranslation } = useLang();
    const unreadNotifications = notifications.filter((n) => !n.read);

    return (
        <Card className="hidden xl:flex h-full min-h-0 flex-col border-white/40 dark:border-white/10 shadow-2xl bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl transition-colors duration-500">
            <CardHeader className="shrink-0 pb-3">
                <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-indigo-500/20 p-2 rounded-lg">
                            <Bell className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-semibold">{getTranslation("notificationWidget.title")}</CardTitle>
                            <CardDescription className="text-xs">{getTranslation("notificationWidget.subtitle")}</CardDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            onClick={markAllAsRead}
                            title={getTranslation("notificationWidget.markAllRead")}
                        >
                            <CheckCheck className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            onClick={clearNotifications}
                            title={getTranslation("notificationWidget.clearAll")}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6">
                    <div className="space-y-4">
                        {unreadNotifications.map((item) => (
                            <div key={item.id} className="group relative border-l-2 border-indigo-500/30 py-1.5 pl-4 transition-all duration-300">
                                <div className="absolute -left-[5px] top-3 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-black/20" />

                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-1.5">
                                        <Info className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                        <h4 className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{item.title}</h4>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0 text-slate-400 opacity-0 transition-opacity hover:text-indigo-500 group-hover:opacity-100"
                                        onClick={() => markAsRead(item.id)}
                                    >
                                        <CheckCheck className="h-3 w-3" />
                                    </Button>
                                </div>

                                <p className="mb-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.message}</p>

                                <span className="block text-[10px] font-medium text-slate-400">
                                    {new Date(item.timestamp).toLocaleDateString()} •{" "}
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                        ))}

                        {unreadNotifications.length === 0 && (
                            <div className="py-12 text-center text-sm text-slate-500">{getTranslation("notificationWidget.noNotifications")}</div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default NotificationWidget;
