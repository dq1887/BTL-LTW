const Department = require('../models/Department');
const Employee = require('../models/Employee');

// [GET] /api/departments - Lấy danh sách phòng ban
const getDepartments = async (req, res) => {
    try {
        const departments = await Department.find().sort({ createdAt: -1 });
        res.json(departments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// [GET] /api/departments/:id - Xem chi tiết 1 phòng ban
const getDepartmentById = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) return res.status(404).json({ message: 'Không tìm thấy phòng ban' });
        res.json(department);
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
    createDepartment,
    updateDepartment,
    deleteDepartment
};