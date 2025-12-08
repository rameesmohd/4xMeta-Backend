import mongoose from "mongoose";

const onboardingMessageSchema = new mongoose.Schema({
  telegramId: { type: String, required: true },
  type: { type: String, enum: ["text", "audio", "video", "image"], required: true },
  content: { type: String, required: true },
  caption: { type: String, default: "" },
  delayMinutes: { type: Number, required: true },
  buttons: { type: Array, default: [] },
  scheduledAt: { type: Date, required: true },
  sent: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("OnboardingMessage", onboardingMessageSchema);
