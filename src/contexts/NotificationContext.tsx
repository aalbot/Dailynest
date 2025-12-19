import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { toast } from "sonner";

// Re-using the firebase config from existing files
const firebaseConfig = {
    apiKey: "AIzaSyCSH0uuKssWvkgvMOnWV_1u3zPO-1XNWPg",
    authDomain: "dailyclub11.firebaseapp.com",
    databaseURL: "https://dailyclub11-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dailyclub11",
    storageBucket: "dailyclub11.firebasestorage.app",
    messagingSenderId: "439424426599",
    appId: "1:439424426599:web:5ee8965e14990c57fdaac2",
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    type: 'order' | 'delivery' | 'info';
    orderId?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [orders, setOrders] = useState<Record<string, any>>({});
    const isInitialLoad = useRef(true);
    const navigate = useNavigate();

    // Sound logic
    const playNotificationSound = () => {
        try {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Audio play failed (user interaction needed first)", e));
        } catch (e) {
            console.error("Error playing sound", e);
        }
    };

    useEffect(() => {
        const db = firebase.database();
        const ordersRef = db.ref("root/order");

        const onValueChange = (snapshot: any) => {
            const data = snapshot.val() || {};

            setOrders(prevOrders => {
                // If it's not the first load, check for changes
                if (!isInitialLoad.current) {
                    Object.keys(data).forEach(key => {
                        const newOrder = data[key];
                        const oldOrder = prevOrders[key];

                        // Case 1: New Order Placed
                        if (!oldOrder && newOrder.status === "Order Placed") {
                            addNotification({
                                title: "New Order Received",
                                message: `Order #${key} has been placed.`,
                                type: 'order',
                                orderId: key
                            });
                        }

                        // Case 2: Status Change to "Ready for Pickup" (Delivery Alert)
                        if (oldOrder && oldOrder.status !== "Ready for Pickup" && newOrder.status === "Ready for Pickup") {
                            addNotification({
                                title: "Ready for Pickup",
                                message: `Order #${key} is ready for delivery.`,
                                type: 'delivery',
                                orderId: key
                            });
                        }

                        // Case 3: Any status change (General Info - optional, mostly for management)
                        // If we want to notify on EVERY status change:
                        if (oldOrder && oldOrder.status !== newOrder.status && newOrder.status !== "Ready for Pickup") {
                            // Uncomment if you want notifications for all status changes
                            /*
                            addNotification({
                                title: "Order Updated",
                                message: `Order #${key} is now ${newOrder.status}`,
                                type: 'info',
                                orderId: key
                            });
                            */
                        }
                    });
                }
                return data;
            });

            if (isInitialLoad.current) {
                isInitialLoad.current = false;
            }
        };

        ordersRef.on("value", onValueChange);

        return () => {
            ordersRef.off("value", onValueChange);
        };
    }, []);

    const addNotification = (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const newNotification: Notification = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            read: false,
            ...n
        };

        setNotifications(prev => [newNotification, ...prev]);

        // Trigger Toast (The "Slide from side" alert)
        toast(newNotification.title, {
            description: newNotification.message,
            action: {
                label: "View",
                onClick: () => {
                    if (newNotification.type === 'order') navigate('/orders');
                    if (newNotification.type === 'delivery') navigate('/delivery');
                },
            },
        });

        playNotificationSound();
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotification must be used within a NotificationProvider");
    }
    return context;
};
