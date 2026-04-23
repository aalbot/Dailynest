const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin
// If you are running strictly locally and want to use the key file:
// const serviceAccount = require("./service-account.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://dclub-32718-default-rtdb.firebaseio.com" // Replace with yours if different
// });

// STANDARD INITIALIZATION (Best for deployment):
admin.initializeApp();

/**
 * Trigger: When a new task is created in the Realtime Database.
 * Path: root/nexus_hr/tasks/{taskId}
 */
exports.onTaskCreate = functions.database.ref("/root/nexus_hr/tasks/{taskId}")
    .onCreate(async (snapshot, context) => {
        const task = snapshot.val();
        const taskId = context.params.taskId;

        if (!task || !task.assignedEmployeeIds) {
            console.log("No assigned employees for task", taskId);
            return null;
        }

        // assignedEmployeeIds might be an array or an object depending on how it was saved
        let employeeIds = task.assignedEmployeeIds;
        if (!Array.isArray(employeeIds)) {
            // Check if it's an object-like array {0: id1, 1: id2} or just a single string if bug
            if (typeof employeeIds === 'object') {
                employeeIds = Object.values(employeeIds);
            } else {
                employeeIds = [employeeIds];
            }
        }

        console.log(`Processing task ${taskId} for employees:`, employeeIds);

        const promises = [];

        // Fetch tokens for each assigned employee
        for (const empId of employeeIds) {
            if (!empId) continue;

            // Check direct employee record (New Single Source from fcm.ts logic)
            const tokenSnap = await admin.database().ref(`root/nexus_hr/employees/${empId}/FcmToken`).once("value");
            const token = tokenSnap.val();

            if (token && typeof token === 'string') {
                const message = {
                    token: token,
                    notification: {
                        title: "New Task Assigned 📋",
                        body: `You have been assigned a new task: ${task.title || "Untitled Task"}`,
                    },
                    data: {
                        taskId: taskId,
                        click_action: "/tasks", // For web push open
                        url: "/tasks" // Custom data payload
                    }
                };

                promises.push(
                    admin.messaging().send(message)
                        .then((response) => {
                            console.log(`Successfully sent message to ${empId}:`, response);
                            return { success: true, empId };
                        })
                        .catch((error) => {
                            console.error(`Error sending message to ${empId}:`, error);
                            // If token is invalid, remove it to keep DB clean
                            if (error.code === 'messaging/registration-token-not-registered' ||
                                error.code === 'messaging/invalid-argument') {
                                admin.database().ref(`root/nexus_hr/employees/${empId}/FcmToken`).remove();
                            }
                            return { success: false, error };
                        })
                );
            } else {
                console.log(`No valid FCM token found for employee ${empId}`);
            }
        }

        return Promise.all(promises);
    });

/**
 * When a new row is created under root/order, ensure canonical initial status.
 * Covers orders created by external clients that omit or mis-set `status`.
 * Skips the `counter` helper node.
 */
exports.onOrderCreate = functions.database.ref("/root/order/{orderId}")
    .onCreate(async (snapshot, context) => {
        const orderId = context.params.orderId;
        if (orderId === "counter") {
            return null;
        }

        const data = snapshot.val();
        if (!data || typeof data !== "object") {
            return null;
        }

        if (data.status === "Order Placed") {
            return null;
        }

        await admin.database().ref(`/root/order/${orderId}`).update({
            status: "Order Placed",
            last_updated: new Date().toISOString(),
        });

        return null;
    });
