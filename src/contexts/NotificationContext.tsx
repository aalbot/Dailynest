import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { firebase, messaging, db as modularDb } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { ref, set, update } from "firebase/database";
import { toast } from "sonner";
import { CONFIG } from "@/config";

export interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    type: "info";
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
    const hiddenNotificationsRef = useRef<Record<string, boolean>>({});
    const navigate = useNavigate();
    const location = useLocation();

    const getSafeUserKey = () => {
        const userName = sessionStorage.getItem("staff_name") || sessionStorage.getItem("user_role") || "anonymous";
        return userName.replace(/[.$#[\]]/g, "_");
    };

    useEffect(() => {
        const userKey = getSafeUserKey();
        const db = firebase.database();
        const hiddenRef = db.ref(`root/user_metadata/${userKey}/hidden_notifications`);

        const handleHiddenChange = (snapshot: any) => {
            const hidden = snapshot.val() || {};
            hiddenNotificationsRef.current = hidden;
            setNotifications((prev) =>
                prev.map((n) => (hidden[n.id] ? { ...n, read: true } : n))
            );
        };

        hiddenRef.on("value", handleHiddenChange);
        return () => hiddenRef.off("value", handleHiddenChange);
    }, []);

    const playNotificationSound = () => {
        try {
            const audio = new Audio(CONFIG.ASSETS.notificationSound);
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch {
            /* ignore */
        }
    };

    const registerDevice = async () => {
        if (!messaging) return;
        const currentStaffId = sessionStorage.getItem("staff_id");
        const currentEmployeeId = sessionStorage.getItem("employee_id");
        if (!currentStaffId) return;

        try {
            const token = await getToken(messaging, {
                vapidKey: CONFIG.FCM.vapidKey,
            });

            if (token) {
                if (currentEmployeeId) {
                    const employeeRef = ref(modularDb, `root/nexus_hr/employees/${currentEmployeeId}`);
                    await update(employeeRef, {
                        FcmToken: token,
                        lastTokenUpdate: Date.now(),
                        deviceInfo: navigator.userAgent,
                    });
                }

                const tokenRef = ref(
                    modularDb,
                    `root/staff_tokens/${currentStaffId}/${token.replace(/[.$#[\]]/g, "_")}`
                );
                await set(tokenRef, {
                    token,
                    lastUpdated: Date.now(),
                    userAgent: navigator.userAgent,
                });
            }
        } catch (error) {
            console.error("FCM Registration failed:", error);
        }
    };

    const requestPermission = async (): Promise<boolean> => {
        if (!("Notification" in window)) return false;

        try {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
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

    useEffect(() => {
        const db = firebase.database();
        const now = Date.now();
        const broadcastRef = db.ref("root/notifications").orderByChild("timestamp").startAt(now);

        const onBroadcast = (snapshot: any) => {
            const data = snapshot.val();
            if (!data) return;

            const targetIds = data.targetEmployeeIds;
            const currentEmpId = sessionStorage.getItem("employee_id");
            const role = sessionStorage.getItem("user_role");

            if (
                role === "admin" ||
                role === "superadmin" ||
                !targetIds ||
                (currentEmpId && targetIds.includes(currentEmpId))
            ) {
                addNotification({
                    id: snapshot.key || Date.now().toString(),
                    title: data.title,
                    message: data.message,
                });
            }
        };

        broadcastRef.on("child_added", onBroadcast);
        return () => broadcastRef.off("child_added", onBroadcast);
    }, []);

    useEffect(() => {
        if (!messaging) return;

        const initFCM = async () => {
            if (Notification.permission === "granted") {
                await registerDevice();
            }
        };

        initFCM();

        const unsubscribe = onMessage(messaging, (payload) => {
            if (payload.notification) {
                addNotification({
                    id: payload.messageId || Date.now().toString(),
                    title: payload.notification.title || "New Notification",
                    message: payload.notification.body || "",
                });
            }
        });

        return () => unsubscribe();
    }, [location.pathname]);

    const addNotification = (n: Omit<Notification, "timestamp" | "read" | "type">) => {
        if (location.pathname === "/") return;

        const id = n.id;
        if (hiddenNotificationsRef.current[id]) return;

        setNotifications((prev) => {
            if (prev.some((notif) => notif.id === id)) return prev;
            const newNotif: Notification = { ...n, timestamp: Date.now(), read: false, type: "info" };
            setTimeout(() => triggerNotificationEffects(newNotif), 0);
            return [newNotif, ...prev];
        });
    };

    const triggerNotificationEffects = (newNotification: Notification) => {
        if (location.pathname === "/") return;

        const isDefaultPermission = Notification.permission === "default";

        toast(newNotification.title, {
            description: newNotification.message,
            duration: 6000,
            action: isDefaultPermission
                ? {
                      label: "Enable Notifications",
                      onClick: () => requestPermission(),
                  }
                : {
                      label: "Open Apps",
                      onClick: () => navigate("/apps"),
                  },
        });

        playNotificationSound();
    };

    const markAsRead = (id: string) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        const userKey = getSafeUserKey();
        firebase.database().ref(`root/user_metadata/${userKey}/hidden_notifications/${id}`).set(true);
    };

    const markAllAsRead = () => {
        const userKey = getSafeUserKey();
        const updates: Record<string, boolean> = {};
        notifications.forEach((n) => {
            updates[n.id] = true;
        });
        firebase.database().ref(`root/user_metadata/${userKey}/hidden_notifications`).update(updates);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const clearNotifications = () => {
        const userKey = getSafeUserKey();
        const updates: Record<string, boolean> = {};
        notifications.forEach((n) => {
            updates[n.id] = true;
        });
        firebase.database().ref(`root/user_metadata/${userKey}/hidden_notifications`).update(updates);
        setNotifications([]);
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                markAsRead,
                markAllAsRead,
                clearNotifications,
                requestPermission,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error("useNotification must be used within NotificationProvider");
    return context;
};
