const jwt = require("jsonwebtoken");
const Employee = require("../models/Employee");

// allow("admin_hr", "manager") -> chỉ cho các vai trò liệt kê đi tiếp.
// Quyền được kiểm tra lại từ database (không tin role ghi trong token).
const allow =
  (...roles) =>
  async (req, res, next) => {
    try {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : null;
      if (!token) {
        return res.status(401).json({ message: "Bạn chưa đăng nhập!" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId =
        decoded.id || decoded._id || decoded.userId || decoded.employeeId;
      const user = userId
        ? await Employee.findById(userId).select("role status")
        : null;

      if (!user) {
        return res.status(401).json({ message: "Tài khoản không tồn tại!" });
      }
      if (!roles.includes(user.role)) {
        return res.status(403).json({
          message: "Bạn không có quyền thực hiện thao tác này!",
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn!",
      });
    }
  };

// Dùng riêng cho thao tác chỉ admin_hr: requireAdminHr
// Dùng nhiều vai trò: requireAdminHr.allow("admin_hr", "manager")
const requireAdminHr = allow("admin_hr");
requireAdminHr.allow = allow;

module.exports = requireAdminHr;
