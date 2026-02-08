
import React from "react";
import { Bell, Info, ClipboardList, Truck, Package, CheckCheck, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNotification } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";

const NotificationWidget = () => {
    const { notifications, markAllAsRead, clearNotifications, markAsRead } = useNotification();
    const { getTranslation } = useLang();
    const unreadNotifications = notifications.filter(n => !n.read);

    return (
        <Card className="hidden xl:flex flex-col h-full border-white/40 dark:border-white/10 shadow-2xl bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl transition-colors duration-500">
            <CardHeader className="pb-3 flex-shrink-0">
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
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-6 pb-6">
                    <div className="space-y-4">
                        {unreadNotifications.map((item) => (
                            <div key={item.id} className="relative pl-4 py-1.5 border-l-2 border-indigo-500/30 group transition-all duration-300">
                                <div className="absolute -left-[5px] top-3 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-black/20 bg-indigo-500" />

                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        {item.type === 'order' && <ClipboardList className="w-3.5 h-3.5 text-pink-500" />}
                                        {item.type === 'delivery' && <Truck className="w-3.5 h-3.5 text-emerald-500" />}
                                        {item.type === 'stock' && <Package className="w-3.5 h-3.5 text-amber-500" />}
                                        {item.type === 'info' && <Info className="w-3.5 h-3.5 text-blue-500" />}
                                        <h4 className="text-sm font-medium truncate text-slate-800 dark:text-slate-200">
                                            {item.title}
                                        </h4>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-500"
                                        onClick={() => markAsRead(item.id)}
                                    >
                                        <CheckCheck className="w-3 h-3" />
                                    </Button>
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-1.5 line-clamp-2">
                                    {item.message}
                                </p>

                                <span className="text-[10px] text-slate-400 font-medium">
                                    {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}

                        {unreadNotifications.length === 0 && (
                            <div className="text-center py-12 text-slate-500 text-sm">
                                {getTranslation("notificationWidget.noNotifications")}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default NotificationWidget;
