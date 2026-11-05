const express = require('express');
const router = express.Router();
const {
    getDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
} = require('../controllers/departmentController');

router.route('/')
    .get(getDepartments)
    .post(createDepartment);

router.route('/:id')
    .get(getDepartmentById)
    .patch(updateDepartment)
    .delete(deleteDepartment);

module.exports = router;