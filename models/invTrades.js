const mongoose = require("mongoose");
const { Schema } = mongoose;

const tradeSchema = new Schema(
    {
      manager: { 
        type: Schema.Types.ObjectId, 
        ref: 'manager', 
        required: true },
      investment : {
        type: Schema.Types.ObjectId, 
        ref: 'investments', 
        required: true 
      },
      manager_trade :  { 
        type: Schema.Types.ObjectId, 
        ref: 'manager_trades', 
        required: true },
      type :{
        type :String,
        enum:['buy','sell'],
        required : true
      },
      symbol : { 
        type: String, 
        required: true },
      manager_volume : {
        type :String ,
        required : true},
      open_price: { 
        type: String, 
        required: true }, 
      close_price: { 
        type: String, 
        required: true }, 
      swap : {
        type : String, 
        default : 0},
      open_time: { 
        type: String, 
        required: true }, 
      close_time: { 
        type: String, 
        required: true }, 
      manager_profit: { 
        type: Number, 
        required: true }, 
      rollover_id : { 
        type: Schema.Types.ObjectId, 
        ref: 'rollover' 
      },
      txid: { 
        type: String, 
        default: () => Math.random().toString(36).substring(2, 10).toUpperCase() 
      },
      investor_profit : { 
        type: Number, 
        required: true }, 
    },
    {
      timestamps: true, // Automatically manages createdAt and updatedAt fields
    }
  );
  
const investorTradeModel = mongoose.model('investor_trades', tradeSchema);

module.exports = investorTradeModel;