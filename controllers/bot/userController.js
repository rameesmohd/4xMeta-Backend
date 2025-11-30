const BotUser = require('../../models/botUsers');
const { sendNewBotUserAlert } = require("./botAlerts");

const saveUser = async (req, res) => {
  try {
    const payload = req.body;

    // Check if user already exists
    const existingUser = await BotUser.findOne({ id: payload.telegramId });

    // Upsert user
    await BotUser.findOneAndUpdate(
      { id: payload.telegramId },
      { $set: payload },
      { upsert: true, new: true }
    );

    // Send alert only for new user
    if (!existingUser) {
      await sendNewBotUserAlert(payload);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { saveUser };
