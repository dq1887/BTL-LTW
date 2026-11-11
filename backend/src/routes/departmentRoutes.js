const express = require("express");
const router = express.Router();
const {
  getDepartments,
  getDepartmentById,
  getDepartmentEmployees,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");

router.route("/").get(getDepartments).post(createDepartment);

router.get("/:id/employees", getDepartmentEmployees);

router
  .route("/:id")
  .get(getDepartmentById)
  .patch(updateDepartment)
  .delete(deleteDepartment);

module.exports = router;
