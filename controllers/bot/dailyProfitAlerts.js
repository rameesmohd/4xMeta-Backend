// controllers/dailyAlertsController.js
const botUserModel = require("../../models/botUsers");
const userModel = require("../../models/user");
const managerTradeModel = require("../../models/managerTrades");
const investorTradeModel = require("../../models/investmentTrades");
const managerModel = require("../../models/manager");
const investmentModel = require("../../models/investment");

/* ---------------- Utils ---------------- */

const getTodayRange = () => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
};

const fetchManagerProfitToday = async (managerId) => {
  const { startOfDay, endOfDay } = getTodayRange();

  const result = await managerTradeModel.aggregate([
    {
      $match: {
        manager: managerId,
        is_distributed: true,
        close_time: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: null,
        totalProfit: { $sum: "$manager_profit" }
      }
    }
  ]);

  return result.length ? Number(result[0].totalProfit.toFixed(2)) : 0;
};

const fetchAllUserProfitsForManager = async (managerId, userIds) => {
  // 🔴 FIX 3: Short-circuit if no user IDs
  if (!userIds || userIds.length === 0) {
    return new Map();
  }

  const { startOfDay, endOfDay } = getTodayRange();

  const results = await investorTradeModel.aggregate([
    {
      $match: {
        manager: managerId,
        user: { $in: userIds },
        close_time: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: "$user",
        totalProfit: { $sum: "$investor_profit" }
      }
    }
  ]);

  const map = new Map();
  results.forEach(r => {
    map.set(r._id.toString(), Number(r.totalProfit.toFixed(2)));
  });

  return map;
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
    const limit = Math.min(Number(req.query.limit || 500), 1000);
    
    const alerts = [];

    // Fetch all managers
    const managers = await managerModel.find().lean();
    if (!managers.length) {
      return res.json({ success: true, alerts: [] });
    }

    // Get bot users (who will receive the alerts)
    const botUsers = await botUserModel
      .find({ is_second_bot: true })
      .lean();

    if (!botUsers.length) {
      return res.json({ success: true, alerts: [] });
    }

    // Paginate bot users
    const pageBotUsers = botUsers.slice(offset, offset + limit);

    // Extract telegram IDs from bot users
    const telegramIds = pageBotUsers.map(u => u.id);

    // 🔴 FIX 1: Guard against empty telegram IDs
    if (!telegramIds || telegramIds.length === 0) {
      return res.json({ success: true, offset, limit, count: 0, alerts: [] });
    }

    // Find web app users with matching telegram IDs
    const webAppUsers = await userModel
      .find({ 
        login_type: "telegram",
        "telegram.id": { $in: telegramIds }
      })
      .select("_id telegram")
      .lean();

    // Create a map: telegramId -> webAppUserId
    const telegramToUserIdMap = new Map();
    webAppUsers.forEach(user => {
      if (user.telegram?.id) {
        telegramToUserIdMap.set(user.telegram.id.toString(), user._id);
      }
    });

    // Get all unique web app user IDs
    const allWebAppUserIds = Array.from(telegramToUserIdMap.values());

    // 🔴 FIX 1: If no web app users linked, still send alerts but with zero profit
    const hasLinkedUsers = allWebAppUserIds.length > 0;

    // Process each manager
    for (const manager of managers) {
      // 🔴 FIX 2: Fetch manager profit first and skip if zero
      const managerProfit = await fetchManagerProfitToday(manager._id);
      
      // Skip managers with no activity today (performance optimization)
      // if (managerProfit === 0) {
      //   continue;
      // }

      let profitMap = new Map();
      let investedUserIds = new Set();

      // Only fetch user data if there are linked web app users
      if (hasLinkedUsers) {
        // Fetch profit data for all web app users under this manager
        profitMap = await fetchAllUserProfitsForManager(manager._id, allWebAppUserIds);

        // Fetch investments for these users under this manager
        const investments = await investmentModel.find(
          { 
            user: { $in: allWebAppUserIds }, 
            manager: manager._id 
          },
          { user: 1 }
        ).lean();

        investedUserIds = new Set(investments.map(i => i.user.toString()));
      }

      // Build alerts for each bot user
      for (const botUser of pageBotUsers) {
        const telegramId = botUser.id.toString();
        const webAppUserId = telegramToUserIdMap.get(telegramId);

        let userProfit = 0;
        let hasInvested = false;

        // Only assign profit/investment if user is linked
        if (webAppUserId) {
          const webAppUserIdStr = webAppUserId.toString();
          userProfit = profitMap.get(webAppUserIdStr) || 0;
          hasInvested = investedUserIds.has(webAppUserIdStr);
        }

        alerts.push(
          buildAlertMessage({
            chat_id: Number(botUser.id),
            manager,
            managerProfit,
            userProfit,
            hasInvested
          })
        );
      }
    }

    return res.json({
      success: true,
      offset,
      limit,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error("Daily alert controller error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getDailyProfitAlerts };