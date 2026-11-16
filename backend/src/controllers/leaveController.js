const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const WorkSchedule = require("../models/WorkSchedule");
require("../models/Shift"); // Đăng ký model để populate các ca làm trong lịch.
const LeaveType = require("../models/LeaveType");
const LeaveRequest = require("../models/LeaveRequest");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const DEFAULT_LEAVE_TYPES = [
  {
    code: "annual",
    name: "Nghỉ phép năm",
    description: "Nghỉ phép theo chế độ năm",
    isPaid: true,
  },
  {
    code: "sick",
    name: "Nghỉ ốm",
    description: "Nghỉ do tình trạng sức khỏe",
    isPaid: true,
  },
  {
    code: "unpaid",
    name: "Nghỉ không lương",
    description: "Nghỉ việc riêng không hưởng lương",
    isPaid: false,
  },
  {
    code: "personal",
    name: "Nghỉ việc riêng",
    description: "Nghỉ để giải quyết công việc cá nhân",
    isPaid: false,
  },
];

const isValidDateOnly = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const validateDateRange = (startDate, endDate) => {
  if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate)) {
    throw new AppError("Ngày nghỉ không hợp lệ. Hãy dùng định dạng YYYY-MM-DD.", 400);
  }
  if (startDate > endDate) {
    throw new AppError("Ngày bắt đầu không được sau ngày kết thúc.", 400);
  }
  const rangeMs =
    new Date(`${endDate}T00:00:00.000Z`).getTime() -
    new Date(`${startDate}T00:00:00.000Z`).getTime();
  if (rangeMs > 1000 * 60 * 60 * 24 * 366) {
    throw new AppError("Khoảng nghỉ không được vượt quá 366 ngày.", 400);
  }
};

const ensureDefaultTypes = async () => {
  try {
    await Promise.all(
      DEFAULT_LEAVE_TYPES.map((item) =>
        LeaveType.updateOne(
          { code: item.code },
          { $setOnInsert: item },
          { upsert: true },
        ),
      ),
    );
  } catch (error) {
    // Hai người dùng có thể mở trang cùng lúc ở lần khởi tạo đầu tiên.
    // Nếu trùng unique code do race condition, dữ liệu mặc định vẫn đã được tạo.
    if (error.code !== 11000) throw error;
  }
};

/**
 * Trong source nhóm hiện tại, Attendance.scheduleId tham chiếu đến Shift.
 * Bản ghi có scheduleId hợp lệ được xem là một ngày đã được phân ca.
 * Attendance chỉ có check-in/check-out nhưng không có scheduleId sẽ không
 * được tính là lịch làm việc, tránh lấy nhầm dữ liệu chấm công làm lịch.
 */
const getScheduledDays = async (employeeId, startDate, endDate) => {
  const dateFilter = { $gte: startDate, $lte: endDate };
  const [publishedSchedules, legacyAttendanceSchedules] = await Promise.all([
    WorkSchedule.find({
      employeeId,
      workDate: dateFilter,
      status: "published",
    })
      .select("workDate shiftId")
      .populate({ path: "shiftId", select: "name startTime endTime" })
      .lean(),
    Attendance.find({
      employeeId,
      workDate: dateFilter,
      scheduleId: { $exists: true, $ne: null },
    })
      .select("workDate scheduleId")
      .populate({ path: "scheduleId", select: "name startTime endTime" })
      .lean(),
  ]);

  const uniqueDays = new Map();
  const addScheduleDay = (workDate, shift) => {
    // Không nhận ngày sai định dạng hoặc lịch mồ côi không còn ca trong shifts.
    if (!shift || !isValidDateOnly(workDate)) return;
    uniqueDays.set(workDate, {
      date: workDate,
      shift: {
        id: String(shift._id),
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
      },
    });
  };

  // Nguồn chính: lịch đã được TV2 công bố trong collection workschedules.
  publishedSchedules.forEach((record) => addScheduleDay(record.workDate, record.shiftId));
  // Tương thích dữ liệu nhóm cũ: Attendance có scheduleId hợp lệ.
  // Ghi publishedSchedules trước để lịch được công bố luôn được ưu tiên.
  legacyAttendanceSchedules.forEach((record) => {
    if (!uniqueDays.has(record.workDate)) {
      addScheduleDay(record.workDate, record.scheduleId);
    }
  });

  return [...uniqueDays.values()].sort((a, b) => a.date.localeCompare(b.date));
};

const ensureNoConflictingLeave = async ({
  employeeId,
  scheduledDates,
  excludeRequestId,
}) => {
  const filter = {
    employeeId,
    status: { $in: ["pending", "approved"] },
    scheduledDates: { $in: scheduledDates },
  };
  if (excludeRequestId) filter._id = { $ne: excludeRequestId };

  const conflict = await LeaveRequest.findOne(filter)
    .select("startDate endDate status")
    .lean();

  if (conflict) {
    throw new AppError(
      `Khoảng nghỉ trùng với một đơn ${conflict.status === "approved" ? "đã được duyệt" : "đang chờ duyệt"} trước đó. Vui lòng kiểm tra lại lịch nghỉ.`,
      409,
    );
  }
};

const validateRequestData = async ({
  employeeId,
  leaveTypeId,
  startDate,
  endDate,
  reason,
  excludeRequestId,
}) => {
  validateDateRange(startDate, endDate);

  if (!mongoose.isValidObjectId(leaveTypeId)) {
    throw new AppError("Vui lòng chọn loại nghỉ phép hợp lệ.", 400);
  }

  const normalizedReason = typeof reason === "string" ? reason.trim() : "";
  if (!normalizedReason) {
    throw new AppError("Vui lòng nhập lý do nghỉ phép.", 400);
  }
  if (normalizedReason.length > 1000) {
    throw new AppError("Lý do nghỉ phép không được vượt quá 1.000 ký tự.", 400);
  }

  const leaveType = await LeaveType.findOne({ _id: leaveTypeId, isActive: true });
  if (!leaveType) {
    throw new AppError("Loại nghỉ phép không tồn tại hoặc đã ngừng sử dụng.", 400);
  }

  const scheduledDays = await getScheduledDays(employeeId, startDate, endDate);
  if (scheduledDays.length === 0) {
    throw new AppError(
      "Không có lịch làm việc đã công bố trong khoảng ngày này. Cần có lịch workschedules trạng thái published (employeeId, workDate, shiftId) hoặc bản ghi attendances có scheduleId hợp lệ.",
      400,
    );
  }

  const scheduledDates = scheduledDays.map((item) => item.date);
  await ensureNoConflictingLeave({ employeeId, scheduledDates, excludeRequestId });

  return {
    scheduledDates,
    totalDays: scheduledDates.length,
    reason: normalizedReason,
  };
};

const isReviewRole = (user) => ["admin_hr", "manager"].includes(user?.role);

const assertCanReview = async (user, request) => {
  if (!isReviewRole(user)) {
    throw new AppError("Bạn không có quyền xử lý đơn nghỉ phép.", 403);
  }
  if (String(request.employeeId) === String(user._id)) {
    throw new AppError("Bạn không thể tự duyệt đơn nghỉ phép của chính mình.", 403);
  }
  if (user.role === "manager") {
    const employee = await Employee.findById(request.employeeId).select("departmentId").lean();
    if (
      !employee ||
      !user.departmentId ||
      String(employee.departmentId) !== String(user.departmentId)
    ) {
      throw new AppError("Trưởng phòng chỉ được xử lý đơn của nhân viên thuộc phòng ban mình.", 403);
    }
  }
};

const populateRequest = (query) =>
  query
    .populate("employeeId", "employeeCode fullName position email departmentId")
    .populate("leaveTypeId", "code name description isPaid")
    .populate("reviewedBy", "employeeCode fullName");

exports.getLeaveTypes = catchAsync(async (req, res) => {
  await ensureDefaultTypes();
  const types = await LeaveType.find({ isActive: true }).sort({ name: 1 }).lean();
  res.status(200).json({ success: true, count: types.length, data: types });
});

exports.createLeaveType = catchAsync(async (req, res, next) => {
  const { code, name, description = "", isPaid = false } = req.body || {};
  const normalizedCode = String(code || "").trim().toLowerCase();
  const normalizedName = String(name || "").trim();
  if (!/^[a-z0-9_-]{2,30}$/.test(normalizedCode) || !normalizedName) {
    return next(new AppError("Mã loại nghỉ chỉ gồm chữ thường, số, dấu gạch ngang; tên không được để trống.", 400));
  }
  try {
    const type = await LeaveType.create({
      code: normalizedCode,
      name: normalizedName,
      description,
      isPaid: Boolean(isPaid),
    });
    res.status(201).json({ success: true, message: "Đã tạo loại nghỉ phép.", data: type });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError("Mã loại nghỉ phép này đã tồn tại.", 409));
    }
    throw error;
  }
});

exports.updateLeaveType = catchAsync(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new AppError("Mã loại nghỉ phép không hợp lệ.", 400));
  }
  const { name, description, isPaid, isActive } = req.body || {};
  const updates = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (description !== undefined) updates.description = String(description).trim();
  if (isPaid !== undefined) updates.isPaid = Boolean(isPaid);
  if (isActive !== undefined) updates.isActive = Boolean(isActive);
  if (updates.name === "") return next(new AppError("Tên loại nghỉ không được để trống.", 400));

  const type = await LeaveType.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!type) return next(new AppError("Không tìm thấy loại nghỉ phép.", 404));
  res.status(200).json({ success: true, message: "Đã cập nhật loại nghỉ phép.", data: type });
});

exports.getScheduleDays = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  validateDateRange(startDate, endDate);
  const days = await getScheduledDays(req.user._id, startDate, endDate);
  res.status(200).json({
    success: true,
    count: days.length,
    dates: days.map((item) => item.date),
    data: days,
  });
});

exports.getLeaveRequests = catchAsync(async (req, res) => {
  const filter = {};
  if (req.user.role === "admin_hr") {
    // HR được xem toàn bộ đơn.
  } else if (req.user.role === "manager") {
    const employees = await Employee.find({ departmentId: req.user.departmentId })
      .select("_id")
      .lean();
    filter.employeeId = { $in: employees.map((item) => item._id) };
  } else {
    filter.employeeId = req.user._id;
  }

  if (req.query.status && ["pending", "approved", "rejected", "cancelled"].includes(req.query.status)) {
    filter.status = req.query.status;
  }

  const requests = await populateRequest(
    LeaveRequest.find(filter).sort({ createdAt: -1 }),
  ).lean();

  res.status(200).json({ success: true, count: requests.length, data: requests });
});

exports.getLeaveRequestById = catchAsync(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new AppError("Mã đơn nghỉ phép không hợp lệ.", 400));
  }
  const request = await populateRequest(LeaveRequest.findById(req.params.id)).lean();
  if (!request) return next(new AppError("Không tìm thấy đơn nghỉ phép.", 404));

  const ownRequest = String(request.employeeId?._id) === String(req.user._id);
  const canViewAll = req.user.role === "admin_hr";
  let canViewDepartment = false;
  if (req.user.role === "manager") {
    canViewDepartment = String(request.employeeId?.departmentId) === String(req.user.departmentId);
  }
  if (!ownRequest && !canViewAll && !canViewDepartment) {
    return next(new AppError("Bạn không có quyền xem đơn nghỉ phép này.", 403));
  }
  res.status(200).json({ success: true, data: request });
});

exports.createLeaveRequest = catchAsync(async (req, res) => {
  const { leaveTypeId, startDate, endDate, reason } = req.body || {};
  const validated = await validateRequestData({
    employeeId: req.user._id,
    leaveTypeId,
    startDate,
    endDate,
    reason,
  });

  const request = await LeaveRequest.create({
    employeeId: req.user._id,
    leaveTypeId,
    startDate,
    endDate,
    scheduledDates: validated.scheduledDates,
    totalDays: validated.totalDays,
    reason: validated.reason,
  });

  const populated = await populateRequest(LeaveRequest.findById(request._id)).lean();
  res.status(201).json({ success: true, message: "Đã gửi đơn nghỉ phép thành công.", data: populated });
});

exports.updateLeaveRequest = catchAsync(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new AppError("Mã đơn nghỉ phép không hợp lệ.", 400));
  }
  const request = await LeaveRequest.findById(req.params.id);
  if (!request) return next(new AppError("Không tìm thấy đơn nghỉ phép.", 404));
  if (String(request.employeeId) !== String(req.user._id)) {
    return next(new AppError("Bạn chỉ được chỉnh sửa đơn nghỉ phép của chính mình.", 403));
  }
  if (request.status !== "pending") {
    return next(new AppError("Chỉ được chỉnh sửa đơn đang chờ duyệt.", 409));
  }

  const { leaveTypeId, startDate, endDate, reason } = req.body || {};
  const validated = await validateRequestData({
    employeeId: req.user._id,
    leaveTypeId: leaveTypeId || request.leaveTypeId,
    startDate: startDate || request.startDate,
    endDate: endDate || request.endDate,
    reason: reason !== undefined ? reason : request.reason,
    excludeRequestId: request._id,
  });

  request.leaveTypeId = leaveTypeId || request.leaveTypeId;
  request.startDate = startDate || request.startDate;
  request.endDate = endDate || request.endDate;
  request.reason = validated.reason;
  request.scheduledDates = validated.scheduledDates;
  request.totalDays = validated.totalDays;
  await request.save();

  const populated = await populateRequest(LeaveRequest.findById(request._id)).lean();
  res.status(200).json({ success: true, message: "Đã cập nhật đơn nghỉ phép.", data: populated });
});

exports.deleteLeaveRequest = catchAsync(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new AppError("Mã đơn nghỉ phép không hợp lệ.", 400));
  }
  const request = await LeaveRequest.findById(req.params.id);
  if (!request) return next(new AppError("Không tìm thấy đơn nghỉ phép.", 404));
  const isOwner = String(request.employeeId) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin_hr") {
    return next(new AppError("Bạn không có quyền xóa đơn nghỉ phép này.", 403));
  }
  if (request.status !== "pending") {
    return next(new AppError("Chỉ có thể xóa đơn đang chờ duyệt. Đơn đã xử lý được giữ lại để bảo toàn lịch sử.", 409));
  }
  await request.deleteOne();
  res.status(200).json({ success: true, message: "Đã xóa đơn nghỉ phép." });
});

const reviewLeaveRequest = (status) => catchAsync(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new AppError("Mã đơn nghỉ phép không hợp lệ.", 400));
  }
  const request = await LeaveRequest.findById(req.params.id);
  if (!request) return next(new AppError("Không tìm thấy đơn nghỉ phép.", 404));
  await assertCanReview(req.user, request);
  if (request.status !== "pending") {
    return next(new AppError("Đơn nghỉ phép này đã được xử lý trước đó.", 409));
  }

  const reviewNote = String(req.body?.reviewNote || "").trim();
  if (reviewNote.length > 1000) {
    return next(new AppError("Ghi chú duyệt không được vượt quá 1.000 ký tự.", 400));
  }

  if (status === "approved") {
    const scheduledDays = await getScheduledDays(
      request.employeeId,
      request.startDate,
      request.endDate,
    );
    const currentDates = scheduledDays.map((item) => item.date);
    if (currentDates.length === 0) {
      return next(new AppError("Không thể duyệt vì nhân viên không còn lịch làm việc đã công bố trong khoảng ngày này.", 409));
    }
    await ensureNoConflictingLeave({
      employeeId: request.employeeId,
      scheduledDates: currentDates,
      excludeRequestId: request._id,
    });
    request.scheduledDates = currentDates;
    request.totalDays = currentDates.length;
  }

  // Compare-and-set: chỉ một người có thể xử lý một đơn đang pending.
  const updated = await LeaveRequest.findOneAndUpdate(
    { _id: request._id, status: "pending" },
    {
      $set: {
        status,
        reviewNote,
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        ...(status === "approved"
          ? { scheduledDates: request.scheduledDates, totalDays: request.totalDays }
          : {}),
      },
    },
    { new: true, runValidators: true },
  );
  if (!updated) return next(new AppError("Đơn vừa được người khác xử lý. Hãy tải lại danh sách.", 409));

  const populated = await populateRequest(LeaveRequest.findById(updated._id)).lean();
  res.status(200).json({
    success: true,
    message: status === "approved" ? "Đã duyệt đơn nghỉ phép." : "Đã từ chối đơn nghỉ phép.",
    data: populated,
  });
});

exports.approveLeaveRequest = reviewLeaveRequest("approved");
exports.rejectLeaveRequest = reviewLeaveRequest("rejected");
