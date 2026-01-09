import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { firebase } from "@/lib/firebase";
import { toast } from "sonner";
import { adjustStockForOrder } from "@/utils/stockManagement";
import { CONFIG } from "@/config";

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
    const hiddenNotificationsRef = useRef<Record<string, boolean>>({});
    const navigate = useNavigate();
    const location = useLocation();

    const getSafeUserKey = () => {
        const userName = sessionStorage.getItem("staff_name") || sessionStorage.getItem("user_role") || "anonymous";
        return userName.replace(/[.$#[\]]/g, "_");
    };

    // 1. Initial Load & Sync from Firebase
    useEffect(() => {
        const userKey = getSafeUserKey();
        const db = firebase.database();
        const hiddenRef = db.ref(`root/user_metadata/${userKey}/hidden_notifications`);

        const handleHiddenChange = (snapshot: any) => {
            const hidden = snapshot.val() || {};
            hiddenNotificationsRef.current = hidden;
            setNotifications(prev =>
                prev.map(n => hidden[n.id] ? { ...n, read: true } : n)
            );
        };

        hiddenRef.on("value", handleHiddenChange);
        return () => hiddenRef.off("value", handleHiddenChange);
    }, []);

    // Sound logic
    const playNotificationSound = () => {
        try {
            const audio = new Audio(CONFIG.ASSETS.notificationSound);
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Audio play failed (user interaction needed first)", e));
        } catch (e) {
            console.error("Error playing sound", e);
        }
    };

    const prevOrdersRef = useRef<Record<string, any>>({});
    const prevStockLevelsRef = useRef<Record<string, number>>({});

    useEffect(() => {
        const db = firebase.database();
        const ordersRef = db.ref("root/order");

        const onValueChange = (snapshot: any) => {
            const data = snapshot.val() || {};
            const prevOrders = prevOrdersRef.current;

            // If it's not the first load, check for changes
            if (!isInitialLoad.current) {
                Object.keys(data).forEach(key => {
                    const newOrder = data[key];
                    const oldOrder = prevOrders[key];

                    // Case 1: New Order Placed
                    if (!oldOrder && newOrder.status === "Order Placed") {
                        addNotification({
                            id: `order_${key}_placed`,
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
                            id: `order_${key}_pickup`,
                            title: "Ready for Pickup",
                            message: `Order #${key} is ready for delivery.`,
                            type: 'delivery',
                            orderId: key
                        });
                    }
                });
            }

            setOrders(data);
            prevOrdersRef.current = data;

            if (isInitialLoad.current) {
                isInitialLoad.current = false;
            }
        };

        const ordersQuery = ordersRef.limitToLast(100);
        ordersQuery.on("value", onValueChange);

        return () => {
            ordersQuery.off("value", onValueChange);
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
            const currentStockLevels = prevStockLevelsRef.current;

            if (!isInitialLoad.current) {
                Object.entries(data).forEach(([prodId, variants]: [string, any]) => {
                    Object.entries(variants).forEach(([varId, variant]: [string, any]) => {
                        const qty = parseInt(variant.quantity) || 0;
                        const stockKey = `${prodId}_${varId} `;
                        const prevQty = currentStockLevels[stockKey] ?? 100; // Assume healthy if first time seeing

                        // Notify only if it JUST crossed below or at 5
                        if (prevQty > 5 && qty <= 5) {
                            const pName = productData.current?.[prodId]?.name || "Unknown Product";
                            addNotification({
                                id: `stock_${prodId}_${varId}`,
                                title: "Low Stock Alert",
                                message: `${pName} is running low (Current Qty: ${qty})`,
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
            prevStockLevelsRef.current = newLevels;
        };

        const stockQuery = stockRef.limitToLast(500);
        stockQuery.on("value", onStockChange);
        return () => stockQuery.off("value", onStockChange);
    }, []);

    // Listen for Broadcasts (New Notifications)
    useEffect(() => {
        const db = firebase.database();
        const now = Date.now();
        const broadcastRef = db.ref("root/notifications").orderByChild("timestamp").startAt(now);

        const onBroadcast = (snapshot: any) => {
            const data = snapshot.val();
            if (data) {
                addNotification({
                    id: snapshot.key || Date.now().toString(),
                    title: data.title,
                    message: data.message,
                    type: data.type || 'info'
                });
            }
        };

        broadcastRef.on("child_added", onBroadcast);
        return () => broadcastRef.off("child_added", onBroadcast);
    }, []);

    const addNotification = (n: Omit<Notification, 'timestamp' | 'read'>) => {
        const id = n.id || (Date.now().toString() + Math.random().toString(36).substr(2, 9));

        // 1. Check if suppressed by Firebase persistence
        if (hiddenNotificationsRef.current[id]) {
            return;
        }

        // 2. Add to local state (with duplicate prevention)
        setNotifications(prev => {
            const isDuplicate = prev.some(notif => notif.id === id);
            if (isDuplicate) return prev;

            const newNotification: Notification = {
                id,
                timestamp: Date.now(),
                read: false,
                ...n
            };

            // 3. Trigger Toast/Sound only for truly new notifications
            // We do this via a side effect trigger to keep the setter pure
            setTimeout(() => triggerNotificationEffects(newNotification), 0);

            return [newNotification, ...prev];
        });
    };

    const triggerNotificationEffects = (newNotification: Notification) => {
        if (location.pathname === '/' || location.pathname.startsWith('/delivery')) return;

        // Skip toast and sound for low stock notifications as requested
        if (newNotification.type === 'stock') return;

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

    const markAsRead = React.useCallback((id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );

        const userKey = getSafeUserKey();
        firebase.database().ref(`root/user_metadata/${userKey}/hidden_notifications/${id}`).set(true);
    }, []);

    const markAllAsRead = React.useCallback(() => {
        const userKey = getSafeUserKey();
        const updates: any = {};
        notifications.forEach(n => {
            updates[n.id] = true;
        });

        firebase.database().ref(`root/user_metadata/${userKey}/hidden_notifications`).update(updates);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, [notifications]);

    const clearNotifications = React.useCallback(() => {
        const userKey = getSafeUserKey();
        const updates: any = {};
        notifications.forEach(n => {
            updates[n.id] = true;
        });

        firebase.database().ref(`root/user_metadata/${userKey}/hidden_notifications`).update(updates);
        setNotifications([]);
    }, [notifications]);

    const unreadCount = React.useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    const contextValue = React.useMemo(() => ({
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications
    }), [notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications]);

    return (
        <NotificationContext.Provider value={contextValue}>
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
