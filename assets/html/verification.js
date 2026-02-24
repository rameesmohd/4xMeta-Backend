const { emailTemplate } = require("./emailTemplates");
/* ─────────────────────────────────────────
   Shared building blocks
───────────────────────────────────────── */

const otpBlock = (otp) => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:28px 0 24px;">
      <table cellpadding="0" cellspacing="0" role="presentation"
        style="border-collapse:collapse;border-radius:14px;background:linear-gradient(135deg,#eff6ff,#ecfeff);border:1px solid #bfdbfe;">
        <tr>
          <td style="padding:5px;">
            <table cellpadding="0" cellspacing="0" role="presentation"
              style="border-collapse:collapse;border-radius:10px;background:linear-gradient(135deg,#1d4ed8,#0891b2);">
              <tr>
                <td align="center" style="padding:18px 44px;">
                  <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:38px;font-weight:700;color:#ffffff;letter-spacing:12px;line-height:1;">${otp}</p>
                  <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:10px;color:rgba(255,255,255,0.65);letter-spacing:3px;text-transform:uppercase;">Verification Code</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:14px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#94a3b8;line-height:1.5;">
        This code expires in <strong style="color:#334155;">10 minutes</strong>. Do not share it with anyone.
      </p>
    </td>
  </tr>
</table>`;

const bodyWrap = (content) => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;background:#ffffff;">
  <tr>
    <td style="padding:36px 40px 32px;">
      ${content}
    </td>
  </tr>
</table>`;

const heading = (text) => `
<table cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin-bottom:20px;">
  <tr>
    <td style="width:3px;border-radius:2px;background:linear-gradient(180deg,#2563eb,#06b6d4);padding:0;font-size:0;line-height:0;">&nbsp;</td>
    <td style="padding:0 0 0 12px;">
      <h2 style="margin:0;font-family:Arial,sans-serif;font-size:19px;font-weight:700;color:#0f172a;line-height:1.3;">${text}</h2>
    </td>
  </tr>
</table>`;

const hi = (name) => `
<p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:#0f172a;">Hello, ${name}</p>`;

const para = (text) => `
<p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:14px;color:#475569;line-height:1.75;">${text}</p>`;

const note = (icon, text, bg, border, color) => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
  style="border-collapse:collapse;border-radius:10px;background:${bg};border-left:3px solid ${border};margin-top:6px;">
  <tr>
    <td style="padding:12px 16px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:${color};line-height:1.6;">${icon}&nbsp;&nbsp;${text}</p>
    </td>
  </tr>
</table>`;

const divider = () => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin:20px 0;">
  <tr><td style="height:1px;background:#f1f5f9;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>`;

const infoRow = (label, value) => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin-bottom:10px;">
  <tr>
    <td style="padding:10px 14px;background:#f8fafc;border-radius:8px;border:1px solid #f1f5f9;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">${label}</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#0f172a;">${value}</p>
    </td>
  </tr>
</table>`;

const badge = (text, bg, color) => `
<table cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;display:inline-table;">
  <tr>
    <td style="padding:4px 12px;border-radius:20px;background:${bg};">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${color};letter-spacing:0.5px;">${text}</p>
    </td>
  </tr>
</table>`;

/* ─────────────────────────────────────────
   1. Email Verification
───────────────────────────────────────── */
const verification = (otp, userName) =>
  emailTemplate(bodyWrap(`
    ${heading("Verify Your Email Address")}
    ${hi(userName)}
    ${para("Thank you for signing up! You're one step away from activating your account. Use the verification code below to confirm your email address:")}
    ${otpBlock(otp)}
    ${note("🔒", "If you did not create an account with us, you can safely ignore this email. No action is required.", "#f8fafc", "#e2e8f0", "#64748b")}
  `));

/* ─────────────────────────────────────────
   2. Withdrawal Verification
───────────────────────────────────────── */
const withdrawalVerification = (otp, userName) =>
  emailTemplate(bodyWrap(`
    ${heading("Withdrawal Verification")}
    ${hi(userName)}
    ${para("We received a withdrawal request from your account. To authorise this transaction, please enter the one-time code below in the app:")}
    ${otpBlock(otp)}
    ${note("⚠️", "If you did not initiate this withdrawal, contact our support team immediately and change your account password.", "#fff7ed", "#f97316", "#9a3412")}
  `));

/* ─────────────────────────────────────────
   3. Forgot Password
───────────────────────────────────────── */
const forgotMail = (otp, userName) =>
  emailTemplate(bodyWrap(`
    ${heading("Reset Your Password")}
    ${hi(userName)}
    ${para("We received a request to reset the password for your account. Use the code below to proceed — it is valid for 10 minutes:")}
    ${otpBlock(otp)}
    ${note("🛡️", "If you did not request a password reset, no action is needed. Your password will remain unchanged and your account is secure.", "#f0fdf4", "#86efac", "#166534")}
  `));

/* ─────────────────────────────────────────
   4. Generic Email to User
───────────────────────────────────────── */
const sendEmailToUser = ({ title, username, desOne, desTwo, desThree }) =>
  emailTemplate(bodyWrap(`
    ${heading(title)}
    ${hi(username)}
    ${para(desOne)}
    ${desTwo ? para(desTwo) : ""}
    ${desThree ? para(desThree) : ""}
    ${divider()}
    ${note("ℹ️", "If you have any questions about this notification, please reach out to our support team.", "#eff6ff", "#93c5fd", "#1e40af")}
  `));

/* ─────────────────────────────────────────
   5. Purchase Confirmation (User)
───────────────────────────────────────── */
const purchaseConfirmation = (userName) =>
  emailTemplate(bodyWrap(`
    ${heading("Challenge Purchase Confirmed")}
    ${hi(userName)}
    ${para("Your challenge purchase has been received and confirmed. Our team is now processing your order and setting up your trading environment.")}

    ${divider()}

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:16px;background:linear-gradient(135deg,#eff6ff,#ecfeff);border-radius:12px;border:1px solid #bfdbfe;">
          <p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:1px;">What happens next?</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
            <tr>
              <td style="padding:5px 0;">
                <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#334155;line-height:1.6;">
                  ✅ &nbsp;Order received and confirmed<br/>
                  ⏳ &nbsp;Trading account is being configured<br/>
                  📧 &nbsp;Account credentials sent once ready
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${para("You will receive another email with your trading account credentials as soon as your challenge is ready. This typically takes a short time.")}
    ${note("📌", "Please check your inbox (and spam folder) for your account details email. If you have not received it within 24 hours, contact our support team.", "#f8fafc", "#cbd5e1", "#475569")}
  `));

/* ─────────────────────────────────────────
   6. Purchase Confirmation (Admin)
───────────────────────────────────────── */
const purchaseConfirmationAdmin = (userName) =>
  emailTemplate(bodyWrap(`
    ${heading("New Challenge Purchase — Action Required")}
    ${hi("Admin")}
    ${para("A new challenge order has been placed and requires your attention. Please review the details below and initiate account provisioning.")}

    ${divider()}

    ${infoRow("Ordered by", userName)}
    ${infoRow("Action Required", "Provision trading account and send credentials to user")}
    ${infoRow("Priority", "Standard")}

    ${divider()}

    ${note("🚨", "Please process this order promptly. The user has been notified that their account is being set up and is awaiting credentials.", "#fff7ed", "#f97316", "#9a3412")}
  `));

module.exports = {
  verification,
  forgotMail,
  purchaseConfirmation,
  purchaseConfirmationAdmin,
  withdrawalVerification,
  sendEmailToUser,
};