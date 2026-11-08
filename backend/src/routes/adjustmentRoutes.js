const express = require("express");
const router = express.Router();
const attendanceCtrl = require("../controllers/attendanceController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/", protect, attendanceCtrl.createAdjustment);
router.get("/", protect, attendanceCtrl.getAdjustments);
router.post(
  "/:id/approve",
  protect,
  authorize("admin_hr", "manager"),
  attendanceCtrl.approveAdjustment,
);

module.exports = router;
