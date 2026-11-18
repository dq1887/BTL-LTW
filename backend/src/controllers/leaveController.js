const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Schedule = require("../models/Schedule");
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
 * Chỉ lấy lịch làm việc từ collection `schedules` do TV2 quản lý.
 * Một ngày được tính nghỉ khi lịch đã `published` và shiftId hợp lệ.
 * Lịch `draft` không tính là ngày công chính thức.
 * Không truy vấn `workschedules` hoặc lấy chấm công làm lịch thay thế.
 */
const getScheduledDays = async (employeeId, startDate, endDate) => {
  const schedules = await Schedule.find({
    employeeId,
    workDate: { $gte: startDate, $lte: endDate },
    status: "published",
  })
    .select("workDate shiftId")
    .populate({ path: "shiftId", select: "name startTime endTime" })
    .lean();

  const uniqueDays = new Map();
  for (const item of schedules) {
    const workDate = item.workDate;
    const shift = item.shiftId;
    if (!isValidDateOnly(workDate) || !shift?._id || uniqueDays.has(workDate)) continue;
    uniqueDays.set(workDate, {
      date: workDate,
      source: "schedules",
      shift: {
        id: String(shift._id),
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
      },
    });
  }
  return [...uniqueDays.values()].sort((a, b) => a.date.localeCompare(b.date));
};

// Lịch nháp chỉ dùng để giải thích vì sao chưa tính được số ngày công.
const getDraftDates = async (employeeId, startDate, endDate) => {
  const drafts = await Schedule.find({
    employeeId,
    workDate: { $gte: startDate, $lte: endDate },
    status: "draft",
  })
    .select("workDate")
    .lean();

  return [...new Set(drafts.map((item) => item.workDate).filter(isValidDateOnly))].sort();
};

/**
 * Chặn đơn trùng theo KHOẢNG NGÀY xin nghỉ, không chỉ theo scheduledDates.
 * Nếu chưa có lịch thì scheduledDates rỗng; kiểm tra bằng $in: [] sẽ bỏ lọt
 * các đơn đang chờ duyệt trùng nhau.
 */
const ensureNoConflictingLeave = async ({
  employeeId,
  startDate,
  endDate,
  excludeRequestId,
}) => {
  const filter = {
    employeeId,
    status: { $in: ["pending", "approved"] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  };
  if (excludeRequestId) filter._id = { $ne: excludeRequestId };

  const conflict = await LeaveRequest.findOne(filter)
    .select("startDate endDate status")
    .lean();
  if (conflict) {
    throw new AppError(
      `Thời gian xin nghỉ trùng với một đơn ${conflict.status === "approved" ? "đã được duyệt" : "đang chờ duyệt"}. Hãy xem lại đơn trước đó.`,
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

  await ensureNoConflictingLeave({ employeeId, startDate, endDate, excludeRequestId });
  const scheduledDays = await getScheduledDays(employeeId, startDate, endDate);
  const scheduledDates = scheduledDays.map((item) => item.date);
  return {
    scheduledDates,
    // null = chưa xác định được ngày công; không coi 0 ngày là đã tính xong.
    totalDays: scheduledDates.length > 0 ? scheduledDates.length : null,
    reason: normalizedReason,
  };
};

/**
 * Khi TV chia ca công bố lịch sau lúc đơn được gửi/duyệt,
 * cập nhật các đơn chưa xác định số ngày khi danh sách được đọc lại.
 * Không thay đổi trạng thái duyệt hoặc sửa đơn đã có số ngày được chốt.
 */
const refreshUndeterminedRequests = async (requests) => {
  const unresolved = requests.filter((item) =>
    item.totalDays == null && ["pending", "approved"].includes(item.status),
  );
  if (unresolved.length === 0) return;

  // Theo từng nhân viên và khoảng ngày; mỗi yêu cầu chỉ cập nhật nếu vẫn chưa xác định.
  await Promise.all(unresolved.map(async (request) => {
    const employeeId = request.employeeId?._id || request.employeeId;
    if (!employeeId || !isValidDateOnly(request.startDate) || !isValidDateOnly(request.endDate)) return;
    const scheduledDays = await getScheduledDays(employeeId, request.startDate, request.endDate);
    if (scheduledDays.length === 0) return;
    const scheduledDates = scheduledDays.map((item) => item.date);
    const updated = await LeaveRequest.findOneAndUpdate(
      { _id: request._id, status: request.status, totalDays: null },
      { $set: { scheduledDates, totalDays: scheduledDates.length } },
      { new: true, runValidators: true },
    );
    if (updated) {
      request.totalDays = scheduledDates.length;
      request.scheduledDates = scheduledDates;
    }
  }));
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
  const [days, draftDates] = await Promise.all([
    getScheduledDays(req.user._id, startDate, endDate),
    getDraftDates(req.user._id, startDate, endDate),
  ]);
  res.status(200).json({
    success: true,
    count: days.length,
    dates: days.map((item) => item.date),
    draftDates: draftDates.filter((date) => !days.some((item) => item.date === date)),
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
  await refreshUndeterminedRequests(requests);

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
  await refreshUndeterminedRequests([request]);
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
    // Quản lý được quyền phê duyệt đơn, kể cả chưa phân ca chính thức.
    // Số ngày công chưa xác định được giữ null để tránh ảnh hưởng tính lương.
    await ensureNoConflictingLeave({
      employeeId: request.employeeId,
      startDate: request.startDate,
      endDate: request.endDate,
      excludeRequestId: request._id,
    });
    request.scheduledDates = currentDates;
    request.totalDays = currentDates.length > 0 ? currentDates.length : null;
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
    message: status === "approved"
      ? (updated.totalDays == null
        ? "Đã duyệt đơn. Số ngày công nghỉ sẽ được xác định khi lịch làm việc được công bố."
        : "Đã duyệt đơn nghỉ phép.")
      : "Đã từ chối đơn nghỉ phép.",
    data: populated,
  });
});

exports.approveLeaveRequest = reviewLeaveRequest("approved");
exports.rejectLeaveRequest = reviewLeaveRequest("rejected");
