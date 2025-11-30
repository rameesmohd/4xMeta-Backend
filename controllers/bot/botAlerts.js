const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const TOKEN = process.env.ALERT_BOT_TOKEN;
const CHANNEL_ID = process.env.ALERT_CHANNEL_ID;

const escapeMarkdown = (text = "") =>
  String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");

const sendNewBotUserAlert = async (user = {}) => {
    
const caption =
`✅ *New Bot User Joined*\n
👤 *Name:* ${escapeMarkdown(`${user.first_name || ""} ${user.last_name || ""}`.trim() || "-")}\n
🔗 *Username:* @${escapeMarkdown(user.username || "-")}\n
🆔 *Telegram ID:* ${escapeMarkdown(user.telegramId)}\n
🌐 *Language:* ${escapeMarkdown(user.language_code || "-")}\n
💎 *Premium:* ${escapeMarkdown(String(user.is_premium || false))}`;


  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: CHANNEL_ID,
      text: caption,
      parse_mode: "MarkdownV2",
    });
  } catch (err) {
    console.error("Send alert error:", err.response?.data || err.message);
  }
};

module.exports= { 
    sendNewBotUserAlert 
};
