const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  checkIn,
  checkOut,
  getAttendances,
  getDashboardStats,
} = require("../controllers/attendanceController");

router.post("/check-in", protect, checkIn);
router.post("/:id/check-out", protect, checkOut);
router.get("/", protect, getAttendances);
router.get("/dashboard-stats", protect, getDashboardStats);

module.exports = router;
