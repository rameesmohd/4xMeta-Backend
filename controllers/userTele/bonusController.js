const axios = require("axios");
const BotUserModel = require("../../models/botUsers");
const UserModel = require("../../models/user");
const BonusModel = require("../../models/bonus");
const { isUserInChannel } = require("../../utils/isUserInChannel");
const BOT_TOKEN = process.env.BOT_TOKEN;
const API_ROOT = `https://api.telegram.org/bot${BOT_TOKEN}`;

const fetchBonus = async (req, res) => {
  try {
    const userId = req.user._id;

    // get user with bonus_added
    const user = await UserModel.findById(userId)
      .select("bonus_added")
      .lean();

    if (!user) {
      return res.status(404).json({ status: "error", msg: "User not found" });
    }

    const claimedBonusIds = user.bonus_added || [];

    // fetch active claim bonuses NOT in bonus_added
    const bonuses = await BonusModel.find({
      status: "active",
      type: "claim",
      _id: { $nin: claimedBonusIds },
    },{
      amount: 1,
      comment: 1,
      name: 1,
      desc: 1
    }).lean();

    return res.status(200).json({
      status: "success",
      result: bonuses,
    });
  } catch (err) {
    console.error("Bonus fetch error:", err);
    return res.status(500).json({
      status: "error",
      msg: "Failed to fetch bonuses",
    });
  }
};

const checkCriteria = async (req, res) => {
  try {
    const tgId =
      req.user?.telegram?.id ||
      req.user?.telegram_id ||
      req.user?.user_id;

    if (!tgId) {
      return res.status(400).json({
        success: false,
        errMsg: "Telegram user id missing in req.user",
      });
    }

    // 1) "Joined bot" = user exists in your bot_users collection 
    const botUser = await BotUserModel.findOne({ id: tgId, is_second_bot: true })
      .select("_id is_joined_channel")
      .lean();

    const joinedBot = !!botUser;

    let joinedChannel = false;

    try {
      joinedChannel = await isUserInChannel(tgId);
    } catch (e) {
      // Most common reasons:
      // - bot not admin in channel => 403
      // - wrong channel username => 400
      // - user never interacted? (rare) => still returns left/kicked sometimes
      console.log("getChatMember failed:", e?.response?.data?.description || e?.message);
      joinedChannel = false;
    }

    if (botUser && joinedChannel && botUser.is_joined_channel !== true) {
      await BotUserModel.updateOne(
        { id: tgId },
        { $set: { is_joined_channel: true } }
      );
    }

    return res.status(200).json({
      success: true,
      result: {
        bot: joinedBot,
        channel: joinedChannel,
      },
    });
  } catch (err) {
    console.error("checkCriteria error:", err);
    return res.status(500).json({
      success: false,
      errMsg: err.message || "Failed to check criteria",
    });
  }
};

module.exports = { 
    checkCriteria,
    fetchBonus
};
