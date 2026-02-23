const InvestmentTransaction = require('../../models/investmentTx');
const InvestmentTrades  = require('../../models/investmentTrades');
const InvestmentModel = require('../../models/investment')
const OtpModel = require('../../models/otp')
const UserModel = require('../../models/user')
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_SECRET_KEY);
const {
    forgotMail,
    verification
} = require("../../assets/html/verification");
const { uploadToCloudinary } = require('../../config/cloudinary');
const { sendKycRequestedAlert } = require('../bot/botAlerts');
const RebateTransactionModel = require('../../models/rebateTx');
const UserTransaction = require('../../models/userTx');
const { default: mongoose } = require('mongoose');

const fetchUserWallet = async (req, res) => {
  try {
    const user = req.user;
    let limit = 5
    let skip = 0

    if (isNaN(limit) || isNaN(skip)) {
      return res.status(400).json({ errMsg: "Invalid pagination values" });
    }

    /* ------------------------------
       CALCULATE TOTAL DEPOSITED 
    -------------------------------*/
    const depositedAgg = await UserTransaction.aggregate([
      { $match: { user: user._id, type: "deposit", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalDeposited = depositedAgg[0]?.total || 0;

    /* ------------------------------
       CALCULATE TOTAL WITHDRAWN 
    -------------------------------*/
    const withdrawnAgg = await UserTransaction.aggregate([
      { $match: { user: user._id, type: "withdrawal", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalWithdrawn = withdrawnAgg[0]?.total || 0;

    /* ------------------------------
         FETCH TRANSACTIONS
    -------------------------------*/
    const transactions = await UserTransaction
      .find({ user: user._id })
      .sort({ createdAt: -1 }) // newest first (MT5 style)
      .skip(skip)
      .limit(limit)
      .lean();

    /* ------------------------------
         TOTAL COUNT FOR PAGINATION
    -------------------------------*/
    const totalCount = await UserTransaction.countDocuments({
      user: user._id,
    });

    return res.status(200).json({
      status: "success",
      result: {
        user,
        totalWithdrawn,
        totalDeposited,
        netGain: user.wallets.main - (totalDeposited - totalWithdrawn) || 0,
        transactions,
        pagination: {
          total: totalCount,
          limit,
          skip,
          hasMore: skip + transactions.length < totalCount,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errMsg: "Server error!", error: error.message });
  }
};

const fetchUserWalletTransactions = async (req, res) => {
  try {
    const { limit = 10, skip = 0, filter = "all" } = req.query;
    const user = req.user;

    const limitNum = Number(limit);
    const skipNum = Number(skip);

    if (isNaN(limitNum) || isNaN(skipNum)) {
      return res.status(400).json({ errMsg: "Invalid pagination values" });
    }

    // Build query dynamically
    const query = {
      user: user._id,
      ...(filter !== "all" && { type: filter }),
    };

    // Get total count before limit/skip
    const totalCount = await UserTransaction.countDocuments(query);

    // Fetch paginated results
    const transactions = await UserTransaction
      .find(query)
      .limit(limitNum)
      .skip(skipNum)
      .sort({ createdAt: -1 });

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
    console.error(error);
    res.status(500).json({ errMsg: "Server error!", error: error.message });
  }
};

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

    const user_id = req.user?._id;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        errMsg: "User ID missing"
      });
    }

    if (!manager_id) {
      return res.status(400).json({
        success: false,
        errMsg: "manager ID missing"
      });
    }

    const skip = (page - 1) * limit;
    const limitNum = Number(limit);
    const now = new Date();

    let createdAtFilter = null;

    /* ----------- PRESET FILTERS ----------- */
    if (filter === "today") {
      createdAtFilter = {
        $gte: new Date(now.setHours(0, 0, 0, 0))
      };
    } else if (filter === "week") {
      createdAtFilter = {
        $gte: new Date(Date.now() - 7 * 86400000)
      };
    } else if (filter === "month") {
      createdAtFilter = {
        $gte: new Date(Date.now() - 30 * 86400000)
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

   /* ----------- FIND USER INVESTMENT FOR THIS MANAGER ----------- */
    const investment = await InvestmentModel.findOne({
      manager: manager_id,
      user: user_id
    }).lean();

    if (!investment) {
      return res.json({
        success: true,
        result: { trades: [], accTransactions: [] },
        pagination: {
          page: Number(page),
          limit: limitNum,
          hasMore: false
        }
      });
    }

    /* ----------- BUILD FINAL QUERY ----------- */
    const baseQuery = { };
    if (filter !== "all" && createdAtFilter) {
      baseQuery.createdAt = createdAtFilter;
    }

    /* ----------- FETCH TRADES (WITH +1 EXTRA) ----------- */
    const trades = await InvestmentTrades.find({
      investment: investment._id,
      ...baseQuery,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum + 1) // Fetch one extra to check if more exist
      .lean();

    /* ----------- FETCH ACCOUNT TRANSACTIONS (WITH +1 EXTRA) ----------- */
    const accTransactions = await InvestmentTransaction.find({
      investment: investment._id,
      user: user_id,
      ...baseQuery,
      status : 'success'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum + 1) // Fetch one extra to check if more exist
      .lean();

    /* ----------- CHECK IF MORE DATA EXISTS ----------- */
    const hasMoreTrades = trades.length > limitNum;
    const hasMoreTransactions = accTransactions.length > limitNum;

    // Remove the extra items before sending
    if (hasMoreTrades) trades.pop();
    if (hasMoreTransactions) accTransactions.pop();

    // If either has more, there's more data to load
    const hasMore = hasMoreTrades || hasMoreTransactions;

    return res.json({
      success: true,
      result: {
        trades,
        accTransactions
      },
      pagination: {
        page: Number(page),
        limit: limitNum,
        hasMore: hasMore
      }
    });

  } catch (err) {
    console.log("Fetch Account Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateUserDetails = async (req, res) => {
  try {
    const { country, email, mobile } = req.body;
    const user = req.user;

    const update = {};

    if (country) update.country = country;
    if (mobile) update.mobile = mobile;

    // If email changed → reset verification
    if (email && email !== user.email) {
      // email format validation optional
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
      }

      update.email = email;
      update["kyc.is_email_verified"] = false; // reset email verification
    }

    const result = await UserModel.findByIdAndUpdate(
      user._id,
      { $set: update },
      { new: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      result,
    });

  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handleEmailVerificationOtp = async (req, res) => {
  try {
    const { action, otp } = req.body;
    const user = req.user;

    if (action === "send") {
      const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();

      await OtpModel.deleteMany({ user: user._id }); 

      await OtpModel.create({
        user: user._id,
        otp: randomOtp,
      });

      // send email using resend
      await resend.emails.send({
        from: process.env.WEBSITE_MAIL,
        to: user.email,
        subject: "Verify Your Email",
        html: verification(randomOtp, user.first_name ? user.first_name : user.telegram.first_name),
      });

      return res.status(200).json({
        success: true,
        msg: "OTP sent successfully",
      });
    }

    if (action === "verify") {
      const otpRecord = await OtpModel.findOne({ user: user._id });

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          errMsg: "OTP expired or not found",
        });
      }

      // incorrect attempt
      if (otpRecord.otp !== otp) {
        otpRecord.attempts += 1;

        if (otpRecord.attempts >= 3) {
          await OtpModel.deleteMany({ user: user._id }); 
          return res.status(403).json({
            success: false,
            errMsg: "Too many attempts. Please request a new OTP.",
          });
        }

        await otpRecord.save();

        return res.status(400).json({
          success: false,
          errMsg: `Incorrect OTP. Attempts left: ${3 - otpRecord.attempts}`,
        });
      }

      // correct otp -> delete & update
      await OtpModel.deleteMany({ user: user._id });

      const updatedUser = await UserModel.findByIdAndUpdate(
        user._id,
        {
          $set: { "kyc.is_email_verified": true },
          $inc: { "kyc.step": 1 },
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        msg: "Email verified successfully",
        result: updatedUser,
      });
    }
  } catch (error) {
    console.log("OTP Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const handleKycProofSubmit = async (req, res) => {
  try {
    const { type } = req.body;
    const user = req.user;

    if (!type || !req.files) {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }

    const fileUrls = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.path))
    );

    // Fetch the user
    const currentUser = await UserModel.findById(user._id);
    if (!currentUser) return res.status(404).json({ success: false, message: "User not found" });

    let newStep = currentUser.kyc.step;
    if (newStep < 4) newStep++; // Prevent overflow

    let updateObj = { "kyc.step": newStep };

    if (type === "identity") {
      updateObj["kyc.identify_proof"] = fileUrls;
      updateObj["kyc.identify_proof_status"] = "submitted";
    } else if (type === "residential") {
      updateObj["kyc.residential_proof"] = fileUrls;
      updateObj["kyc.residential_proof_status"] = "submitted";
    } else {
      return res.status(400).json({ success: false, message: "Invalid proof type" });
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      user._id,
      { $set: updateObj },
      { new: true }
    );

    if(updatedUser){
      // after saving KYC request
      await sendKycRequestedAlert({
        user: {
          first_name: updatedUser.telegram.first_name,
          last_name: updatedUser.telegram.last_name,
          username: updatedUser.telegram.username,
          telegramId: updatedUser.telegram.id,
        },
        kycLevel: updatedUser.kyc.step,
      });
    }

    res.status(200).json({ success: true, result: updatedUser });

  } catch (error) {
    console.error("KYC submit error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const fetchRebateTx = async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      RebateTransactionModel
        .find({ user: user._id })
        .populate({ path: "investment", select: "inv_id" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      RebateTransactionModel.countDocuments({ user: user._id }),
    ]);

    const hasMore = page * limit < total;

    res.status(200).json({
      success: true,
      result: transactions,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const trasferRebateToWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await UserModel.findById(req.user._id).session(session);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    const rebateBalance = Number(user.wallets.rebate || 0);
    const MIN_TRANSFER = 100;

    if (rebateBalance < MIN_TRANSFER) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        msg: `Minimum $${MIN_TRANSFER} rebate balance required.`,
      });
    }

    const newMainBalance = Number((user.wallets.main + rebateBalance).toFixed(2));

    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          "wallets.main": newMainBalance,
          "wallets.rebate": 0,
        },
      },
      { session }
    );

    await UserTransaction.create(
      [
        {
          user: user._id,
          type: "transfer",
          status: "completed",
          payment_mode: "rebate-wallet",
          amount:  Number(rebateBalance).toFixed(2),
          from: `REBATE_${user.wallets.rebate_id}`,
          to: `WALL_${user.wallets.main_id}`,
          description: "Rebate Transferred",
          transaction_id: "TX-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
        },
      ],
      { session }
    );

    await RebateTransactionModel.create(
      [
        {
          user: user._id,
          type: "transfer",
          status: "approved",
          amount: Number(rebateBalance).toFixed(2),
          description: "Transfered to Wallet",
          transaction_id: "TX-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: true,
      msg: "Rebate transferred successfully",
      result: await UserModel.findById(user._id),
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Rebate Transfer Error:", error);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

const fetchUser =async(req,res)=>{
    try {
        const { _id }=req.user 
        const user = await UserModel.findOne({_id},{password : 0,currToken : 0})
        if(!user){
            return res.status(400).json({errMsg:'User not found!'})
        }
        return res.status(200).json({result :user })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ errMsg: 'Error registering user', error: error.message });
    }
}

const callbackRequestSubmit = async (req, res) => {
    try {
        const { client, name, surname, contactnumber, emailaddress, agreement } = req.body;

        // Validate input
        if (!name || !surname || !contactnumber || !emailaddress) {
            return res.status(400).json({ errMsg: "Please fill in all required fields." });
        }

        await resend.emails.send({
            from: process.env.WEBSITE_MAIL,
            to: process.env.SUPPORT_MAIL || "rameesmohd789@gmail.com", 
            subject: "New Contact Form Submission",
            html: `
                <h3 style="color: #333;">New Contact Form Submission</h3>
                <p><strong>Existing Client:</strong> ${client ? "Yes" : "No"}</p>
                <p><strong>Name:</strong> ${name} ${surname}</p>
                <p><strong>Contact Number:</strong> ${contactnumber}</p>
                <p><strong>Email Address:</strong> ${emailaddress}</p>
                <p><strong>Agreement:</strong> ${agreement ? "Agreed" : "Not Agreed"}</p>
            `,
        });

        return res.status(200).json({ msg: "Your request has been successfully submitted. We will get back to you shortly." });
    } catch (error) {
        console.error("Error sending callback email:", error);
        return res.status(500).json({ errMsg: "There was an issue submitting your request. Please try again later." });
    }
};

// const registerProvider = async (req, res) => {
//     try {
//       const formData = req.body;
            
//       if(!formData){
//         return res.status(400).json({ success: false, error: error.message });
//       }  
//       // Send email
//       await resend.emails.send({
//         from: process.env.WEBSITE_MAIL,
//         to: process.env.SUPPORT_MAIL || "rameesmohd789@gmail.com", 
//         subject: 'New Strategy Provider Registration',
//         html: `
//           <h2>New Registration</h2>
//           <ul>
//             <li><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</li>
//             <li><strong>Email:</strong> ${formData.email}</li>
//             <li><strong>Phone:</strong> ${formData.countryCode}${formData.mobile}</li>
//             <li><strong>Country:</strong> ${formData.country}</li>
//             <li><strong>DOB:</strong> ${formData.dateOfBirth}</li>
//             <li><strong>Account Type:</strong> ${formData.accountType}</li>
//             <li><strong>Platform:</strong> ${formData.platform}</li>
//             <li><strong>Leverage:</strong> ${formData.leverage}</li>
//             <li><strong>Referral:</strong> ${formData.referral || 'None'}</li>
//           </ul>
//         `
//       });
  
//       return res.status(200).json({ success: true, message: 'Registered and email sent' });
//     } catch (error) {
//       console.error('Error sending email:', error);
//       return res.status(500).json({ success: false, error: error.message });
//     }
//   };
const fs = require("fs");
const truthy = (v) => v === true || v === "true" || v === "1" || v === 1;
const isEmail = (s) => typeof s === "string" && s.includes("@");
const isDigits = (s) => typeof s === "string" && /^\d{5,15}$/.test(s);

const required = (obj, key, errors, msg) => {
  if (!obj[key] || String(obj[key]).trim() === "") errors[key] = msg;
};

const registerProvider = async (req, res) => {
  try {
    const formData = req.body || {};
    const files = req.files || {};

    if (!formData || Object.keys(formData).length === 0) {
      return res.status(400).json({ success: false, error: "Empty form data" });
    }

    const errors = {};

    // Basic
    required(formData, "firstName", errors, "First name required");
    required(formData, "lastName", errors, "Last name required");
    if (!isEmail(formData.email)) errors.email = "Valid email required";
    required(formData, "country", errors, "Country required");
    required(formData, "countryCode", errors, "Country code required");
    if (!isDigits(formData.mobile)) errors.mobile = "Valid mobile required";
    required(formData, "dateOfBirth", errors, "DOB required");

    // Provider setup
    required(formData, "accountType", errors, "Account type required");
    required(formData, "platform", errors, "Platform required");
    required(formData, "leverage", errors, "Leverage required");

    // Tough gating
    const expYears = Number(formData.experienceYears);
    if (!formData.experienceYears) errors.experienceYears = "Experience required";
    else if (Number.isNaN(expYears) || expYears < 1)
      errors.experienceYears = "Minimum 1 year experience required";

    required(formData, "tradedMarkets", errors, "Markets required");

    if (!formData.strategySummary || String(formData.strategySummary).trim().length < 40)
      errors.strategySummary = "Strategy summary min 40 characters";

    if (!formData.riskApproach || String(formData.riskApproach).trim().length < 40)
      errors.riskApproach = "Risk approach min 40 characters";

    if (formData.hasProfitableMonth !== "yes")
      errors.hasProfitableMonth = "Must be profitable in last 30 days to register as Provider";

    if (formData.accountIsLive !== "yes")
      errors.accountIsLive = "Provider must verify a LIVE account";

    required(formData, "accountCurrency", errors, "Account currency required");
    required(formData, "brokerName", errors, "Broker name required");
    required(formData, "tradingAccountId", errors, "Trading account ID required");
    required(formData, "investorPassword", errors, "Investor password required");

    if (!truthy(formData.agreeProviderCode)) errors.agreeProviderCode = "Required";
    if (!truthy(formData.agreeDataVerification)) errors.agreeDataVerification = "Required";
    if (!truthy(formData.agreeNoGuaranteedReturns)) errors.agreeNoGuaranteedReturns = "Required";

    // Required files
    if (!files.providerIdFront?.[0]) errors.providerIdFront = "ID front required";
    if (!files.providerIdBack?.[0]) errors.providerIdBack = "ID back required";
    if (!files.providerSelfie?.[0]) errors.providerSelfie = "Selfie with ID required";
    if (!files.profitableProof?.[0]) errors.profitableProof = "Profitability proof required";

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        fields: errors,
      });
    }

    // Email content
    const safe = (v) => (v ? String(v).replace(/[<>]/g, "") : "");
    const fileInfo = (f) =>
      f ? `${f.originalname} (${f.mimetype}, ${(f.size / 1024).toFixed(1)} KB)` : "Not provided";

    const html = `
      <h2>New Strategy Provider Registration</h2>
      <h3>Basic Info</h3>
      <ul>
        <li><strong>Name:</strong> ${safe(formData.firstName)} ${safe(formData.lastName)}</li>
        <li><strong>Email:</strong> ${safe(formData.email)}</li>
        <li><strong>Phone:</strong> ${safe(formData.countryCode)}${safe(formData.mobile)}</li>
        <li><strong>Country:</strong> ${safe(formData.country)}</li>
        <li><strong>DOB:</strong> ${safe(formData.dateOfBirth)}</li>
        <li><strong>Referral:</strong> ${safe(formData.referral || "None")}</li>
      </ul>

      <h3>Provider Verification</h3>
      <ul>
        <li><strong>Experience (Years):</strong> ${safe(formData.experienceYears)}</li>
        <li><strong>Markets:</strong> ${safe(formData.tradedMarkets)}</li>
        <li><strong>Profitable last 30 days:</strong> ${safe(formData.hasProfitableMonth)}</li>
        <li><strong>Live account:</strong> ${safe(formData.accountIsLive)}</li>
        <li><strong>Account Currency:</strong> ${safe(formData.accountCurrency)}</li>
        <li><strong>Track Record Link:</strong> ${safe(formData.trackRecordLink || "None")}</li>
      </ul>

      <h3>Trading Account Details</h3>
      <ul>
        <li><strong>Broker:</strong> ${safe(formData.brokerName)}</li>
        <li><strong>Trading Account ID:</strong> ${safe(formData.tradingAccountId)}</li>
        <li><strong>Investor Password:</strong> ${safe(formData.investorPassword)}</li>
      </ul>

      <h3>Strategy Summary</h3>
      <p>${safe(formData.strategySummary)}</p>

      <h3>Risk Management</h3>
      <p>${safe(formData.riskApproach)}</p>

      <h3>Uploaded Files (metadata)</h3>
      <ul>
        <li><strong>ID Front:</strong> ${fileInfo(files.providerIdFront?.[0])}</li>
        <li><strong>ID Back:</strong> ${fileInfo(files.providerIdBack?.[0])}</li>
        <li><strong>Selfie with ID:</strong> ${fileInfo(files.providerSelfie?.[0])}</li>
        <li><strong>Profit Proof:</strong> ${fileInfo(files.profitableProof?.[0])}</li>
      </ul>
    `;

    // Attachments for diskStorage (SAFE)
    const attachments = [];
    const pushAtt = (key, filenamePrefix) => {
      const f = files[key]?.[0];
      if (!f) return;

      const fileBuffer = fs.readFileSync(f.path);
      attachments.push({
        filename: `${filenamePrefix}-${f.originalname}`,
        content: fileBuffer.toString("base64"),
        contentType: f.mimetype,
      });
    };

    pushAtt("providerIdFront", "ID-FRONT");
    pushAtt("providerIdBack", "ID-BACK");
    pushAtt("providerSelfie", "SELFIE");
    pushAtt("profitableProof", "PROOF");

    await resend.emails.send({
      from: process.env.WEBSITE_MAIL,
      to: process.env.SUPPORT_MAIL || "rameesmohd789@gmail.com",
      subject: "New Strategy Provider Registration",
      html,
      attachments, // remove if you don’t want attachments
    });

    return res.status(200).json({
      success: true,
      message: "Provider registration received. Verification pending.",
    });
  } catch (error) {
    console.error("Error in registerProvider:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};


module.exports = {
    fetchUserWallet,
    fetchUserWalletTransactions,
    fetchAccountData,

    updateUserDetails,
    handleEmailVerificationOtp,
    handleKycProofSubmit,

    fetchRebateTx,
    trasferRebateToWallet,

    fetchUser,
    callbackRequestSubmit,
    registerProvider
}