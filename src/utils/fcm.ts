import { firebase } from "@/lib/firebase";
import { CONFIG } from "@/config";

/**
 * Sends a push notification to multiple employees via FCM Legacy HTTP API.
 * This fetches tokens from root/staff_tokens/EMPLOYEE_ID
 */
export const sendPushNotification = async (employeeIds: string[], title: string, body: string, data: any = {}) => {
    if (!employeeIds || employeeIds.length === 0) return;

    const serverKey = (CONFIG.FCM as any).serverKey; // We'll add this to config
    if (!serverKey || serverKey === "YOUR_FCM_SERVER_KEY") {
        console.warn("[FCM] Push skipped: No Server Key configured in src/config/index.ts");
        return;
    }

    try {
        const db = firebase.database();
        const allTokens: string[] = [];

        // 1. Fetch tokens for all employees
        for (const id of employeeIds) {
            const snapshot = await db.ref(`root/staff_tokens/${id}`).once("value");
            const tokensObj = snapshot.val();
            if (tokensObj) {
                Object.values(tokensObj).forEach((entry: any) => {
                    if (entry.token) {
                        allTokens.push(entry.token);
                    }
                });
            }
        }

        if (allTokens.length === 0) {
            console.warn("[FCM] Push skipped: No tokens found for employees", employeeIds);
            return;
        }

        // 2. Prepare payload
        const payload = {
            registration_ids: allTokens,
            notification: {
                title,
                body,
                icon: "/logo.png",
                click_action: window.location.origin + "/tasks",
                sound: "default"
            },
            data: {
                ...data,
                click_url: "/tasks"
            }
        };

        // 3. Send to FCM
        const response = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `key=${serverKey}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log("[FCM] Push Response:", result);
        return result;
    } catch (error) {
        console.error("[FCM] Push Error:", error);
    }
};
