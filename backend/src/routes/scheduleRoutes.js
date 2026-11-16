const express = require("express");
const router = express.Router();
const {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  publishSchedule,
} = require("../controllers/scheduleController");

router.get("/", getSchedules);
router.post("/", createSchedule);
router.patch("/:id", updateSchedule);
router.delete("/:id", deleteSchedule);
router.post("/:id/publish", publishSchedule);

module.exports = router;
