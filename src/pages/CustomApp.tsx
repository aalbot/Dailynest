import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";
import firebase from "firebase/compat/app";
import "firebase/compat/database";

const CustomApp = () => {
    const { id } = useParams<{ id: string }>();
    const [appData, setAppData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const db = firebase.database();
        // We have to search for the app with this ID since we stored them in a list under "root/apps" by push ID.
        // Wait, I stored at `root/apps/${pushKey}`. So I can query by ID if `pushKey` IS the ID.
        // Yes, in AddAppModal: `const newAppRef = db.ref("root/apps").push();` and `id: newAppRef.key`.

        const appRef = db.ref(`root/apps/${id}`);
        appRef.once('value').then(snapshot => {
            setAppData(snapshot.val());
            setLoading(false);
        });
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!appData) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500">
                App not found
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
            <div className="fixed top-0 left-0 right-0 z-50">
                <Navbar />
            </div>

            <main className="pt-20 px-4 md:px-8 pb-8 max-w-7xl mx-auto">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 min-h-[80vh]">
                    {/* 
                       If it is HTML content, we render it. 
                       We can wrap it in a shadow dom or just a div. 
                     */}
                    <div
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: appData.htmlContent || '' }}
                    />
                </div>
            </main>
        </div>
    );
};

export default CustomApp;
