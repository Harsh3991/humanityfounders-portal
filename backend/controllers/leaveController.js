const path = require("path");
const fs = require("fs");
const Leave = require("../models/Leave");
const { validateLeaveRequest, syncApprovedLeaveToAttendance } = require("../services/leaveService");

// POST /api/leaves/request
const requestLeave = async (req, res) => {
    try {
        const { startDate, endDate, reason, description } = req.body;
        const userId = req.user._id;

        const validation = await validateLeaveRequest(startDate, endDate, reason, description, userId);
        if (!validation.valid) {
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(400).json({ success: false, message: validation.message });
        }

        if (["medical", "exam"].includes(reason) && !req.file) {
            return res.status(400).json({ success: false, message: "Document is required for medical/exam leaves." });
        }

        const leave = await Leave.create({
            user: userId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason,
            description: description || "",
            documentUrl: req.file ? req.file.path.replace(/\\/g, "/") : "",
            documentFileName: req.file ? req.file.originalname : "",
        });

        await leave.populate("user", "fullName email department");
        res.status(201).json({ success: true, data: leave });
    } catch (err) {
        console.error("requestLeave error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// GET /api/leaves/my-requests
const getMyRequests = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = { user: req.user._id };
        if (status && status !== "all") filter.status = status;

        const leaves = await Leave.find(filter)
            .populate("approvedBy", "fullName")
            .sort({ createdAt: -1 });

        res.json({ success: true, data: leaves });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// GET /api/leaves (Admin/HR)
const getAllRequests = async (req, res) => {
    try {
        const { status, reason, userId, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (status && status !== "all") filter.status = status;
        if (reason) filter.reason = reason;
        if (userId) filter.user = userId;

        const skip = (Number(page) - 1) * Number(limit);
        const total = await Leave.countDocuments(filter);
        const leaves = await Leave.find(filter)
            .populate("user", "fullName email department")
            .populate("approvedBy", "fullName")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        res.json({ success: true, data: leaves, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// PATCH /api/leaves/:leaveId/approve (Admin/HR)
const approveLeave = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.leaveId);
        if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });
        if (leave.status !== "pending") return res.status(400).json({ success: false, message: "Leave has already been actioned" });

        leave.status = "approved";
        leave.approvedBy = req.user._id;
        leave.actionDate = new Date();
        leave.adminNotes = req.body.adminNotes || "";
        await leave.save();

        syncApprovedLeaveToAttendance(leave.user, leave.startDate, leave.endDate)
            .catch(err => console.error("Attendance sync failed:", err));

        await leave.populate([
            { path: "user", select: "fullName email department" },
            { path: "approvedBy", select: "fullName" },
        ]);

        res.json({ success: true, data: leave });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// PATCH /api/leaves/:leaveId/decline (Admin/HR)
const declineLeave = async (req, res) => {
    try {
        const { adminNotes } = req.body;
        if (!adminNotes) {
            return res.status(400).json({ success: false, message: "A reason is required when declining a leave." });
        }

        const leave = await Leave.findById(req.params.leaveId);
        if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });
        if (leave.status !== "pending") return res.status(400).json({ success: false, message: "Leave has already been actioned" });

        leave.status = "declined";
        leave.approvedBy = req.user._id;
        leave.actionDate = new Date();
        leave.adminNotes = adminNotes;
        await leave.save();

        await leave.populate([
            { path: "user", select: "fullName email department" },
            { path: "approvedBy", select: "fullName" },
        ]);

        res.json({ success: true, data: leave });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// GET /api/leaves/:leaveId/download-document
const downloadDocument = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.leaveId);
        if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });

        if (req.user.role !== "admin" && req.user.role !== "hr" && String(leave.user) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        if (!leave.documentUrl) {
            return res.status(404).json({ success: false, message: "No document attached to this leave." });
        }

        const filePath = path.resolve(leave.documentUrl);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: "Document file not found on server." });
        }

        res.download(filePath, leave.documentFileName || "document");
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = { requestLeave, getMyRequests, getAllRequests, approveLeave, declineLeave, downloadDocument };
