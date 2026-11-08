require("../models/Employee"); // Nạp schema Employee để populate không lỗi
const Attendance = require("../models/Attendance");
const AttendanceAdjustment = require("../models/AttendanceAdjustment");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// 1. POST /api/attendances/check-in (Quy tắc 1: Đúng ngày hiện tại, 1 bản ghi/ca)[cite: 81]
exports.checkIn = catchAsync(async (req, res, next) => {
  const employeeId = req.user ? req.user._id : req.body.employeeId;
  const { scheduleId, workDate } = req.body;

  const todayStr = new Date().toISOString().split("T")[0];
  const targetDate = workDate || todayStr;

  if (targetDate !== todayStr) {
    return next(
      new AppError("Chỉ cho phép điểm danh đúng ngày làm việc hiện tại!", 400),
    );
  }

  const existingRecord = await Attendance.findOne({
    employeeId,
    workDate: targetDate,
  });
  if (existingRecord && existingRecord.checkInAt) {
    return next(new AppError("Bạn đã Check-in ca làm việc này rồi!", 409));
  }

  const attendance = await Attendance.create({
    employeeId,
    scheduleId: scheduleId || null,
    workDate: targetDate,
    checkInAt: new Date(),
    status: "present",
  });

  res.status(201).json({
    success: true,
    message: "Check-in thành công!",
    data: attendance,
  });
});

// 2. POST /api/attendances/:id/check-out (Quy tắc 2, 3, 4: Chặn lặp, tính phút, quy đổi công)[cite: 81]
exports.checkOut = catchAsync(async (req, res, next) => {
  const attendance = await Attendance.findById(req.params.id);

  if (!attendance) {
    return next(new AppError("Không tìm thấy bản ghi chấm công!", 404));
  }

  if (!attendance.checkInAt) {
    return next(new AppError("Chưa Check-in, không thể Check-out!", 400));
  }

  if (attendance.checkOutAt) {
    return next(new AppError("Bản ghi đã Check-out trước đó rồi!", 409));
  }

  const checkOutTime = new Date();
  attendance.checkOutAt = checkOutTime;

  // minutesWorked = (checkOut - checkIn) - breakMinutes
  const totalMs = checkOutTime - new Date(attendance.checkInAt);
  const totalMinutes = Math.round(totalMs / 60000);
  const breakMin = attendance.breakMinutes || 60;
  const actualMinutes = Math.max(0, totalMinutes - breakMin);
  attendance.minutesWorked = actualMinutes;

  // Quy đổi công chuẩn: >= 75% -> 1 công, >= 50% -> 0.5 công, < 50% -> 0 công
  const standardShiftMinutes = 480;
  const ratio = actualMinutes / standardShiftMinutes;

  if (ratio >= 0.75) {
    attendance.workCredit = 1;
  } else if (ratio >= 0.5) {
    attendance.workCredit = 0.5;
  } else {
    attendance.workCredit = 0;
  }

  await attendance.save();

  res.status(200).json({
    success: true,
    message: "Check-out thành công và đã tự động quy đổi công chuẩn!",
    data: attendance,
  });
});

// 3. GET /api/attendances
exports.getAttendances = catchAsync(async (req, res, next) => {
  const employeeId = req.user ? req.user._id : req.query.employeeId;
  const { month } = req.query;
  const filter = {};

  if (employeeId) filter.employeeId = employeeId;
  if (month) filter.workDate = { $regex: `^${month}` };

  const records = await Attendance.find(filter)
    .populate("employeeId", "fullName employeeCode")
    .sort({ workDate: -1 });

  res.status(200).json({
    success: true,
    count: records.length,
    data: records,
  });
});

// 4. POST /api/attendance-adjustments (Quy tắc 5: Tạo đơn trạng thái pending)[cite: 81]
exports.createAdjustment = catchAsync(async (req, res, next) => {
  const employeeId = req.user ? req.user._id : req.body.employeeId;
  const { attendanceId, requestReason, proposedIn, proposedOut } = req.body;

  if (!attendanceId || !requestReason || !proposedIn || !proposedOut) {
    return next(new AppError("Vui lòng điền đầy đủ thông tin khiếu nại!", 400));
  }

  const pendingExists = await AttendanceAdjustment.findOne({
    attendanceId,
    status: "pending",
  });

  if (pendingExists) {
    return next(new AppError("Bản ghi công này đang có đơn chờ duyệt!", 409));
  }

  const adjustment = await AttendanceAdjustment.create({
    attendanceId,
    employeeId,
    requestReason,
    proposedIn,
    proposedOut,
    status: "pending",
  });

  res.status(201).json({
    success: true,
    message: "Đã gửi đề nghị sửa công thành công (pending)!",
    data: adjustment,
  });
});

// GET /api/attendance-adjustments
exports.getAdjustments = catchAsync(async (req, res, next) => {
  const adjustments = await AttendanceAdjustment.find()
    .populate("employeeId", "fullName employeeCode email")
    .populate("attendanceId")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: adjustments.length,
    data: adjustments,
  });
});

// 5. POST /api/attendance-adjustments/:id/approve (Quy tắc 5: Duyệt và cập nhật lại công)[cite: 81]
exports.approveAdjustment = catchAsync(async (req, res, next) => {
  const adjustment = await AttendanceAdjustment.findById(req.params.id);

  if (!adjustment) {
    return next(new AppError("Không tìm thấy đơn khiếu nại!", 404));
  }

  if (adjustment.status !== "pending") {
    return next(new AppError("Đơn này đã được xử lý trước đó!", 400));
  }

  adjustment.status = "approved";
  adjustment.reviewedBy = req.user ? req.user._id : req.body.managerId || null;
  adjustment.reviewNote = req.body.reviewNote || "Duyệt điều chỉnh giờ công";
  await adjustment.save();

  // Tự động cập nhật công chính thức vào collection attendances
  const attendance = await Attendance.findById(adjustment.attendanceId);
  if (attendance) {
    attendance.checkInAt = adjustment.proposedIn;
    attendance.checkOutAt = adjustment.proposedOut;

    const workedMs =
      new Date(adjustment.proposedOut) - new Date(adjustment.proposedIn);
    const workedMinutes = Math.round(workedMs / 60000);
    const breakMin = attendance.breakMinutes || 60;
    const actualMinutes = Math.max(0, workedMinutes - breakMin);
    attendance.minutesWorked = actualMinutes;

    const ratio = actualMinutes / 480;
    if (ratio >= 0.75) attendance.workCredit = 1;
    else if (ratio >= 0.5) attendance.workCredit = 0.5;
    else attendance.workCredit = 0;

    await attendance.save();
  }

  res.status(200).json({
    success: true,
    message: "Đã duyệt đơn và tự động cập nhật lại công chính thức!",
    data: adjustment,
  });
});
