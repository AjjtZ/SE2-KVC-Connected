// server/utils/emailUtility.js
const nodemailer = require("nodemailer");
require("dotenv").config(); // Make sure dotenv is configured early in your app entry point usually

const sendEmail = async (to, subject, body) => {
    // --- ADD THIS CHECK ---
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("Error sending email: EMAIL_USER or EMAIL_PASS environment variables not set.");
        // Return early to prevent further execution and errors
        return;
    }
    // --- END CHECK ---

    try {
        // Ensure EMAIL_USER/PASS are read *after* the check
        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;

        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailUser, // Use the variable read after check
                pass: emailPass, // Use the variable read after check
            },
            // Consider adding tls options if needed for specific environments, but usually not required for gmail
            // tls: {
            //     rejectUnauthorized: false // Use only if absolutely necessary and understand the risks
            // }
        });

        let mailOptions = {
            // Use the consistent name from your implementation
            from: `"Kho Veterinary Clinic Support" <${emailUser}>`,
            to: to,
            subject: subject,
            text: body, // Or use `html: body` if sending HTML content
        };

        let info = await transporter.sendMail(mailOptions);
        // Log confirmation - keep this if useful for debugging/logging
        console.log("Email sent:", info.response);
        // You might want to return something meaningful on success, e.g., true or info
        // return true;
    } catch (error) {
        // Log the actual error from nodemailer
        console.error("Error sending email:", error);
        // You might want to return false or throw the error on failure
        // return false;
        // throw error; // If you want the caller to handle it
    }
};

module.exports = { sendEmail };