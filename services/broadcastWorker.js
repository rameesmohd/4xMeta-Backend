import cron from "node-cron";
import BotUser from "../models/botUsers.js";
import ScheduledMessage from "../models/botMessage/ScheduledMessage.js";
import { sendMessageSafe } from "../utils/sendBotMessage.js";

cron.schedule("*/20 * * * * *", async () => {
  console.log("⏱ Checking scheduled messages...");

  const now = new Date();

  // Only pick messages where time has come and not sent previously
  const scheduled = await ScheduledMessage.find({
    isActive: true,
    sendAt: { $lte: now },
    isSend: false,
  });

  for (let msg of scheduled) {
    let targets = [];

    if (msg.audience === "all") {
      targets = await BotUser.find();
    } else if (msg.audience === "single" && msg.singleUserId) {
      targets = [{ telegramId: msg.singleUserId }];
    }

    const totalTargets = targets.length;
    console.log(`📨 Sending message ${msg._id} to ${totalTargets} users`);

    // Send to users
    targets.forEach((user) => {
      const chatId = user.telegramId || user.id;
      if (!chatId) return console.log("⚠ No chat_id found, skipping user");

      const payload = {
        chat_id: chatId,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: msg.buttons
            ?.filter(btn => btn.text && btn.url && btn.url.startsWith("http"))
            .map(btn => [{ text: btn.text, url: btn.url }]) || []
        },
      };

      const media = msg.fileId;

      switch (msg.type) {
        case "text":
          payload.text = msg.caption || "";
          sendMessageSafe("sendMessage", payload);
          break;

        case "image":
          if (!media) return console.log("⚠ Image missing, skipped");
          payload.photo = media;
          payload.caption = msg.caption || "";
          sendMessageSafe("sendPhoto", payload);
          break;

        case "video":
          if (!media) return console.log("⚠ Video missing, skipped");
          payload.video = media;
          payload.caption = msg.caption || "";
          sendMessageSafe("sendVideo", payload);
          break;

        case "audio":
          if (!media) return console.log("⚠ Audio missing, skipped");
          payload.audio = media;
          payload.caption = msg.caption || "";
          sendMessageSafe("sendAudio", payload);
          break;

        default:
          console.log("⚠ Unknown type:", msg.type);
      }
    });

    // Update database after sending
    msg.isSend = true;
    msg.isActive = false;
    msg.sentCount = totalTargets;
    msg.sentAt = new Date();

    await msg.save();

    console.log(`✅ Completed sending message ${msg._id} to ${totalTargets} users`);
  }
});
