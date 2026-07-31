import nodemailer from "nodemailer";

/* SMTP transport, configured from .env. Falls back gracefully: if SMTP isn't
   configured we log the email to the console instead of crashing, so the app
   still runs in dev before you've added credentials. */
let transporter = null;

const isConfigured = () =>
    !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
    if (transporter) return transporter;
    if (!isConfigured()) return null;
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        // 465 = implicit TLS, otherwise STARTTLS
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    return transporter;
};

/* Send an email. In dev without SMTP creds it logs to the console so flows
   are still testable. Returns true if actually dispatched. */
export const sendEmail = async ({ to, subject, html, text }) => {
    const tx = getTransporter();
    const from = process.env.SMTP_FROM || "Club App <no-reply@clubapp.local>";

    if (!tx) {
        console.log("\n──────── EMAIL (SMTP not configured, logging instead) ────────");
        console.log(`To:      ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body:    ${text || html}`);
        console.log("──────────────────────────────────────────────────────────────\n");
        return false;
    }

    await tx.sendMail({ from, to, subject, html, text });
    return true;
};

/* The frontend base URL the action links point at. */
const clientUrl = () => process.env.CLIENT_URL || "http://localhost:5173";

export const sendVerificationEmail = async (user, rawToken) => {
    const link = `${clientUrl()}/verify-email?token=${rawToken}`;
    return sendEmail({
        to: user.email,
        subject: "Verify your Club App email",
        text: `Welcome, ${user.fullName}! Verify your email: ${link} (expires in 30 minutes).`,
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto">
                <h2>Welcome to Club App, ${user.fullName} 👋</h2>
                <p>Confirm your email address to activate your account.</p>
                <p><a href="${link}" style="display:inline-block;padding:12px 22px;background:#b5532a;color:#fff;border-radius:8px;text-decoration:none">Verify email</a></p>
                <p style="color:#888;font-size:13px">This link expires in 30 minutes. If you didn't sign up, ignore this email.</p>
            </div>`,
    });
};

export const sendPasswordResetEmail = async (user, rawToken) => {
    const link = `${clientUrl()}/reset-password?token=${rawToken}`;
    return sendEmail({
        to: user.email,
        subject: "Reset your Club App password",
        text: `Reset your password: ${link} (expires in 30 minutes). If you didn't request this, ignore it.`,
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto">
                <h2>Password reset requested</h2>
                <p>Click below to choose a new password.</p>
                <p><a href="${link}" style="display:inline-block;padding:12px 22px;background:#b5532a;color:#fff;border-radius:8px;text-decoration:none">Reset password</a></p>
                <p style="color:#888;font-size:13px">This link expires in 30 minutes. If you didn't request a reset, your password is unchanged.</p>
            </div>`,
    });
};
