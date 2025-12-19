import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { iconMap, iconList } from "@/utils/appIcons";
import { appColors } from "@/utils/appColors";
import { Search, ChevronLeft, Loader2, Link as LinkIcon, FileCode } from "lucide-react";
import firebase from "firebase/compat/app";
import "firebase/compat/database";

interface AddAppModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: any;
}

type Step = "form" | "icon" | "color";

export function AddAppModal({ open, onOpenChange, initialData }: AddAppModalProps) {
    const [step, setStep] = useState<Step>("form");
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        icon: "Layout",
        color: appColors[0],
        type: "url" as "url" | "html",
        content: ""
    });

    // Effect to reset or populate form
    const [prevOpen, setPrevOpen] = useState(false);
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            if (initialData) {
                // Find color object
                const foundColor = appColors.find(c => c.class === initialData.colorClass || c.gradient === initialData.colorGradient) || appColors[0];
                setFormData({
                    name: initialData.name,
                    icon: initialData.icon,
                    color: foundColor,
                    type: initialData.type || "url",
                    content: initialData.type === 'html' ? initialData.htmlContent : initialData.path
                });
            } else {
                setFormData({
                    name: "",
                    icon: "Layout",
                    color: appColors[0],
                    type: "url",
                    content: ""
                });
            }
            setStep("form");
        }
    }

    const [searchIcon, setSearchIcon] = useState("");

    const filteredIcons = iconList.filter(name =>
        name.toLowerCase().includes(searchIcon.toLowerCase())
    );

    const SelectedIcon = iconMap[formData.icon] || iconMap.Layout;

    const handleSubmit = async () => {
        if (!formData.name || !formData.content) return;

        setLoading(true);
        try {
            const db = firebase.database();

            if (initialData && initialData.id) {
                // Update
                await db.ref(`root/apps/${initialData.id}`).update({
                    name: formData.name,
                    icon: formData.icon,
                    colorClass: formData.color.class,
                    colorGradient: formData.color.gradient,
                    path: formData.type === 'url' ? formData.content : `/custom-app/${initialData.id}`,
                    type: formData.type,
                    htmlContent: formData.type === 'html' ? formData.content : null,
                });
            } else {
                // Create
                const newAppRef = db.ref("root/apps").push();
                await newAppRef.set({
                    id: newAppRef.key,
                    name: formData.name,
                    icon: formData.icon,
                    colorClass: formData.color.class, // We save the bg class
                    colorGradient: formData.color.gradient, // Save full gradient for detail/fancy views
                    path: formData.type === 'url' ? formData.content : `/custom-app/${newAppRef.key}`,
                    type: formData.type,
                    htmlContent: formData.type === 'html' ? formData.content : null,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
            }

            onOpenChange(false);
            // Reset form handled by effect
            setStep("form");
        } catch (error) {
            console.error("Error saving app:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all duration-300">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        {step !== "form" && (
                            <button
                                onClick={() => setStep("form")}
                                className="p-1 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {step === "form" && "Create App"}
                            {step === "icon" && "Select Icon"}
                            {step === "color" && "Select Color"}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="mt-4">
                    {step === "form" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            {/* Preview */}
                            <div className="flex justify-center mb-6">
                                <div className="flex flex-col items-center gap-3">
                                    <div
                                        className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${formData.color.gradient}`}
                                        onClick={() => setStep("color")}
                                    >
                                        <SelectedIcon size={40} className="drop-shadow-md" strokeWidth={1.5} />
                                    </div>
                                    <div
                                        className="text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                        onClick={() => setStep("icon")}
                                    >
                                        Change Icon
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">App Name</label>
                                    <Input
                                        placeholder="e.g. My Custom Page"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-slate-50 dark:bg-slate-800/50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Content Type</label>
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                        <button
                                            onClick={() => setFormData({ ...formData, type: "url" })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${formData.type === "url"
                                                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                                }`}
                                        >
                                            <LinkIcon size={16} /> URL Link
                                        </button>
                                        <button
                                            onClick={() => setFormData({ ...formData, type: "html" })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${formData.type === "html"
                                                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                                }`}
                                        >
                                            <FileCode size={16} /> Custom HTML
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {formData.type === 'url' ? 'Destination URL' : 'Upload HTML File'}
                                    </label>
                                    {formData.type === 'url' ? (
                                        <Input
                                            placeholder="https://example.com"
                                            value={formData.content}
                                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                            className="bg-slate-50 dark:bg-slate-800/50"
                                        />
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <div
                                                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group relative"
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    const file = e.dataTransfer.files[0];
                                                    if (file && file.name.endsWith('.html')) {
                                                        const reader = new FileReader();
                                                        reader.onload = (e) => {
                                                            const text = e.target?.result as string;
                                                            setFormData({ ...formData, content: text });
                                                        };
                                                        reader.readAsText(file);
                                                    } else {
                                                        alert("Please upload a valid .html file");
                                                    }
                                                }}
                                                onClick={() => document.getElementById('file-upload')?.click()}
                                            >
                                                <input
                                                    id="file-upload"
                                                    type="file"
                                                    accept=".html"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = (e) => {
                                                                const text = e.target?.result as string;
                                                                setFormData({ ...formData, content: text });
                                                            };
                                                            reader.readAsText(file);
                                                        }
                                                    }}
                                                />
                                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                    <FileCode className="w-6 h-6 text-blue-500" />
                                                </div>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                    {formData.content ? "File Selected" : "Click to upload or drag and drop"}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {formData.content ? "Click to replace" : "HTML files only"}
                                                </p>
                                                {formData.content && (
                                                    <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-sm animate-in zoom-in">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            {formData.content && (
                                                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center">
                                                    File loaded successfully
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button
                                onClick={handleSubmit}
                                disabled={loading || !formData.name || !formData.content}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Create App"}
                            </Button>
                        </div>
                    )}

                    {step === "icon" && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-[400px] flex flex-col">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <Input
                                    placeholder="Search icons..."
                                    value={searchIcon}
                                    onChange={(e) => setSearchIcon(e.target.value)}
                                    className="pl-9 bg-slate-50 dark:bg-slate-800/50"
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto grid grid-cols-5 gap-3 p-1 custom-scrollbar">
                                {filteredIcons.map(name => {
                                    const Icon = iconMap[name];
                                    return (
                                        <button
                                            key={name}
                                            onClick={() => {
                                                setFormData({ ...formData, icon: name });
                                                setStep("form");
                                            }}
                                            className={`flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${formData.icon === name ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-slate-600 dark:text-slate-400'}`}
                                        >
                                            <Icon size={24} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === "color" && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-[400px] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                {appColors.map((color) => (
                                    <button
                                        key={color.name}
                                        onClick={() => {
                                            setFormData({ ...formData, color: color });
                                            setStep("form");
                                        }}
                                        className={`group relative h-20 rounded-xl overflow-hidden transition-all hover:scale-[1.02] active:scale-95 ${color.gradient}`}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                                            <span className="text-white font-medium drop-shadow-md">{color.name}</span>
                                        </div>
                                        {formData.color.name === color.name && (
                                            <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full shadow-lg animate-bounce" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
