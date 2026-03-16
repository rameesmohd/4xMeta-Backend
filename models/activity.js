// models/activityEvent.js
const mongoose = require("mongoose");

const ActivityEventSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["Provider", "Signal", "Risk", "Performance", "Trade"],
      required: true,
    },
    provider: { type: String, required: true },
    message:  { type: String, required: true },
  },
  {
    timestamps: true,       // adds createdAt / updatedAt
    capped: {
      size: 1_048_576,      // 1 MB hard cap (MongoDB requires size even with max)
      max:  100,            // keep latest 100 events
    },
  }
);

ActivityEventSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.ActivityEvent ||
  mongoose.model("activity_event", ActivityEventSchema);