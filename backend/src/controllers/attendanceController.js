const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const AttendanceAdjustment = require("../models/AttendanceAdjustment");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// Bảng cấu hình định mức các ca theo danh mục TV2
const SHIFT_SPECS = {
  hanh_chinh: {
    name: "Ca hành chính",
    standardNetMinutes: 480,
    breakMinutes: 60,
  },
  sang: { name: "Ca sáng", standardNetMinutes: 255, breakMinutes: 15 },
  chieu: { name: "Ca chiều", standardNetMinutes: 255, breakMinutes: 15 },
  dem: { name: "Ca đêm", standardNetMinutes: 435, breakMinutes: 45 },
};

const detectShiftSpec = (checkInDate) => {
  const hour = new Date(checkInDate).getHours();
  if (hour >= 20 || hour < 5) return SHIFT_SPECS.dem;
  if (hour >= 6 && hour < 10) return SHIFT_SPECS.hanh_chinh;
  if (hour >= 12 && hour < 16) return SHIFT_SPECS.chieu;
  return SHIFT_SPECS.hanh_chinh;
};

// 1. Vào ca (Check-in)
exports.checkIn = catchAsync(async (req, res, next) => {
  const employeeId = req.user ? req.user._id : req.body.employeeId;
  const { scheduleId, workDate } = req.body;

  const todayStr = new Date().toISOString().split("T")[0];
  const targetDate = workDate || todayStr;

  // Kiểm tra ca chưa checkout
  const activeShift = await Attendance.findOne({
    employeeId,
    checkInAt: { $ne: null },
    checkOutAt: null,
  }).sort({ checkInAt: -1 });

  if (activeShift) {
    const shiftTimeStr = new Date(activeShift.checkInAt).toLocaleTimeString(
      "vi-VN",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );
    return next(
      new AppError(
        `Bạn vẫn còn ca làm việc (bắt đầu lúc ${shiftTimeStr} ngày ${activeShift.workDate}) chưa bấm Tan ca! Vui lòng bấm Tan ca trước khi vào ca mới.`,
        400,
      ),
    );
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

// 2. Tan ca (Check-out)
exports.checkOut = catchAsync(async (req, res, next) => {
  const attendance = await Attendance.findById(req.params.id);

  if (!attendance) {
    return next(new AppError("Không tìm thấy bản ghi chấm công!", 404));
  }
  if (!attendance.checkInAt) {
    return next(new AppError("Chưa Check-in, không thể Check-out!", 400));
  }
  if (attendance.checkOutAt) {
    return next(new AppError("Bản ghi này đã Check-out trước đó rồi!", 409));
  }

  const checkOutTime = new Date();
  attendance.checkOutAt = checkOutTime;

  const totalMs = checkOutTime - new Date(attendance.checkInAt);
  const totalMinutes = Math.max(0, Math.round(totalMs / 60000));

  const shift = detectShiftSpec(attendance.checkInAt);
  const breakMin =
    attendance.breakMinutes !== undefined
      ? attendance.breakMinutes
      : shift.breakMinutes;
  const standardShiftMinutes = shift.standardNetMinutes;

  if (totalMinutes < standardShiftMinutes) {
    attendance.minutesWorked = totalMinutes;
    attendance.workCredit = 0;
  } else {
    const netWorkedMinutes = Math.max(0, totalMinutes - breakMin);
    attendance.minutesWorked = netWorkedMinutes;
    attendance.workCredit = Number(
      (netWorkedMinutes / standardShiftMinutes).toFixed(1),
    );
  }

  await attendance.save();

  res.status(200).json({
    success: true,
    message: "Check-out thành công và đã quy đổi công tự động!",
    data: attendance,
  });
});

// 3. Lấy danh sách chấm công
exports.getAttendances = catchAsync(async (req, res, next) => {
  const { month, employeeId } = req.query;
  const currentUserId = req.user ? req.user._id : null;
  const userRole = req.user ? req.user.role : "employee";
  const userPosition = (req.user?.position || "").toLowerCase();

  const isBossAdmin =
    userRole === "admin_hr" ||
    userPosition.includes("giám đốc") ||
    (req.user?.email || "").includes("nam.duong");
  const isDepartmentLead =
    userPosition.includes("trưởng phòng") || userPosition.includes("leader");

  const filter = {};

  if (isBossAdmin) {
    // Admin HR/Giám đốc: Thấy toàn bộ danh sách
    if (employeeId) filter.employeeId = employeeId;
  } else if (isDepartmentLead) {
    // Trưởng phòng: Xem cấp dưới, không xem của Admin HR
    const adminEmployees = await Employee.find({
      $or: [{ role: "admin_hr" }, { email: "nam.duong1@gmail.com" }],
    }).select("_id");
    const adminIds = adminEmployees.map((a) => a._id);

    filter.employeeId = { $nin: adminIds };
    if (employeeId && !adminIds.some((id) => id.equals(employeeId))) {
      filter.employeeId = employeeId;
    }
  } else {
    // Nhân viên thông thường: Chỉ thấy của chính mình
    if (currentUserId) {
      filter.employeeId = currentUserId;
    }
  }

  if (month) {
    filter.workDate = { $regex: `^${month}` };
  }

  const records = await Attendance.find(filter)
    .populate("employeeId", "fullName employeeCode position email")
    .sort({ workDate: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: records.length,
    data: records,
  });
});

// 4. Tạo khiếu nại sửa công
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

// 5. Lấy danh sách duyệt sửa công
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

// 6. Duyệt khiếu nại
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

    attendance.workCredit = Number((actualMinutes / 480).toFixed(1));
    await attendance.save();
  }

  res.status(200).json({
    success: true,
    message: "Đã duyệt đơn và tự động cập nhật lại công chính thức!",
    data: adjustment,
  });
});
