import React, { useEffect, useState } from "react";
import { dataProvider } from "@/data";
import {
    Activity,
    Shield,
    User,
    Clock,
    Info,
    AlertTriangle,
    Database,
    Download,
    RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LogEntry {
    id: string;
    action: string;
    adminId: string;
    adminName: string;
    timestamp: string;
    details: any;
}

const AuditTrail = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await dataProvider.get("infra_logs");
            if (data) {
                const logsList = Object.values(data) as LogEntry[];
                // Sort by timestamp descending
                logsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setLogs(logsList);
            }
        } catch (error) {
            console.error("Failed to fetch audit logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        // Set up real-time listener
        const unsub = dataProvider.observe("infra_logs").subscribe((data: any) => {
            if (data) {
                const logsList = Object.values(data) as LogEntry[];
                logsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setLogs(logsList);
            }
        });

        return () => {
            if (unsub && typeof unsub === 'function') unsub();
        };
    }, []);

    const getActionBadge = (action: string) => {
        switch (action) {
            case "CREATE_BACKUP":
                return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"><Database className="w-3 h-3 mr-1" /> BACKUP</Badge>;
            case "RESTORE_DATABASE":
                return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"><RefreshCw className="w-3 h-3 mr-1" /> RESTORE</Badge>;
            case "BACKUP_ERROR":
            case "RESTORE_ERROR":
                return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> ERROR</Badge>;
            default:
                return <Badge variant="outline">{action}</Badge>;
        }
    };

    return (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 p-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        <Activity size={22} />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-bold">Audit Trail</CardTitle>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Chronological log of infrastructure actions</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchLogs} className="rounded-xl">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                            <TableRow>
                                <TableHead className="w-[180px] font-bold">Timestamp</TableHead>
                                <TableHead className="w-[150px] font-bold">Action</TableHead>
                                <TableHead className="w-[200px] font-bold">Admin</TableHead>
                                <TableHead className="font-bold">Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 && !loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-48 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Shield className="w-10 h-10 opacity-20" />
                                            <p>No infrastructure logs found.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                        <TableCell className="font-mono text-[11px] text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={12} className="opacity-50" />
                                                {new Date(log.timestamp).toLocaleString()}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getActionBadge(log.action)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                    <User size={14} className="text-slate-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{log.adminName}</span>
                                                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">{log.adminId}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-2 max-w-lg">
                                                <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                                <pre className="whitespace-pre-wrap font-sans">
                                                    {typeof log.details === 'object'
                                                        ? JSON.stringify(log.details, null, 2)
                                                        : log.details}
                                                </pre>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default AuditTrail;
