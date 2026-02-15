const userModel = require("../../models/user")
const botModel = require('../../models/botUsers')
const jwt = require('jsonwebtoken');
const { isUserInChannel } = require("../../utils/isUserInChannel");

const createToken = (userId) => {
    return jwt.sign({ userId }, 
        process.env.JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

const userlog = async(req,res)=>{
  try {
    const {data} = req.body
    console.log("Data : ",data);
    res.status(200).json({})
  } catch (error) {
    console.log(error);
    res.status(500).json({})
  }
}

const teleUser = async (req, res) => {
  try {
    const { id, first_name, last_name, username, photo_url, is_premium } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Missing Telegram user ID",
      });
    }

    const [user, botUser] = await Promise.all([
      userModel.findOne({ user_id: id }),
      botModel.findOne({ id }).lean()
    ]);
 
    // Mark webapp opened (fire-and-forget)
    if (botUser && !botUser.is_opened_webapp) {
      botModel
        .updateOne(
          { id, is_opened_webapp: false }, 
          { $set: { is_opened_webapp: true } }
        )
        .catch(console.error);
    }

    // Mark channel joined (fire-and-forget)
    if (botUser && !botUser.is_joined_channel) {
      isUserInChannel(id)
        .then((isMember) => {
          if (isMember) {
            return botModel.updateOne(
              { id, is_joined_channel: false }, 
              { $set: { is_joined_channel: true } }
            );
          }
        })
        .catch(console.error);
    }

    /* ------------------------------------------------------
       EXISTING USER 
    ------------------------------------------------------ */
    if (user) {
      const token = createToken(user._id);
      await userModel.updateOne(
        { _id: user._id },
        { $set: { currToken: token } }
      );

      return res
        .cookie("userToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
          ...(process.env.NODE_ENV === "production" && {
            domain: process.env.DOMAIN,
          }),
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .status(200)
        .json({
          success: true,
          message: "User logged in successfully",
          data: user,
        });
    }

    /* ------------------------------------------------------
       NEW USER 
    ------------------------------------------------------ */
    let referred_by = null
    if (botUser?.referred_by) {
      const refUser = await userModel.findOne({ user_id: botUser.referred_by });
      if (refUser) referred_by = refUser._id;
    }

    // Generate token first
    const tempUser = new userModel({
      login_type: "telegram",
      telegram: {
        id,
        first_name,
        last_name,
        username,
        photo_url,
        is_premium,
      },
      user_id: id,
      'referral.referred_by' : referred_by,
    });
    
    const token = createToken(tempUser._id);
    tempUser.currToken = token;
    
    const newUser = await tempUser.save();

    if (referred_by) {
      userModel.findByIdAndUpdate(referred_by, {
        $push: { "referral.referrals": newUser._id },
        $inc: { "referral.total_referrals": 1 },
      });
    }

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
        message: "New Telegram user created successfully",
        data: newUser,
      });

  } catch (error) {
    console.error("Telegram login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


module.exports = {
    teleUser,
    userlog
}
