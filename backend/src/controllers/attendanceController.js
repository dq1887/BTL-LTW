const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Schedule = require("../models/Schedule");
const AttendanceAdjustment = require("../models/AttendanceAdjustment");
const Department = require("../models/Department");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { recalcPayroll } = require("../utils/payrollHelper");

const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const calculateCredits = (inTime, outTime, shiftStartStr, shiftEndStr) => {
  const round2 = (n) => Math.round(n * 100) / 100;

  const totalMinutes = Math.max(
    0,
    (new Date(outTime) - new Date(inTime)) / 60000,
  );

  if (!shiftStartStr || !shiftEndStr) {
    return {
      workCredit: round2(totalMinutes / 480),
      overtimeCredit: 0,
      totalMinutes: Math.round(totalMinutes),
    };
  }

  const shiftStartMins = parseTime(shiftStartStr);
  const shiftEndMins = parseTime(shiftEndStr);
  const shiftTotalMins = shiftEndMins - shiftStartMins;

  const actualStartMins =
    new Date(inTime).getHours() * 60 + new Date(inTime).getMinutes();
  const actualEndMins =
    new Date(outTime).getHours() * 60 + new Date(outTime).getMinutes();

  const overlapStart = Math.max(actualStartMins, shiftStartMins);
  const overlapEnd = Math.min(actualEndMins, shiftEndMins);
  const inShiftMinutes = Math.max(0, overlapEnd - overlapStart);

  let overtimeMinutes = Math.max(0, totalMinutes - inShiftMinutes);

  const effectiveWorkMins = inShiftMinutes > 0 ? inShiftMinutes : totalMinutes;
  const workCredit = round2(effectiveWorkMins / 480);
  const overtimeCredit = round2(overtimeMinutes / 60);

  return { workCredit, overtimeCredit, totalMinutes: Math.round(totalMinutes) };
};

const refreshPayroll = (employeeId, workDate) => {
  const month = String(workDate || "").slice(0, 7);
  if (!employeeId || !/^\d{4}-\d{2}$/.test(month)) return;
  recalcPayroll(employeeId, month).catch((err) =>
    console.error("Lỗi cập nhật lương:", err.message),
  );
};

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
      { hour: "2-digit", minute: "2-digit" },
    );
    return next(
      new AppError(
        `Bạn vẫn còn ca làm việc (bắt đầu lúc ${shiftTimeStr} ngày ${activeShift.workDate}) chưa bấm Tan ca! Vui lòng bấm Tan ca trước khi vào ca mới.`,
        400,
      ),
    );
  }

  const todayRecord = await Attendance.findOne({
    employeeId,
    workDate: targetDate,
  });

  if (todayRecord) {
    return next(
      new AppError(
        `Bạn đã chốt công cho ngày hôm nay (${targetDate}) rồi. Mỗi nhân viên chỉ được tạo 1 bản ghi chấm công mỗi ngày!`,
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

  refreshPayroll(employeeId, targetDate);

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

  const schedule = await Schedule.findOne({
    employeeId: attendance.employeeId,
    workDate: attendance.workDate,
    status: "published",
  }).populate("shiftId");

  let shiftStart = null;
  let shiftEnd = null;
  if (schedule && schedule.shiftId) {
    shiftStart = schedule.shiftId.startTime;
    shiftEnd = schedule.shiftId.endTime;
  }

  const { workCredit, overtimeCredit, totalMinutes } = calculateCredits(
    attendance.checkInAt,
    checkOutTime,
    shiftStart,
    shiftEnd,
  );

  attendance.minutesWorked = totalMinutes;
  attendance.workCredit = workCredit;
  attendance.overtimeCredit = overtimeCredit;
  attendance.status = totalMinutes > 0 ? "present" : "absent";

  await attendance.save();

  refreshPayroll(attendance.employeeId, attendance.workDate);

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

  const filter = {};

  if (userRole === "admin_hr" || userRole === "manager") {
    if (employeeId) {
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
    .populate("employeeId", "fullName employeeCode position email role")
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

    const schedule = await Schedule.findOne({
      employeeId: attendance.employeeId,
      workDate: attendance.workDate,
      status: "published",
    }).populate("shiftId");

    let shiftStart = null;
    let shiftEnd = null;
    if (schedule && schedule.shiftId) {
      shiftStart = schedule.shiftId.startTime;
      shiftEnd = schedule.shiftId.endTime;
    }

    const { workCredit, overtimeCredit, totalMinutes } = calculateCredits(
      adjustment.proposedIn,
      adjustment.proposedOut,
      shiftStart,
      shiftEnd,
    );

    attendance.minutesWorked = totalMinutes;
    attendance.workCredit = workCredit;
    attendance.overtimeCredit = overtimeCredit;
    attendance.status = totalMinutes > 0 ? "present" : "absent";
    await attendance.save();

    refreshPayroll(attendance.employeeId, attendance.workDate);
  }

  res.status(200).json({
    success: true,
    message: "Đã duyệt đơn và tự động cập nhật lại công chính thức!",
    data: adjustment,
  });
});

exports.getDashboardStats = catchAsync(async (req, res, next) => {
  const todayStr = new Date().toISOString().split("T")[0];

  const totalEmployees = await Employee.countDocuments({ status: "active" });
  const totalInactive = await Employee.countDocuments({ status: "inactive" });
  const totalDepartments = await Department.countDocuments();

  const todayAttendances = await Attendance.find({ workDate: todayStr });
  const presentCount = todayAttendances.filter(
    (a) => a.status === "present",
  ).length;
  const lateCount = todayAttendances.filter((a) => a.status === "late").length;
  const absentCount = todayAttendances.filter(
    (a) => a.status === "absent",
  ).length;

  const totalWorkingToday = presentCount + lateCount;

  const attendanceRate =
    totalEmployees > 0
      ? Math.round((totalWorkingToday / totalEmployees) * 100)
      : 0;

  res.status(200).json({
    success: true,
    data: {
      totalEmployees,
      totalInactive,
      totalDepartments,
      attendanceRate,
      attendanceStats: {
        totalWorkingToday,
        presentCount,
        lateCount,
        absentCount,
      },
    },
  });
});

exports.resetAllAttendancesAPI = catchAsync(async (req, res, next) => {
  await Attendance.deleteMany({});
  await AttendanceAdjustment.deleteMany({});
  res.status(200).json({
    success: true,
    message: "Đã reset và xóa sạch toàn bộ dữ liệu chấm công thành công!",
  });
});
