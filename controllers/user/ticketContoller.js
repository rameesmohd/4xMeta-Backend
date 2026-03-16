const ticketModel = require('../../models/tickets');
const userModel = require('../../models/user')
const fs = require("fs");
const cloudinary = require("../../config/cloudinary");
const { cleanupFiles } = require('../../config/multer');
const { uploadToCloudinary } = cloudinary;

const submitTicket = async (req, res) => {
  const localFiles = req.files || [];

  try {
    const user_id = req.user._id;
    const { category, description } = req.body;

    // Validate required fields
    if (!category || !description) {
      return res.status(400).json({ errMsg: "Category and description are required!" });
    }

    // Validate types
    if (typeof category !== "string" || typeof description !== "string") {
      return res.status(400).json({ errMsg: "Category and description must be valid strings!" });
    }

    // Validate description length
    if (description.length > 1000) {
      return res.status(400).json({ errMsg: "Description cannot exceed 1000 characters!" });
    }

    // Validate file count before uploading anything
    if (localFiles.length > 2) {
      cleanupFiles(localFiles); // fire-and-forget cleanup is fine here
      return res.status(400).json({ errMsg: "Max 2 files allowed!" });
    }

    // Upload files, always clean up locals after regardless of outcome
    let uploadedFiles = [];
    if (localFiles.length > 0) {
      try {
        uploadedFiles = await Promise.all(
          localFiles.map(file => uploadToCloudinary(file.path))
        );
      } finally {
        cleanupFiles(localFiles);
      }
    }

    const ticket = await ticketModel.create({
      user_id,
      category: category.trim(),
      description: description.trim(),
      uploads: uploadedFiles,
    });

    return res.status(201).json({ success: true, ticket, msg: "Ticket submitted successfully" });

  } catch (error) {
    console.error("Error submitting ticket:", error);
    res.status(500).json({ errMsg: "Server error!", error: error.message });
  }
};

const fetchTickets = async(req,res)=>{
    try {
        const user_id = req.user._id;
        const myTickets = await ticketModel.find({user_id})
        return res.status(200).json({result : myTickets});
    } catch (error) {
        console.error(error);
        res.status(500).json({ errMsg: 'Server error!', error: error.message });
    }
}

module.exports = {
    submitTicket,
    fetchTickets
}