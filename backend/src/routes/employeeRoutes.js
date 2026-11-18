const express = require('express');
const router = express.Router();
const {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    transferDepartment,
    deleteEmployee,
    restoreEmployee
} = require('../controllers/employeeController');

router.route('/')
    .get(getEmployees)
    .post(createEmployee);

router.route('/:id')
    .get(getEmployeeById)
    .patch(updateEmployee)
    .delete(deleteEmployee);

// Route điều chuyển phòng ban
router.patch('/:id/transfer', transferDepartment);

// Route khôi phục / kích hoạt lại nhân viên
router.patch('/:id/restore', restoreEmployee);

module.exports = router;