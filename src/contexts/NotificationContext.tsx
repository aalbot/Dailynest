import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { firebase, messaging, db as modularDb } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { ref, set, update } from "firebase/database";
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
    requestPermission: () => Promise<boolean>;
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

    // 2. Efficient Order Listening
    useEffect(() => {
        const db = firebase.database();
        const ordersRef = db.ref("root/order");
        const ordersQuery = ordersRef.limitToLast(10); // Reduced initial sync bandwidth

        const handleOrderAdded = (snapshot: any) => {
            const key = snapshot.key;
            const newOrder = snapshot.val();
            if (!key) return;

            // Notification for new orders
            if (!isInitialLoad.current && newOrder.status === "Order Placed") {
                addNotification({
                    id: `order_${key}_placed`,
                    title: "New Order Received",
                    message: `Order #${key} has been placed.`,
                    type: 'order',
                    orderId: key
                });
            }

            // Sync state
            setOrders(prev => ({ ...prev, [key]: newOrder }));

            // Automatic Stock Reduction logic
            if (!newOrder.stock_reduced && newOrder.status !== "Cancelled" && !processingOrders.current.has(key)) {
                processingOrders.current.add(key);
                adjustStockForOrder(newOrder, 'reduce')
                    .then(() => db.ref(`root/order/${key}`).update({ stock_reduced: true }))
                    .catch(err => console.error(`Failed to reduce stock for ${key}`, err))
                    .finally(() => processingOrders.current.delete(key));
            }
        };

        const handleOrderChanged = (snapshot: any) => {
            const key = snapshot.key;
            const newOrder = snapshot.val();
            if (!key) return;
            const oldOrder = prevOrdersRef.current[key];

            // Alert for delivery readiness
            if (oldOrder && oldOrder.status !== "Ready for Pickup" && newOrder.status === "Ready for Pickup") {
                addNotification({
                    id: `order_${key}_pickup`,
                    title: "Ready for Pickup",
                    message: `Order #${key} is ready for delivery.`,
                    type: 'delivery',
                    orderId: key
                });
            }

            // Stock restoration for cancellations
            if (newOrder.status === "Cancelled" && newOrder.stock_reduced && !processingOrders.current.has(key)) {
                processingOrders.current.add(key);
                adjustStockForOrder(newOrder, 'increase')
                    .then(() => db.ref(`root/order/${key}`).update({ stock_reduced: false }))
                    .catch(err => console.error(`Failed to restore stock for ${key}`, err))
                    .finally(() => processingOrders.current.delete(key));
            }

            setOrders(prev => ({ ...prev, [key]: newOrder }));
            prevOrdersRef.current[key] = newOrder;
        };

        ordersQuery.on("child_added", handleOrderAdded);
        ordersQuery.on("child_changed", handleOrderChanged);

        // Transition out of initial load burst
        ordersQuery.once("value", () => {
            isInitialLoad.current = false;
        });

        return () => {
            ordersQuery.off("child_added", handleOrderAdded);
            ordersQuery.off("child_changed", handleOrderChanged);
        };
    }, []);

    // 3. Optimized Stock Monitoring
    useEffect(() => {
        const db = firebase.database();
        const stockRef = db.ref("root/stock");
        const prodRef = db.ref("root/products");

        prodRef.once("value", (snap) => {
            productData.current = snap.val() || {};
        });

        const handleStockUpdate = (snapshot: any) => {
            const prodId = snapshot.key;
            const variants = snapshot.val();
            if (!prodId || !variants) return;

            const currentStockLevels = prevStockLevelsRef.current;

            Object.entries(variants).forEach(([varId, variant]: [string, any]) => {
                const qty = parseInt(variant.quantity) || 0;
                const stockKey = `${prodId}_${varId}`;
                const prevQty = currentStockLevels[stockKey] ?? 100;

                if (!isInitialLoad.current && prevQty > 5 && qty <= 5) {
                    const pName = productData.current?.[prodId]?.name || "Unknown Product";
                    addNotification({
                        id: `stock_${prodId}_${varId}`,
                        title: "Low Stock Alert",
                        message: `${pName} is running low (Current Qty: ${qty})`,
                        type: 'stock'
                    });
                }
                currentStockLevels[stockKey] = qty;
            });

            // Update state efficiently
            const flatLevels: Record<string, number> = {};
            Object.entries(variants).forEach(([vId, v]: [string, any]) => {
                flatLevels[`${prodId}_${vId}`] = parseInt(v.quantity) || 0;
            });
            setStockLevels(prev => ({ ...prev, ...flatLevels }));
        };

        // Use child_changed to only download updates
        stockRef.on("child_added", handleStockUpdate);
        stockRef.on("child_changed", handleStockUpdate);

        return () => {
            stockRef.off("child_added", handleStockUpdate);
            stockRef.off("child_changed", handleStockUpdate);
        };
    }, []);

    // 4. Broadcast Listener
    useEffect(() => {
        const db = firebase.database();
        const now = Date.now();
        const broadcastRef = db.ref("root/notifications").orderByChild("timestamp").startAt(now);

        const onBroadcast = (snapshot: any) => {
            const data = snapshot.val();
            if (data) {
                const targetIds = data.targetEmployeeIds;
                const currentEmpId = sessionStorage.getItem("employee_id");
                const role = sessionStorage.getItem("user_role");

                // Show if:
                // 1. User is admin
                // 2. Notification is a global broadcast (no targetIds)
                // 3. User's employeeId is in targetIds
                if (role === 'admin' || !targetIds || (currentEmpId && targetIds.includes(currentEmpId))) {
                    addNotification({
                        id: snapshot.key || Date.now().toString(),
                        title: data.title,
                        message: data.message,
                        type: data.type || 'info'
                    });
                }
            }
        };

        broadcastRef.on("child_added", onBroadcast);
        return () => broadcastRef.off("child_added", onBroadcast);
    }, []);

    const registerDevice = async () => {
        if (!messaging) return;
        const currentStaffId = sessionStorage.getItem("staff_id");
        if (!currentStaffId) return;

        try {
            const token = await getToken(messaging, {
                vapidKey: CONFIG.FCM.vapidKey
            });

            if (token) {
                console.log(`%cFCM Token Generated for User: ${currentStaffId}`, "color: #2196F3; font-weight: bold;");
                console.log("Token:", token);
                // Store token directly in employee profile (replaces old one)
                const employeeRef = ref(modularDb, `root/nexus_hr/employees/${currentStaffId}`);
                await update(employeeRef, {
                    FcmToken: token,
                    lastTokenUpdate: Date.now(),
                    deviceInfo: navigator.userAgent
                });

                // maintain legacy parallel token storage for now (optional, can be removed if not needed)
                const tokenRef = ref(modularDb, `root/staff_tokens/${currentStaffId}/${token.replace(/[.$#[\]]/g, "_")}`);
                await set(tokenRef, {
                    token,
                    lastUpdated: Date.now(),
                    userAgent: navigator.userAgent
                });

                console.log(`%c✓ Token Stored in Employee Record (root/nexus_hr/employees/${currentStaffId})`, "color: #4CAF50; font-weight: bold;");
                console.log("%c🚀 FCM Registration Complete", "color: #4CAF50; font-weight: bold; font-size: 12px;");
            }
        } catch (error) {
            console.error("FCM Registration failed:", error);
        }
    };

    const requestPermission = async (): Promise<boolean> => {
        if (!('Notification' in window)) return false;

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await registerDevice();
                toast.success("Notifications enabled successfully!");
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error requesting permission", error);
            return false;
        }
    };

    // 5. FCM Push Notification Setup
    useEffect(() => {
        if (!messaging) return;

        const initFCM = async () => {
            if (Notification.permission === 'granted') {
                await registerDevice();
            }
        };

        initFCM();

        // Handle foreground messages
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log("Foreground message received:", payload);
            if (payload.notification) {
                addNotification({
                    id: payload.messageId || Date.now().toString(),
                    title: payload.notification.title || "New Notification",
                    message: payload.notification.body || "",
                    type: 'info'
                });
            }
        });

        return () => unsubscribe();
    }, [location.pathname]); // Re-check on nav, but mainly relies on staff_id presence

    const addNotification = (n: Omit<Notification, 'timestamp' | 'read'>) => {
        const id = n.id;
        if (hiddenNotificationsRef.current[id]) return;

        setNotifications(prev => {
            if (prev.some(notif => notif.id === id)) return prev;
            const newNotif: Notification = { ...n, timestamp: Date.now(), read: false };
            setTimeout(() => triggerNotificationEffects(newNotif), 0);
            return [newNotif, ...prev];
        });
    };

    const triggerNotificationEffects = (newNotification: Notification) => {
        if (location.pathname === '/' || location.pathname.startsWith('/delivery') || newNotification.type === 'stock') return;

        const isDefaultPermission = Notification.permission === 'default';

        toast(newNotification.title, {
            description: newNotification.message,
            action: isDefaultPermission ? {
                label: "Enable Notifications",
                onClick: () => requestPermission(),
            } : {
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
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        const userKey = getSafeUserKey();
        firebase.database().ref(`root/user_metadata/${userKey}/hidden_notifications/${id}`).set(true);
    };

    const markAllAsRead = () => {
        const userKey = getSafeUserKey();
        const updates: any = {};
        notifications.forEach(n => { updates[n.id] = true; });
        firebase.database().ref(`root/user_metadata/${userKey}/hidden_notifications`).update(updates);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearNotifications = () => {
        const userKey = getSafeUserKey();
        const updates: any = {};
        notifications.forEach(n => { updates[n.id] = true; });
        firebase.database().ref(`root/user_metadata/${userKey}/hidden_notifications`).update(updates);
        setNotifications([]);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications, requestPermission }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error("useNotification must be used within NotificationProvider");
    return context;
};
