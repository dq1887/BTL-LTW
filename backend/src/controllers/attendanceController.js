const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const AttendanceAdjustment = require("../models/AttendanceAdjustment");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.checkIn = catchAsync(async (req, res, next) => {
  const employeeId = req.user ? req.user._id : req.body.employeeId;
  const { scheduleId, workDate } = req.body;

  const todayStr = new Date().toISOString().split("T")[0];
  const targetDate = workDate || todayStr;

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
  const totalMs =
    checkOutTime.getTime() - new Date(attendance.checkInAt).getTime();
  const minutesWorked = Math.max(0, Math.floor(totalMs / (1000 * 60)));
  const workCredit = Math.round((minutesWorked / 480) * 10) / 10;

  attendance.minutesWorked = minutesWorked;
  attendance.workCredit = workCredit;
  attendance.status = minutesWorked > 0 ? "present" : "absent";

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
    userRole === "admin_hr" ||
    userPosition.includes("giám đốc") ||
    (req.user?.email || "").includes("nam.duong");
  const isDepartmentLead =
    userPosition.includes("trưởng phòng") || userPosition.includes("leader");

  const filter = {};

  if (isBossAdmin) {
    if (employeeId) filter.employeeId = employeeId;
  } else if (isDepartmentLead) {
    const adminEmployees = await Employee.find({
      $or: [{ role: "admin_hr" }, { email: "nam.duong1@gmail.com" }],
    }).select("_id");
    const adminIds = adminEmployees.map((a) => a._id);

    filter.employeeId = { $nin: adminIds };
    if (employeeId && !adminIds.some((id) => id.equals(employeeId))) {
      filter.employeeId = employeeId;
    }
  } else {
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
      new Date(adjustment.proposedOut).getTime() -
      new Date(adjustment.proposedIn).getTime();
    const minutesWorked = Math.max(0, Math.floor(workedMs / (1000 * 60)));
    const workCredit = Math.round((minutesWorked / 480) * 10) / 10;

    attendance.minutesWorked = minutesWorked;
    attendance.workCredit = workCredit;
    await attendance.save();
  }

  res.status(200).json({
    success: true,
    message: "Đã duyệt đơn và tự động cập nhật lại công chính thức!",
    data: adjustment,
  });
});
