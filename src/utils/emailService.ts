
export const sendTaskUpdateEmail = async (
    recipients: { email: string }[],
    taskTitle: string,
    taskDescription: string,
    hasAttachments: boolean,
    customSubject?: string
) => {
    // URL provided by user request. 
    // NOTE: This URL (Firebase Console Overview) is likely incorrect for an API endpoint.
    // It should probably be a Google Apps Script Web App URL (e.g., script.google.com/macros/s/.../exec).
    const API_URL = "https://script.google.com/macros/s/AKfycbx7.../exec"; // Placeholder for the actual script ID if known, or use the one user provided if insisted.

    // User provided URL: https://console.firebase.google.com/project/dclub-32718/overview
    // I will use a placeholder variable for now and comment on it.
    const USER_PROVIDED_URL = "https://sendemail-3gcc2acnha-uc.a.run.app";

    // Construct the payload rows
    // User requested format:
    // "data": [ ["to-email", "email@address", "Subject", "Body"] ]

    const emailRows = recipients.map(recipient => {
        const subject = customSubject || "New task assigned";
        let body = `<h1>${taskTitle}</h1><br><p>${taskDescription}</p>`;

        if (hasAttachments) {
            body += "<br><p><strong>Note:</strong> This task includes attachments. Please check the dashboard for details.</p>";
        }

        return [recipient.email, "dailyclub767@gmail.com", subject, body];
    });

    const payload = {
        "clmail": "dailyclub767@gmail.com",
        "pass": "stwrjcogdsprkapd",
        "data": emailRows
    };

    try {
        // Using no-cors mode might be needed if calling Google Script from browser, but for now standard POST
        const response = await fetch(USER_PROVIDED_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("Email API responded with error:", response.status, response.statusText);
            return false;
        }

        // Google Scripts often return a redirect or text/plain
        const result = await response.text();
        console.log("Email API response:", result);
        return true;

    } catch (error) {
        console.error("Failed to send task email notification:", error);
        return false;
    }
};
