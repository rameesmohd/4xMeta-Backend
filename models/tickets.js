const mongoose = require("mongoose");
const { Schema } = mongoose;

const ticketSchema = new Schema({
    user_id: { 
      type: Schema.Types.ObjectId, 
      ref: 'users', 
      index: true 
    },
    investment: { 
      type: Schema.Types.ObjectId, 
      ref: 'investments', 
      index: true 
    },
    category: {
      type: String,
      enum: [
        'payments',
        'trading',
        'technical',
        'partnerships',
        'other'],
      required: true,
      index: true 
    },
    status: { 
      type: String, 
      enum: ['submitted', 'resolved'], 
      default: 'submitted' 
    },
    description: {
      type : String,
      required : false
    },
    ticket_id: { 
      type: String, 
      default: () => Math.random().toString(36).substring(2, 10).toUpperCase() 
    },
    uploads : {
        type : [],
        required: false 
    },
    createdAt: { 
      type: Date, 
      default: Date.now, 
      index: true 
    },
  },
  {
    timestamps: true,
  }
);
  
const ticketModel = mongoose.model('tickets', ticketSchema);
module.exports = ticketModel;