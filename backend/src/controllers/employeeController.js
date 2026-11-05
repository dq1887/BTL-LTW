// backend/src/controllers/employeeController.js
const Employee = require('../models/Employee');
const Department = require('../models/Department');

// [GET] /api/employees - Lấy danh sách nhân viên (có tìm kiếm & phân trang)
const getEmployees = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search || '';

        // Tìm kiếm theo tên (không phân biệt hoa thường)
        const query = search
            ? { fullName: { $regex: search, $options: 'i' } }
            : {};

        const count = await Employee.countDocuments(query);
        const employees = await Employee.find(query)
            .populate('departmentId', 'name') // Lấy tên phòng ban từ bảng Department
            .limit(limit)
            .skip(limit * (page - 1))
            .sort({ createdAt: -1 });

        res.json({
            employees,
            page,
            pages: Math.ceil(count / limit),
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ:', error: error.message });
    }
};

// [GET] /api/employees/:id - Xem chi tiết 1 nhân viên
const getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).populate('department');
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        res.json(employee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// [POST] /api/employees - Thêm mới nhân viên
const createEmployee = async (req, res) => {
    try {
        const employee = new Employee(req.body);
        const savedEmployee = await employee.save();
        res.status(201).json(savedEmployee);
    } catch (error) {
        res.status(400).json({ message: 'Dữ liệu không hợp lệ:', error: error.message });
    }
};

// [PUT] /api/employees/:id - Cập nhật thông tin nhân viên
const updateEmployee = async (req, res) => {
    try {
        const updatedEmployee = await Employee.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedEmployee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        res.json(updatedEmployee);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// [DELETE] /api/employees/:id - Xóa nhân viên
const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findByIdAndDelete(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        res.json({ message: 'Xóa nhân viên thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
};