const AppError = require("../utils/appError");
const { canManagePayroll } = require("../utils/payrollHelper");

exports.requirePayrollManager = (req, res, next) => {
  if (!req.user || !canManagePayroll(req.user)) {
    return next(
      new AppError("Chỉ Kế toán hoặc Giám đốc mới có quyền thực hiện!", 403),
    );
  }
  next();
};