const axios = require("axios");
const dotenv = require("dotenv");
const userModel = require("../../models/user");

dotenv.config();

const TOKEN = process.env.ALERT_BOT_TOKEN;
const CHANNEL_ID = process.env.ALERT_CHANNEL_ID;

if (!TOKEN || !CHANNEL_ID) {
  console.warn(
    "[alertService] ALERT_BOT_TOKEN or ALERT_CHANNEL_ID is not set in environment variables."
  );
}

const escapeMarkdown = (text = "") =>
  String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");


const sendTelegramAlert = async (text) => {
  if (!TOKEN || !CHANNEL_ID) return;

  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

  try {
    await axios.post(url, {
      chat_id: CHANNEL_ID,
      text,
      parse_mode: "MarkdownV2",
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error(
      "[alertService] Send alert error:",
      err.response?.data || err.message
    );
  }
};

const sendNewBotUserAlert = async (user = {}) => {
  const count = await userModel.countDocuments();

  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "-";

  const caption = 
`✅ *NEW BOT USER*\n
👥 *Total Users:* ${escapeMarkdown(String(count))}\n
👤 *Name:* ${escapeMarkdown(fullName)}\n
🔗 *Username:* @${escapeMarkdown(user.username || "-")}\n
🆔 *Telegram ID:* ${escapeMarkdown(user.telegramId || "-")}\n
🌐 *Language:* ${escapeMarkdown(user.language_code || "-")}\n`;

  await sendTelegramAlert(caption);
};

const sendKycRequestedAlert = async ({ user = {}, kycLevel = "Standard", requestId = "-" } = {}) => {
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "-";

  const caption =
`📝 *NEW KYC REQUEST*\n
👤 *Name:* ${escapeMarkdown(fullName)}\n
🔗 *Username:* @${escapeMarkdown(user.username || "-")}\n
🆔 *Telegram ID:* ${escapeMarkdown(user.telegramId || "-")}\n
📛 *KYC Level:* ${escapeMarkdown(kycLevel)}\n
🆔 *Request ID:* ${escapeMarkdown(requestId)}\n
📅 *Requested At:* ${escapeMarkdown(new Date().toISOString())}\n`;

  await sendTelegramAlert(caption);
};

const sendUserDepositAlert = async ({
  user = {},
  amount = 0,
  currency = "USD",
  paymentMethod = "-",
  txid = "-",
  createdAt = new Date()
} = {}) => {
  const fullName =
    `${user.first_name || ""} ${user.last_name || ""}`.trim() || "-";

  const caption = `
💰 *DEPOSIT CONFIRMATION*
────────────────────
👤 *Client:* ${escapeMarkdown(fullName)}
🔗 *Username:* ${user.username ? `@${escapeMarkdown(user.username)}` : "—"}
🆔 *Telegram ID:* ${escapeMarkdown(user.telegramId || "—")}

💵 *Amount:* ${escapeMarkdown(`${Number(amount).toFixed(2)} ${currency}`)}
💳 *Payment Method:* ${escapeMarkdown(paymentMethod)}

🧾 *Transaction ID:*
${escapeMarkdown(txid)}

📅 *Date:* ${escapeMarkdown(
  new Date(createdAt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
)}
────────────────────
`;

  await sendTelegramAlert(caption);
};


module.exports = {
  sendNewBotUserAlert,
  sendKycRequestedAlert,
  sendUserDepositAlert
};
