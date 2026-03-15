const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        reason: { type: String, enum: ["medical", "exam", "other"], required: true },
        description: { type: String, default: "" },
        documentUrl: { type: String, default: "" },
        documentFileName: { type: String, default: "" },
        status: { type: String, enum: ["pending", "approved", "declined"], default: "pending" },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        actionDate: { type: Date, default: null },
        adminNotes: { type: String, default: "" },
    },
    { timestamps: true }
);

leaveSchema.index({ user: 1, status: 1 });
leaveSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Leave", leaveSchema);
