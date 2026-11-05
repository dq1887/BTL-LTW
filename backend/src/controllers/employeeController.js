const Employee = require('../models/Employee');
const Department = require('../models/Department');

// [GET] /api/employees - Lấy danh sách nhân viên
const getEmployees = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search || '';

        const query = search
            ? { fullName: { $regex: search, $options: 'i' } }
            : {};

        const count = await Employee.countDocuments(query);
        const employees = await Employee.find(query)
            .populate('departmentId', 'name code')
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

// [GET] /api/employees/:id - Chi tiết 1 nhân viên (kèm lịch sử chuyển phòng)
const getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id)
            .populate('departmentId', 'name code')
            .populate('transferHistory.oldDepartment', 'name code')
            .populate('transferHistory.newDepartment', 'name code');

        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        res.json(employee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// [POST] /api/employees - Thêm nhân viên mới (Check trùng employeeCode & email -> 409)
const createEmployee = async (req, res) => {
    try {
        const { employeeCode, email } = req.body;

        // Quy tắc 1: Check trùng employeeCode hoặc email
        const existingEmp = await Employee.findOne({
            $or: [{ employeeCode }, { email }]
        });

        if (existingEmp) {
            return res.status(409).json({
                message: 'Mã nhân viên hoặc Email đã tồn tại trên hệ thống!'
            });
        }

        const employee = new Employee(req.body);
        const savedEmployee = await employee.save();
        res.status(201).json(savedEmployee);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// [PATCH] /api/employees/:id - Cập nhật nhân viên
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

// [PATCH] /api/employees/:id/transfer - Điều chuyển phòng ban (Quy tắc 2)
const transferDepartment = async (req, res) => {
    try {
        const { newDepartmentId } = req.body;
        const employee = await Employee.findById(req.params.id);

        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });

        const oldDepartmentId = employee.departmentId;

        // Nếu chuyển sang đúng phòng ban hiện tại thì bỏ qua
        if (oldDepartmentId.toString() === newDepartmentId) {
            return res.status(400).json({ message: 'Nhân viên đã thuộc phòng ban này rồi!' });
        }

        // Cập nhật departmentId mới và lưu nhật ký điều chuyển
        employee.departmentId = newDepartmentId;
        employee.transferHistory.push({
            oldDepartment: oldDepartmentId,
            newDepartment: newDepartmentId,
            updatedAt: new Date()
        });

        await employee.save();
        res.json({ message: 'Điều chuyển phòng ban thành công!', employee });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// [DELETE] /api/employees/:id - Xóa mềm nhân viên (Quy tắc 4)
const deleteEmployee = async (req, res) => {
    try {
        // Áp dụng cơ chế xóa mềm: Đổi trạng thái thành inactive để bảo toàn lịch sử
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { status: 'inactive' },
            { new: true }
        );

        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        res.json({ message: 'Đã chuyển trạng thái nhân viên sang Inactive (Xóa mềm)', employee });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    transferDepartment,
    deleteEmployee
};