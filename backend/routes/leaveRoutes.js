const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const protect = require("../middleware/auth");
const roleAuth = require("../middleware/roleAuth");
const {
    requestLeave,
    getMyRequests,
    getAllRequests,
    approveLeave,
    declineLeave,
    downloadDocument,
} = require("../controllers/leaveController");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "../uploads/leaves", String(req.user._id));
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only PDF, JPG, PNG are allowed."), false);
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect);

router.post("/request", upload.single("documentFile"), requestLeave);
router.get("/my-requests", getMyRequests);
router.get("/", roleAuth("admin", "hr"), getAllRequests);
router.patch("/:leaveId/approve", roleAuth("admin", "hr"), approveLeave);
router.patch("/:leaveId/decline", roleAuth("admin", "hr"), declineLeave);
router.get("/:leaveId/download-document", downloadDocument);

module.exports = router;
