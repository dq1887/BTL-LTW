const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const leaveController = require("../controllers/leaveController");

router.use(protect);

router.get("/types", leaveController.getLeaveTypes);
router.post("/types", authorize("admin_hr"), leaveController.createLeaveType);
router.patch("/types/:id", authorize("admin_hr"), leaveController.updateLeaveType);

router.get("/schedule-days", leaveController.getScheduleDays);
router.get("/balance-employees", authorize("admin_hr", "manager"), leaveController.getBalanceEmployees);
router.get("/paid-balance", leaveController.getPaidLeaveBalance);
router.get("/requests", leaveController.getLeaveRequests);
router.post("/requests", leaveController.createLeaveRequest);
router.get("/requests/:id", leaveController.getLeaveRequestById);
router.patch("/requests/:id", leaveController.updateLeaveRequest);
router.delete("/requests/:id", leaveController.deleteLeaveRequest);
router.post("/requests/:id/approve", authorize("admin_hr", "manager"), leaveController.approveLeaveRequest);
router.post("/requests/:id/reject", authorize("admin_hr", "manager"), leaveController.rejectLeaveRequest);

module.exports = router;
