const Employee = require("../models/Employee");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Vui lòng cung cấp đầy đủ Email và Mật khẩu trong Request Body (dạng JSON)!",
      });
    }

    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res
        .status(401)
        .json({ message: "Email hoặc mật khẩu không chính xác" });
    }

    let isMatch = false;
    if (
      employee.password &&
      (employee.password.startsWith("$2a$") ||
        employee.password.startsWith("$2b$"))
    ) {
      isMatch = await bcrypt.compare(password, employee.password);
    } else {
      isMatch = employee.password === password;
    }

    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Email hoặc mật khẩu không chính xác" });
    }

    if (employee.status === "inactive") {
      return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hóa" });
    }

    const token = jwt.sign(
      { id: employee._id, role: employee.role },
      process.env.JWT_SECRET || "HRM_SECRET_KEY",
      { expiresIn: "7d" },
    );

    const ip =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Web Browser";
    let device = "PC / Windows";
    if (/mobile/i.test(userAgent)) device = "Mobile / Smartphone";
    else if (/chrome/i.test(userAgent)) device = "Chrome Browser (PC)";
    else if (/firefox/i.test(userAgent)) device = "Firefox (PC)";

    employee.loginHistory = employee.loginHistory || [];
    employee.loginHistory.unshift({
      loginAt: new Date(),
      ip: String(ip).replace("::ffff:", ""),
      device: device,
    });
    if (employee.loginHistory.length > 10) employee.loginHistory.pop();
    await employee.save({ validateBeforeSave: false });

    res.status(200).json({
      token,
      user: {
        id: employee._id,
        _id: employee._id,
        employeeCode: employee.employeeCode,
        fullName: employee.fullName || employee.name || "Người dùng",
        name: employee.fullName || employee.name || "Người dùng",
        email: employee.email,
        phone: employee.phone || "",
        position: employee.position || "Nhân viên",
        role: employee.role,
        departmentId: employee.departmentId,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const employeeId = req.user ? req.user._id : req.body.employeeId;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin!",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới và xác nhận mật khẩu không khớp!",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải có ít nhất 6 ký tự!",
      });
    }

    const employee = await Employee.findById(employeeId).select("+password");
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản nhân viên!",
      });
    }

    let isMatch = false;
    if (
      employee.password &&
      (employee.password.startsWith("$2a$") ||
        employee.password.startsWith("$2b$"))
    ) {
      isMatch = await bcrypt.compare(currentPassword, employee.password);
    } else {
      isMatch = employee.password === currentPassword;
    }

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu hiện tại không chính xác!",
      });
    }

    const salt = await bcrypt.genSalt(10);
    employee.password = await bcrypt.hash(newPassword, salt);
    await employee.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công! Hãy đăng nhập lại bằng mật khẩu mới.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLoginHistory = async (req, res) => {
  try {
    const employeeId = req.user ? req.user._id : req.query.employeeId;
    const employee = await Employee.findById(employeeId).select("loginHistory");
    res.status(200).json({
      success: true,
      data: employee?.loginHistory || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { login, changePassword, getLoginHistory };
