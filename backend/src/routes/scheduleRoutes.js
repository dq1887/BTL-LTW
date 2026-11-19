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

router.get("/", getSchedules);
router.post("/", createSchedule);
router.post("/auto-generate", autoGenerateSchedules);
router.patch("/:id", updateSchedule);
router.delete("/:id", deleteSchedule);
router.post("/:id/publish", publishSchedule);

module.exports = router;
