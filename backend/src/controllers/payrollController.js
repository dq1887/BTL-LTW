const Payroll = require("../models/Payroll");
const SalaryRequest = require("../models/SalaryRequest");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const {
  isPayrollManager,
  currentMonth,
  round1,
  round2,
  loadStats,
  loadPayrollRows,
  finalizeMonth,
} = require("../utils/payrollHelper");

// GET /api/payroll?month=2026-11
// Chỉ tính và hiển thị, không ghi gì vào database
exports.getPayrolls = catchAsync(async (req, res) => {
  const month = req.query.month || currentMonth();
  const canManage = await isPayrollManager(req);

  // Người không có quyền quản lý chỉ xem lương của chính mình
  const data = await loadPayrollRows(month, canManage ? null : req.user._id);

  res.status(200).json({
    success: true,
    canManage,
    currentUserId: String(req.user._id),
    count: data.length,
    data,
  });
});

// PUT /api/payroll/edit  { employeeId, month, baseSalary, hourRate, allowance, adjustment, note }
// Lưu thay đổi vào database và chuyển phiếu về "Nháp" (kể cả khi đã chốt),
// để bấm "Chốt lương" lần nữa thì database được cập nhật lại.
exports.updatePayroll = catchAsync(async (req, res, next) => {
  const { employeeId, month, baseSalary, hourRate, allowance, adjustment, note } =
    req.body;

  if (!employeeId || !/^\d{4}-\d{2}$/.test(month || "")) {
    return next(new AppError("Thiếu nhân viên hoặc tháng!", 400));
  }

  const [row] = await loadPayrollRows(month, employeeId);
  if (!row) return next(new AppError("Không tìm thấy nhân viên!", 404));

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

  // Số giờ luôn lấy mới nhất từ chấm công
  const stat = (await loadStats(month, employeeId)).get(String(employeeId));
  const totalHours = round2((stat?.minutes || 0) / 60);
  const totalCredit = round1(stat?.credit || 0);
  const hourBonus = Math.round(totalHours * newRate);

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
        total: newBase + hourBonus + newAllowance + newAdjustment,
        note: note !== undefined ? note : row.note,
        status: "draft", // đưa về Nháp để chốt lại
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

// POST /api/payroll/finalize  { month }
exports.finalizePayroll = catchAsync(async (req, res) => {
  const month = req.body.month || currentMonth();
  const result = await finalizeMonth(month, req.user._id);

  res.status(200).json({
    success: true,
    message: `Đã chốt lương tháng ${month}`,
    count: result.changed, // số bảng lương vừa ghi/cập nhật lần này
    saved: result.saved, // tổng số bảng đã chốt của tháng trong database
    total: result.total, // tổng tiền lương của tháng
    finalizedAt: result.finalizedAt,
  });
});

// POST /api/payroll/requests  - nhân viên gửi kế toán xin sửa lương
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

// GET /api/payroll/requests
exports.getRequests = catchAsync(async (req, res) => {
  const canManage = await isPayrollManager(req);
  const filter = canManage ? {} : { employeeId: req.user._id };

  const data = await SalaryRequest.find(filter)
    .populate("employeeId", "fullName employeeCode position")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, canManage, count: data.length, data });
});

// PUT /api/payroll/requests/:id  { status: "resolved" | "rejected", reply }
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