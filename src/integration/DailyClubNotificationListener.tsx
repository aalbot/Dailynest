import React, { useEffect, useRef } from 'react';
import { db } from "@/lib/firebase";
import { ref, onChildAdded, query, limitToLast } from "firebase/database";
import { toast } from 'sonner';

export const NotificationListener = () => {
    // Use a ref to track initialization time to prevent showing old alerts
    const initTime = useRef(Date.now());

    useEffect(() => {
        const playSound = () => {
            try {
                const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
                audio.volume = 0.5;
                audio.play().catch(e => console.log("Audio autoplay blocked", e));
            } catch (e) {
                console.error("Audio error", e);
            }
        };

        // Listen to the last 2 items
        // We filter manually by timestamp to be absolutely sure
        const notificationsRef = query(
            ref(db, "root/notifications"),
            limitToLast(2)
        );

        const unsubscribe = onChildAdded(notificationsRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.timestamp) {
                // ONLY show if the notification was created AFTER this component mounted
                // (with a small buffer of 2 seconds to account for network delay)
                if (data.timestamp > (initTime.current - 2000)) {
                    toast(data.title, {
                        description: data.message,
                        duration: 5000,
                        style: {
                            background: '#fff',
                            color: '#000',
                            borderLeft: data.type === 'warning' ? '4px solid orange' :
                                data.type === 'success' ? '4px solid green' : '4px solid blue'
                        }
                    });
                    playSound();
                }
            }
        });

        return () => unsubscribe();
    }, []);

    // Important: Render Toaster so the toast actually shows up
    return null;
};

export default NotificationListener;
