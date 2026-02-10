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

/**
 * Sends a push notification via the Cloud Function "testPush".
 * This iterates through all tokens for the given employees and calls the cloud function for each suitable token.
 */
export const sendCloudFunctionPush = async (employeeIds: string[], title: string, body: string) => {
    if (!employeeIds || employeeIds.length === 0) return;

    // Placeholder URL based on the email service pattern.
    // User can update this if the actual function name/URL differs.
    const CLOUD_FUNCTION_URL = "https://testpush-3gcc2acnha-uc.a.run.app";

    try {
        const db = firebase.database();
        const uniqueTokens = new Set<string>();

        // 1. Fetch tokens for all employees
        for (const id of employeeIds) {
            // Strategy A: Check direct employee record (New Single Source)
            try {
                const empSnap = await db.ref(`root/nexus_hr/employees/${id}/FcmToken`).once("value");
                const empToken = empSnap.val();
                if (empToken && typeof empToken === 'string') {
                    uniqueTokens.add(empToken);
                }
            } catch (e) {
                console.warn(`[FCM] Failed to check employee record for ${id}`, e);
            }

            // Strategy B: Check legacy staff_tokens (Multiple Devices)
            try {
                const snapshot = await db.ref(`root/staff_tokens/${id}`).once("value");
                const tokensObj = snapshot.val();
                if (tokensObj) {
                    Object.values(tokensObj).forEach((entry: any) => {
                        if (entry.token) {
                            uniqueTokens.add(entry.token);
                        }
                    });
                }
            } catch (e) {
                console.warn(`[FCM] Failed to check staff_tokens for ${id}`, e);
            }
        }

        const allTokens = Array.from(uniqueTokens);

        if (allTokens.length === 0) {
            console.warn("[FCM] Cloud Push skipped: No tokens found for employees", employeeIds);

            // DEBUG: Check one ID to see what's in DB to help diagnose
            if (employeeIds.length > 0) {
                try {
                    const debugId = employeeIds[0];
                    const debugSnap = await db.ref(`root/staff_tokens/${debugId}`).once("value");
                    console.log(`[FCM DEBUG] Token query for ${debugId} returned:`, debugSnap.val());
                } catch (e) {
                    console.error("[FCM DEBUG] Failed to query token:", e);
                }
            }
            return;
        }

        // 2. Call Cloud Function for each token
        // The cloud function expects a single token per request based on "const fcmToken = ..."
        const promises = allTokens.map(async (token) => {
            const payload = {
                fcmToken: token,
                payload: {
                    notification: {
                        title: title,
                        body: body
                    }
                }
            };

            try {
                const response = await fetch(CLOUD_FUNCTION_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    console.error(`[FCM] Cloud Function failed for token ${token.substring(0, 10)}...: ${response.status}`);
                }
                return response;
            } catch (err) {
                console.error(`[FCM] Cloud Function error for token ${token.substring(0, 10)}...:`, err);
            }
        });

        await Promise.all(promises);
        console.log(`[FCM] Sent cloud push to ${allTokens.length} devices.`);

    } catch (error) {
        console.error("[FCM] Cloud Push Error:", error);
    }
};
