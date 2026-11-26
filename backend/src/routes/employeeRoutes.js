const express = require("express");
const router = express.Router();
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  transferDepartment,
  deleteEmployee,
  restoreEmployee,
} = require("../controllers/employeeController");

router.route("/").get(getEmployees).post(createEmployee);

router
  .route("/:id")
  .get(getEmployeeById)
  .patch(updateEmployee)
  .delete(deleteEmployee);

router.patch("/:id/transfer", transferDepartment);

router.patch("/:id/restore", restoreEmployee);

module.exports = router;
