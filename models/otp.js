const mongoose = require("mongoose");
const { Schema } = mongoose;

const otpSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "users", index: true },
    otp: { type: String, required: true },

    attempts: { type: Number, default: 0 },  // Count wrong attempts

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
      index: { expires: "10m" },
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("otp", otpSchema);
