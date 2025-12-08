const mongoose = require("mongoose");

const scheduledMessageSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["text", "audio", "video", "image"], required: true },
    caption: { type: String },
    fileId: { type: String },
    buttons: [{ text: String, url: String }],
    sendAt: { type: Date, required: true }, // exact time to send
    audience: { type: String, enum: ["all", "new", "single"], default: "all" },
    singleUserId: { type: String, default: null },
    isActive: { type: Boolean, default: false },
    isSend : { type: Boolean,default : false},
    totalSent : { type : Number , default : 0}
  },
  { timestamps: true }
);

module.exports = mongoose.model("scheduledMessage", scheduledMessageSchema);
