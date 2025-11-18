const investmentTransactionModel = require("../models/investmentTx");
const rolloverModel = require('../models/rollover')
const { approveDepositTransaction,approveWithdrawalTransaction } = require('../controllers/master/invController')
const { rollOverTradeDistribution } = require('../controllers/tradeController')

const fetchAndUseLatestRollover = async () => {
    const latestPendingRollover = await rolloverModel.findOne({ status: "completed" }).sort({ start_time: -1 });
    if (!latestPendingRollover) {
      console.log("No rollovers found!");
      return;
    }
    console.log("Latest Rollover ID:", latestPendingRollover._id);
    return latestPendingRollover
};

const fetchAndApprovePendingInvestmentTransactions = async (rollover_id) => {
  try {
    const [pendingDepositTransactions, pendingWithdrawTransactions] = await Promise.all([
      investmentTransactionModel.find({ status: "pending", type: "deposit" }),
      investmentTransactionModel.find({ status: "pending", type: "withdrawal" })
    ]);

    await rollOverTradeDistribution(rollover_id);

    for (const transaction of pendingDepositTransactions) {
      const result = await approveDepositTransaction(transaction._id, rollover_id);
      if (!result) {
        console.error(`Deposit Transaction ${transaction._id} failed`);
      }
    }

    for (const transaction of pendingWithdrawTransactions) {
      const result = await approveWithdrawalTransaction(transaction._id, rollover_id);
      if (!result) {
        console.error(`Withdrawal Transaction ${transaction._id} failed`);
      }
    }

    console.log("All pending transactions processed.");
  } catch (error) {
    console.error("Error processing investment transactions:", error);
  }
};


  
module.exports = {
    fetchAndApprovePendingInvestmentTransactions,
    fetchAndUseLatestRollover
}