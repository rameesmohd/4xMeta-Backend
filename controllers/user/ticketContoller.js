const ticketModel = require('../../models/tickets');
const userModel = require('../../models/user')
const fs = require("fs");
const cloudinary = require("../../config/cloudinary");
const { uploadToCloudinary } = cloudinary;

const submitTicket = async (req, res) => {
    try {
        const user_id = req.user._id;
        const { category, description } = req.body;

        // 🔹 Validate required fields
        if (!category || !description || !user_id) {
            return res.status(400).json({ errMsg: "Category, description, and user ID are required!" });
        }

        // 🔹 Validate data types
        if (typeof category !== "string" || typeof description !== "string") {
            return res.status(400).json({ errMsg: "Category and description must be valid strings!" });
        }

        // 🔹 Ensure description length does not exceed 1000 characters
        if (description.length > 1000) {
            return res.status(400).json({ errMsg: "Description cannot exceed 1000 characters!" });
        }

        // 🔹 Ensure user exists
        const user = await userModel.findOne({ _id: user_id });
        if (!user) {
            return res.status(404).json({ errMsg: "User not found!" });
        }

        if (Array.isArray(req.files) && req.files.length > 2) {
            // 🔹 Delete local files after upload failure (prevent storing unnecessary files)
            await Promise.all(
                req.files.map((file) =>
                    fs.unlink(file.path, (err) => {
                        if (err) console.error("Failed to delete file:", err);
                    })
                )
            );
        
            return res.status(400).json({ errMsg: "Max only 2 files allowed!" });
        }

        // 🔹 Handle file uploads safely
        let uploadedFiles = [];
        if (Array.isArray(req.files) && req.files.length > 0) {
            uploadedFiles = await Promise.all(
                req.files.map(async (file) => await uploadToCloudinary(file.path))
            );
        }

        // 🔹 Create ticket data
        const ticketData = {
            user_id,
            category: category.trim(),
            description: description.trim(),
            uploads: uploadedFiles,
        };

        // 🔹 Save to database
        const ticket = await ticketModel.create(ticketData);

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