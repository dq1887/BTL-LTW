const Payroll = require("../models/Payroll");
const SalaryRequest = require("../models/SalaryRequest");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const {
  isPayrollManager,
  currentMonth,
  isMonthEnded,
  lastDayOfMonth,
  hasAttendance,
  round1,
  round2,
  loadStats,
  loadPayrollRows,
  finalizeMonth,
  computeLeave,
} = require("../utils/payrollHelper");

exports.getPayrolls = catchAsync(async (req, res) => {
  const month = req.query.month || currentMonth();
  const canManage = await isPayrollManager(req);

  const data = await loadPayrollRows(month, canManage ? null : req.user._id);

  res.status(200).json({
    success: true,
    canManage,
    monthEnded: isMonthEnded(month),
    currentUserId: String(req.user._id),
    hasData: data.length > 0,
    count: data.length,
    data,
  });
});

exports.updatePayroll = catchAsync(async (req, res, next) => {
  const {
    employeeId,
    month,
    baseSalary,
    hourRate,
    allowance,
    adjustment,
    note,
  } = req.body;

  if (!employeeId || !/^\d{4}-\d{2}$/.test(month || "")) {
    return next(new AppError("Thiếu nhân viên hoặc tháng!", 400));
  }

  const [row] = await loadPayrollRows(month, employeeId);
  if (!row) {
    return next(
      new AppError(
        `Không tìm thấy bảng lương: tháng ${month} chưa có dữ liệu chấm công!`,
        404,
      ),
    );
  }

  const num = (field, value, allowNegative = false) => {
    if (value === undefined) return row[field];
    const n = Number(value);
    if (!Number.isFinite(n) || (!allowNegative && n < 0)) {
      throw new AppError(`Giá trị "${field}" không hợp lệ!`, 400);
    }
    return n;
  };

  const newBase = num("baseSalary", baseSalary);
  const newRate = num("hourRate", hourRate);
  const newAllowance = num("allowance", allowance);
  const newAdjustment = num("adjustment", adjustment, true);
  const stat = (await loadStats(month, employeeId)).get(String(employeeId));
  const totalHours = round2((stat?.minutes || 0) / 60);
  const totalCredit = round1(stat?.credit || 0);
  const hourBonus = Math.round(totalHours * newRate);
  const { leaveDays, leaveDeduction, totalLeaveDays } = await computeLeave(
    month,
    employeeId,
  );

  await Payroll.findOneAndUpdate(
    { employeeId, month },
    {
      $set: {
        totalHours,
        totalCredit,
        baseSalary: newBase,
        hourRate: newRate,
        allowance: newAllowance,
        adjustment: newAdjustment,
        hourBonus,
        leaveDays,
        leaveDeduction,
        totalLeaveDays,
        total:
          newBase + hourBonus + newAllowance + newAdjustment - leaveDeduction,
        note: note !== undefined ? note : row.note,
        status: "draft",
        updatedBy: req.user._id,
      },
      $unset: { finalizedBy: "", finalizedAt: "" },
    },
    { upsert: true },
  );

  const [updated] = await loadPayrollRows(month, employeeId);

  res.status(200).json({
    success: true,
    message: "Đã lưu thay đổi vào cơ sở dữ liệu!",
    data: updated,
  });
});

exports.finalizePayroll = catchAsync(async (req, res, next) => {
  const month = req.body.month || currentMonth();

  if (!isMonthEnded(month)) {
    return next(
      new AppError(
        `Tháng ${month} chưa kết thúc (hết ngày ${lastDayOfMonth(month)}), chưa thể chốt lương!`,
        400,
      ),
    );
  }

  if (!(await hasAttendance(month))) {
    return next(
      new AppError(
        `Tháng ${month} chưa có dữ liệu chấm công, không thể chốt lương!`,
        400,
      ),
    );
  }

  const result = await finalizeMonth(month, req.user._id);

  res.status(200).json({
    success: true,
    message: `Đã chốt lương tháng ${month}`,
    count: result.changed,
    saved: result.saved,
    total: result.total,
    finalizedAt: result.finalizedAt,
  });
});

exports.createRequest = catchAsync(async (req, res, next) => {
  const { month, message } = req.body;
  if (!message || !message.trim()) {
    return next(new AppError("Vui lòng nhập nội dung yêu cầu!", 400));
  }
  const data = await SalaryRequest.create({
    employeeId: req.user._id,
    month: month || currentMonth(),
    message: message.trim(),
  });
  res.status(201).json({
    success: true,
    message: "Đã gửi yêu cầu cho kế toán!",
    data,
  });
});

exports.getRequests = catchAsync(async (req, res) => {
  const canManage = await isPayrollManager(req);
  const filter = canManage ? {} : { employeeId: req.user._id };

  const data = await SalaryRequest.find(filter)
    .populate("employeeId", "fullName employeeCode position")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, canManage, count: data.length, data });
});

exports.handleRequest = catchAsync(async (req, res, next) => {
  const { status, reply } = req.body;
  if (!["resolved", "rejected"].includes(status)) {
    return next(new AppError("Trạng thái không hợp lệ!", 400));
  }

  const request = await SalaryRequest.findById(req.params.id);
  if (!request) return next(new AppError("Không tìm thấy yêu cầu!", 404));
  if (request.status !== "pending") {
    return next(new AppError("Yêu cầu này đã được xử lý!", 400));
  }

  request.status = status;
  request.reply = reply || "";
  request.handledBy = req.user._id;
  request.handledAt = new Date();
  await request.save();

  res.status(200).json({
    success: true,
    message: "Đã xử lý yêu cầu!",
    data: request,
  });
});
