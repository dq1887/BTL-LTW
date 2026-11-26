const Employee = require("../models/Employee");
const Department = require("../models/Department");
const getEmployees = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = req.query.limit !== undefined ? Number(req.query.limit) : 0;
    const search = req.query.search || "";
    const departmentId = req.query.departmentId;

    const query = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { employeeCode: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { position: { $regex: search, $options: "i" } },
      ];
    }
    if (departmentId) {
      query.departmentId = departmentId;
    }

    const count = await Employee.countDocuments(query);
    let queryBuilder = Employee.find(query)
      .populate("departmentId", "name code")
      .sort({ createdAt: -1 });

    if (limit > 0) {
      queryBuilder = queryBuilder.limit(limit).skip(limit * (page - 1));
    }

    const employees = await queryBuilder;

    res.json({
      employees,
      page,
      pages: limit > 0 ? Math.ceil(count / limit) : 1,
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ:", error: error.message });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate("departmentId", "name code")
      .populate("transferHistory.oldDepartment", "name code")
      .populate("transferHistory.newDepartment", "name code");

    if (!employee)
      return res.status(404).json({ message: "Không tìm thấy nhân viên" });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createEmployee = async (req, res) => {
  try {
    const { employeeCode, email } = req.body;

    const existingEmp = await Employee.findOne({
      $or: [{ employeeCode }, { email }],
    });

    if (existingEmp) {
      return res.status(409).json({
        message: "Mã nhân viên hoặc Email đã tồn tại trên hệ thống!",
      });
    }

    const employee = new Employee(req.body);
    const savedEmployee = await employee.save();
    res.status(201).json(savedEmployee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!updatedEmployee)
      return res.status(404).json({ message: "Không tìm thấy nhân viên" });
    res.json(updatedEmployee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const transferDepartment = async (req, res) => {
  try {
    const { newDepartmentId } = req.body;
    const employee = await Employee.findById(req.params.id);

    if (!employee)
      return res.status(404).json({ message: "Không tìm thấy nhân viên" });

    if (employee.status !== "active") {
      return res.status(400).json({
        message:
          "Không thể điều chuyển nhân viên đã bị vô hiệu hóa hoặc nghỉ việc!",
      });
    }

    const oldDepartmentId = employee.departmentId;

    if (oldDepartmentId.toString() === newDepartmentId) {
      return res
        .status(400)
        .json({ message: "Nhân viên đã thuộc phòng ban này rồi!" });
    }

    employee.departmentId = newDepartmentId;
    employee.transferHistory.push({
      oldDepartment: oldDepartmentId,
      newDepartment: newDepartmentId,
      updatedAt: new Date(),
    });

    await employee.save();
    res.json({ message: "Điều chuyển phòng ban thành công!", employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { status: "inactive" },
      { new: true },
    );

    if (!employee)
      return res.status(404).json({ message: "Không tìm thấy nhân viên" });
    res.json({
      message: "Đã chuyển trạng thái nhân viên sang Inactive (Xóa mềm)",
      employee,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const restoreEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { status: "active" },
      { new: true },
    );

    if (!employee)
      return res.status(404).json({ message: "Không tìm thấy nhân viên" });
    res.json({
      message: "Đã kích hoạt lại tài khoản nhân viên thành công!",
      employee,
    });
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
  deleteEmployee,
  restoreEmployee,
};
