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

// Hàm tự động nhận diện ca dựa trên giờ Check-in
const detectShiftSpec = (checkInDate) => {
  const hour = new Date(checkInDate).getHours();
  if (hour >= 20 || hour < 5) return SHIFT_SPECS.dem;
  if (hour >= 6 && hour < 10) return SHIFT_SPECS.hanh_chinh;
  if (hour >= 12 && hour < 16) return SHIFT_SPECS.chieu;
  return SHIFT_SPECS.hanh_chinh;
};

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

  // 1. Tính tổng thời gian thực tế có mặt (phút)
  const totalMs = checkOutTime - new Date(attendance.checkInAt);
  const totalMinutes = Math.max(0, Math.round(totalMs / 60000));

  // 2. Xác định ca làm việc tương ứng
  const shift = detectShiftSpec(attendance.checkInAt);
  const breakMin =
    attendance.breakMinutes !== undefined
      ? attendance.breakMinutes
      : shift.breakMinutes;
  const standardShiftMinutes = shift.standardNetMinutes;

  // 3. Tính công: Chưa đủ thời gian tối thiểu của ca thì công = 0
  if (totalMinutes < standardShiftMinutes) {
    attendance.minutesWorked = totalMinutes;
    attendance.workCredit = 0;
  } else {
    // Đã làm đủ hoặc làm quá giờ (OT): trừ thời gian nghỉ và chia cho định mức ca quy định
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

exports.getAttendances = catchAsync(async (req, res, next) => {
  const { month, employeeId } = req.query;
  const currentUserId = req.user ? req.user._id : null;
  const userRole = req.user ? req.user.role : "employee";
  const userPosition = (req.user?.position || "").toLowerCase();

  const isBossAdmin =
    userRole === "admin_hr" || (req.user?.email || "").includes("nam.duong");
  const isDepartmentLead =
    userPosition.includes("trưởng phòng") || userPosition.includes("leader");

  const filter = {};

  if (isBossAdmin) {
    // Admin HR: Thấy toàn bộ, có thể lọc theo employeeId
    if (employeeId) filter.employeeId = employeeId;
  } else if (isDepartmentLead) {
    // Trưởng phòng: Thấy tất cả ngoại trừ Admin HR
    const adminEmployees = await Employee.find({
      $or: [{ role: "admin_hr" }, { email: "nam.duong1@gmail.com" }],
    }).select("_id");
    const adminIds = adminEmployees.map((a) => a._id);

    filter.employeeId = { $nin: adminIds };
    if (employeeId && !adminIds.some((id) => id.equals(employeeId))) {
      filter.employeeId = employeeId;
    }
  } else {
    // Nhân viên thông thường: Chỉ thấy bản ghi của chính mình
    filter.employeeId = currentUserId;
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
