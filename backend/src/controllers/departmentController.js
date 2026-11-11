const Department = require('../models/Department');
const Employee = require('../models/Employee');

// [GET] /api/departments - Lấy danh sách phòng ban kèm nhân viên trực thuộc
const getDepartments = async (req, res) => {
    try {
        const departments = await Department.find().sort({ createdAt: 1 });
        const departmentsWithEmployees = await Promise.all(
            departments.map(async (dept) => {
                const employees = await Employee.find({ departmentId: dept._id })
                    .select('employeeCode fullName email phone position role status')
                    .sort({ role: 1, fullName: 1 });
                return {
                    ...dept.toObject(),
                    employeeCount: employees.length,
                    employees: employees
                };
            })
        );
        res.json(departmentsWithEmployees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// [GET] /api/departments/:id - Xem chi tiết 1 phòng ban kèm danh sách nhân viên
const getDepartmentById = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) return res.status(404).json({ message: 'Không tìm thấy phòng ban' });
        
        const employees = await Employee.find({ departmentId: department._id })
            .select('employeeCode fullName email phone position role status')
            .sort({ role: 1, fullName: 1 });

        res.json({
            ...department.toObject(),
            employeeCount: employees.length,
            employees
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// [GET] /api/departments/:id/employees - Lấy riêng danh sách nhân viên thuộc phòng ban
const getDepartmentEmployees = async (req, res) => {
    try {
        const employees = await Employee.find({ departmentId: req.params.id })
            .select('-password')
            .sort({ role: 1, fullName: 1 });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// [POST] /api/departments - Tạo mới phòng ban (Check trùng mã phòng ban)
const createDepartment = async (req, res) => {
    try {
        const { code, name, description } = req.body;

        // Quy tắc 1: Kiểm tra trùng mã phòng ban -> Trả 409 Conflict
        const existingDept = await Department.findOne({ code });
        if (existingDept) {
            return res.status(409).json({ message: 'Mã phòng ban đã tồn tại trên hệ thống!' });
        }

        const newDept = new Department({ code, name, description });
        const savedDept = await newDept.save();
        res.status(201).json(savedDept);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// [PATCH] /api/departments/:id - Cập nhật thông tin phòng ban
const updateDepartment = async (req, res) => {
    try {
        const updatedDept = await Department.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedDept) return res.status(404).json({ message: 'Không tìm thấy phòng ban' });
        res.json(updatedDept);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// [DELETE] /api/departments/:id - Chặn xóa nếu còn nhân viên
const deleteDepartment = async (req, res) => {
    try {
        const departmentId = req.params.id;

        // Quy tắc 3: Kiểm tra xem còn nhân viên trực thuộc phòng này không
        const countEmployees = await Employee.countDocuments({ departmentId, status: 'active' });
        if (countEmployees > 0) {
            return res.status(409).json({
                message: `Không thể xóa/khóa phòng ban vì vẫn còn ${countEmployees} nhân viên đang trực thuộc!`
            });
        }

        const deletedDept = await Department.findByIdAndDelete(departmentId);
        if (!deletedDept) return res.status(404).json({ message: 'Không tìm thấy phòng ban' });

        res.json({ message: 'Xóa phòng ban thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDepartments,
    getDepartmentById,
    getDepartmentEmployees,
    createDepartment,
    updateDepartment,
    deleteDepartment
};