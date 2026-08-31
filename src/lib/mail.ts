import nodemailer from "nodemailer";

export type SendMailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SendMailResult =
  | { success: true }
  | { success: false; skipped?: boolean; error: string };

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function mailUser() {
  return process.env.EMAIL_USER || process.env.GMAIL_USER || "";
}

function mailPass() {
  return process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || "";
}

export function getShopInbox() {
  return process.env.MAIL_TO || mailUser();
}

export function isMailConfigured() {
  return Boolean(mailUser() && mailPass());
}

export async function sendMail(options: SendMailOptions): Promise<SendMailResult> {
  const user = mailUser();
  const pass = mailPass();

  if (!user || !pass) {
    console.warn("sendMail skipped: EMAIL_USER / EMAIL_PASS are not set");
    return { success: false, skipped: true, error: "Email is not configured" };
  }

  if (!options.to || (Array.isArray(options.to) && options.to.length === 0)) {
    return { success: false, error: "Missing recipient" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: Number(process.env.EMAIL_PORT || 465),
      secure: Number(process.env.EMAIL_PORT || 465) === 465,
      auth: { user, pass },
    });

    const from = process.env.MAIL_FROM || `Dukandar Shandar <${user}>`;

    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      replyTo: options.replyTo,
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    console.error("sendMail error:", error);
    return { success: false, error: message };
  }
}
