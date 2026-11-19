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

// Xem lịch: ai cũng xem được
router.get("/", getSchedules);

// Phân ca / chỉnh sửa / xóa / công bố: chỉ admin_hr
router.post("/", requireAdminHr, createSchedule);
router.post("/auto-generate", requireAdminHr, autoGenerateSchedules);
router.patch("/:id", requireAdminHr, updateSchedule);
router.delete("/:id", requireAdminHr, deleteSchedule);
router.post("/:id/publish", requireAdminHr, publishSchedule);

module.exports = router;
