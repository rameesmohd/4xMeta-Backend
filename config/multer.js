const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Absolute path to uploads directory
const uploadDir = path.join(process.cwd(), "uploads");

// Ensure uploads folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}${ext}`;

    cb(null, safeName);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/pdf",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, JPEG, and PDF files are allowed"), false);
  }
};

// Export upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const cleanupFiles = (files = []) => {
  files.forEach(file => {
    fs.unlink(file.path, err => {
      if (err) console.error("Cleanup failed for:", file.path, err);
    });
  });
};

// Reusable multer error wrapper
const withUpload = (uploadMiddleware, handler) => (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Each file must be under 10MB. Please compress your document and try again.",
        });
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message: "Maximum 2 files allowed (front and back).",
        });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          success: false,
          message: "Unexpected file field. Please use the correct upload form.",
        });
      }
      // fileFilter rejection lands here
      return res.status(400).json({
        success: false,
        message: err.message || "Invalid file type. Only JPG, PNG, and PDF are accepted.",
      });
    }
    handler(req, res, next);
  });
};

// Update your routes
// router.post("/kyc/identity",
//   withUpload(upload.array("identityProof", 2), user.handleKycProofSubmit("identity"))
// );
// router.post("/kyc/residential",
//   withUpload(upload.array("residentialProof", 2), user.handleKycProofSubmit("residential"))
// );

module.exports = { upload, cleanupFiles ,withUpload};

