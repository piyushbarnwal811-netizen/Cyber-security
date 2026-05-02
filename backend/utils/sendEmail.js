import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, text }) => {
  if (!to) {
    console.log("Email skipped:", { to, subject, text });
    return;
  }

  const hasSmtpConfig =
    Boolean(process.env.SMTP_HOST) &&
    Boolean(process.env.SMTP_USER) &&
    Boolean(process.env.SMTP_PASS);

  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.ALERT_EMAIL_FROM || "onboarding@resend.dev",
        to: [to],
        subject,
        text
      })
    });

    if (!response.ok) {
      const details = await response.text();
      // In Resend test mode, external recipients are blocked.
      // If SMTP is configured, fallback so OTP/alerts can still be delivered.
      if (!hasSmtpConfig) {
        throw new Error(`Resend failed: ${details}`);
      }
      console.warn(`Resend failed, falling back to SMTP: ${details}`);
    } else {
      return;
    }
  }

  if (!hasSmtpConfig) {
    console.log(
      "Email skipped: configure RESEND domain/from address or valid SMTP settings"
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.ALERT_EMAIL_FROM || "alerts@fraudshield.ai",
    to,
    subject,
    text
  });
};
