const userModel = require("../../models/user")
const jwt = require('jsonwebtoken');

const createToken = (userId) => {
    return jwt.sign({ userId }, 
        process.env.JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

const fetchUser = async (req, res) => {
  try {
    const { id, first_name, last_name, username } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "Missing Telegram user ID" });
    }

    let user = await userModel.findOne({ user_id: id });

    // Generate token
    const token = createToken(id);

    if (user) {
      // Update token every login
      user.token = token;
      await user.save();

      return res
        .cookie("userToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
          ...(process.env.NODE_ENV === "production" && { domain: process.env.DOMAIN }),
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        })
        .status(200)
        .json({
          success: true,
          message: "User logged in successfully",
          data: user,
        });
    }

    // Create new user if not found
    const newUser = new userModel({
      user_id: id,
      first_name,
      last_name,
      username,
      token, // save token here
      join_date: new Date(),
    });

    await newUser.save();

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
        message: "New user created successfully",
        data: newUser,
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
    fetchUser,
}


// 🧾 Step 5: (Optional) Verify the data server-side

// If you want to verify authenticity of the user (prevent spoofing),
// Telegram provides an HMAC hash in initData that you can verify with your bot token.

// In your backend (Node.js example):

// import crypto from "crypto";

// export function verifyTelegramAuth(initData, botToken) {
//   const urlParams = new URLSearchParams(initData);
//   const hash = urlParams.get("hash");
//   urlParams.delete("hash");

//   const dataCheckString = [...urlParams.entries()]
//     .sort(([a], [b]) => a.localeCompare(b))
//     .map(([k, v]) => `${k}=${v}`)
//     .join("\n");

//   const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
//   const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

//   return computedHash === hash;
// }