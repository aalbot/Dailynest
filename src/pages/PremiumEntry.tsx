import React, { useState } from "react";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { toast, Toaster } from "sonner";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { Crown, Loader2, Send, Check } from "lucide-react";

// Initialize Firebase if not already initialized
const firebaseConfig = {
    apiKey: "AIzaSyBUhKliTOKWKVW-TCTaYiRN9FXCjoxcsHg",
    authDomain: "dclub-32718.firebaseapp.com",
    projectId: "dclub-32718",
    storageBucket: "dclub-32718.firebasestorage.app",
    messagingSenderId: "401946278556",
    appId: "1:401946278556:web:efd912ca5196ce248b0b59",
    measurementId: "G-Q9RC6QRR7K"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const PremiumEntry = () => {
    const [formData, setFormData] = useState({
        entryId: "",
        name: "",
        phnm: "",
    });
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { entryId, name, phnm } = formData;

        if (!entryId.trim()) {
            toast.error("Entry ID cannot be empty.");
            setLoading(false);
            return;
        }

        try {
            const database = firebase.database();
            const dbRef = database.ref("root/premium").child(entryId.trim());

            const dataToSave = {
                name,
                phnm,
                timestamp: Date.now(),
            };

            await dbRef.set(dataToSave);

            toast.success(
                `Data for ${name} submitted successfully. Saved as key: ${entryId}`
            );
            setFormData({ entryId: "", name: "", phnm: "" }); // Reset form
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error("Error saving data:", error);
            toast.error("Error saving data to Firebase. Check console.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.id]: e.target.value,
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            <Toaster position="top-right" />
            <Navbar />

            <div className="flex-1 min-h-[calc(100vh-64px)] flex items-center justify-center p-4 pt-24">
                <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8 animate-in fade-in slide-in-from-bottom-8 duration-500 relative">

                    {/* Header */}
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <div className="absolute top-6 left-6">
                            <BackButton />
                        </div>

                        <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-2xl text-amber-500 shadow-inner">
                            <Crown size={40} className="drop-shadow-sm" />
                        </div>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                Premium Access
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Grant exclusive premium privileges to a user</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1">
                            <label htmlFor="entryId" className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                Entry ID <span className="text-slate-400 font-normal">(e.g., 03)</span>
                            </label>
                            <input
                                type="text"
                                id="entryId"
                                value={formData.entryId}
                                onChange={handleChange}
                                placeholder="Enter unique ID"
                                required
                                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                            />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="name" className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                User Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Full Name"
                                required
                                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                            />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="phnm" className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                id="phnm"
                                value={formData.phnm}
                                onChange={handleChange}
                                placeholder="+91 XXXXX XXXXX"
                                required
                                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-400 font-medium font-mono"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base mt-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <Send size={20} />
                                    <span>Grant Access</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300 border border-white/20 max-w-sm w-full relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-yellow-600"></div>
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 shadow-inner">
                            <Check size={40} strokeWidth={3} />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Success!</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Premium privileges granted to <br /> <span className="text-slate-900 dark:text-slate-100 font-bold">{formData.name || 'User'}</span></p>
                        </div>
                        <button onClick={() => setShowSuccess(false)} className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold rounded-xl transition-colors">
                            Dismiss
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PremiumEntry;
