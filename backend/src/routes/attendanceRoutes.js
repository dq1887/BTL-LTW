const express = require("express");
const router = express.Router();
const attendanceCtrl = require("../controllers/attendanceController");
const { protect } = require("../middleware/authMiddleware");

router.post("/check-in", protect, attendanceCtrl.checkIn);
router.post("/:id/check-out", protect, attendanceCtrl.checkOut);
router.get("/", protect, attendanceCtrl.getAttendances);

module.exports = router;
