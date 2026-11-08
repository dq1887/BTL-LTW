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
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
    );

    res.status(200).json({
      token,
      user: {
        id: employee._id,
        name: employee.fullName || employee.name || "Người dùng",
        fullName: employee.fullName || employee.name || "Người dùng",
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { login };
