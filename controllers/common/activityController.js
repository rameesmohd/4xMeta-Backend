// routes/activityEvents.js
const ActivityEvent = require("../../models/activity");
const { isMarketClosed } = require("../../utils/generateactivityevents");


const activity =  async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 12, 50);
    const events = await ActivityEvent
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      success:    true,
      marketOpen: !isMarketClosed(),
      events:     events.map((e) => ({
        _id:       e._id,
        category:  e.category,
        provider:  e.provider,
        message:   e.message,
        createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    console.error("[GET /activity-events]", err.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = {
    activity
};