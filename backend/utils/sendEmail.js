import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, text }) => {
  if (!to) {
    console.log("Email skipped:", { to, subject, text });
    return;
  }

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
      throw new Error(`Resend failed: ${details}`);
    }

    return;
  }

  if (!process.env.SMTP_HOST) {
    console.log("Email skipped: configure RESEND_API_KEY or SMTP settings");
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
