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

// Giới hạn khoảng tính trong phạm vi ngày workDate (+07:00)
const clampToWorkDate = (inTime, outTime, workDate) => {
  const dayStart = new Date(`${workDate}T00:00:00.000+07:00`).getTime();
  const dayEnd = new Date(`${workDate}T23:59:59.999+07:00`).getTime();

  const rawStart = new Date(inTime).getTime();
  const rawEnd = new Date(outTime).getTime();

  const clampedStart = Math.max(rawStart, dayStart);
  const clampedEnd = Math.min(rawEnd, dayEnd);

  if (clampedEnd <= clampedStart) {
    return { startMs: clampedStart, endMs: clampedStart, minutes: 0 };
  }

  return {
    startMs: clampedStart,
    endMs: clampedEnd,
    minutes: Math.round((clampedEnd - clampedStart) / 60000),
  };
};

const calculateAttendanceMetrics = (
  inTime,
  outTime,
  workDate,
  shiftStartStr,
  shiftEndStr,
  existingWorkCreditToday = 0,
  isFirstSession = true,
) => {
  const round2 = (n) => Math.round(n * 100) / 100;
  const {
    startMs,
    endMs,
    minutes: totalMinutes,
  } = clampToWorkDate(inTime, outTime, workDate);

  const hasPublishedSchedule = Boolean(shiftStartStr && shiftEndStr);
  let standardMinutes = 0;
  let overtimeMinutes = totalMinutes;
  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let shiftTotalMins = 0;

  if (hasPublishedSchedule) {
    const shiftStart = buildShiftDateTime(workDate, shiftStartStr);
    const shiftEnd = buildShiftDateTime(workDate, shiftEndStr);

    if (shiftEnd <= shiftStart) {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    const shiftStartMs = shiftStart.getTime();
    const shiftEndMs = shiftEnd.getTime();
    shiftTotalMins = Math.round((shiftEndMs - shiftStartMs) / 60000);

    // Thời gian làm trong khung giờ ca -> Thời gian chuẩn
    const overlapStart = Math.max(startMs, shiftStartMs);
    const overlapEnd = Math.min(endMs, shiftEndMs);
    if (overlapEnd > overlapStart) {
      standardMinutes = Math.round((overlapEnd - overlapStart) / 60000);
    }

    // Thời gian làm ngoài khung giờ ca -> Tăng ca
    overtimeMinutes = Math.max(0, totalMinutes - standardMinutes);

    // Chỉ tính Đi muộn & Về sớm cho lượt check-in đầu tiên trong ngày
    if (isFirstSession) {
      if (startMs > shiftStartMs) {
        lateMinutes = Math.round((startMs - shiftStartMs) / 60000);
      }
      if (endMs < shiftEndMs) {
        earlyLeaveMinutes = Math.round((shiftEndMs - endMs) / 60000);
      }
    }
  }

  // Vẫn quy đổi workCredit & overtimeCredit ngầm để Bảng lương hoạt động bình thường
  let workCredit = 0;
  if (shiftTotalMins > 0 && standardMinutes > 0) {
    const rawCredit =
      standardMinutes >= shiftTotalMins
        ? 1
        : round2(standardMinutes / shiftTotalMins);
    const remaining = Math.max(0, round2(1 - existingWorkCreditToday));
    workCredit = round2(Math.min(rawCredit, remaining));
  }
  const overtimeCredit = Math.floor(overtimeMinutes / 60);

  return {
    totalMinutes,
    standardMinutes,
    overtimeMinutes,
    lateMinutes,
    earlyLeaveMinutes,
    hasPublishedSchedule,
    workCredit,
    overtimeCredit,
  };
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
  let hasPublishedSchedule = false;
  if (!resolvedScheduleId) {
    const publishedSchedule = await Schedule.findOne({
      employeeId,
      workDate: targetDate,
      status: "published",
    });
    if (publishedSchedule) {
      resolvedScheduleId = publishedSchedule.shiftId || null;
      hasPublishedSchedule = true;
    }
  }

  const attendance = await Attendance.create({
    employeeId,
    scheduleId: resolvedScheduleId,
    workDate: targetDate,
    checkInAt: new Date(),
    hasPublishedSchedule,
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

  // Kiểm tra xem đây có phải lượt check-in đầu tiên trong ngày hay không
  const earlierCount = await Attendance.countDocuments({
    employeeId: attendance.employeeId,
    workDate: attendance.workDate,
    _id: { $ne: attendance._id },
    checkInAt: { $lt: attendance.checkInAt },
  });
  const isFirstSession = earlierCount === 0;

  const metrics = calculateAttendanceMetrics(
    attendance.checkInAt,
    checkOutTime,
    attendance.workDate,
    shiftStart,
    shiftEnd,
    existingWorkCreditToday,
    isFirstSession,
  );

  attendance.minutesWorked = metrics.totalMinutes;
  attendance.standardMinutes = metrics.standardMinutes;
  attendance.overtimeMinutes = metrics.overtimeMinutes;
  attendance.lateMinutes = metrics.lateMinutes;
  attendance.earlyLeaveMinutes = metrics.earlyLeaveMinutes;
  attendance.hasPublishedSchedule = metrics.hasPublishedSchedule;
  attendance.workCredit = metrics.workCredit;
  attendance.overtimeCredit = metrics.overtimeCredit;

  if (metrics.totalMinutes === 0) {
    attendance.status = "absent";
  } else if (metrics.hasPublishedSchedule && metrics.lateMinutes > 0) {
    attendance.status = "late";
  } else {
    attendance.status = "present";
  }

  await attendance.save();

  refreshPayroll(attendance.employeeId, attendance.workDate);

  res.status(200).json({
    success: true,
    message: "Tan ca thành công và đã tính thời gian tự động!",
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
    .sort({ workDate: -1, createdAt: -1 })
    .lean();

  // Tự động tính lại các trường mới cho những bản ghi cũ chưa có dữ liệu
  const needRecalc = records.filter(
    (r) => r.standardMinutes === undefined && r.checkInAt && r.checkOutAt,
  );

  if (needRecalc.length > 0) {
    const empIds = [
      ...new Set(
        needRecalc
          .map((r) => String(r.employeeId?._id || r.employeeId))
          .filter(Boolean),
      ),
    ];
    const dates = [...new Set(needRecalc.map((r) => r.workDate))];

    const schedules = await Schedule.find({
      employeeId: { $in: empIds },
      workDate: { $in: dates },
      status: "published",
    })
      .populate("shiftId")
      .lean();

    const scheduleMap = new Map();
    for (const s of schedules) {
      if (s.shiftId) {
        scheduleMap.set(`${s.employeeId}_${s.workDate}`, s.shiftId);
      }
    }

    // Tìm lượt check-in sớm nhất của mỗi nhân viên trong từng ngày
    const earliestCheckInMap = new Map();
    for (const r of records) {
      if (!r.checkInAt) continue;
      const empId = String(r.employeeId?._id || r.employeeId);
      const key = `${empId}_${r.workDate}`;
      const time = new Date(r.checkInAt).getTime();
      if (!earliestCheckInMap.has(key) || time < earliestCheckInMap.get(key)) {
        earliestCheckInMap.set(key, time);
      }
    }

    for (const r of needRecalc) {
      const empId = String(r.employeeId?._id || r.employeeId);
      const key = `${empId}_${r.workDate}`;
      const shift = scheduleMap.get(key);
      const isFirstSession =
        new Date(r.checkInAt).getTime() === earliestCheckInMap.get(key);

      const metrics = calculateAttendanceMetrics(
        r.checkInAt,
        r.checkOutAt,
        r.workDate,
        shift?.startTime || null,
        shift?.endTime || null,
        0,
        isFirstSession,
      );

      r.standardMinutes = metrics.standardMinutes;
      r.overtimeMinutes = metrics.overtimeMinutes;
      r.lateMinutes = metrics.lateMinutes;
      r.earlyLeaveMinutes = metrics.earlyLeaveMinutes;
      r.hasPublishedSchedule = metrics.hasPublishedSchedule;
    }
  }

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
