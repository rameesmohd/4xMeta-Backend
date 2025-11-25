const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    timeout: 600000 
  });

const uploadToCloudinary = (filePath) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        filePath,
        { folder: "kyc_documents", resource_type: "auto" },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            // 🔹 Delete local file after successful upload
            fs.unlink(filePath, (err) => {
              if (err) console.error("Failed to delete file:", err);
            });
            resolve(result.secure_url);
          }
        }
      );
    });
};

module.exports = { uploadToCloudinary };

