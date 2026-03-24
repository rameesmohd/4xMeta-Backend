const { emailTemplate } = require("./emailTemplates");

/* ─────────────────────────────────────────
   Shared building blocks (same as existing)
───────────────────────────────────────── */

const bodyWrap = (content) => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;background:#ffffff;">
  <tr>
    <td style="padding:26px 30px 22px;">
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

const sectionLabel = (text) => `
<p style="margin:16px 0 8px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">${text}</p>`;

/* ─────────────────────────────────────────
   1. Welcome / Registration Complete
───────────────────────────────────────── */
const welcomeMail = ({ firstName, lastName, email, userId }) =>
  emailTemplate(bodyWrap(`
    ${heading("Welcome to 4xMeta!")}
    ${hi(`${firstName} ${lastName}`)}
    ${para("Your account has been successfully created. You're now part of the 4xMeta copy trading community — smart, secure, and built for growth.")}
    ${divider()}
    ${sectionLabel("Your Account Details")}
    ${infoRow("Full Name", `${firstName} ${lastName}`)}
    ${infoRow("Email Address", email)}
    ${infoRow("User ID", userId)}
    ${divider()}
    ${para("To start trading, complete your KYC verification and fund your wallet. Our team is here to help every step of the way.")}
    ${note("Get started by completing your KYC verification to unlock all platform features.", "#eff6ff", "#93c5fd", "#1e40af")}
  `));

/* ─────────────────────────────────────────
   2. Ticket Submitted
───────────────────────────────────────── */
const ticketSubmittedMail = ({ userName, ticketId, category, description }) =>
  emailTemplate(bodyWrap(`
    ${heading("Support Ticket Received")}
    ${hi(userName)}
    ${para("We have received your support request and our team will review it shortly. Here are the details of your submitted ticket:")}
    ${divider()}
    ${sectionLabel("Ticket Details")}
    ${infoRow("Ticket ID", ticketId)}
    ${infoRow("Category", category.charAt(0).toUpperCase() + category.slice(1))}
    ${infoRow("Status", "Submitted")}
    ${infoRow("Description", description.length > 120 ? description.slice(0, 120) + "..." : description)}
    ${divider()}
    ${para("We typically respond within <strong style='color:#0f172a;'>24–48 hours</strong>. You will receive an email notification once your ticket is updated.")}
  `));

/* ─────────────────────────────────────────
   3. Deposit Successful
───────────────────────────────────────── */
const depositSuccessMail = ({ userName, amount, paymentMode, transactionId, date, walletBalance }) =>
  emailTemplate(bodyWrap(`
    ${heading("Deposit Successful")}
    ${hi(userName)}
    ${para("Great news! Your deposit has been confirmed and your wallet has been credited. Here is a summary of your transaction:")}
    ${divider()}
    ${sectionLabel("Transaction Summary")}
    ${infoRow("Amount Credited", `$${Number(amount).toFixed(2)} USDT`)}
    ${infoRow("Payment Method", paymentMode)}
    ${infoRow("Transaction ID", transactionId)}
    ${infoRow("Date & Time", date)}
    ${infoRow("Updated Wallet Balance", `$${Number(walletBalance).toFixed(2)} USDT`)}
    ${divider()}
    ${para("Your funds are now available in your main wallet and ready to use for investments.")}
    ${note("🔒", "If you did not initiate this deposit, please contact our support team immediately.", "#fff7ed", "#f97316", "#9a3412")}
  `));

/* ─────────────────────────────────────────
   4. Investment Confirmed
───────────────────────────────────────── */
const investmentMail = ({ userName, amount, managerName, managerNickname, tradingInterval, minWithdrawal, performanceFee, invId, date }) =>
  emailTemplate(bodyWrap(`
    ${heading("Investment Confirmed")}
    ${hi(userName)}
    ${para("Your investment has been successfully submitted. Your funds will be allocated to your chosen manager in the <strong style='color:#0f172a;'>next trading rollover cycle</strong>.")}
    ${divider()}
    ${sectionLabel("Investment Details")}
    ${infoRow("Investment ID", `INV_${invId}`)}
    ${infoRow("Amount Invested", `$${Number(amount).toFixed(2)} USDT`)}
    ${infoRow("Manager", `${managerName} (${managerNickname})`)}
    ${infoRow("Trading Interval", tradingInterval)}
    ${infoRow("Performance Fee", `${performanceFee}%`)}
    ${infoRow("Minimum Withdrawal", `$${minWithdrawal} USDT`)}
    ${infoRow("Submitted On", date)}
    ${divider()}
    ${note("📈", "Your funds will be added to the manager's portfolio in the next rollover. Returns will reflect in your investment dashboard.", "#eff6ff", "#93c5fd", "#1e40af")}
    ${note("⚠️", "Copy trading involves risk. Past performance is not indicative of future results.", "#f8fafc", "#e2e8f0", "#64748b")}
  `));

/* ─────────────────────────────────────────
   5. Withdrawal Request Submitted
───────────────────────────────────────── */
const withdrawalRequestMail = ({ userName, amount, networkFee, paymentMode, recipientAddress, transactionId, date }) =>
  emailTemplate(bodyWrap(`
    ${heading("Withdrawal Request Submitted")}
    ${hi(userName)}
    ${para("Your withdrawal request has been received and is now pending review. Our team will process it shortly. Here are your withdrawal details:")}
    ${divider()}
    ${sectionLabel("Withdrawal Details")}
    ${infoRow("Amount Requested", `$${Number(amount).toFixed(2)} USDT`)}
    ${infoRow("Network Fee", `$${Number(networkFee).toFixed(2)} USDT`)}
    ${infoRow("Amount to Receive", `$${(Number(amount) - Number(networkFee)).toFixed(2)} USDT`)}
    ${infoRow("Payment Method", paymentMode)}
    ${infoRow("Recipient Address", recipientAddress)}
    ${infoRow("Transaction ID", transactionId)}
    ${infoRow("Submitted On", date)}
    ${divider()}
    ${para("Withdrawals are typically processed within <strong style='color:#0f172a;'>1–3 business days</strong>. You will receive a confirmation email once the transfer is complete.")}
    ${note("⚠️", "If you did not initiate this withdrawal, contact our support team immediately and change your account password.", "#fff7ed", "#f97316", "#9a3412")}
  `));

module.exports = {
  welcomeMail,
  ticketSubmittedMail,
  depositSuccessMail,
  investmentMail,
  withdrawalRequestMail,
};