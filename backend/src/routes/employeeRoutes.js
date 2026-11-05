const express = require('express');
const router = express.Router();
const {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    transferDepartment,
    deleteEmployee
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

module.exports = router;