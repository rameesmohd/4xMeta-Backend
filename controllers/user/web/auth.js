const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const userModel = require("../../../models/user.js");
const { validateRegister,validateLogin } = require("../../common/validations.js");
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_SECRET_KEY);
const OtpModel = require('../../../models/otp');
const { forgotMail } = require("../../../assets/html/verification.js");
const { welcomeMail } = require("../../../assets/html/transactional.js")
const createToken = (userId) => {
    return jwt.sign({ userId }, 
        process.env.JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

async function generateUniqueWebUserId() {
  while (true) {
    const code = "W" + Math.random().toString(36).substring(2, 10).toUpperCase(); // W + 8 chars
    const exists = await userModel.exists({ user_id: code });
    if (!exists) return code;
  }
}

const registerWebUser = async (req, res) => {
  const { valid, errors } = validateRegister(req.body);

  if (!valid) {
    return res
      .status(400)
      .json({ errMsg: "Validation failed. Please review the provided input.", errors });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      firstName,
      lastName,
      email,
      country,
      countryCode,
      mobile,
      dateOfBirth,
      password,
      referral, // this is the referrer's user_id (string)
    } = req.body;

    // Email must be unique among WEB users (telegram users may not have email)
    const isAlreadyRegistered = await userModel
      .findOne({ email: email?.toLowerCase() })
      .session(session);

    if (isAlreadyRegistered) {
      await session.abortTransaction();
      return res.status(400).json({ errMsg: "User already registered please login!" });
    }

    // Build referred_by (optional)
    let referredById = null;
    if (referral) {
      const refUser = await userModel.findOne({ user_id: referral }).session(session);
      if (refUser) referredById = refUser._id;
      // If you want to reject invalid referral instead of ignoring:
      // else { throw new Error("Invalid referral code"); }
    }

    const hashpassword = await bcrypt.hash(password, 10);

    // Important: generate user_id for WEB users (don’t collide with telegram.id strings)
    const webUserId = await generateUniqueWebUserId();

    const newUser = await userModel.create(
      [
        {
          login_type: "web",
          user_id: webUserId,

          // web auth
          email: email.toLowerCase(),
          password: hashpassword,

          // profile
          first_name: firstName,
          last_name: lastName,
          country,
          country_code: countryCode,
          mobile,
          date_of_birth: dateOfBirth,

          // referral
          referral: {
            referred_by: referredById,
          },

          // wallets/kyc will auto-default from schema
        },
      ],
      { session }
    );

    const createdUser = newUser[0];

    // Update referrer stats if valid referral
    if (referredById) {
      await userModel.updateOne(
        { _id: referredById },
        {
          $inc: { "referral.total_referrals": 1 },
          $push: { "referral.referrals": createdUser._id },
        },
        { session }
      );
    }

    // Create token (same style as your telegram controller)
    const token = createToken(createdUser._id);
    await userModel.updateOne(
      { _id: createdUser._id },
      { $set: { currToken: token } },
      { session }
    );

    await session.commitTransaction();

    await resend.emails.send({
      from: `4xMeta <${process.env.WEBSITE_MAIL}>`,
      to: createdUser.email,
      subject: "Welcome to 4xMeta",
      html: welcomeMail({
        firstName: createdUser.first_name,
        lastName:  createdUser.last_name,
        email:     createdUser.email,
        userId:    createdUser.user_id,
      }),
    });
    
    return res
      .cookie("userToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        ...(process.env.NODE_ENV === "production" && { domain: process.env.DOMAIN }),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(201)
      .json({
        success: true,
        msg: "User registered successfully",
        data: createdUser,
      });
  } catch (error) {
    await session.abortTransaction();

    // Handle duplicate key errors nicely (email/user_id wallets id)
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        errMsg: "Duplicate value error",
        fields: error.keyValue,
      });
    }

    return res.status(500).json({ errMsg: "Error registering user", error: error.message });
  } finally {
    session.endSession();
  }
};

const webLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { valid, errors } = validateLogin(req.body);
    if (!valid) {
      return res
        .status(400)
        .json({ success: false, errMsg: "Validation failed. Please review the provided input.", errors });
    }

    const user = await userModel
      .findOne({ email: email?.toLowerCase(), login_type: "web" }) // important
      .select("+password") // only if you made password select:false, safe either way
      .lean(false); // return mongoose doc (so we can update easily)

    if (!user) {
      return res.status(400).json({
        success: false,
        errMsg: "User not found. Please register.",
      });
    }

    if (user.is_blocked) {
      return res.status(403).json({
        success: false,
        errMsg: "Account is blocked. Please contact support.",
      });
    }

    // If you allow telegram users to later set password/email, remove login_type filter above.
    if (!user.password) {
      return res.status(400).json({
        success: false,
        errMsg: "This account does not have a password. Please login via Telegram.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        errMsg: "Invalid password. Please try again.",
      });
    }

    const token = createToken(user._id);

    await userModel.updateOne(
      { _id: user._id },
      { $set: { currToken: token } }
    );

    // remove password from response
    const userObj = user.toObject();
    delete userObj.password;

    return res
      .cookie("userToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        ...(process.env.NODE_ENV === "production" && { domain: process.env.DOMAIN }),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        success: true,
        message: "Logged in successfully",
        data: userObj,
      });
  } catch (error) {
    console.error("Web login error:", error);
    return res.status(500).json({
      success: false,
      errMsg: "Server error!",
      error: error.message,
    });
  }
};

const webLogout = async (req, res) => {
  try {
    const token = req.cookies.userToken;
    
    if(token){
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await userModel.findOne({_id :decoded.userId},{is_blocked: false,password: 0});      
      if (!user) {
        return res.status(400).json({ success: false, errMsg: "User not authenticated" });
      }
      await userModel.updateOne(
        { _id: user._id },
        { $unset: { currToken: 1 } }
      );
    }

    return res
      .clearCookie("userToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        ...(process.env.NODE_ENV === "production" && { domain: process.env.DOMAIN }),
      })
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Web logout error:", error);
    return res.status(500).json({
      success: false,
      errMsg: "Server error!",
      error: error.message,
    });
  }
};

const providerLogin = async (req, res) => {
  try {    
    const { provider_account, provider_pass } = req.body;
    console.log(provider_account, provider_pass);
    
    return res.status(400).json({ errMsg: "User not exist!" }); 
  } catch (error) {
    console.error("Provider login error:", error);
    return res.status(500).json({
      success: false,
      errMsg: "Server error!",
      error: error.message,
    });
  }
}

const forgetPassGenerateOTP = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) return res.status(400).json({ errMsg: "Email is required" });

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ errMsg: "User not found. Please sign up to continue!" });
    }

    const generateOTP = Math.floor(100000 + Math.random() * 900000);

    try {
      await resend.emails.send({
        from: `4xMeta <${process.env.WEBSITE_MAIL}>`,
        to: user.email,
        subject: "Verify email",
        html: forgotMail(generateOTP, user.first_name),
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return res.status(500).json({ errMsg: "Failed to send verification email. Please try again!" });
    }

    // OPTIONAL: delete old OTPs for this user
    await OtpModel.deleteMany({ user: user._id });

    const newOtp = await OtpModel.create({
      user: user._id,
      otp: generateOTP,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    return res.status(200).json({ otp_id: newOtp._id, msg: "Otp sent successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ errMsg: "server side error", error: error.message });
  }
};

const validateForgetOTP = async (req, res) => {
  try {
    const { id, otp } = req.body;

    if (!id || !otp) return res.status(400).json({ errMsg: "OTP and id are required" });

    const forgetPassOtp = await OtpModel.findById(id);
    if (!forgetPassOtp) return res.status(400).json({ errMsg: "OTP timeout, please try again" });

    if (forgetPassOtp.expiresAt && forgetPassOtp.expiresAt < new Date()) {
      return res.status(400).json({ errMsg: "OTP expired, please request a new one!" });
    }

    if (String(forgetPassOtp.otp) !== String(otp)) {
      return res.status(400).json({ errMsg: "Incorrect OTP!" });
    }

    return res.status(200).json({ msg: "OTP verification successful" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ errMsg: "server side error", error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { otp, id, newPassword } = req.body;

    if (!id || !otp || !newPassword) {
      return res.status(400).json({ errMsg: "All fields are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ errMsg: "Password is too short! It must be at least 8 characters long." });
    }

    const forgetData = await OtpModel.findById(id);
    if (!forgetData) return res.status(400).json({ errMsg: "Session timeout, please try again!" });

    if (forgetData.expiresAt && forgetData.expiresAt < new Date()) {
      return res.status(400).json({ errMsg: "OTP expired, please request a new one!" });
    }

    if (String(forgetData.otp) !== String(otp)) {
      return res.status(400).json({ errMsg: "Invalid OTP!" });
    }

    const hashpassword = await bcrypt.hash(newPassword, 10);
    await userModel.updateOne({ _id: forgetData.user }, { $set: { password: hashpassword } });

    // prevent OTP reuse
    await OtpModel.deleteOne({ _id: id });

    return res.status(200).json({ msg: "Password changed successfully!" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ errMsg: "Server error, please try again later.", error: error.message });
  }
};

module.exports = {
   registerWebUser,
   webLogin,
   webLogout,
   providerLogin,
   forgetPassGenerateOTP, 
   validateForgetOTP, 
   resetPassword
}









