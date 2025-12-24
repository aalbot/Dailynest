
import React from "react";
import { Bell, Info, ClipboardList, Truck, Package } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNotification } from "@/contexts/NotificationContext";

const NotificationWidget = () => {
    const { notifications } = useNotification();

    return (
        <Card className="flex flex-col h-full border-white/20 dark:border-white/10 shadow-2xl bg-white/10 dark:bg-black/40 backdrop-blur-2xl">
            <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="bg-indigo-500/20 p-2 rounded-lg">
                        <Bell className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold">Notifications</CardTitle>
                        <CardDescription className="text-xs">Recent updates & alerts</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-6 pb-6">
                    <div className="space-y-4">
                        {notifications.map((item) => (
                            <div key={item.id} className={`relative pl-4 py-1.5 border-l-2 group ${item.read ? 'border-slate-300 dark:border-slate-700 opacity-70' : 'border-indigo-500/30'}`}>
                                <div className={`absolute -left-[5px] top-3 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-black/20 ${item.read ? 'bg-slate-400' : 'bg-indigo-500'}`} />

                                <div className="flex items-center gap-1.5 mb-1">
                                    {item.type === 'order' && <ClipboardList className="w-3.5 h-3.5 text-pink-500" />}
                                    {item.type === 'delivery' && <Truck className="w-3.5 h-3.5 text-emerald-500" />}
                                    {item.type === 'stock' && <Package className="w-3.5 h-3.5 text-amber-500" />}
                                    {item.type === 'info' && <Info className="w-3.5 h-3.5 text-blue-500" />}
                                    <h4 className={`text-sm font-medium ${item.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {item.title}
                                    </h4>
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-1.5 line-clamp-2">
                                    {item.message}
                                </p>

                                <span className="text-[10px] text-slate-400 font-medium">
                                    {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}

                        {notifications.length === 0 && (
                            <div className="text-center py-12 text-slate-500 text-sm">
                                No new notifications.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default NotificationWidget;
