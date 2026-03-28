// cron/dailyAlerts.js
// import cron from "node-cron";
// import { axiosGet, axiosPost } from "../secureApi.js";
// import isPermanentTelegramError from "../utils/isPermanentTelegramError.js";

// const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// export default function startDailyAlerts(bot) {
//   console.log("⏱️ Daily alerts cron loaded");

//   cron.schedule("0 23 * * 1-5",async () => {
//   // cron.schedule("*/20 * * * * *", async () => {
//       console.log("⏱️ Daily alerts started");

//       let offset = 0;
//       const limit = 500;

//       while (true) {
//         let res;
//         try {
//           res = await axiosGet("/daily-profit-alerts", { limit, offset });
//         } catch (apiErr) {
//           console.error("❌ API fetch error:", apiErr.message);
//           break;
//         }

//         if (!res?.success || !res.alerts?.length) {
//           console.log("✅ No more alerts to send");
//           break;
//         }

//         console.log(`📨 Sending batch: ${res.alerts.length}`);

//         for (const msg of res.alerts) {
//           const chatId = msg.chat_id; // ✅ freeze for catch scope safety

//           try {
//             const imageFileId = process.env.DAILY_PERFORMANCE_IMAGE_FILE_ID || null;

//             if (imageFileId) {
//               await bot.telegram.sendPhoto(chatId, imageFileId, {
//                 caption: msg.payload.text,
//                 parse_mode: msg.payload.parse_mode,
//                 reply_markup: msg.payload.reply_markup,
//               });
//             } else {
//               await bot.telegram.sendMessage(chatId, msg.payload.text, {
//                 parse_mode: msg.payload.parse_mode,
//                 reply_markup: msg.payload.reply_markup,
//               });
//             }

//             await sleep(100);
//           } catch (e) {
//             const errorCode = e.response?.error_code;
//             const errorDesc = e.response?.description || e.message;

//             console.error(`Telegram send error (${chatId}):`, errorDesc);

//             // ✅ Permanent → update DB & skip
//             if (isPermanentTelegramError(e)) {
//               try {
//                 await axiosPost("/bot-user/mark-second-inactive", {
//                   chat_id: chatId,
//                 });
//                 console.log(`🚫 Marked ${chatId} second bot inactive`);
//               } catch (dbErr) {
//                 console.error("❌ Failed to update is_second_bot:", dbErr.message);
//               }
//               continue;
//             }

//             // ✅ Rate limit → wait and continue
//             if (errorCode === 429) {
//               const retryAfter = e.response?.parameters?.retry_after || 5;
//               await sleep(retryAfter * 1000);
//               continue;
//             }

//             // ✅ Any other temporary error → just continue
//             continue;
//           }
//         }

//         offset += limit;
//         await sleep(2000);
//       }

//       console.log("✅ Daily alerts finished");
//     },
//     // { timezone: "Asia/Kolkata" } 
//   );
// }

// controllers/dailyAlertsController.js
const botUserModel = require("../../models/botUsers");
const userModel = require("../../models/user");
const managerTradeModel = require("../../models/managerTrades");
const investorTradeModel = require("../../models/investmentTrades");
const managerModel = require("../../models/manager");
const investmentModel = require("../../models/investment");
const { default: mongoose } = require("mongoose");

/* ---------------- Utils ---------------- */

const getTodayRange = () => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
};

/* ---------------- Message Builder ---------------- */

const buildAlertMessage = ({
  chat_id,
  manager,
  managerProfit,
  userProfit = 0,
  hasInvested
}) => {
  const text = `
<blockquote><b>Manager:</b> ${manager.nickname || manager.name}
<b>Today’s Performance:</b> $${managerProfit.toFixed(2)}
<b>Your Portfolio:</b> ${userProfit > 0 ? "+" : ""}$${userProfit.toFixed(2)}</blockquote>

${hasInvested ? userProfit > 0 ? "<b>Positive progress today.</b>" : userProfit < 0 ? "<b>Controlled drawdown within risk limits.</b>" : "<b>No trades executed today.</b>" : 
`<b>The best part?</b>
Our followers earned this while sleeping, working, or spending time with family.
`}
Check the full breakdown here ⬇️
`.trim();

  return {
    chat_id,
    payload: {
      text,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: hasInvested ? "View Portfolio" : "Start Investing",
              web_app: { url: process.env.WEBAPP_URL }
            }
          ]
        ]
      }
    }
  };
};

/* ---------------- CONTROLLER WITH PAGINATION ---------------- */

const getDailyProfitAlerts = async (req, res) => {
  try {
    const offset = Number(req.query.offset || 0);
    const limit  = Math.min(Number(req.query.limit || 500), 1000);

    const botUsers = await botUserModel.find({ is_second_bot: true }).lean();
    if (!botUsers.length) return res.json({ success: true, alerts: [] });

    const pageBotUsers = botUsers.slice(offset, offset + limit);
    const telegramIds  = pageBotUsers.map(u => u.id);
    if (!telegramIds.length) {
      return res.json({ success: true, offset, limit, count: 0, alerts: [] });
    }

    // Step 1: telegram.id → webApp user
    const webAppUsers = await userModel
      .find({ login_type: "telegram", "telegram.id": { $in: telegramIds } })
      .select("_id telegram")
      .lean();

    // telegramId (string) → webApp _id
    const telegramToUserIdMap = new Map();
    webAppUsers.forEach(u => {
      if (u.telegram?.id) {
        telegramToUserIdMap.set(u.telegram.id.toString(), u._id);
      }
    });

    const allWebAppUserIds = Array.from(telegramToUserIdMap.values());

    if (!allWebAppUserIds.length) {
      return res.json({ success: true, offset, limit, count: 0, alerts: [] });
    }

    // Step 2: find the ONE active investment per user to get their manager
    // (unique index guarantees one investment per user per manager,
    //  but bot users belong to one manager's bot — take active one)
    const investments = await investmentModel
      .find(
        { user: { $in: allWebAppUserIds }, status: "active" },
        { user: 1, manager: 1 }
      )
      .lean();

    // webAppUserId (string) → managerId (string)
    const userToManagerMap = new Map();
    investments.forEach(inv => {
      userToManagerMap.set(inv.user.toString(), inv.manager.toString());
    });

    // Collect only the managers that actually have bot users invested
    const relevantManagerIds = [...new Set(Object.values(
      Object.fromEntries(userToManagerMap)
    ))];

    if (!relevantManagerIds.length) {
      return res.json({ success: true, offset, limit, count: 0, alerts: [] });
    }

    // Step 3: fetch all needed data in parallel
    const { startOfDay, endOfDay } = getTodayRange();

    const [managers, managerProfitResults, userProfitResults] = await Promise.all([
      // Manager docs
      managerModel.find({ _id: { $in: relevantManagerIds } }).lean(),

      // Manager profits for today
      managerTradeModel.aggregate([
        {
          $match: {
            manager: { $in: relevantManagerIds.map(id => new mongoose.Types.ObjectId(id)) },
            is_distributed: true,
            close_time: { $gte: startOfDay, $lte: endOfDay },
          },
        },
        { $group: { _id: "$manager", totalProfit: { $sum: "$manager_profit" } } },
      ]),

      // User profits for today scoped to their manager
      investorTradeModel.aggregate([
        {
          $match: {
            user: { $in: allWebAppUserIds },
            close_time: { $gte: startOfDay, $lte: endOfDay },
          },
        },
        {
          $group: {
            _id: { manager: "$manager", user: "$user" },
            totalProfit: { $sum: "$investor_profit" },
          },
        },
      ]),
    ]);

    // managerId → manager doc
    const managerMap = new Map(managers.map(m => [m._id.toString(), m]));

    // managerId → profit
    const managerProfitMap = new Map();
    managerProfitResults.forEach(r => {
      managerProfitMap.set(r._id.toString(), Number(r.totalProfit.toFixed(2)));
    });

    // "managerId_userId" → profit
    const userProfitMap = new Map();
    userProfitResults.forEach(r => {
      const key = `${r._id.manager}_${r._id.user}`;
      userProfitMap.set(key, Number(r.totalProfit.toFixed(2)));
    });

    // investedSet: "managerId_userId" — already have investments from Step 2
    const investedSet = new Set(
      investments.map(i => `${i.manager}_${i.user}`)
    );

    // Step 4: one alert per bot user using their own manager
    const alerts = [];

    for (const botUser of pageBotUsers) {
      const telegramId   = botUser.id.toString();
      const webAppUserId = telegramToUserIdMap.get(telegramId)?.toString();

      if (!webAppUserId) continue; // bot user not linked to a web app account

      const managerId = userToManagerMap.get(webAppUserId);
      if (!managerId) continue; // no active investment found for this user

      const manager = managerMap.get(managerId);
      if (!manager) continue;

      const managerProfit = managerProfitMap.get(managerId) || 0;
      const userProfit    = userProfitMap.get(`${managerId}_${webAppUserId}`) || 0;
      const hasInvested   = investedSet.has(`${managerId}_${webAppUserId}`);

      alerts.push(
        buildAlertMessage({
          chat_id: Number(botUser.id),
          manager,
          managerProfit,
          userProfit,
          hasInvested,
        })
      );
    }

    return res.json({ success: true, offset, limit, count: alerts.length, alerts });

  } catch (error) {
    console.error("Daily alert controller error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getDailyProfitAlerts };