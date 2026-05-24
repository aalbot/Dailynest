import React, { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import AuditTrail from "./components/AuditTrail";
import AppsManager from "./components/AppsManager";
import { useInfraLogic } from "./InfraLogic";
import { createInitialState as getInitialData } from "./InfraData";
import { useNavigate } from "react-router-dom";
import {
    Activity, ArrowRight, BarChart3, Check, ChevronDown, Clock, Cloud, Database, FileCode, Folder, FolderOpen,
    HardDrive, History as HistoryIcon, RefreshCcw, Save, Server, Shield, Terminal, Trash2, UploadCloud, AlertTriangle, Play,
    RotateCcw, Upload, Archive, Download, Zap, ShieldAlert, Lock as LockIcon, Search, ExternalLink, FileArchive, Sparkles, Grid3X3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const InfraConsole = () => {
    const [data, setData] = useState(getInitialData());
    const forceUpdate = useCallback(() => setData({ ...data }), [data]);
    const { dispatch } = useInfraLogic(data, forceUpdate);
    const navigate = useNavigate();

    // Enforce Superadmin Access Only
    React.useEffect(() => {
        const role = sessionStorage.getItem("user_role");
        if (role !== "superadmin") {
            toast.error("Unauthorized Access: Superadmin clearance required.");
            navigate("/apps");
        }
    }, [navigate]);

    // Refresh system health metrics
    React.useEffect(() => {
        if (data.activeTab !== "status") return;

        // Initial fetch
        dispatch({ type: "REFRESH_SYSTEM_HEALTH" });

        const interval = setInterval(() => {
            dispatch({ type: "REFRESH_SYSTEM_HEALTH" });
        }, 2000);

        return () => clearInterval(interval);
    }, [data.activeTab]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
                                <ShieldAlert className="text-red-600 w-8 h-8" />
                                InfraConsole
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Systems & Infrastructure Management • v1.0 • Admin Only</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400">Environment:</div>
                        <div className="px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black rounded-xl">Production</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar / Tabs */}
                    <div className="lg:col-span-3 space-y-4">
                        <Card className="bg-white dark:bg-slate-900 border-none shadow-xl rounded-3xl overflow-hidden p-2">
                            <Tabs value={data.activeTab} onValueChange={(v: any) => dispatch({ type: "SET_TAB", tab: v })} className="w-full">
                                <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-1">
                                    <TabsTrigger value="status" className="w-full justify-start gap-3 px-4 py-4 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:text-white hover:translate-x-1 cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded bg-indigo-500/20 flex items-center justify-center">
                                                <Activity size={10} className="text-indigo-500" />
                                            </div>
                                            <span className="font-bold text-sm tracking-tight">Status</span>
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger value="backup" className="w-full justify-start gap-3 px-4 py-4 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:text-white hover:translate-x-1 cursor-pointer">
                                        <Database size={18} /> Backup
                                    </TabsTrigger>
                                    <TabsTrigger value="restore" className="w-full justify-start gap-3 px-4 py-4 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:text-white hover:translate-x-1 cursor-pointer">
                                        <RefreshCcw size={18} /> Restore
                                    </TabsTrigger>
                                    <TabsTrigger value="cleanup" className="w-full justify-start gap-3 px-4 py-4 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:text-white hover:translate-x-1 cursor-pointer">
                                        <Trash2 size={18} /> Maintenance
                                    </TabsTrigger>
                                    <TabsTrigger value="apps" className="w-full justify-start gap-3 px-4 py-4 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:text-white hover:translate-x-1 cursor-pointer">
                                        <Grid3X3 size={18} /> Manage Apps
                                    </TabsTrigger>
                                    <TabsTrigger value="logs" className="w-full justify-start gap-3 px-4 py-4 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:text-white hover:translate-x-1 cursor-pointer">
                                        <HistoryIcon size={18} /> Audit Trail
                                    </TabsTrigger>
                                    <TabsTrigger value="migration" className="w-full justify-start gap-3 px-4 py-4 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:text-white hover:translate-x-1 cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded bg-amber-500/20 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 group-hover:bg-white transition-all duration-300" />
                                            </div>
                                            Migration
                                            
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger value="Configuration" className="w-full justify-start gap-3 px-4 py-4 rounded-2xl data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-none font-bold text-slate-600 dark:text-slate-400 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded bg-orange-500/20 flex items-center justify-center">
                                                <Zap size={10} className="text-orange-500" />
                                            </div>
                                            Configuration
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger value="branding" className="w-full justify-start gap-3 px-4 py-4 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:text-white hover:translate-x-1 cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded bg-pink-500/20 flex items-center justify-center">
                                                <Sparkles size={10} className="text-pink-500" />
                                            </div>
                                            Branding
                                        </div>
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </Card>

                        {/* Quick Stats Card */}
                        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-none shadow-xl rounded-3xl overflow-hidden p-6 text-white relative">
                            {/* Pulse Indicator */}
                            <div className="absolute top-6 right-6 flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
                            </div>

                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                <Activity size={14} className="text-indigo-400" /> System Metrics
                            </h3>

                            <div className="space-y-6">
                                {/* CPU & Memory */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">CPU Load</p>
                                        <div className="flex items-end gap-1">
                                            <p className="text-2xl font-black tracking-tight">{Math.round(data.liveMetrics.cpu)}%</p>
                                        </div>
                                        <Progress value={data.liveMetrics.cpu} className="h-1 bg-white/10 mt-2 [&>div]:bg-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Memory</p>
                                        <div className="flex items-end gap-1">
                                            <p className="text-2xl font-black tracking-tight">{Math.round(data.liveMetrics.memory)}%</p>
                                        </div>
                                        <Progress value={data.liveMetrics.memory} className="h-1 bg-white/10 mt-2 [&>div]:bg-purple-500" />
                                    </div>
                                </div>

                                <div className="h-px bg-white/10" />

                                {/* Network */}
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Network Traffic</p>
                                    <div className="flex justify-between items-center text-xs font-mono font-medium text-slate-300">
                                        <span className="flex items-center gap-1"><UploadCloud size={10} className="text-blue-400" /> {Math.round(data.liveMetrics.network.outbound)} KB/s</span>
                                        <span className="flex items-center gap-1 text-slate-500">|</span>
                                        <span className="flex items-center gap-1"><Cloud size={10} className="text-emerald-400" /> {Math.round(data.liveMetrics.network.inbound)} KB/s</span>
                                    </div>
                                </div>

                                <div className="h-px bg-white/10" />

                                {/* DB Stats */}
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Database</p>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-lg font-black tracking-tight">{data.liveMetrics.db.activeConnections}</p>
                                            <p className="text-[9px] text-slate-400">Active Connections</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black tracking-tight text-amber-400">{data.liveMetrics.db.storageUsage.toFixed(2)} GB</p>
                                            <p className="text-[9px] text-slate-400">Storage Used</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Progress Bar Overlay removed from here */}

                    {/* Main Content Area */}
                    <div className="lg:col-span-9 space-y-6">
                        {data.activeTab === "status" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">

                                {/* Live System Performance */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card className="bg-white dark:bg-slate-900 border-indigo-100 dark:border-slate-800 shadow-lg rounded-3xl p-6 flex flex-col justify-between">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-indigo-50 dark:bg-slate-800 rounded-2xl">
                                                <Activity className="text-indigo-500" size={20} />
                                            </div>
                                            <Badge variant="outline" className="border-indigo-100 text-indigo-600 bg-indigo-50">CPU</Badge>
                                        </div>
                                        <div>
                                            <h4 className="text-3xl font-black text-slate-800 dark:text-white mb-1">{Math.round(data.liveMetrics.cpu)}%</h4>
                                            <p className="text-xs text-slate-400 font-medium">Processing Load</p>
                                        </div>
                                        <Progress value={data.liveMetrics.cpu} className="h-1.5 bg-slate-100 dark:bg-slate-800 mt-4 [&>div]:bg-indigo-500" />
                                    </Card>

                                    <Card className="bg-white dark:bg-slate-900 border-purple-100 dark:border-slate-800 shadow-lg rounded-3xl p-6 flex flex-col justify-between">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-purple-50 dark:bg-slate-800 rounded-2xl">
                                                <Zap className="text-purple-500" size={20} />
                                            </div>
                                            <Badge variant="outline" className="border-purple-100 text-purple-600 bg-purple-50">RAM</Badge>
                                        </div>
                                        <div>
                                            <h4 className="text-3xl font-black text-slate-800 dark:text-white mb-1">{Math.round(data.liveMetrics.memory)}%</h4>
                                            <p className="text-xs text-slate-400 font-medium">Memory Usage</p>
                                        </div>
                                        <Progress value={data.liveMetrics.memory} className="h-1.5 bg-slate-100 dark:bg-slate-800 mt-4 [&>div]:bg-purple-500" />
                                    </Card>

                                    <Card className="bg-white dark:bg-slate-900 border-blue-100 dark:border-slate-800 shadow-lg rounded-3xl p-6 flex flex-col justify-between">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-blue-50 dark:bg-slate-800 rounded-2xl">
                                                <UploadCloud className="text-blue-500" size={20} />
                                            </div>
                                            <Badge variant="outline" className="border-blue-100 text-blue-600 bg-blue-50">NET</Badge>
                                        </div>
                                        <div>
                                            <div className="flex items-baseline gap-1">
                                                <h4 className="text-3xl font-black text-slate-800 dark:text-white mb-1">{Math.round(data.liveMetrics.network.inbound + data.liveMetrics.network.outbound)}</h4>
                                                <span className="text-sm font-bold text-slate-400">KB/s</span>
                                            </div>
                                            <p className="text-xs text-slate-400 font-medium">Total Throughput</p>
                                        </div>
                                        <Progress value={(data.liveMetrics.network.inbound + data.liveMetrics.network.outbound) / 10} className="h-1.5 bg-slate-100 dark:bg-slate-800 mt-4 [&>div]:bg-blue-500" />
                                    </Card>

                                    <Card className="bg-white dark:bg-slate-900 border-amber-100 dark:border-slate-800 shadow-lg rounded-3xl p-6 flex flex-col justify-between">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-amber-50 dark:bg-slate-800 rounded-2xl">
                                                <Database className="text-amber-500" size={20} />
                                            </div>
                                            <Badge variant="outline" className="border-amber-100 text-amber-600 bg-amber-50">DB</Badge>
                                        </div>
                                        <div>
                                            <h4 className="text-3xl font-black text-slate-800 dark:text-white mb-1">{data.liveMetrics.db.activeConnections}</h4>
                                            <p className="text-xs text-slate-400 font-medium">Live Connections</p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                            Optimal
                                        </div>
                                    </Card>
                                </div>

                                {/* App Data Usage Breakdown */}
                                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden">
                                    <CardHeader className="p-8 pb-4">
                                        <CardTitle className="text-xl font-black flex items-center gap-3">
                                            <BarChart3 className="text-slate-400" /> Application Data Usage
                                        </CardTitle>
                                        <CardDescription>Real-time bandwidth consumption by module.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-8 pt-4">
                                        <div className="space-y-6">
                                            {data.appUsage.map((app) => (
                                                <div key={app.id} className="group">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${app.trend === 'up' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                                            <span className="font-bold text-slate-700 dark:text-slate-200">{app.name}</span>
                                                            <Badge variant="secondary" className="text-[10px] h-5">{app.activeUsers} Users</Badge>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="font-black text-slate-900 dark:text-white">{app.usage} MB</span>
                                                            <span className="text-xs text-slate-400 ml-1">({app.percentage}%)</span>
                                                        </div>
                                                    </div>
                                                    <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="absolute top-0 left-0 h-full bg-slate-900 dark:bg-white rounded-full transition-all duration-1000 ease-out"
                                                            style={{ width: `${app.percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden">
                                        <CardHeader className="p-8 pb-4">
                                            <CardTitle className="text-xl font-black">Infrastructure Health</CardTitle>
                                            <CardDescription>Real-time status of initialized nodes.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-8 pt-2">
                                            {data.systemSettings ? (
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                                        <span className="text-sm font-bold text-slate-500">System Version</span>
                                                        <Badge className="bg-indigo-500">{data.systemSettings.version}</Badge>
                                                    </div>
                                                    <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                                        <span className="text-sm font-bold text-slate-500">Last Check</span>
                                                        <span className="text-xs font-mono">{new Date(data.systemSettings.lastSystemCheck).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                                        <span className="text-sm font-bold text-slate-500">Maintenance Mode</span>
                                                        <Badge variant={data.systemSettings.maintenanceMode ? "destructive" : "outline"}>
                                                            {data.systemSettings.maintenanceMode ? "Active" : "Disabled"}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-10 opacity-50">
                                                    <ShieldAlert size={40} className="mx-auto mb-4 text-amber-500" />
                                                    <p className="text-sm font-bold">Infrastructure Not Initialized</p>
                                                    <p className="text-xs">Run the "INIT_INFRA" migration script.</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden">
                                        <CardHeader className="p-8 pb-4">
                                            <CardTitle className="text-xl font-black">Environment</CardTitle>
                                            <CardDescription>Active configuration flags.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-8 pt-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2">
                                                    <Database size={24} className="text-blue-500" />
                                                    <span className="text-[10px] font-black uppercase text-slate-400">Database</span>
                                                    <span className="text-sm font-bold">Stable</span>
                                                </div>
                                                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2">
                                                    <LockIcon size={24} className="text-emerald-500" />
                                                    <span className="text-[10px] font-black uppercase text-slate-400">Security</span>
                                                    <span className="text-sm font-bold">RBAC Active</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )}

                        {/* TAB: RESTORE */}
                        {data.activeTab === "restore" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <Card className="rounded-[2.5rem] border-0 shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-3xl overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
                                    <CardHeader className="p-8 pb-4">
                                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                                            <RotateCcw className="text-emerald-500" /> System Restore
                                        </CardTitle>
                                        <CardDescription className="text-base font-medium">Recover system state from a previous snapshot. <span className="text-red-500 font-bold">WARNING: This action is destructive.</span></CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-8">

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Zone 1: Database Restore */}
                                            <div className="p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <Database size={120} />
                                                </div>
                                                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2 relative z-10">Database Recovery</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 relative z-10">Restore JSON snapshots to Realtime Database. Overwrites existing data at target nodes.</p>

                                                <div className="relative z-10">
                                                    <input
                                                        type="file"
                                                        accept=".json"
                                                        className="hidden"
                                                        id="db-restore-upload"
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0]) {
                                                                if (confirm("Are you sure you want to overwrite database data with this snapshot?")) {
                                                                    dispatch({ type: "START_RESTORE", file: e.target.files[0], restoreType: "db" });
                                                                }
                                                                e.target.value = ''; // Reset
                                                            }
                                                        }}
                                                        disabled={!!data.isRestoring}
                                                    />
                                                    <label htmlFor="db-restore-upload">
                                                        <Button asChild className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer">
                                                            <span>
                                                                {data.isRestoring === 'db' ? <RefreshCcw className="mr-2 h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
                                                                {data.isRestoring === 'db' ? "Restoring..." : "Upload JSON Snapshot"}
                                                            </span>
                                                        </Button>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Zone 2: Storage Restore */}
                                            <div className="p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 relative overflow-hidden group hover:border-amber-500/30 transition-all">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <Archive size={120} />
                                                </div>
                                                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2 relative z-10">Storage Recovery</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 relative z-10">Restore ZIP archives to Firebase Storage. Unpacks and uploads files to their original paths.</p>

                                                <div className="relative z-10">
                                                    <input
                                                        type="file"
                                                        accept=".zip"
                                                        className="hidden"
                                                        id="storage-restore-upload"
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0]) {
                                                                if (confirm("This will upload extracted files to Storage. Continue?")) {
                                                                    dispatch({ type: "START_RESTORE", file: e.target.files[0], restoreType: "storage" });
                                                                }
                                                                e.target.value = ''; // Reset
                                                            }
                                                        }}
                                                        disabled={!!data.isRestoring}
                                                    />
                                                    <label htmlFor="storage-restore-upload">
                                                        <Button asChild className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer">
                                                            <span>
                                                                {data.isRestoring === 'storage' ? <RefreshCcw className="mr-2 h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
                                                                {data.isRestoring === 'storage' ? "Restoring..." : "Upload ZIP Archive"}
                                                            </span>
                                                        </Button>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Restore Progress Console */}
                                        {data.isRestoring && (
                                            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                                <div className="flex justify-between items-center text-emerald-400 font-black uppercase tracking-widest text-[9px]">
                                                    <span>System Recovery in Progress</span>
                                                    <span>{data.progress}%</span>
                                                </div>
                                                <Progress value={data.progress} className="h-2 bg-slate-800 [&>div]:bg-emerald-500" />
                                                <div className="text-slate-400 flex items-center gap-2">
                                                    <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                                                    {data.statusMessage}
                                                </div>
                                            </div>
                                        )}

                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {data.activeTab === "backup" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* Database Section */}
                                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden">
                                    <div className="bg-indigo-600 h-1" />
                                    <CardHeader className="p-8 pb-4">
                                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                                            <Database className="text-indigo-500" /> Database Snapshot
                                        </CardTitle>
                                        <CardDescription className="text-base font-medium">Capture the entire system state or select specific datasets.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-6">
                                        {/* Dataset Hierarchy */}
                                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 mb-4">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Dataset Hierarchy</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
                                                {data.dbNodes.map(node => (
                                                    <div key={node.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors hover:border-indigo-200 dark:hover:border-indigo-900/50 group">
                                                        <Checkbox
                                                            checked={node.selected}
                                                            onCheckedChange={() => dispatch({ type: "TOGGLE_DB_NODE", id: node.id })}
                                                            disabled={!!data.isBackingUp}
                                                            className="data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                                        />
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{node.label}</span>
                                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-slate-200 text-slate-500">{node.group}</Badge>
                                                            </div>
                                                            <span className="text-[10px] font-mono text-slate-400 truncate w-full" title={node.path}>{node.path}</span>
                                                        </div>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Download JSON"
                                                            onClick={() => dispatch({ type: "DOWNLOAD_DB_NODE", id: node.id })}
                                                            disabled={!!data.isBackingUp}
                                                        >
                                                            <Download size={14} />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-4">
                                            <Button
                                                onClick={() => dispatch({ type: "START_BACKUP", full: true })}
                                                disabled={!!data.isBackingUp}
                                                className="w-full sm:w-auto px-6 py-6 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-black text-base shadow-xl active:scale-95 transition-all gap-3"
                                            >
                                                {data.isBackingUp === "db" ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                                                Full System Backup
                                            </Button>

                                            <Button
                                                onClick={() => dispatch({ type: "START_BACKUP", full: false })}
                                                disabled={!!data.isBackingUp || !data.dbNodes.some(n => n.selected)}
                                                className="w-full sm:w-auto px-6 py-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base shadow-xl shadow-indigo-500/20 active:scale-95 transition-all gap-3"
                                            >
                                                {data.isBackingUp === "db" ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                                                Backup Selected ({data.dbNodes.filter(n => n.selected).length})
                                            </Button>
                                        </div>

                                        {/* Local Console for DB Backup */}
                                        {data.isBackingUp === "db" && data.activeTab === "backup" && (
                                            <div className="mt-6 p-6 rounded-3xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                                <div className="flex justify-between items-center text-indigo-400 font-black uppercase tracking-widest text-[9px]">
                                                    <span>Streaming Database Dump</span>
                                                    <span>{data.progress}%</span>
                                                </div>
                                                <Progress value={data.progress} className="h-1 bg-slate-800" />
                                                <div className="text-slate-400 flex items-center gap-2">
                                                    <span className="text-emerald-500">➜</span>
                                                    {data.statusMessage || "Initializing secure handshake..."}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Storage Section */}
                                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden">
                                    <div className="bg-amber-500 h-1" />
                                    <CardHeader className="p-8 pb-4">
                                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                                            <FileArchive className="text-amber-500" /> Storage Asset Backup
                                        </CardTitle>
                                        <CardDescription className="text-base font-medium">Pack all uploaded images (Products, Categories, Staff) into a compressed ZIP file.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-6">
                                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 mb-4">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Select Targets</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {data.backupTargets.map(t => (
                                                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors hover:border-amber-200 dark:hover:border-amber-900/50 group">
                                                        <Checkbox
                                                            checked={t.selected}
                                                            onCheckedChange={() => dispatch({ type: "TOGGLE_BACKUP_TARGET", id: t.id })}
                                                            disabled={!!data.isBackingUp}
                                                            className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                                        />
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{t.label}</span>
                                                            <span className="text-[10px] font-mono text-slate-400 truncate w-full" title={t.path}>
                                                                {t.type === 'db-base64' ? 'Database Asset' : 'Storage Folder'}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Download this folder only"
                                                            onClick={() => dispatch({ type: "DOWNLOAD_STORAGE_TARGET", id: t.id })}
                                                            disabled={!!data.isBackingUp}
                                                        >
                                                            <Download size={14} />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-4">
                                            <Button
                                                onClick={() => dispatch({ type: "START_STORAGE_BACKUP" })}
                                                disabled={!!data.isBackingUp}
                                                className="w-full sm:w-auto px-8 py-7 rounded-[2rem] bg-amber-500 hover:bg-amber-600 text-white font-black text-lg shadow-2xl shadow-amber-500/30 active:scale-95 transition-all gap-3"
                                            >
                                                {data.isBackingUp === "storage" ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <FileArchive className="w-5 h-5" />}
                                                {data.isBackingUp === "storage" ? "Packing ZIP..." : "Initiate Storage Backup"}
                                            </Button>
                                        </div>

                                        {/* Local Console for Storage Backup */}
                                        {data.isBackingUp === "storage" && data.activeTab === "backup" && (
                                            <div className="mt-6 p-6 rounded-3xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                                <div className="flex justify-between items-center text-amber-500 font-black uppercase tracking-widest text-[9px]">
                                                    <span>Packing Asset Archive</span>
                                                    <span>{data.progress}%</span>
                                                </div>
                                                <Progress value={data.progress} className="h-1 bg-slate-800" />
                                                <div className="text-slate-400 flex items-center gap-2">
                                                    <span className="text-amber-500">➜</span>
                                                    {data.statusMessage}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {data.activeTab === "logs" && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <AuditTrail />
                            </div>
                        )}

                        {data.activeTab === "apps" && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <AppsManager />
                            </div>
                        )}

                        {data.activeTab === "migration" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden">
                                    <CardHeader className="p-8 pb-4">
                                        <CardTitle className="text-2xl font-black tracking-tight">Schema Migrations</CardTitle>
                                        <CardDescription className="text-base font-medium">Execute versioned data transformations and structure updates.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-6">
                                        <div className="space-y-4">
                                            {data.migrations.map((m) => (
                                                <div key={m.version} className="space-y-4">
                                                    <div className="p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-white dark:hover:bg-slate-800 shadow-sm hover:shadow-md">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-mono">
                                                                    {m.version}
                                                                </span>
                                                                {m.history?.status === "SUCCESS" ? (
                                                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Executed</Badge>
                                                                ) : (
                                                                    <Badge variant="outline">Pending</Badge>
                                                                )}
                                                            </div>
                                                            <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{m.description}</h4>
                                                            {m.history && (
                                                                <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                                    <span>Admin: {m.history.adminId}</span>
                                                                    <span>Date: {new Date(m.history.executedAt).toLocaleDateString()}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {!m.history || m.history.status !== "SUCCESS" ? (
                                                            <Button
                                                                variant="default"
                                                                className="rounded-2xl font-black px-6 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                                                                onClick={() => {
                                                                    if (confirm(`Run migration ${m.version}? A safety backup will be created first.`)) {
                                                                        dispatch({ type: "RUN_MIGRATION", version: m.version });
                                                                    }
                                                                }}
                                                                disabled={data.isMigrating}
                                                            >
                                                                {data.isMigrating ? "Applying..." : "Run Now"}
                                                            </Button>
                                                        ) : (
                                                            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600">
                                                                <HistoryIcon size={20} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Local Console for Migrations */}
                                                    {data.isMigrating && data.statusMessage.includes(m.version) && (
                                                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 font-mono text-[10px] space-y-2">
                                                            <div className="flex justify-between items-center text-amber-500 font-black uppercase tracking-widest">
                                                                <span>Executing {m.version}</span>
                                                                <span>{data.progress}%</span>
                                                            </div>
                                                            <Progress value={data.progress} className="h-1 bg-slate-800" />
                                                            <div className="text-slate-400">➜ {data.statusMessage}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {data.activeTab === "cleanup" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden">
                                    <CardHeader className="p-8 pb-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-2xl font-black tracking-tight">Storage Maintenance</CardTitle>
                                                <CardDescription className="text-base font-medium">Detect and remove files in Firebase Storage with no database reference.</CardDescription>
                                            </div>
                                            <Button
                                                variant="outline"
                                                className="rounded-2xl font-black border-slate-200 dark:border-slate-800"
                                                onClick={() => dispatch({ type: "SCAN_ORPHANS" })}
                                                disabled={data.isScanning}
                                            >
                                                <Search size={16} className={`mr-2 ${data.isScanning ? 'animate-pulse' : ''}`} />
                                                {data.isScanning ? "Scanning..." : "Scan Storage"}
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8">
                                        {/* Local Console for Scanning/Cleaning */}
                                        {(data.isScanning || data.isCleaning) && (
                                            <div className="mb-6 p-4 rounded-2xl bg-slate-900 border border-slate-800 font-mono text-[10px] space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="flex justify-between items-center text-indigo-400 font-black uppercase tracking-widest">
                                                    <span>{data.isScanning ? "Scanning Storage" : "Purging Assets"}</span>
                                                    <span>{data.progress}%</span>
                                                </div>
                                                <Progress value={data.progress} className="h-0.5 bg-slate-800" />
                                                <div className="text-slate-400">➜ {data.statusMessage}</div>
                                            </div>
                                        )}

                                        {data.orphans.length > 0 ? (
                                            <div className="space-y-6">
                                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="rounded-xl font-bold border-red-500/20 text-red-500 hover:bg-red-500/10"
                                                            onClick={() => {
                                                                if (data.selectedOrphans.length === 0) {
                                                                    toast.error("No files selected");
                                                                    return;
                                                                }
                                                                if (confirm(`Delete ${data.selectedOrphans.length} selected files?`)) {
                                                                    dispatch({ type: "CLEAN_SELECTED_ORPHANS" });
                                                                }
                                                            }}
                                                            disabled={data.isCleaning || data.selectedOrphans.length === 0}
                                                        >
                                                            <Trash2 size={14} className="mr-2" />
                                                            Delete Selected ({data.selectedOrphans.length})
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            className="rounded-xl font-black bg-red-600 hover:bg-red-700"
                                                            onClick={() => {
                                                                if (confirm(`CRITICAL: This will permanently delete ALL ${data.orphans.length} detected files. Proceed?`)) {
                                                                    dispatch({ type: "CLEAN_ORPHANS" });
                                                                }
                                                            }}
                                                            disabled={data.isCleaning}
                                                        >
                                                            {data.isCleaning ? "Deleting..." : `Bulk Delete All`}
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="max-h-[400px] overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800 custom-scrollbar">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-500 font-black uppercase text-[10px] tracking-widest border-b border-slate-100 dark:border-slate-800">
                                                            <tr>
                                                                <th className="px-6 py-4 w-12">
                                                                    <Checkbox
                                                                        checked={data.orphans.length > 0 && data.selectedOrphans.length === data.orphans.length}
                                                                        onCheckedChange={(checked) => dispatch({ type: "SELECT_ALL_ORPHANS", selected: !!checked })}
                                                                    />
                                                                </th>
                                                                <th className="px-6 py-4">File Name</th>
                                                                <th className="px-6 py-4">Source Folder</th>
                                                                <th className="px-6 py-4 text-right">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                            {data.orphans.map((file, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                                    <td className="px-6 py-4">
                                                                        <Checkbox
                                                                            checked={data.selectedOrphans.includes(file.fullPath)}
                                                                            onCheckedChange={() => dispatch({ type: "TOGGLE_ORPHAN_SELECTION", path: file.fullPath })}
                                                                        />
                                                                    </td>
                                                                    <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300">{file.name}</td>
                                                                    <td className="px-6 py-4 text-slate-500">{file.path}</td>
                                                                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-8 w-8 p-0 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                                                            onClick={async () => {
                                                                                try {
                                                                                    const { MaintenanceService } = await import("./services/MaintenanceService");
                                                                                    const url = await MaintenanceService.getFileUrl(file.fullPath);
                                                                                    window.open(url, "_blank");
                                                                                } catch (e) {
                                                                                    toast.error("Failed to fetch file URL");
                                                                                }
                                                                            }}
                                                                        >
                                                                            <ExternalLink size={14} />
                                                                        </Button>
                                                                        <Badge variant="outline" className="text-[10px] uppercase">{file.type}</Badge>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
                                                <HardDrive size={48} className="opacity-20" />
                                                <div className="text-center">
                                                    <p className="font-black text-lg text-slate-300 dark:text-slate-700">Storage is Clean</p>
                                                    <p className="text-xs font-medium max-w-[280px]">Run a scan to check if any files in Firebase Storage are no longer linked to products or categories.</p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {data.activeTab === "firebase" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden">
                                    <CardHeader className="p-8 pb-4">
                                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                                                <Zap className="text-orange-500 w-6 h-6" />
                                            </div>
                                            Firebase Configuration
                                        </CardTitle>
                                        <CardDescription>Override default connection settings. <span className="font-bold text-red-500">Advanced Use Only.</span></CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-8">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Fields */}
                                            {Object.entries(data.firebaseConfig).map(([key, value]) => (
                                                <div key={key} className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">{key}</label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-bold text-slate-700 dark:text-slate-300"
                                                        value={value as string}
                                                        onChange={(e) => dispatch({ type: "UPDATE_FIREBASE_CONFIG", key, value: e.target.value })}
                                                        placeholder={`Enter ${key}...`}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                                                <AlertTriangle size={24} className="text-amber-500" />
                                                <p className="text-xs font-medium max-w-sm">Changes here will override the hardcoded app configuration and persist in your browser's local storage.</p>
                                            </div>
                                            <div className="flex items-center gap-3 w-full md:w-auto">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        if (confirm("Reset to default configuration?")) {
                                                            localStorage.removeItem('FIREBASE_CONFIG_OVERRIDE');
                                                            window.location.reload();
                                                        }
                                                    }}
                                                    className="rounded-2xl h-12 px-6 font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex-1 md:flex-none"
                                                >
                                                    Reset Defaults
                                                </Button>
                                                <Button
                                                    onClick={() => dispatch({ type: "SAVE_FIREBASE_CONFIG" })}
                                                    className="rounded-2xl h-12 px-8 font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex-1 md:flex-none"
                                                >
                                                    Save & Reload
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {data.activeTab === "branding" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden">
                                    <CardHeader className="p-8 pb-4">
                                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-pink-500/20 flex items-center justify-center">
                                                <Sparkles className="text-pink-500 w-6 h-6" />
                                            </div>
                                            App Branding
                                        </CardTitle>
                                        <CardDescription>Customize your application name and logo. Changes persist in browser storage.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-8">
                                        <div className="grid grid-cols-1 gap-6">
                                            {/* App Name */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">App Name</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all font-bold text-slate-700 dark:text-slate-300"
                                                    value={data.brandingConfig.appName}
                                                    onChange={(e) => dispatch({ type: "UPDATE_BRANDING_CONFIG", key: "appName", value: e.target.value })}
                                                    placeholder="Enter app name..."
                                                />
                                            </div>

                                            {/* Logo Upload */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Logo Image</label>
                                                <div className="flex gap-3">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                // Check file size (max 2MB)
                                                                if (file.size > 2 * 1024 * 1024) {
                                                                    toast.error("Image size should be less than 2MB");
                                                                    return;
                                                                }

                                                                const reader = new FileReader();
                                                                reader.onloadend = () => {
                                                                    const base64String = reader.result as string;
                                                                    dispatch({ type: "UPDATE_BRANDING_CONFIG", key: "logoUrl", value: base64String });
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                        className="hidden"
                                                        id="logo-upload"
                                                    />
                                                    <label
                                                        htmlFor="logo-upload"
                                                        className="flex-1 cursor-pointer bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-2"
                                                    >
                                                        <Upload size={16} />
                                                        {data.brandingConfig.logoUrl && data.brandingConfig.logoUrl.startsWith('data:') ? 'Change Logo' : 'Upload Logo'}
                                                    </label>
                                                    {data.brandingConfig.logoUrl && data.brandingConfig.logoUrl.startsWith('data:') && (
                                                        <button
                                                            onClick={() => dispatch({ type: "UPDATE_BRANDING_CONFIG", key: "logoUrl", value: "/logo.svg" })}
                                                            className="px-5 py-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl text-sm font-bold text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400 pl-1">Upload an image file (PNG, JPG, SVG). Max size: 2MB</p>
                                            </div>

                                            {/* Preview */}
                                            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Preview</h4>
                                                <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    <img decoding="async" loading="lazy"                                                         src={data.brandingConfig.logoUrl || "/logo.svg"}
                                                        alt="Logo Preview"
                                                        className="w-9 h-9 rounded-xl object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = "/logo.svg";
                                                        }}
                                                    />
                                                    <span className="font-bold text-lg tracking-tight text-slate-500 dark:text-slate-400">
                                                        {data.brandingConfig.appName || "App Name"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                                                <AlertTriangle size={24} className="text-pink-500" />
                                                <p className="text-xs font-medium max-w-sm">Changes will override the default branding and persist in your browser's local storage.</p>
                                            </div>
                                            <div className="flex items-center gap-3 w-full md:w-auto">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        if (confirm("Reset to default branding?")) {
                                                            localStorage.removeItem('APP_BRANDING_OVERRIDE');
                                                            window.location.reload();
                                                        }
                                                    }}
                                                    className="rounded-2xl h-12 px-6 font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex-1 md:flex-none"
                                                >
                                                    Reset Defaults
                                                </Button>
                                                <Button
                                                    onClick={() => dispatch({ type: "SAVE_BRANDING_CONFIG" })}
                                                    className="rounded-2xl h-12 px-8 font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex-1 md:flex-none"
                                                >
                                                    Save & Reload
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default InfraConsole;
