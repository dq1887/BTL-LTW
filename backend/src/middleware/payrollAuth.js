const AppError = require("../utils/appError");
const { isPayrollManager } = require("../utils/payrollHelper");

// Chỉ Kế toán (role accountant) và Giám đốc (role admin_hr) được đi tiếp
exports.requirePayrollManager = async (req, res, next) => {
  try {
    if (!req.user || !(await isPayrollManager(req))) {
      return next(
        new AppError("Chỉ Kế toán hoặc Giám đốc mới có quyền thực hiện!", 403),
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};