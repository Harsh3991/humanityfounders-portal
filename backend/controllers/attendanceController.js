const Attendance = require("../models/Attendance");

/**
 * Helper: get today's date range
 */
const getTodayRange = () => {
    const now = new Date();
    // Use local time for date boundaries
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
};

/**
 * Helper: get or create today's attendance record
 */
const getRecordForClockIn = async (userId) => {
    const { start } = getTodayRange();

    // Check if there is ALREADY an active session (clocked-in or away) regardless of date
    // Prevents starting a new session while one is running from yesterday
    const activeRecord = await Attendance.findOne({
        user: userId,
        status: { $in: ["clocked-in", "away"] }
    });

    if (activeRecord) return { record: activeRecord, isNew: false, isActive: true };

    // Check for today's record (could be clocked-out from a previous session today)
    let record = await Attendance.findOne({
        user: userId,
        date: start,
    });

    if (!record) {
        // Create new record for today
        record = new Attendance({
            user: userId,
            date: start,
            status: "absent",
            activeSeconds: 0,
            clockIn: new Date(), // Set INITIAL clock-in time for the day
            sessions: []
        });
        return { record, isNew: true, isActive: false };
    }

    return { record, isNew: false, isActive: false };
};

/**
 * Helper: get active record for actions (Away, Resume, Clock Out)
 */
const getActiveRecord = async (userId) => {
    // Find any record where user is currently clocked in or away
    // This handles cross-day shifts
    return await Attendance.findOne({
        user: userId,
        status: { $in: ["clocked-in", "away"] }
    });
};

// ═══════════════════════════════════════════════
// POST /api/attendance/clock-in
// ═══════════════════════════════════════════════
const clockIn = async (req, res, next) => {
    try {
        const { record, isNew, isActive } = await getRecordForClockIn(req.user._id);

        if (isActive) {
            return res.status(400).json({
                success: false,
                message: "You are already clocked in. Please clock out first.",
            });
        }

        const now = new Date();

        // Start a new work segment
        record.status = "clocked-in";
        record.lastActiveAt = now;

        // If it's a fresh record, set user Ref if needed (already set in create)
        // Mongoose handles saving

        await record.save();

        res.status(200).json({
            success: true,
            message: "Clocked in successfully ⏱️",
            data: {
                clockIn: record.clockIn, // Returns the DAY's first clock-in
                status: record.status,
                activeSeconds: record.activeSeconds, // Returns cumulative seconds so far
            },
        });
    } catch (error) {
        next(error);
    }
};

// ═══════════════════════════════════════════════
// POST /api/attendance/away
// ═══════════════════════════════════════════════
const goAway = async (req, res, next) => {
    try {
        const record = await getActiveRecord(req.user._id);

        if (!record || record.status !== "clocked-in") {
            return res.status(400).json({
                success: false,
                message: "You must be clocked in to go away",
            });
        }

        const now = new Date();

        // Accumulate active time from the last active segment
        if (record.lastActiveAt) {
            const segmentSeconds = Math.floor((now - record.lastActiveAt) / 1000);
            record.activeSeconds += segmentSeconds;

            // Log this work session
            if (!record.sessions) record.sessions = [];
            record.sessions.push({
                start: record.lastActiveAt,
                end: now,
                duration: segmentSeconds
            });
        }

        // Start a new break
        record.breaks.push({ start: now });
        record.status = "away";
        record.lastActiveAt = null; // timer paused

        await record.save();

        res.status(200).json({
            success: true,
            message: "Timer paused — enjoy your break ☕",
            data: {
                status: record.status,
                activeSeconds: record.activeSeconds,
                breakStart: now,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ═══════════════════════════════════════════════
// POST /api/attendance/resume
// ═══════════════════════════════════════════════
const resume = async (req, res, next) => {
    try {
        const record = await getActiveRecord(req.user._id);

        if (!record || record.status !== "away") {
            return res.status(400).json({
                success: false,
                message: "You are not on a break",
            });
        }

        const now = new Date();

        // Close the current break
        const currentBreak = record.breaks[record.breaks.length - 1];
        if (currentBreak && !currentBreak.end) {
            currentBreak.end = now;
            currentBreak.duration = Math.floor((now - currentBreak.start) / 1000);
        }

        record.status = "clocked-in";
        record.lastActiveAt = now; // restart active timer (start new session segment)

        await record.save();

        res.status(200).json({
            success: true,
            message: "Welcome back! Timer resumed ⏱️",
            data: {
                status: record.status,
                activeSeconds: record.activeSeconds,
                lastActiveAt: record.lastActiveAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ═══════════════════════════════════════════════
// POST /api/attendance/clock-out
// Body: { dailyReport: "What was accomplished" }
// ═══════════════════════════════════════════════
const clockOut = async (req, res, next) => {
    try {
        const record = await getActiveRecord(req.user._id);

        if (!record) {
            return res.status(400).json({
                success: false,
                message: "You are not clocked in. Please clock in first.",
            });
        }

        const { dailyReport } = req.body;

        if (!dailyReport || !dailyReport.trim()) {
            return res.status(400).json({
                success: false,
                message: "Daily report is required when clocking out",
            });
        }

        const now = new Date();

        // If currently active (not away), accumulate remaining active time
        if (record.status === "clocked-in" && record.lastActiveAt) {
            const segmentSeconds = Math.floor((now - record.lastActiveAt) / 1000);
            record.activeSeconds += segmentSeconds;

            // Log this work session
            if (!record.sessions) record.sessions = [];
            record.sessions.push({
                start: record.lastActiveAt,
                end: now,
                duration: segmentSeconds
            });
        }

        // If away, close the open break before clocking out
        if (record.status === "away") {
            const currentBreak = record.breaks[record.breaks.length - 1];
            if (currentBreak && !currentBreak.end) {
                currentBreak.end = now;
                currentBreak.duration = Math.floor((now - currentBreak.start) / 1000);
            }
        }

        record.clockOut = now; // Update to latest clock-out time
        record.status = "clocked-out";
        record.lastActiveAt = null;

        // Append report if one exists (for multi-session days)
        if (record.dailyReport) {
            record.dailyReport += `\n[${now.toLocaleTimeString()}]: ${dailyReport.trim()}`;
        } else {
            record.dailyReport = dailyReport.trim();
        }

        await record.save();

        // Calculate total break time
        const totalBreakSeconds = record.breaks.reduce(
            (sum, b) => sum + (b.duration || 0),
            0
        );

        res.status(200).json({
            success: true,
            message: "Clocked out — great work!",
            data: {
                clockIn: record.clockIn,
                clockOut: record.clockOut,
                activeSeconds: record.activeSeconds,
                totalBreakSeconds,
                dailyReport: record.dailyReport,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ═══════════════════════════════════════════════
// GET /api/attendance/today
// Get today's attendance status for the current user
// ═══════════════════════════════════════════════
const getToday = async (req, res, next) => {
    try {
        // First check for ANY active record (handles cross-day)
        let record = await getActiveRecord(req.user._id);

        // If no active record, fetch today's record (could be clocked-out)
        if (!record) {
            const { start } = getTodayRange();
            record = await Attendance.findOne({
                user: req.user._id,
                date: start
            });
        }

        if (!record) {
            return res.status(200).json({
                success: true,
                data: {
                    status: "absent",
                    clockIn: null,
                    clockOut: null,
                    activeSeconds: 0,
                    dailyReport: "",
                    lastActiveAt: null
                }
            });
        }

        // If currently active, calculate live active seconds
        let liveActiveSeconds = record.activeSeconds || 0;
        if (record.status === "clocked-in" && record.lastActiveAt) {
            const now = new Date();
            liveActiveSeconds += Math.floor((now - record.lastActiveAt) / 1000);
        }

        const totalBreakSeconds = record.breaks.reduce(
            (sum, b) => sum + (b.duration || 0),
            0
        );

        res.status(200).json({
            success: true,
            data: {
                status: record.status,
                clockIn: record.clockIn || null,
                clockOut: record.clockOut || null,
                activeSeconds: liveActiveSeconds,
                totalBreakSeconds,
                breaksCount: record.breaks.length,
                lastActiveAt: record.lastActiveAt,
                dailyReport: record.dailyReport || "",
            },
        });
    } catch (error) {
        next(error);
    }
};

// ═══════════════════════════════════════════════
// GET /api/attendance/history?month=2&year=2026
// Get monthly attendance history for the current user
// ═══════════════════════════════════════════════
const getHistory = async (req, res, next) => {
    try {
        const now = new Date();
        const month = parseInt(req.query.month) || now.getMonth() + 1; // 1-12
        const year = parseInt(req.query.year) || now.getFullYear();

        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);

        const records = await Attendance.find({
            user: req.user._id,
            date: { $gte: start, $lte: end },
        })
            .select("date status clockIn clockOut activeSeconds dailyReport")
            .sort({ date: 1 })
            .lean();

        // Calculate stats
        const daysPresent = records.filter(
            (r) => ["clocked-in", "clocked-out", "away"].includes(r.status)
        ).length;

        const totalActiveSeconds = records.reduce(
            (sum, r) => sum + (r.activeSeconds || 0),
            0
        );

        res.status(200).json({
            success: true,
            data: {
                month,
                year,
                records,
                stats: {
                    daysPresent,
                    totalWorkingHours:
                        Math.round((totalActiveSeconds / 3600) * 10) / 10,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    clockIn,
    goAway,
    resume,
    clockOut,
    getToday,
    getHistory,
};
