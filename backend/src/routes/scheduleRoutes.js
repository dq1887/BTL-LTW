const express = require("express");
const router = express.Router();
const {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  publishSchedule,
  autoGenerateSchedules,
} = require("../controllers/scheduleController");
const requireAdminHr = require("../middleware/requireAdminHr");

// admin_hr được phân ca và sửa lịch nháp
const requireStaff = requireAdminHr.allow("admin_hr");

// Xem lịch: ai cũng xem được
router.get("/", getSchedules);

router.post("/", requireStaff, createSchedule);
router.post("/auto-generate", requireStaff, autoGenerateSchedules);
router.patch("/:id", requireStaff, updateSchedule);

// Xóa ca và công bố lịch: chỉ admin_hr
router.delete("/:id", requireAdminHr, deleteSchedule);
router.post("/:id/publish", requireAdminHr, publishSchedule);

module.exports = router;
