import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log("✅ Email service connected");
  } catch (error) {
    console.warn("⚠️  Email service not connected:", error.message);
    console.warn("   Add EMAIL_USER and EMAIL_PASS in .env to enable emails");
  }
};

const sendVerificationEmail = async (toEmail, name, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      toEmail,
    subject: "Verify your email — StockSense Pro",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#6366f1">StockSense Pro</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thanks for signing up! Please verify your email address by clicking the button below.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;margin:20px 0">
          Verify Email
        </a>
        <p style="color:#888;font-size:13px">This link expires in <strong>24 hours</strong>.</p>
        <p style="color:#888;font-size:13px">If you didn't sign up, ignore this email.</p>
      </div>
    `,
  });
};

const sendApprovalEmail = async (toEmail, name, role) => {
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      toEmail,
    subject: "Your account has been approved — StockSense Pro",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#6366f1">StockSense Pro</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Great news! Your account has been <strong style="color:#22c55e">approved</strong>.</p>
        <p>Your role: <strong>${role}</strong></p>
        <a href="${process.env.FRONTEND_URL}/login"
           style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;margin:20px 0">
          Login Now
        </a>
      </div>
    `,
  });
};

const sendInvitationEmail = async (toEmail, inviterName, role, token) => {
  const inviteUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      toEmail,
    subject: `You're invited to join StockSense Pro`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#6366f1">StockSense Pro</h2>
        <p>Hi there,</p>
        <p><strong>${inviterName}</strong> has invited you to join their team on StockSense Pro as a <strong>${role}</strong>.</p>
        <p>Click the button below to accept the invitation and set up your account.</p>
        <a href="${inviteUrl}"
           style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;margin:20px 0">
          Accept Invitation
        </a>
        <p style="color:#888;font-size:13px">This invitation expires in <strong>7 days</strong>.</p>
      </div>
    `,
  });
};

const sendRejectionEmail = async (toEmail, name) => {
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      toEmail,
    subject: "Your account request — StockSense Pro",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#6366f1">StockSense Pro</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Unfortunately your account request has been <strong style="color:#ef4444">rejected</strong>.</p>
        <p>Please contact your administrator for more information.</p>
      </div>
    `,
  });
};

const sendOtpEmail = async (toEmail, name, code) => {
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      toEmail,
    subject: `${code} — Your StockSense Verification Code`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:30px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#6366f1;margin-top:0">StockSense Pro</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Use the code below to verify your email address. It expires in <strong>5 minutes</strong>.</p>
        <div style="text-align:center;margin:32px 0">
          <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#1e1b4b;background:#f0f0ff;padding:16px 28px;border-radius:10px;display:inline-block">${code}</span>
        </div>
        <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (toEmail, name, code) => {
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      toEmail,
    subject: `${code} — StockSense Password Reset`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:30px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#6366f1;margin-top:0">StockSense Pro</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Use the code below to reset your password. It expires in <strong>5 minutes</strong>.</p>
        <div style="text-align:center;margin:32px 0">
          <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#1e1b4b;background:#f0f0ff;padding:16px 28px;border-radius:10px;display:inline-block">${code}</span>
        </div>
        <p style="color:#888;font-size:13px">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });
};

export {
  verifyEmailConnection,
  sendVerificationEmail,
  sendApprovalEmail,
  sendInvitationEmail,
  sendRejectionEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
};