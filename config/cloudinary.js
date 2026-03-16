const cloudinary = require('cloudinary').v2;
const fs = require("fs")
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    timeout: 600000 
  });

const uploadToCloudinary = async (filePath) => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: "kyc_documents",
    resource_type: "auto",
  });
  return result.secure_url;
};

module.exports = { uploadToCloudinary };


