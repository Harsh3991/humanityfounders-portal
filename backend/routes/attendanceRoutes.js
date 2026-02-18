const express = require("express");
const router = express.Router();
const {
    clockIn,
    goAway,
    resume,
    clockOut,
    getToday,
    getHistory,
} = require("../controllers/attendanceController");
const protect = require("../middleware/auth");

// All attendance routes require authentication
router.use(protect);

// Today's status
router.get("/today", getToday);

// Monthly history
router.get("/history", getHistory);

// Clock actions
router.post("/clock-in", clockIn);
router.post("/away", goAway);
router.post("/resume", resume);
router.post("/clock-out", clockOut);

module.exports = router;
