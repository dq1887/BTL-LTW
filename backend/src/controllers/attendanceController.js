const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Schedule = require("../models/Schedule");
const Department = require("../models/Department");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { recalcPayroll } = require("../utils/payrollHelper");

const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

const getTodayVN = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: VN_TIMEZONE });

const buildShiftDateTime = (workDate, timeStr) => {
  const [hours, minutes] = String(timeStr || "08:00")
    .split(":")
    .map((n) => String(Number(n)).padStart(2, "0"));
  return new Date(`${workDate}T${hours}:${minutes}:00.000+07:00`);
};

// Tính tổng thời gian thực tế giữa inTime và outTime
// Cho phép tính trọn vẹn số phút làm việc kể cả khi ca kéo dài xuyên đêm sang hôm sau
const calculateWorkSpan = (inTime, outTime) => {
  const rawStart = new Date(inTime).getTime();
  const rawEnd = new Date(outTime).getTime();

  if (rawEnd <= rawStart) {
    return { startMs: rawStart, endMs: rawStart, minutes: 0 };
  }

  return {
    startMs: rawStart,
    endMs: rawEnd,
    minutes: Math.round((rawEnd - rawStart) / 60000),
  };
};

const calculateCredits = (
  inTime,
  outTime,
  workDate,
  shiftStartStr,
  shiftEndStr,
  existingWorkCreditToday = 0,
) => {
  const round2 = (n) => Math.round(n * 100) / 100;
  const {
    startMs,
    endMs,
    minutes: totalMinutes,
  } = calculateWorkSpan(inTime, outTime);

  let inShiftMinutes = 0;
  let shiftTotalMins = 0;

  if (shiftStartStr && shiftEndStr && totalMinutes > 0) {
    const shiftStart = buildShiftDateTime(workDate, shiftStartStr);
    const shiftEnd = buildShiftDateTime(workDate, shiftEndStr);

    if (shiftEnd <= shiftStart) {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    shiftTotalMins = Math.round(
      (shiftEnd.getTime() - shiftStart.getTime()) / 60000,
    );

    const overlapStart = Math.max(startMs, shiftStart.getTime());
    const overlapEnd = Math.min(endMs, shiftEnd.getTime());
    if (overlapEnd > overlapStart) {
      inShiftMinutes = Math.round((overlapEnd - overlapStart) / 60000);
    }
  }

  // Toàn bộ thời gian làm việc ngoài ca (hoặc ngoài ca chuẩn) được tính vào làm thêm / công phụ
  const outShiftMinutes = Math.max(0, totalMinutes - inShiftMinutes);

  let workCredit = 0;
  if (shiftTotalMins > 0 && inShiftMinutes > 0) {
    const rawCredit =
      inShiftMinutes >= shiftTotalMins
        ? 1
        : round2(inShiftMinutes / shiftTotalMins);
    const remaining = Math.max(0, round2(1 - existingWorkCreditToday));
    workCredit = round2(Math.min(rawCredit, remaining));
  } else if (!shiftStartStr && totalMinutes > 0) {
    // Trường hợp không có ca quy định cụ thể: 480 phút (8h) = 1 công chuẩn
    workCredit = round2(Math.min(1, totalMinutes / 480));
  }

  // Công phụ / làm thêm: Mỗi 60 phút làm ngoài ca được tính là 1 giờ công thêm
  const overtimeCredit = Math.floor(outShiftMinutes / 60);

  return { workCredit, overtimeCredit, totalMinutes };
};

const refreshPayroll = (employeeId, workDate) => {
  const month = String(workDate || "").slice(0, 7);
  if (!employeeId || !/^\d{4}-\d{2}$/.test(month)) return;
  recalcPayroll(employeeId, month).catch((err) =>
    console.error("Lỗi cập nhật lương:", err.message),
  );
};

exports.checkIn = catchAsync(async (req, res, next) => {
  const employeeId = req.user?._id;
  if (!employeeId) {
    return next(
      new AppError("Vui lòng đăng nhập để thực hiện chấm công!", 401),
    );
  }

  const { scheduleId, workDate } = req.body;
  const targetDate = workDate || getTodayVN();

  const activeShift = await Attendance.findOne({
    employeeId,
    checkInAt: { $ne: null },
    checkOutAt: null,
  }).sort({ checkInAt: -1 });

  if (activeShift) {
    const shiftTimeStr = new Date(activeShift.checkInAt).toLocaleTimeString(
      "vi-VN",
      { hour: "2-digit", minute: "2-digit", timeZone: VN_TIMEZONE },
    );
    return next(
      new AppError(
        `Bạn vẫn còn ca làm việc (bắt đầu lúc ${shiftTimeStr} ngày ${activeShift.workDate}) chưa bấm Tan ca! Vui lòng bấm Tan ca trước khi vào ca mới.`,
        400,
      ),
    );
  }

  const todayCount = await Attendance.countDocuments({
    employeeId,
    workDate: targetDate,
  });

  if (todayCount >= 2) {
    return next(
      new AppError(
        `Bạn đã chấm công đủ tối đa 2 lần trong ngày ${targetDate} rồi!`,
        400,
      ),
    );
  }

  let resolvedScheduleId = scheduleId || null;
  if (!resolvedScheduleId) {
    const publishedSchedule = await Schedule.findOne({
      employeeId,
      workDate: targetDate,
      status: "published",
    });
    if (publishedSchedule) {
      resolvedScheduleId = publishedSchedule.shiftId || null;
    }
  }

  const attendance = await Attendance.create({
    employeeId,
    scheduleId: resolvedScheduleId,
    workDate: targetDate,
    checkInAt: new Date(),
    status: "present",
  });

  refreshPayroll(employeeId, targetDate);

  res.status(201).json({
    success: true,
    message: `Vào ca lần ${todayCount + 1} thành công!`,
    data: attendance,
  });
});

exports.checkOut = catchAsync(async (req, res, next) => {
  const currentUserId = req.user?._id;
  if (!currentUserId) {
    return next(new AppError("Vui lòng đăng nhập để thực hiện Tan ca!", 401));
  }

  const attendance = req.params.id
    ? await Attendance.findById(req.params.id)
    : await Attendance.findOne({
        employeeId: currentUserId,
        checkInAt: { $ne: null },
        checkOutAt: null,
      }).sort({ checkInAt: -1 });

  if (!attendance) {
    return next(new AppError("Bạn chưa có ca nào đang mở để Tan ca!", 404));
  }

  if (String(attendance.employeeId) !== String(currentUserId)) {
    return next(
      new AppError(
        "Bạn không thể Tan ca cho bản ghi chấm công của người khác!",
        403,
      ),
    );
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

  const previousToday = await Attendance.find({
    employeeId: attendance.employeeId,
    workDate: attendance.workDate,
    _id: { $ne: attendance._id },
    checkOutAt: { $ne: null },
  });
  const existingWorkCreditToday = previousToday.reduce(
    (sum, item) => sum + (item.workCredit || 0),
    0,
  );

  const { workCredit, overtimeCredit, totalMinutes } = calculateCredits(
    attendance.checkInAt,
    checkOutTime,
    attendance.workDate,
    shiftStart,
    shiftEnd,
    existingWorkCreditToday,
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

exports.getDashboardStats = catchAsync(async (req, res, next) => {
  const todayStr = getTodayVN();

  const totalEmployees = await Employee.countDocuments({ status: "active" });
  const totalInactive = await Employee.countDocuments({ status: "inactive" });
  const totalDepartments = await Department.countDocuments();

  const todayAttendances = await Attendance.find({ workDate: todayStr });

  const presentIds = new Set();
  const lateIds = new Set();
  const absentIds = new Set();

  for (const a of todayAttendances) {
    const id = String(a.employeeId);
    if (a.status === "present") presentIds.add(id);
    else if (a.status === "late") lateIds.add(id);
    else if (a.status === "absent") absentIds.add(id);
  }

  const presentCount = presentIds.size;
  const lateCount = lateIds.size;
  const absentCount = absentIds.size;
  const workingIds = new Set([...presentIds, ...lateIds]);
  const totalWorkingToday = workingIds.size;

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
  res.status(200).json({
    success: true,
    message: "Đã reset và xóa sạch toàn bộ dữ liệu chấm công thành công!",
  });
});
