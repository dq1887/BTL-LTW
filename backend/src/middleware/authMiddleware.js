const jwt = require("jsonwebtoken");
const Employee = require("../models/Employee");

const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "HRM_SECRET_KEY",
      );
      req.user = await Employee.findById(decoded.id).select("-password");
      if (!req.user)
        return res.status(401).json({ message: "Tài khoản không tồn tại" });
      if (req.user.status === "inactive")
        return res.status(403).json({ message: "Tài khoản đã bị khóa" });
      return next();
    } catch (error) {
      return res
        .status(401)
        .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
  }
  if (!token)
    return res.status(401).json({ message: "Chưa cung cấp Token xác thực" });
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({
          message: `Quyền '${req.user.role}' không được phép truy cập!`,
        });
    }
    next();
  };
};

module.exports = { protect, authorize };
