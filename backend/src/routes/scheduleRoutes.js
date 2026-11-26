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

const requireStaff = requireAdminHr.allow("admin_hr");

router.get("/", getSchedules);

router.post("/", requireStaff, createSchedule);
router.post("/auto-generate", requireStaff, autoGenerateSchedules);
router.patch("/:id", requireStaff, updateSchedule);

router.delete("/:id", requireAdminHr, deleteSchedule);
router.post("/:id/publish", requireAdminHr, publishSchedule);

module.exports = router;
