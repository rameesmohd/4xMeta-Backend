import cron from "node-cron";
import OnboardingMessage from "../models/botMessage/OnboardingMessage.js";
import { sendMessageSafe } from "../utils/sendBotMessage.js";

cron.schedule("*/1 * * * *", async () => {
  console.log("📦 Checking onboarding queue...");

  const due = await OnboardingMessage.find({
    sent: false,
    scheduledAt: { $lte: new Date() }
  });

  for (let msg of due) {
    const payload = {
      chat_id: msg.telegramId,
      reply_markup: { inline_keyboard: msg.buttons || [] }
    };

    // Normalize content
    const content = msg.content || msg.fileId || null;

    // If content missing, send fallback text to avoid crash
    if (!content) {
      console.log("⚠️ Skipping message: no content found for type:", msg.type);
      msg.sent = true;
      await msg.save();
      continue;
    }

    switch (msg.type) {

      case "text":
        payload.text = msg.caption || msg.content;
        sendMessageSafe("sendMessage", payload);
        break;

      case "image":
        payload.photo = content;
        payload.caption = msg.caption;
        sendMessageSafe("sendPhoto", payload);
        break;

      case "video":
          payload.video = content;
          payload.caption = msg.caption;
          sendMessageSafe("sendVideo", payload);
        break;

      case "audio":
        payload.audio = content;
        payload.caption = msg.caption;
        sendMessageSafe("sendAudio", payload);
        break;

      default:
        console.log("⚠️ Unknown type:", msg.type);
    }

    msg.sent = true;
    await msg.save();
  }
});
