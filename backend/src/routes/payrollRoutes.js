const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { requirePayrollManager } = require("../middleware/payrollAuth");
const payrollController = require("../controllers/payrollController");

router.use(protect);

router.post("/requests", payrollController.createRequest);
router.get("/requests", payrollController.getRequests);
router.put(
  "/requests/:id",
  requirePayrollManager,
  payrollController.handleRequest,
);

router.post(
  "/finalize",
  requirePayrollManager,
  payrollController.finalizePayroll,
);
router.put("/edit", requirePayrollManager, payrollController.updatePayroll);

router.get("/", payrollController.getPayrolls);

module.exports = router;
