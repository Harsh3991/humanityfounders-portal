const Leave = require("../models/Leave");
const Attendance = require("../models/Attendance");

const validateLeaveRequest = async (startDate, endDate, reason, description, userId) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end)) {
        return { valid: false, message: "Invalid dates provided." };
    }

    if (end < start) {
        return { valid: false, message: "End date must be on or after start date." };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
        return { valid: false, message: "Cannot request leave for past dates." };
    }

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (days > 30) {
        return { valid: false, message: "Leave duration cannot exceed 30 days." };
    }

    if (["medical", "exam"].includes(reason) && !description) {
        return { valid: false, message: "Description is required for medical/exam leaves." };
    }

    const overlapping = await Leave.findOne({
        user: userId,
        status: { $in: ["pending", "approved"] },
        startDate: { $lte: end },
        endDate: { $gte: start },
    });

    if (overlapping) {
        return { valid: false, message: "You already have a leave request that overlaps with these dates." };
    }

    return { valid: true, message: "Valid" };
};

const syncApprovedLeaveToAttendance = async (userId, startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let datesUpdated = 0;

    const current = new Date(start);
    while (current <= end) {
        const dayStart = new Date(current);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(current);
        dayEnd.setUTCHours(23, 59, 59, 999);

        await Attendance.findOneAndUpdate(
            { user: userId, date: { $gte: dayStart, $lte: dayEnd } },
            {
                $setOnInsert: { user: userId, date: new Date(dayStart) },
                $set: { status: "on-leave", activeSeconds: 0 },
            },
            { upsert: true, new: true }
        );
        datesUpdated++;
        current.setDate(current.getDate() + 1);
    }

    return { synced: true, datesUpdated };
};

module.exports = { validateLeaveRequest, syncApprovedLeaveToAttendance };
