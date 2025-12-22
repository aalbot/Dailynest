import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { toast } from "sonner";
import { adjustStockForOrder } from "@/utils/stockManagement";

// Re-using the firebase config from existing files
const firebaseConfig = {
    apiKey: "AIzaSyCSH0uuKssWvkgvMOnWV_1u3zPO-1XNWPg",
    authDomain: "dailyclub11.firebaseapp.com",
    databaseURL: "https://dailyclub11-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dailyclub11",
    storageBucket: "dailyclub11.firebasestorage.app",
    messagingSenderId: "439424426599",
    appId: "1:439424426599:web:c2e064f640bf5927fdaac2"
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
    type: 'order' | 'delivery' | 'info' | 'stock';
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
    const [stockLevels, setStockLevels] = useState<Record<string, number>>({});
    const isInitialLoad = useRef(true);
    const productData = useRef<any>(null);
    const processingOrders = useRef<Set<string>>(new Set());
    const navigate = useNavigate();
    const location = useLocation();

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

                        // --- Stock Management Side Effects ---
                        // 1. Reduce Stock for New/Unprocessed Orders
                        if (!newOrder.stock_reduced && newOrder.status !== "Cancelled" && !processingOrders.current.has(key)) {
                            console.log(`[Stock] Reducing stock for order #${key}`);
                            processingOrders.current.add(key);
                            adjustStockForOrder(newOrder, 'reduce')
                                .then(() => db.ref(`root/order/${key}`).update({ stock_reduced: true }))
                                .catch(err => console.error(`Failed to reduce stock for ${key}`, err))
                                .finally(() => processingOrders.current.delete(key));
                        }

                        // 2. Increase Stock for Cancelled Orders
                        if (newOrder.status === "Cancelled" && newOrder.stock_reduced && !processingOrders.current.has(key)) {
                            console.log(`[Stock] Restoring stock for cancelled order #${key}`);
                            processingOrders.current.add(key);
                            adjustStockForOrder(newOrder, 'increase')
                                .then(() => db.ref(`root/order/${key}`).update({ stock_reduced: false }))
                                .catch(err => console.error(`Failed to restore stock for ${key}`, err))
                                .finally(() => processingOrders.current.delete(key));
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
                                message: `Order #${ key } is now ${ newOrder.status } `,
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

    // Listen for Stock Changes
    useEffect(() => {
        const db = firebase.database();
        const stockRef = db.ref("root/stock");
        const prodRef = db.ref("root/products");

        // First, get product names once
        prodRef.once("value", (snap) => {
            productData.current = snap.val() || {};
        });

        const onStockChange = (snapshot: any) => {
            const data = snapshot.val() || {};

            if (!isInitialLoad.current) {
                Object.entries(data).forEach(([prodId, variants]: [string, any]) => {
                    Object.entries(variants).forEach(([varId, variant]: [string, any]) => {
                        const qty = parseInt(variant.quantity) || 0;
                        const stockKey = `${prodId}_${varId} `;
                        const prevQty = stockLevels[stockKey] ?? 100; // Assume healthy if first time seeing

                        // Notify only if it JUST crossed below or at 5
                        if (prevQty > 5 && qty <= 5) {
                            const pName = productData.current?.[prodId]?.name || "Unknown Product";
                            addNotification({
                                title: "Low Stock Alert",
                                message: `${pName} is running low(Current Qty: ${qty})`,
                                type: 'stock'
                            });
                        }
                    });
                });
            }

            // Update local tracking
            const newLevels: Record<string, number> = {};
            Object.entries(data).forEach(([prodId, variants]: [string, any]) => {
                Object.entries(variants).forEach(([varId, variant]: [string, any]) => {
                    newLevels[`${prodId}_${varId} `] = parseInt(variant.quantity) || 0;
                });
            });
            setStockLevels(newLevels);
        };

        stockRef.on("value", onStockChange);
        return () => stockRef.off("value", onStockChange);
    }, [stockLevels]);

    // Listen for Broadcasts (New Notifications)
    useEffect(() => {
        const db = firebase.database();
        const now = Date.now();
        const broadcastRef = db.ref("root/notifications").orderByChild("timestamp").startAt(now);

        const onBroadcast = (snapshot: any) => {
            const data = snapshot.val();
            if (data) {
                // Ensure we don't show the same notification multiple times if multiple come in at once
                // snapshot.val() for child_added is the item itself
                addNotification({
                    title: data.title,
                    message: data.message,
                    type: data.type || 'info'
                });
            }
        };

        broadcastRef.on("child_added", onBroadcast);
        return () => broadcastRef.off("child_added", onBroadcast);
    }, []);

    const addNotification = (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const newNotification: Notification = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            read: false,
            ...n
        };

        setNotifications(prev => [newNotification, ...prev]);

        // Don't show visual/audio alerts on the Gateway page
        if (location.pathname === '/') return;

        // Trigger Toast (The "Slide from side" alert)
        toast(newNotification.title, {
            description: newNotification.message,
            action: {
                label: "View",
                onClick: () => {
                    if (newNotification.type === 'order') navigate('/orders');
                    if (newNotification.type === 'delivery') navigate('/delivery');
                    if (newNotification.type === 'stock') navigate('/dashboard', { state: { tab: 'stocks' } });
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
