const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  user_id: {
    type: String,
    unique: true,
    required: true,
  },
  email: {
    type: String,
    set: (v) => v.toLowerCase(),
  },
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
    default: "",
  },
  username: {
    type: String,
    default: "",
  },
  is_verified: {
    type: Boolean,
    default: false,
  },
  join_date: {
    type: Date,
    default: Date.now,
  },
  start_date: {
    type: Date,
    default: Date.now,
  },
  is_upgraded: {
    type: Boolean,
    default: false,
  },
  ip_address: {
    type: String,
  },
  is_blocked: {
    type: Boolean,
    default: false,
  },
  token: {
    type: String,
    default: "",
  },
});

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ user_id: 1 });
userSchema.index({ join_date: -1 });
userSchema.index({ ip_address: 1 });

const userModel = mongoose.model("users", userSchema);
module.exports = userModel;
