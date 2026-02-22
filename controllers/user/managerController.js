  const investmentModel = require('../../models/investment')
  const managerModel = require('../../models/manager')
  const jwt = require("jsonwebtoken");
  const { fetchAndUseLatestRollover } = require('../rolloverController')
  const { default: mongoose } = require('mongoose');
  const bcrypt = require("bcrypt");
  const managerTradeModel = require('../../models/managerTrades');
  const InvestmentTransaction = require('../../models/investmentTx');

const fetchManager =async(req,res)=>{
    try {
        const { id } = req.query
        const manager =  await managerModel.findOne({id : id },{password : 0})
        if(manager){
            return res.status(200).json({
              status : "success",
              manager,
            })
        }else{
            return res.status(200).json({errMsg : "Invalid id"})
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ errMsg: 'Server error!', error: error.message });
    }
}

const fetchManagerTele =async(req,res)=>{
    try {
        const {id} = req.query
        const recentTradeslimit = 3
        const manager =  await managerModel.findOne({id : id },{password : 0})
        if(manager){
        const recentTrades = await managerTradeModel
          .find({ manager: manager._id })
          .sort({ createdAt: -1 })       // newest first
          .limit(recentTradeslimit);

            return res.status(200).json({
              status : "success",
              manager,
              recentTrades
            })
        }else{
            return res.status(200).json({errMsg : "Invalid id"})
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ errMsg: 'Server error!', error: error.message });
    }
}

const fetchAccountData = async (req, res) => {
  try {
    const {
      manager_id,
      filter = "month",
      page = 1,
      limit = 20,
      start_date,
      end_date
    } = req.query;

    if (!manager_id)
      return res.status(400).json({
        success: false,
        message: "Manager ID missing"
      });

    const skip = (page - 1) * limit;
    const now = new Date();

    let createdAtFilter = null;

    /* ----------- PRESET FILTERS ----------- */
    if (filter === "today") {
      createdAtFilter = {
        $gte: new Date(now.setHours(0, 0, 0, 0))
      };
    } else if (filter === "week") {
      createdAtFilter = {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      };
    } else if (filter === "month") {
      createdAtFilter = {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      };
    }

    /* ----------- CUSTOM DATE RANGE ----------- */
    if (filter === "custom") {
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: "Start and End dates required for custom filter"
        });
      }

      createdAtFilter = {
        $gte: new Date(start_date),
        $lte: new Date(end_date + "T23:59:59.999Z")
      };
    }

    /* ----------- BUILD FINAL QUERIES ----------- */
    const baseQuery = { manager: manager_id };
    if (filter !== "all" && createdAtFilter) {
      baseQuery.createdAt = createdAtFilter;
    }

    /* ----------- FETCH TRADES ----------- */
    const trades = await managerTradeModel
      .find(baseQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit) + 1); // Fetch one extra to check if more exist

    /* ----------- FETCH TRANSACTIONS ----------- */
    // const accTransactions = await InvestmentTransaction
    //   .find(baseQuery)
    //   .sort({ createdAt: -1 })
    //   .skip(skip)
    //   .limit(Number(limit) + 1); // Fetch one extra to check if more exist

    // Check if there are more items
    const hasMoreTrades = trades.length > Number(limit);
    // const hasMoreTransactions = accTransactions.length > Number(limit);
    
    // Remove the extra items
    if (hasMoreTrades) trades.pop();
    // if (hasMoreTransactions) accTransactions.pop();

    // Determine if there's more data
    const hasMore = hasMoreTrades 

    return res.json({
      success: true,
      result: {
        trades,
        // accTransactions
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        hasMore: hasMore
      }
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const fetchManagerTransactions = async (req, res) => {
  try {
    const { manager_id, limit = 10, skip = 0, filter = "all" } = req.query;

    if (!manager_id)
    return res.status(400).json({
      success: false,
      message: "Manager ID missing"
    });

    const limitNum = Number(limit);
    const skipNum = Number(skip);

    if (isNaN(limitNum) || isNaN(skipNum)) {
      return res.status(400).json({ errMsg: "Invalid pagination values" });
    }

    // Build query
    const query = {
      manager: manager_id,
      status : "success",
      ...(filter !== "all" && { type: filter }), // filter: deposit / withdrawal
    };

    // Count total before pagination
    const totalCount = await InvestmentTransaction.countDocuments(query);

    // Fetch data
    const transactions = await InvestmentTransaction.find(query)
      .sort({ createdAt: -1 }) // latest first
      .limit(limitNum)
      .skip(skipNum)
      .lean();

    return res.status(200).json({
      status: "success",
      result: {
        transactions,
        pagination: {
          total: totalCount,
          limit: limitNum,
          skip: skipNum,
          hasMore: skipNum + transactions.length < totalCount,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching manager transaction history:", error);
    return res.status(500).json({
      errMsg: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
    fetchManager,
    fetchManagerTele,
    fetchAccountData,
    fetchManagerTransactions
}