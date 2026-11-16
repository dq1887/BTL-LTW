const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { requirePayrollManager } = require("../middleware/payrollAuth");
const payrollController = require("../controllers/payrollController");

router.use(protect);

// Yêu cầu sửa lương
router.post("/requests", payrollController.createRequest);
router.get("/requests", payrollController.getRequests);
router.put(
  "/requests/:id",
  requirePayrollManager,
  payrollController.handleRequest,
);

// Chốt lương và sửa lương (chỉ Kế toán / Giám đốc)
router.post(
  "/finalize",
  requirePayrollManager,
  payrollController.finalizePayroll,
);
router.put("/edit", requirePayrollManager, payrollController.updatePayroll);

// Xem bảng lương
router.get("/", payrollController.getPayrolls);

module.exports = router;