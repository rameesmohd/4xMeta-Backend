const mongoose = require("mongoose");
const { Schema } = mongoose;

const rolloverSchema = new Schema({
    period: {
        type: String,
        enum: ["15min","4hr","daily", "weekly", "monthly"],
        required: true,
      },
    status: { 
      type: String, 
      enum: ["pending", "completed", "failed"],
      default: 'pending' 
    },
    start_time: {
        type: Date,
        required: true,
    },
    processed_at: { 
        type: Date, 
    },
    next_rollover_time: {
        type: Date,
        required: true,
    },
  },
);
  
const rolloverModel = mongoose.model('rollover', rolloverSchema);
module.exports = rolloverModel;