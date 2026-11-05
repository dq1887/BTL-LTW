const express = require("express");
const router = express.Router();
const {
  getShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
} = require("../controllers/shiftController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Route gốc: /api/shifts
router
  .route("/")
  .get(protect, getShifts)
  .post(protect, authorize("admin_hr", "manager"), createShift);

// Route chi tiết theo ID: /api/shifts/:id
router
  .route("/:id")
  .get(protect, getShiftById)
  .patch(protect, authorize("admin_hr", "manager"), updateShift)
  .delete(protect, authorize("admin_hr"), deleteShift);

module.exports = router;
