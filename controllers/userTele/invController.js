const investmentModel = require('../../models/investment');
const managerModel = require('../../models/manager');
const userModel = require('../../models/user')
const { default: mongoose } = require('mongoose');
const InvestmentTransaction = require('../../models/investmentTx');
const UserTransaction = require('../../models/userTx');

const makeInvestment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { managerId, amount : rawAmt, ref } = req.body;
      const parsed = Number(rawAmt);
      const amount = Math.floor(parsed * 100) / 100;
      const userId = req.user._id;

      if (!userId || !managerId || !amount || amount <= 0) {
        throw new Error("Invalid input data");
      }

      // Fetch user & manager
      const [user, manager] = await Promise.all([
        userModel.findById(userId).session(session),
        managerModel.findById(managerId).session(session),
      ]);

      if (!user || !manager) throw new Error("User or manager not found");


      // Validate balance
      if (amount > user.wallets.main)
        throw new Error("Insufficient wallet balance");

      // Validate minimum investment
      if (amount < manager.min_initial_investment)
        throw new Error(
          `Minimum investment required is $${manager.min_initial_investment}`
        );

      // Deduct from wallet
      await userModel.findByIdAndUpdate(
        userId,
        { $inc: { "wallets.main": -amount } },
        { session }
      );

      // Generate investment ID
      const invCount = await investmentModel.countDocuments().session(session);

      //Check already existed
      let investment = await investmentModel.findOne({user :user._id ,manager : manager._id })
      
      if(!investment){
          // Find inviter
          let inviter = null;
          if (ref) {
            inviter = await userModel.findOne({ user_id: ref }).session(session);
          } else if (user.referral?.referred_by) {
            inviter = await userModel.findById(user.referral.referred_by).session(session);
          }
          // Create Investment Entry
          const [newInvestment] = await investmentModel.create(
            [
              {
                inv_id: 21234 + invCount,
                user: user._id,
                manager: manager._id,
                manager_nickname: manager.nickname,

                // Manager settings
                trading_interval: manager.trading_interval,
                trading_liquidity_period: manager.trading_liquidity_period,
                min_initial_investment: manager.min_initial_investment,
                min_top_up: manager.min_top_up,
                min_withdrawal: manager.min_withdrawal,
                manager_performance_fee: manager.performance_fees_percentage,

                // Dashboard totals (start empty)
                total_funds: 0,
                total_deposit: 0,
                deposits: [],

                // Referral
                referred_by: inviter ? inviter._id : null,
              },
            ],
            { session }
          );

          investment = newInvestment

          // Referral tracking
          if (inviter && inviter._id.toString() !== user._id.toString()) {
            await userModel.findByIdAndUpdate(
              inviter._id,
              {
                $push: {
                  "referral.investments": {
                    investment_id: investment._id,
                    rebate_received: 0,
                  },
                },
              },
              { session }
            );
          }
      }

      // Format from/to IDs
      const fromWallet = `WALL_${user.wallets.main_id || "UNKNOWN"}`;
      const toInvestment = `INV_${investment.inv_id}`;

      // USER TRANSACTION → (Wallet transfer)
      await UserTransaction.create(
        [
          {
            user: user._id,
            investment: investment._id,
            type: "transfer",
            status: "completed",
            amount,
            from: fromWallet,
            to: toInvestment,
            description: `To Manager: ${manager.nickname}`
          },
        ],
        { session }
      );

      // INVESTMENT TRANSACTION (Deposit to manager)
      await InvestmentTransaction.create(
        [
          {
            user: user._id,
            manager: manager._id,
            investment: investment._id,
            type: "deposit",
            status: "pending",
            amount,
            from: fromWallet,
            to: toInvestment,
            description: `Deposit to ${manager.nickname}`,
          },
        ],
        { session }
      );

      // Increase manager investor count
      await managerModel.findByIdAndUpdate(
        managerId,
        { $inc: { total_investors: 1 } },
        { session }
      );

      return res.status(201).json({
        status : "success",
        msg: "Investment created successfully",
        investmentId: investment._id,
        result: investment,
      });
    });
  } catch (error) {
    console.error("Investment Error:", error);
    return res.status(500).json({
      errMsg: error.message || "Server error",
    });
  } finally {
    session.endSession();
  }
};

const fetchInvestment=async(req,res)=>{
  try {
    const user = req.user._id
    const manager = req.query.manager
    const investment = await investmentModel.findOne({user,manager})

    return res.status(200).json({
      status : "success",
      result: investment,
    });
  } catch (error) {
    console.error("Investment Error:", error);
    return res.status(500).json({
      errMsg: error.message || "Server error",
    });
  }
}

const fetchInvTransactions = async (req, res) => {
  try {
    const user = req.user;
    const { manager } = req.body;

    if ( !manager) {
      return res.status(400).json({
        status: "failed",
        errMsg: "Manager fields are required",
      });
    }

    const transactions = await InvestmentTransaction.find({
      user: user._id,
      manager,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      status: "success",
      result: transactions,
    });
  } catch (error) {
    console.error("Investment Error:", error);
    return res.status(500).json({
      errMsg: error.message || "Server error",
    });
  }
};


module.exports={
    makeInvestment,
    fetchInvestment,
    fetchInvTransactions
}