const investmentModel = require('../../models/investment');
const investmentTransactionModel = require('../../models/investmentTx');
const userTransactionModel = require('../../models/userTx');
const userModel = require('../../models/user')
const investmentTradesModel =require('../../models/investmentTrades');
const { default: mongoose } = require('mongoose');

const fetchInvestmentTransactions=async(req,res)=>{
    try {
      const { id } = req.query
      const response = await investmentTransactionModel.find({investment : id})
      if(response){
          res.status(200).json({result : response})
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ errMsg: 'Server error!', error: error.message });
    }
}

// Helper function to calculate the date N trading days ago (only weekdays considered)
const getDateNTradingDaysAgo=(n)=> {
  let targetDate = new Date();
  let daysCount = 0;

  while (daysCount < n) {
    targetDate.setDate(targetDate.getDate() - 1);
    const dayOfWeek = targetDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysCount++;
    }
  }
  return targetDate;
}

const fetchInvestmentTrades=async(req,res)=>{
  try {
    const {_id} = req.query
    const myInvestmetTrades =  await investmentTradesModel.find({investment:_id})
    return res.status(200).json({result : myInvestmetTrades})
  } catch (error) {
    console.error(error);
    return res.status(500).json({ errMsg: 'Server error!', error: error.message });
  }
}

//-------------------------------------------------------Manager Functions------------------------------------------------//

const fetchAllInvestmentTransactions=async(req,res)=>{
  try {
    const { manager_id ,type} = req.query
    const myInvestmentDeposits = await investmentTransactionModel
    .find({ manager: manager_id, type })
    .populate({
      path: "investment",
      select: "inv_id"
    })
    .populate({
      path: "user",
      select: "email telegram login_type"
    })
    .sort({ createdAt: -1 });
    res.status(200).json({result : myInvestmentDeposits})
  } catch(error) { 
    console.error(error);
    return res.status(500).json({ errMsg: 'Server error!', error: error.message });
  }
}

module.exports = {
    fetchInvestmentTransactions,
    fetchInvestmentTrades,
    fetchAllInvestmentTransactions          
}