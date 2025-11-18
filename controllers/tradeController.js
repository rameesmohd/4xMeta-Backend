const { default: mongoose } = require('mongoose');
const investmentModel = require('../models/investment');
const investorTradeModel = require('../models/invTrades');
const managerModel = require('../models/manager')
const managerTradeModel = require('../models/managerTrades')
const compountProfitChartModel = require('../models/compoundProfitChart')
const { ObjectId } = require('mongoose').Types;
const dayjs = require('dayjs');

const addTradeToManager=async(req,res)=>{
    try {
        const { formData , manager_id } = req.body
        const {
            close_price,
            close_time,
            manager_profit,
            manager_volume,
            open_price,
            open_time,
            symbol,
            type,
            swap    
        } = formData

        const newTrade =new managerTradeModel({
            manager : manager_id,
            symbol,
            manager_volume,
            type,
            open_price,
            close_price,
            swap,
            open_time,
            close_time,
            manager_profit
        })
        
        await newTrade.save()
        res.status(200).json({result : newTrade,msg:'Trade added successfully'})
    } catch (error) {
        console.log(error);
        res.status(500).json({errMsg : 'sever side error'})
    }
}

const getTrades=async(req,res)=>{
    try {
        const {_id,distributed} = req.query
        // Validate _id
        if (!ObjectId.isValid(_id)) {
            return res.status(400).json({ errMsg: 'Invalid manager ID' });
        }

        // Query trades based on distribution status
        const tradeData = await managerTradeModel.find({
            manager: _id,
            is_distributed: distributed === 'true', // Convert query parameter to boolean
        }).sort({createdAt:-1});

        res.status(200).json({result : tradeData})
    } catch (error) {
        console.log(error);
        res.status(500).json({errMsg : 'sever side error'})
    }
}

const getDailyGrowthData = async (managerId) => {
    const dailyGrowth = await managerTradeModel.aggregate([
      {
        $match: { manager: managerId }, // Filter trades by the manager's ID
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$open_time" }, // Group by day
          },
          totalProfit: { $sum: "$manager_profit" }, // Sum profit for each day
        },
      },
      {
        $sort: { _id: 1 }, // Sort by date (ascending)
      },
      {
        $project: {
          date: "$_id", // Rename _id to date
          value: { $round: ["$totalProfit", 2] }, // Round profit to 2 decimals
          _id: 0,
        },
      },
    ]);
  
    return dailyGrowth.map((data) => ({
      date: new Date(data.date).getTime(), // Convert date to timestamp for charting
      value: data.value,
    }));
  };

const truncateToTwoDecimals = (num) => {
    return Number(num.toFixed(2));
  };
  
// const rollOverTradeDistribution = async (rollover_id) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // Fetch undistributed trades
//     const unDistributedTrades = await managerTradeModel.find({ is_distributed: false }).session(session);

//     if (unDistributedTrades.length === 0) {
//         console.log("No undistributed trades found.");
//         await session.commitTransaction();
//         session.endSession();
//         return true;
//     }

//     const bulkInvestmentUpdates = [];
//     const bulkInvestorTradeInserts = [];
//     const bulkTradeUpdates = [];
//     const bulkManagerUpdates = [];

//     for (const trade of unDistributedTrades) {
//           const tradeProfit =   truncateToTwoDecimals(trade.manager_profit);

//           const manager = await managerModel.findById(trade.manager).session(session);
//           if (!manager) {
//               console.warn(`Manager not found for trade ${trade._id}`);
//               continue;
//           }

//           // Update manager profits
//           manager.closed_trade_profit += tradeProfit;
//           manager.total_trade_profit += tradeProfit;

//           const investments = await investmentModel.find({ manager: manager._id }).session(session);
//           const totalFunds = investments.reduce((sum, inv) => sum + (inv.total_funds || 0), 0);

//           if (totalFunds === 0) {
//               console.warn(`Manager ${manager._id} has no funds to distribute.`);
//               continue;
//           }

//           for (const investment of investments) {

//               if(investment.total_funds < 1){
//                 console.warn(`Skipping investment due to no funds ${investment._id}`);
//                 continue;
//               }

//             const investorProfit = truncateToTwoDecimals(
//                 (investment.total_funds / totalFunds) * tradeProfit
//             );
//             const performanceFee = truncateToTwoDecimals(
//                 (investorProfit * (investment.manager_performance_fee || 0)) / 100
//             );

//             //   if(investorProfit>0){                 
//               // Update investment profits
//               bulkInvestmentUpdates.push({
//                   updateOne: {
//                       filter: { _id: investment._id },
//                       update: {
//                           $inc: {
//                               current_interval_profit: investorProfit,
//                               current_interval_profit_equity: investorProfit,
//                               total_trade_profit: investorProfit,
//                               closed_trade_profit: investorProfit,
//                               performance_fee_projected: performanceFee,
//                           },
//                       },
//                   },
//               });

//               // Add investor trade history
//               bulkInvestorTradeInserts.push({
//                   investment: investment._id,
//                   manager: manager._id,
//                   manager_trade: trade._id,
//                   type: trade.type,
//                   symbol: trade.symbol,
//                   manager_volume: trade.manager_volume,
//                   open_price: trade.open_price,
//                   close_price: trade.close_price,
//                   swap: trade.swap,
//                   open_time: new Date(trade.open_time).toISOString(),
//                   close_time: new Date(trade.close_time).toISOString(),
//                   manager_profit: trade.manager_profit,
//                   investor_profit: investorProfit,
//                   rollover_id: rollover_id,
//                 });
//             // }
//         }

//           // Mark the trade as distributed
//           bulkTradeUpdates.push({
//               updateOne: {
//                   filter: { _id: trade._id },
//                   update: { is_distributed: true },
//               },
//           });

//         //   if (tradeProfit > 0) {
//               // Queue manager update
//               bulkManagerUpdates.push({
//               updateOne: {
//                   filter: { _id: manager._id },
//                   update: {
//                       $inc: {
//                           closed_trade_profit: truncateToTwoDecimals(tradeProfit),
//                           total_trade_profit: truncateToTwoDecimals(tradeProfit),
//                         },
//                     },
//                 },
//             });
//         // }
//     }

//       // Execute bulk database operations **inside the transaction**
//       if (bulkInvestmentUpdates.length) {
//           const investmentResult = await investmentModel.bulkWrite(bulkInvestmentUpdates, { session });
//           console.log("Investment bulk update result:", investmentResult);
//       }

//       if (bulkInvestorTradeInserts.length) {
//           const investorTradeResult = await investorTradeModel.insertMany(bulkInvestorTradeInserts, { session });
//           console.log("Investor trade insert result:", investorTradeResult.length, "documents inserted.");
//       }

//       if (bulkTradeUpdates.length) {
//           const tradeUpdateResult = await managerTradeModel.bulkWrite(bulkTradeUpdates, { session });
//           console.log("Trade bulk update result:", tradeUpdateResult);
//       }

//       if (bulkManagerUpdates.length) {
//           const managerUpdateResult = await managerModel.bulkWrite(bulkManagerUpdates, { session });
//           console.log("Manager bulk update result:", managerUpdateResult);
//       }

//       // Commit the transaction
//       await session.commitTransaction();
//       session.endSession();

//       console.log("Trade distribution completed successfully.");
//       return true;
//   } catch (error) {
//       await session.abortTransaction();
//       session.endSession();
//       console.error("Error in trade distribution:", error);
//       return false;
//   }
// };

const rollOverTradeDistribution = async (rollover_id) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const unDistributedTrades = await managerTradeModel.find({ is_distributed: false }).session(session);
    if (unDistributedTrades.length === 0) {
      console.log("No undistributed trades found.");
      await session.commitTransaction();
      session.endSession();
      return true;
    }

    const bulkInvestmentUpdates = [];
    const bulkInvestorTradeInserts = [];
    const bulkTradeUpdates = [];
    const bulkManagerUpdates = [];
    const bulkCompoundedChartInserts = [];

    const managerGrowthDataMap = new Map(); 

    for (const trade of unDistributedTrades) {
      const tradeProfit = truncateToTwoDecimals(trade.manager_profit);
      const manager = await managerModel.findById(trade.manager).session(session);

      if (!manager) continue;

      const investments = await investmentModel.find({ manager: manager._id }).session(session);
      const totalFunds = investments.reduce((sum, inv) => sum + (inv.total_funds || 0), 0);
      if (totalFunds === 0) continue;

      for (const investment of investments) {
        if (investment.total_funds < 1) continue;

        const investorProfit = truncateToTwoDecimals(
          (investment.total_funds / totalFunds) * tradeProfit
        );
        const performanceFee = truncateToTwoDecimals(
          (investorProfit * (investment.manager_performance_fee || 0)) / 100
        );

        bulkInvestmentUpdates.push({
          updateOne: {
            filter: { _id: investment._id },
            update: {
              $inc: {
                current_interval_profit: investorProfit,
                current_interval_profit_equity: investorProfit,
                total_trade_profit: investorProfit,
                closed_trade_profit: investorProfit,
                performance_fee_projected: performanceFee,
              },
            },
          },
        });

        bulkInvestorTradeInserts.push({
          investment: investment._id,
          manager: manager._id,
          manager_trade: trade._id,
          type: trade.type,
          symbol: trade.symbol,
          manager_volume: trade.manager_volume,
          open_price: trade.open_price,
          close_price: trade.close_price,
          swap: trade.swap,
          open_time: new Date(trade.open_time).toISOString(),
          close_time: new Date(trade.close_time).toISOString(),
          manager_profit: trade.manager_profit,
          investor_profit: investorProfit,
          rollover_id: rollover_id,
        });
      }

      const lastEquity = manager.total_funds || 0;

      const dailyPercent = lastEquity > 0
      ? truncateToTwoDecimals((tradeProfit / lastEquity) * 100)
      : 0;
                                 
      // // Append growth data
      // const newPoint = {
      //   date: new Date(trade.close_time).getTime(),
      //   value: dailyPercent,
      // };
      
      // // Store growth data temporarily in map
      // if (!managerGrowthDataMap.has(manager._id.toString())) {
      //   managerGrowthDataMap.set(manager._id.toString(), []);
      // }
      // managerGrowthDataMap.get(manager._id.toString()).push(newPoint);

      const chartDate = dayjs(trade.close_time).startOf('day').toDate();
      const existingChart = await compountProfitChartModel.findOne({
        manager: manager._id,
        date: chartDate,
      }).session(session);

      if (existingChart) {
        const newValue = (1 + existingChart.value / 100) * (1 + dailyPercent / 100) - 1;
        existingChart.value = truncateToTwoDecimals(newValue * 100);
        await existingChart.save({ session });
      } else {
        await compountProfitChartModel.create([{
          manager: manager._id,
          date: chartDate,
          value: dailyPercent,
        }], { session });
      }

      bulkTradeUpdates.push({
        updateOne: {
          filter: { _id: trade._id },
          update: { is_distributed: true },
        },
      });

      bulkManagerUpdates.push({
        updateOne: {
          filter: { _id: manager._id },
          update: {
            $inc: {
              closed_trade_profit: tradeProfit,
              total_trade_profit: tradeProfit,
            },
            $set: {
              total_return: manager.total_trade_profit + tradeProfit,
            },
          },
        },
      });
    }

    // Execute all bulks
    if (bulkInvestmentUpdates.length) await investmentModel.bulkWrite(bulkInvestmentUpdates, { session });
    if (bulkInvestorTradeInserts.length) await investorTradeModel.insertMany(bulkInvestorTradeInserts, { session });
    if (bulkTradeUpdates.length) await managerTradeModel.bulkWrite(bulkTradeUpdates, { session });
    if (bulkManagerUpdates.length) await managerModel.bulkWrite(bulkManagerUpdates, { session });
    if (bulkCompoundedChartInserts.length) await compountProfitChartModel.insertMany(bulkCompoundedChartInserts, { session });

    await session.commitTransaction();
    session.endSession();

    console.log("Trade distribution and compound chart update completed.");
    return true;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in trade distribution:", error);
    return false;
  }
};



module.exports = { 
    addTradeToManager,
    getTrades,
    rollOverTradeDistribution
}