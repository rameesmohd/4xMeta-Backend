const crypto = require("crypto");
require("dotenv").config();

const botAuth =(req, res, next)=> {
  const requestIp = req.ip.replace("::ffff:", "");
  const signature = req.headers["x-signature"];
  const calculated = crypto
  .createHmac("sha256", process.env.BOT_SECRET)
  .update(JSON.stringify(req.body))
  .digest("hex");
  
  // console.log(requestIp,ip ,signature ,calculated);
  if (signature !== calculated) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // IP whitelist only in production
  if (
    process.env.NODE_ENV === "production" &&
    process.env.BOT_SERVER_IP &&
    requestIp !== process.env.BOT_SERVER_IP
  ) {
    return res.status(401).json({ message: "Unauthorized - IP mismatch" });
  }

  next(); 
};

module.exports = {
    botAuth
}