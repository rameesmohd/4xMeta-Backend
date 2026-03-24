const mongoose = require("mongoose");
const { Schema } = mongoose;

const otpSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: false,
    },
    otp: {
      type: String,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 mins
    },

    formData: { 
      type: Object, 
    },

    email: {
      type: String,
      index: true,
      sparse: true
    },
  },
  { timestamps: true }
);

otpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);
otpSchema.index({ user: 1 });

module.exports = mongoose.model("otp", otpSchema);
