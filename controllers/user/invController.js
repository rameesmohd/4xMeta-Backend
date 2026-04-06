const InvestmentModel = require('../../models/investment');
const ManagerModel = require('../../models/manager');
const UserModel = require('../../models/user')
const { default: mongoose } = require('mongoose');
const InvestmentTransaction = require('../../models/investmentTx');
const InvestmentTrades = require('../../models/investmentTrades');
const UserTransaction = require('../../models/userTx');
const BotUserModel = require('../../models/botUsers')
const BonusModel = require('../../models/bonus');
const { fetchAndUseLatestRollover } = require("../rolloverController");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_SECRET_KEY);
const { investmentMail } = require("../../assets/html/transactional")
const toTwoDecimals = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n * 100) / 100;
};

const makeInvestment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { managerId, amount : rawAmt, ref , topup} = req.body;
      const parsed = Number(rawAmt);
      const amount = Math.floor(parsed * 100) / 100;
      const userId = req.user._id;

      if (!userId || !managerId || !amount || amount <= 0) {
        throw new Error("Invalid input data");
      }

      // Fetch user & manager
      const [user, manager] = await Promise.all([
        UserModel.findById(userId).session(session),
        ManagerModel.findById(managerId).session(session),
      ]);

      if (!user || !manager) throw new Error("User or manager not found");


      // Validate balance
      if (amount > user.wallets.main)
        throw new Error("Insufficient wallet balance");

      // ✅ Correct minimum validation with correct error message
      if (topup) {
        if (amount < manager.min_top_up)
          throw new Error(`Minimum top-up amount is $${manager.min_top_up}`);
      } else {
        if (amount < manager.min_initial_investment)
          throw new Error(`Minimum investment required is $${manager.min_initial_investment}`);
      }

      // Deduct from wallet
      await UserModel.findByIdAndUpdate(
        userId,
        { $inc: { "wallets.main": -amount } },
        { session }
      );

      // Generate investment ID
      const invCount = await InvestmentModel.countDocuments().session(session);

      //Check already existed
      let investment = await InvestmentModel.findOne({user :user._id ,manager : manager._id ,status: "active" }).session(session)
      
      if (user?.login_type === "telegram") {
        await BotUserModel.findOneAndUpdate(
          { id: user.telegram?.id },
          { $set: { is_invested: true } },
          { session, new: true }
      );}
      if(!investment){

          // Find inviter
          let inviter = null;
          if (ref) {
            inviter = await UserModel.findOne({ user_id: ref }).session(session);
          } else if (user.referral?.referred_by) {
            inviter = await UserModel.findById(user.referral.referred_by).session(session);
          }
          // Create Investment Entry
          const [newInvestment] = await InvestmentModel.create(
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
            await UserModel.findByIdAndUpdate(
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
            kind: "cash",   
            amount,
            from: fromWallet,
            to: toInvestment,
            description: `Deposit to ${manager.nickname}`,
          },
        ],
        { session }
      );

      // Increase manager investor count
      await ManagerModel.findByIdAndUpdate(
        managerId,
        { $inc: { total_investors: 1 } },
        { session }
      );

      if (user.email) {
        await resend.emails.send({
          from: `4xMeta <${process.env.WEBSITE_MAIL}>`,
          to: user.email,
          subject: "Investment Confirmed — 4xMeta",
          html: investmentMail({
            userName:        user.first_name || user.telegram?.first_name || "User",
            amount:          amount,
            managerName:     manager.name || manager.nickname,
            managerNickname: manager.nickname,
            tradingInterval: manager.trading_interval,
            minWithdrawal:   manager.min_withdrawal,
            performanceFee:  manager.performance_fees_percentage,
            invId:           investment.inv_id,
            date:            new Date().toLocaleString("en-US", { timeZone: "UTC" }) + " UTC",
          }),
        });
      }

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

const makeBonusInvestment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { manager:managerId, ref ,bonus } = req.body;
      const parsed = Number(bonus.amount);
      const amount = Math.floor(parsed * 100) / 100;
      const userId = req.user._id;
      
      console.log("Bonus Investment Request:", { userId, managerId, amount, bonus });
      if (!userId || !managerId || !amount || !bonus || amount <= 0) {
        throw new Error("Invalid input data");
      }
      
      const isExist = await BonusModel.findOne({ _id: bonus._id, status: "active", type: "claim" })
      if (!isExist) {
        return res.status(400).json({ errMsg: "Bonus not found" });
      }

      // Fetch user & manager
      const [user, manager] = await Promise.all([
        UserModel.findById(userId).session(session),
        ManagerModel.findById(managerId).session(session),
      ]);

      if (!user || !manager) throw new Error("User or manager not found");

      // Generate investment ID
      const invCount = await InvestmentModel.countDocuments().session(session);

      //Check already existed
      let investment = await InvestmentModel.findOne({user :user._id ,manager : manager._id })
      
      await UserModel.findOneAndUpdate(
        { _id: user._id },
        { $addToSet: { bonus_added: bonus._id } },
        { session, new: true }
      );
      
      if(!investment){
        if(user?.login_type === "telegram"){
          await BotUserModel.findOneAndUpdate(
            { id: user.telegram?.id },
            { $set: { is_claimed_bonus: true } },
            { session, new: true }
          );
      }
      // Find inviter
        let inviter = null;
        if (ref) {
          inviter = await UserModel.findOne({ user_id: ref }).session(session);
        } else if (user.referral?.referred_by) {
          inviter = await UserModel.findById(user.referral.referred_by).session(session);
        }
        // Create Investment Entry
        const [newInvestment] = await InvestmentModel.create(
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
          await UserModel.findByIdAndUpdate(
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
      
      const fromWallet = `BONUS`;
      const toInvestment = `INV_${investment.inv_id}`;

      // INVESTMENT TRANSACTION (Deposit to manager)
      await InvestmentTransaction.create(
        [
          {
            user: user._id,
            manager: manager._id,
            investment: investment._id,
            type: "deposit",
            status: "pending",
            kind: "bonus",
            amount,
            from: fromWallet,
            to: toInvestment,
            description: `System Bonus`,
          },
        ],
        { session }
      );

      // Increase manager investor count
      await ManagerModel.findByIdAndUpdate(
        managerId,
        { $inc: { total_investors: 1 } },
        { session }
      );

      await BonusModel.findByIdAndUpdate(
        bonus._id,
        { $inc: { used_count: 1 } },
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
    const user = req.user;
    const userId = req.user._id
    const managerId = req.query.manager
    const investment = await InvestmentModel.findOne({
      user:userId,
      manager:managerId
    })

    return res.status(200).json({
      status : "success",
      result: {
        investment,
        user
      },
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

const getWithdrawSummary= async(req,res)=> {
  try {
  const {id : investmentId } = req.query
  if (!mongoose.Types.ObjectId.isValid(investmentId)) {
    return res.status(400).json({
      success: false,
      errMsg: "Invalid or missing investmentId",
    });
  }

  const investment = await InvestmentModel
    .findById(investmentId)
    .lean();

  if (!investment) {
    return res.status(404).json({
      success: false,
      errMsg: "Investment not found",
    });
  }
  
  // Optionally load user if you need wallet ids etc
  const user = await UserModel.findById(investment.user).lean().catch(() => null);

  // Basic fields (defensive)
  const deposits = Array.isArray(investment.deposits) ? investment.deposits : [];
  const now = new Date();

  // Determine liquidity period in days. Prefer investment.trading_liquidity_period,
  // fallback to deposit.lock_duration for each deposit if present.
  const liquidityDays = Number(investment.trading_liquidity_period) || null;

  // Helper: is a single deposit locked?
  const isDepositLocked = (deposit) => {
    if (deposit?.kind === "bonus") return true;
    // If deposit has explicit unlocked_at, use it
    if (deposit.unlocked_at) {
      const unlockedAt = new Date(deposit.unlocked_at);
      return unlockedAt > now;
    }

    // if deposit has lock_duration field (days) use that
    if (deposit.lock_duration) {
      const depositedAt = new Date(deposit.deposited_at || deposit.depositedAt || deposit.createdAt);
      if (!depositedAt || isNaN(depositedAt.getTime())) return false;
      const unlock = new Date(depositedAt);
      unlock.setDate(unlock.getDate() + Number(deposit.lock_duration || 0));
      return unlock > now;
    }

    // otherwise, if investment-level liquidityDays provided, compute from deposited_at
    if (liquidityDays != null) {
      const depositedAt = new Date(deposit.deposited_at || deposit.depositedAt || deposit.createdAt);
      if (!depositedAt || isNaN(depositedAt.getTime())) return false;
      const unlock = new Date(depositedAt);
      unlock.setDate(unlock.getDate() + Number(liquidityDays));
      return unlock > now;
    }

    // default: not locked
    return false;
  };

  // Sum total deposits
  const totalDeposits = toTwoDecimals(
    deposits.reduce((s, d) => s + (Number(d.amount) || 0), 0)
  );

  // Partition deposits into locked/unlocked
  let depositsLocked = 0;
  const lockedDepositsArr = [];
  const unlockedDepositsArr = [];

  for (const d of deposits) {
    const amt = Number(d.amount) || 0;
    if (isDepositLocked(d)) {
      depositsLocked += amt;
      lockedDepositsArr.push({
        amount: toTwoDecimals(amt),
        deposited_at: d.deposited_at || d.createdAt,
        unlocked_at: d.unlocked_at || null,
        lock_duration: d.lock_duration || liquidityDays || null,
      });
    } else {
      unlockedDepositsArr.push({
        amount: toTwoDecimals(amt),
        deposited_at: d.deposited_at || d.createdAt,
        unlocked_at: d.unlocked_at || null,
        lock_duration: d.lock_duration || liquidityDays || null,
      });
    }
  }

  depositsLocked = toTwoDecimals(depositsLocked);
  const depositsUnlocked = toTwoDecimals(totalDeposits - depositsLocked);

  // Use stored fields when available
  const totalFunds = toTwoDecimals(investment.total_funds || investment.total_equity || 0);

  // totalProfit: prefer closed_trade_profit if present; add open_trade_profit if you want
  const closedProfit = Number(investment.closed_trade_profit || investment.total_trade_profit || 0);
  const openProfit = Number(investment.open_trade_profit || 0);
  const totalProfit = toTwoDecimals(closedProfit + openProfit);
  const projected = Number(investment.performance_fee_projected || 0);
  const paid = Number(investment.performance_fee_paid || 0);
  const profit = Number(totalProfit || 0);

  const netProfit = toTwoDecimals(profit - (projected + paid));  // current interval profit (liquid profit that can be used depending on rules)
  const currentIntervalProfit = toTwoDecimals(investment.current_interval_profit_equity || investment.current_interval_profit || 0);

  // Projected performance fee (if stored)
  const performanceFeeProjected = toTwoDecimals(investment.performance_fee_projected || 0);

  // // Withdrawable calculation:
  // // Basic rule used in your code: withdrawable = totalFunds - depositsLocked
  // // (This prevents withdrawing locked principal)
  // let withdrawableBalance = toTwoDecimals(totalFunds - depositsLocked);
  // if (withdrawableBalance < 0) withdrawableBalance = 0;

  // // Optionally, determine how much of withdrawable is profit vs principal:
  // // We estimate principal still locked/available by comparing totalDeposits and depositsLocked.
  // // - Unlocked principal available = min(depositsUnlocked, totalFunds)
  // // - Profit portion of withdrawable = withdrawable - unlocked principal used
  // const unlockedPrincipalAvailable = Math.min(depositsUnlocked, totalFunds);
  // const profitAvailableEstimate = toTwoDecimals(Math.max(0, withdrawableBalance - unlockedPrincipalAvailable));

  // // Safety: if profitAvailableEstimate is tiny negative because of floats, floor to 0
  // const profitAvailable = profitAvailableEstimate < 0 ? 0 : profitAvailableEstimate;

  // Locked principal
  const lockedPrincipal = depositsLocked;

  // Locked profit (current interval)
  const lockedProfit = currentIntervalProfit;

  // Withdrawable = total funds - locked principal - locked profit
  let withdrawableBalance = toTwoDecimals(
    totalFunds - lockedPrincipal - lockedProfit
  );

  if (withdrawableBalance < 0) withdrawableBalance = 0;

  // Unlocked principal available = min(depositsUnlocked, totalFunds)
  const unlockedPrincipalAvailable = Math.min(depositsUnlocked, totalFunds);

  // Profit available = withdrawable portion - principal portion used
  let profitAvailable = withdrawableBalance - unlockedPrincipalAvailable;
  if (profitAvailable < 0) profitAvailable = 0;
  profitAvailable = toTwoDecimals(profitAvailable);

  // Build a friendly response
  const result = {
    investmentId: investment._id,
    userId: investment.user,
    totalDeposits,
    totalWithdrawals: toTwoDecimals(investment.total_withdrawal || 0),
    depositsLocked,
    depositsUnlocked,
    lockedDepositsList: lockedDepositsArr,
    unlockedDepositsList: unlockedDepositsArr,
    totalFunds,
    totalProfit,
    netProfit,
    currentIntervalProfit,
    performanceFeeProjected,
    lockedProfit: toTwoDecimals(lockedProfit),
    withdrawableBalance,
    profitAvailable,
    unlockedPrincipalAvailable: toTwoDecimals(unlockedPrincipalAvailable),
    liquidityDays: liquidityDays || null,
    // helpful flags
    isFullyLocked: withdrawableBalance <= 0,
    timestamp: new Date().toISOString(),
  };

  return res.status(200).json({
    success : true,
    result,
  })
  } catch (error) {
    console.log(error);
    res.status(500).json({success: false,errMsg : "Server Error",error})
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

const getDepositsInLastTradingDays = (investment) => {
  if (!investment) throw new Error("Investment not found.");

  const startDate = getDateNTradingDaysAgo(
    investment.trading_liquidity_period
  );

  const recentDeposits = (investment.deposits || []).filter((d) => {
    const dt = new Date(d.deposited_at);
    return dt >= startDate;
  });

  const totalRecentDeposits = recentDeposits.reduce(
    (sum, d) => sum + Number(d.amount || 0),
    0
  );

  return { totalRecentDeposits, recentDeposits };
};

const handleInvestmentWithdrawal = async (req, res) => {
  try {
    const { id: investmentId, amount: rawAmount } = req.body;
    const userId = req.user._id

    const amount = toTwoDecimals(rawAmount);
    if (!amount || amount <= 0)
      return res.status(400).json({ success : false, errMsg: "Invalid withdrawal amount." });

    if (amount < 10)
      return res.status(400).json({ success : false, errMsg: "Min withdrawal is $10." });

    const investment = await InvestmentModel.findById(investmentId);
    if (!investment)
      return res.status(400).json({ success : false, errMsg: "Investment not found." });
    
    const user = await UserModel.findById(userId);

    if (!user)
      return res.status(400).json({ errMsg: "User not found." });

    if(user?.login_type === "telegram"){
      const botUser = await BotUserModel.findOne({ id: user.telegram?.id });
      if(!botUser.is_invested){
         return res.status(400).json({errMsg: "Bonus profits can only be withdrawn after a minimum actual investment."});
      }
    }
    
    /** -----------------------------------------
     * Calculate liquidity-locked deposits
     * ----------------------------------------- */
    const { totalRecentDeposits } = getDepositsInLastTradingDays(investment);

    const availableEquity = toTwoDecimals(
        Number(investment.total_equity) -
        Number(totalRecentDeposits) -
        Number(investment.current_interval_profit)
      );

    // Format from/to IDs
    const fromInvestment = `INV_${investment.inv_id}`;
    const toWallet = `WALL_${user.wallets.main_id || "UNKNOWN"}`;

    /** -----------------------------------------
     * CASE 1: Amount is available (unlocked equity)
     * ----------------------------------------- */
    if (amount <= availableEquity) {
      
      const tx = new InvestmentTransaction({
        user: investment.user,
        investment: investment._id,
        manager: investment.manager,
        from: fromInvestment,
        to: toWallet,
        type: "withdrawal",
        status: "pending",
        amount,
        comment: "",
      });

      await tx.save();

      await InvestmentModel.findByIdAndUpdate(investment._id, {
        $inc: {
          total_withdrawal: amount,
          total_equity: -amount,
        },
      });

      return res.status(200).json({success : true,  msg: "Withdrawal processed successfully." });
    }

    /** -----------------------------------------
     * CASE 2: Liquidity period blocks withdrawal
     * User has funds, but recent deposits are locked
     * ----------------------------------------- */
    if (amount > Number(availableEquity)) {
      const rejectTx = new InvestmentTransaction({
        user: investment.user,
        investment: investment._id,
        manager: investment.manager,
        type: "withdrawal",
        status: "failed",
        from: fromInvestment,
        to: toWallet,
        amount,
        comment: `Liquidity Period is active`,
      });

      await rejectTx.save();

      return res
        .status(200)
        .json({success : false, errMsg: "Liquidity Period is active", blocked: true });
    }

    /** -----------------------------------------
     * CASE 3: Insufficient total funds
     * ----------------------------------------- */
    return res
      .status(400)
      .json({ 
        success : false, 
        errMsg: "Insufficient balance to withdraw." 
    });

  } catch (err) {
    console.error("Withdrawal error:", err);
    return res.status(500).json({
      errMsg: "Server error.",
      error: err.message,
    });
  }
};

const fetchInvestments=async(req,res)=>{
  try {
    const user = req.user;
    const userId = req.user._id
    const investment = await InvestmentModel.find({ user: userId }).populate({
      path: "manager",
      select: "img_url ",
    });

    return res.status(200).json({
      status : "success",
      result: {
        investment,
        user
      },
    });
  } catch (error) {
    console.error("Investment Error:", error);
    return res.status(500).json({
      errMsg: error.message || "Server error",
    });
  }
}

const fetchInvestmentTrades = async (req, res) => {
  try {
    const { _id, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [rows, total] = await Promise.all([
      InvestmentTrades.find({ investment: _id })
        .sort({ createdAt: -1 }) // latest first (better than reverse on frontend)
        .skip(skip)
        .limit(limitNum),
      InvestmentTrades.countDocuments({ investment: _id }),
    ]);

    return res.status(200).json({
      result: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: pageNum * limitNum < total,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ errMsg: "Server error!", error: error.message });
  }
};

const fetchInvestmentTransactions = async (req, res) => {
  try {
    const { _id, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [rows, total] = await Promise.all([
      InvestmentTransaction.find({ investment: _id })
        .sort({ updatedAt: -1 }) // ✅ newest first
        .skip(skip)
        .limit(limitNum),
      InvestmentTransaction.countDocuments({ investment: _id }),
    ]);

    return res.status(200).json({
      result: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: pageNum * limitNum < total,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ errMsg: "Server error!", error: error.message });
  }
};

const fetchInvById=async(req,res)=>{
  try {
    const user = req.user
    const userId = req.user._id
    const invId = req.query.id
    const investment = await InvestmentModel.findOne({
      _id : invId,
      user:userId,
    }).populate('manager')

     const latestRollover = await fetchAndUseLatestRollover()   

    return res.status(200).json({
      status : "success",
      result: {
        investment,
        user,
        rollover : latestRollover
      },
    });
  } catch (error) {
    console.error("Investment Error:", error);
    return res.status(500).json({
      errMsg: error.message || "Server error",
    });
  }
}

const checkPendingDeposit = async (req, res) => {
  try {
    const {id} = req.query;
    if (!id) {
      return res.status(400).json({
        errMsg: "Missing investment ID"
      });
    }

    const user = req.user;
    const userId = user._id;

    const pendingDeposits = await InvestmentTransaction.find({
      investment: id,
      user: userId,
      status: "pending",
      type: "deposit",
    })
    .sort({ createdAt: -1 })
    .select({ _id: 1, amount: 1, createdAt: 1, status: 1 })
    .lean();

    return res.status(200).json({
      status: "success",
      result: {
        hasPending: !!pendingDeposits,
        pendingDeposits,
      },
    });
  } catch (error) {
    console.error("Pending Deposit Check Error:", error);
    return res.status(500).json({
      errMsg: error.message || "Server error",
    });
  }
};

// const InvestmentModel = require('../models/investment');
// const UserModel = require('../models/user');
// const investmentTransactionModel = require('../models/investmentTx');
// const userTransactionModel = require('../models/userTx');
// const managerModel = require('../models/manager');
// const { default: mongoose } = require('mongoose');
/**
 * Close an investment and credit the appropriate amount to the user's wallet.
 *
 * RULES:
 *  A) Any deposit still within its liquidity period → principal only (profit on
 *     that slice is forfeited / stays with the manager).
 *  B) If some profit has already been withdrawn (net_profit already paid out),
 *     that amount is deducted from the principal being returned.
 *  C) Deposits whose liquidity period has fully elapsed → principal + settled
 *     profit returned, EXCLUDING current_interval_profit (unsettled interval).
 *  D) current_interval_profit is ALWAYS forfeited on close (interval not settled).
 *  E) performance_fee_projected is also forfeited (would have been deducted at settlement).
 */
const closeInvestment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {

      /* ── 0. Parse & validate ─────────────────────────────────── */
      const { investmentId } = req.body;
      const userId = req.user._id;

      if (!mongoose.Types.ObjectId.isValid(investmentId)) {
        return res.status(400).json({ success: false, errMsg: 'Invalid investmentId.' });
      }

      const investment = await InvestmentModel
        .findOne({ _id: investmentId, user: userId })
        .session(session);

      if (!investment) {
        return res.status(404).json({ success: false, errMsg: 'Investment not found.' });
      }

      if (investment.status === 'closed') {
        return res.status(400).json({ success: false, errMsg: 'Investment is already closed.' });
      }

      const user = await UserModel.findById(userId).session(session);
      if (!user) {
        return res.status(404).json({ success: false, errMsg: 'User not found.' });
      }

      /* ── 1. Snapshot key figures ─────────────────────────────── */
      const now = new Date();

      const totalEquity            = toTwoDecimals(investment.total_equity            || 0);
      const currentIntervalProfit  = toTwoDecimals(investment.current_interval_profit  || 0); // forfeited
      const perfFeeProjected       = toTwoDecimals(investment.performance_fee_projected || 0); // forfeited
      const netProfitAlreadyPaid   = toTwoDecimals(investment.net_profit               || 0); // profit already in wallet
      const deposits               = Array.isArray(investment.deposits) ? investment.deposits : [];

      /* ── 2. Partition deposits: locked vs unlocked ───────────── */
      let lockedPrincipal   = 0;
      let unlockedPrincipal = 0;

      for (const d of deposits) {
        const amt = Number(d.amount) || 0;

        // Bonus deposits are always locked (non-refundable)
        if (d.kind === 'bonus') continue;

        const isLocked = (() => {
          // Prefer explicit unlocked_at stored on the deposit
          if (d.unlocked_at) return new Date(d.unlocked_at) > now;

          // Fall back to lock_duration from deposit or investment level
          const lockDays = Number(d.lock_duration ?? investment.trading_liquidity_period ?? 0);
          if (!lockDays) return false;

          const depositedAt = new Date(d.deposited_at || d.createdAt);
          if (isNaN(depositedAt.getTime())) return false;

          const unlock = new Date(depositedAt);
          unlock.setDate(unlock.getDate() + lockDays);
          return unlock > now;
        })();

        if (isLocked) {
          lockedPrincipal += amt;
        } else {
          unlockedPrincipal += amt;
        }
      }

      lockedPrincipal   = toTwoDecimals(lockedPrincipal);
      unlockedPrincipal = toTwoDecimals(unlockedPrincipal);

      /* ── 3. Calculate what gets credited to the wallet ───────── */

      /**
       * total_equity already reflects:
       *   principal + settled profits − settled fees − previous withdrawals
       *
       * We need to strip out the unsettled current-interval profit because
       * that slice is forfeited on early close.
       *
       * equityExcludingCurrentInterval = the "settled" pool available.
       */
      const equityExcludingCurrentInterval = toTwoDecimals(
        totalEquity - currentIntervalProfit - perfFeeProjected
      );

      /**
       * LOCKED slice:
       *   Profit on locked deposits is forfeited.
       *   We return the raw principal only.
       *   But if the investor has already withdrawn more profit than they earned
       *   on unlocked deposits, that over-withdrawal is recovered from principal.
       *
       * UNLOCKED slice:
       *   Full settled equity attributable to unlocked deposits is returned.
       *   equityExcludingCurrentInterval covers both principal and settled profit
       *   for unlocked deposits.
       */

      // Settled equity attributable to unlocked principal
      // (everything in the settled pool minus the locked principal portion)
      const unlockedSettledEquity = toTwoDecimals(
        Math.max(0, equityExcludingCurrentInterval - lockedPrincipal)
      );

      // For locked deposits: only return principal; forgo any profit on them.
      // Cap at what's actually left in equity so we never return more than exists.
      const lockedRefund = toTwoDecimals(
        Math.min(lockedPrincipal, equityExcludingCurrentInterval)
      );

      /**
       * net_profit already paid out must be reconciled:
       *   If the investor withdrew profits that were derived from principal,
       *   deduct those from the principal refund.
       *
       *   Estimated settled profit in unlocked equity:
       *     settledProfitInPool = unlockedSettledEquity - unlockedPrincipal
       *
       *   Over-withdrawn profit = max(0, netProfitAlreadyPaid - settledProfitInPool)
       *   This over-withdrawn amount is recovered from lockedRefund first, then
       *   from unlockedSettledEquity.
       */
      const settledProfitInPool = toTwoDecimals(
        Math.max(0, unlockedSettledEquity - unlockedPrincipal)
      );

      const overWithdrawnProfit = toTwoDecimals(
        Math.max(0, netProfitAlreadyPaid - settledProfitInPool)
      );

      // Final credit = unlocked settled equity + locked principal refund − over-withdrawals
      let creditToWallet = toTwoDecimals(
        unlockedSettledEquity + lockedRefund - overWithdrawnProfit
      );

      // Safety floor
      if (creditToWallet < 0) creditToWallet = 0;

      /* ── 4. Build a human-readable closing summary ───────────── */
      const closingSummary = {
        totalEquityBeforeClose    : totalEquity,
        currentIntervalForfeited  : currentIntervalProfit,
        perfFeeProjectedForfeited : perfFeeProjected,
        lockedPrincipal,
        lockedRefund,
        unlockedPrincipal,
        unlockedSettledEquity,
        netProfitAlreadyPaid,
        overWithdrawnProfit,
        creditToWallet,
      };

      console.log('📋 Closing summary:', closingSummary);

      /* ── 5. Credit wallet ────────────────────────────────────── */
      await UserModel.findByIdAndUpdate(
        userId,
        { $inc: { 'wallets.main': creditToWallet } },
        { session }
      );

      /* ── 6. Mark investment closed & zero out equity ─────────── */
      await InvestmentModel.findByIdAndUpdate(
        investment._id,
        {
          $set: {
            status                          : 'closed',
            total_equity                    : 0,
            current_interval_profit         : 0,
            current_interval_profit_equity  : 0,
            performance_fee_projected       : 0,
          },
          $inc: {
            total_withdrawal: creditToWallet,
          },
        },
        { session }
      );

      /* ── 7. Decrement manager totals ─────────────────────────── */
      await ManagerModel.findByIdAndUpdate(
        investment.manager,
        {
          $inc: {
            total_funds    : -creditToWallet,
            total_investors: -1,
          },
        },
        { session }
      );

      /* ── 8. Investment transaction record (closure) ──────────── */
      const fromInvestment = `INV_${investment.inv_id}`;
      const toWallet       = `WALL_${user.wallets?.main_id || 'UNKNOWN'}`;

      await InvestmentTransaction.create(
        [
          {
            user      : userId,
            investment: investment._id,
            manager   : investment.manager,
            type      : 'withdrawal',
            status    : 'success',
            amount    : creditToWallet,
            from      : fromInvestment,
            to        : toWallet,
            comment   : `Investment closed. Forfeited: interval_profit=${currentIntervalProfit}, projected_fee=${perfFeeProjected}, over_withdrawn=${overWithdrawnProfit}`,
          },
        ],
        { session }
      );

      /* ── 9. User wallet transaction record ───────────────────── */
      await UserTransaction.create(
        [
          {
            user                : userId,
            investment          : investment._id,
            type                : 'transfer',
            status              : 'completed',
            amount              : creditToWallet,
            from                : fromInvestment,
            to                  : toWallet,
            description         : `Investment ${investment.inv_id} closed`,
            transaction_type    : 'investment_transactions',
            createdAt           : new Date(),
          },
        ],
        { session }
      );

      /* ── 10. Respond ─────────────────────────────────────────── */
      return res.status(200).json({
        success : true,
        msg     : 'Investment closed successfully.',
        summary : closingSummary,
      });
    });

  } catch (error) {
    console.error('closeInvestment error:', error);
    return res.status(500).json({
      success : false,
      errMsg  : error.message || 'Server error.',
    });
  } finally {
    session.endSession();
  }
};

module.exports={
    makeInvestment,
    closeInvestment,
    fetchInvestment,
    fetchInvTransactions,

    fetchInvestments,

    //<===== Withdrawal from Investment ======>
    getWithdrawSummary,
    handleInvestmentWithdrawal,

    makeBonusInvestment,
    fetchInvestmentTrades,
    fetchInvestmentTransactions,
    fetchInvById,
    checkPendingDeposit
}