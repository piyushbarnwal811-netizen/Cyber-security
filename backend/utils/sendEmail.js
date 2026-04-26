import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, text }) => {
  if (!process.env.SMTP_HOST || !to) {
    console.log("Email skipped:", { to, subject, text });
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
