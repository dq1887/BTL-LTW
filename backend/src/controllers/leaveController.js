const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Schedule = require("../models/Schedule");
require("../models/Shift");
const LeaveType = require("../models/LeaveType");
const LeaveRequest = require("../models/LeaveRequest");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { recalcPayroll } = require("../utils/payrollHelper");
const { isValidDateOnly, calendarDays, currentYearVN, describeRequest } = require("../utils/leaveDates");

const {
  PAID_QUOTA_DAYS,
  SUPPORTED_LEAVE_CODES,
  getYearsInRange,
  countDaysForYear,
  summarizeQuota,
  exceedsPaidQuota,
} = require("../utils/leaveQuota");

// Tuần tự hóa các thao tác đơn nghỉ cùng nhân viên trong một tiến trình backend.
const mutationQueues = new Map();
const withEmployeeMutation = (handler, create = false) => catchAsync(async (req, res, next) => {
  let employeeId = req.user._id;
  if (!create) {
    if (!mongoose.isValidObjectId(req.params.id)) return next(new AppError("Mã đơn nghỉ phép không hợp lệ.", 400));
    const target = await LeaveRequest.findById(req.params.id).select("employeeId").lean();
    if (!target) return next(new AppError("Không tìm thấy đơn nghỉ phép.", 404));
    employeeId = target.employeeId;
  }
  const key = String(employeeId);
  const previous = mutationQueues.get(key) || Promise.resolve();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  mutationQueues.set(key, gate);
  await previous;
  try {
    await handler(req, res, next);
  } finally {
    release();
    if (mutationQueues.get(key) === gate) mutationQueues.delete(key);
  }
});

const DEFAULT_LEAVE_TYPES = [
  {
    code: "paid",
    name: "Nghỉ có lương",
    description: "Tối đa 12 ngày có lương trong mỗi năm",
    isPaid: true,
  },
  {
    code: "unpaid",
    name: "Nghỉ không lương",
    description: "Không trừ hạn mức nghỉ có lương",
    isPaid: false,
  },
];

const validateDateRange = (startDate, endDate) => {
  if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate)) {
    throw new AppError("Ngày nghỉ không hợp lệ (năm 2000–2099).", 400);
  }
  if (startDate > endDate) throw new AppError("Ngày bắt đầu không được sau ngày kết thúc.", 400);
  if (calendarDays(startDate, endDate) > 366) throw new AppError("Khoảng nghỉ không được vượt quá 366 ngày.", 400);
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
    if (error.code !== 11000) throw error;
  }
};

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
    if (!isValidDateOnly(workDate) || !shift?._id || uniqueDays.has(workDate))
      continue;
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

const getDraftDates = async (employeeId, startDate, endDate) => {
  const drafts = await Schedule.find({
    employeeId,
    workDate: { $gte: startDate, $lte: endDate },
    status: "draft",
  })
    .select("workDate")
    .lean();

  return [
    ...new Set(drafts.map((item) => item.workDate).filter(isValidDateOnly)),
  ].sort();
};

// Lịch hiện tại chỉ dùng để dự tính đơn chờ duyệt và cảnh báo đơn đã xử lý.
// Không tự sửa lịch sử đã duyệt trong API đọc.
const describeRequests = async (requests) => {
  const valid = requests.filter(r => calendarDays(r.startDate, r.endDate) !== null && (r.employeeId?._id || r.employeeId));
  const byEmployee = new Map();
  for (const r of valid) {
    const id = String(r.employeeId?._id || r.employeeId);
    if (!byEmployee.has(id)) byEmployee.set(id, []);
    byEmployee.get(id).push(r);
  }
  await Promise.all([...byEmployee].map(async ([id, list]) => {
    const start = list.map(r => r.startDate).sort()[0];
    const end = list.map(r => r.endDate).sort().at(-1);
    const [days, drafts] = await Promise.all([getScheduledDays(id, start, end), getDraftDates(id, start, end)]);
    const dates = days.map(d => d.date);
    for (const r of list) Object.assign(r, describeRequest(r, dates, drafts));
  }));
  for (const r of requests) if (!valid.includes(r)) Object.assign(r, describeRequest(r, [], []));
  return requests;
};

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

const loadPaidQuota = async (employeeId, year, excludeRequestId) => {
  const paidTypes = await LeaveType.find({ $or: [{ isPaid: true }, { isPaid: { $exists: false }, paid: true }] }).select("_id").lean();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const filter = {
    employeeId,
    leaveTypeId: { $in: paidTypes.map((item) => item._id) },
    status: { $in: ["pending", "approved"] },
    startDate: { $lte: yearEnd },
    endDate: { $gte: yearStart },
  };
  if (excludeRequestId) filter._id = { $ne: excludeRequestId };
  const requests = await LeaveRequest.find(filter)
    .select("_id employeeId startDate endDate scheduledDates status totalDays")
    .lean();
  await describeRequests(requests.filter(r => r.status === "pending"));
  const summary = summarizeQuota(requests, year);
  return { year, limit: PAID_QUOTA_DAYS, ...summary };
};

const ensurePaidQuota = async ({
  employeeId,
  leaveType,
  scheduledDates,
  startDate,
  endDate,
  excludeRequestId,
}) => {
  if (!leaveType.isPaid) return;
  if (scheduledDates.length === 0) {
    throw new AppError(
      "Bạn chỉ được tạo đơn nghỉ phép khi có lịch làm việc đã được phân công trong khoảng ngày này.",
      400,
    );
  }
  for (const year of getYearsInRange(startDate, endDate)) {
    const requestedDays = countDaysForYear(scheduledDates, year);
    if (!requestedDays) continue;
    const quota = await loadPaidQuota(employeeId, year, excludeRequestId);
    if (quota.unresolvedApproved.length) {
      throw new AppError(
        `Năm ${year} có đơn nghỉ có lương đã duyệt cần kiểm tra lại số ngày. Vui lòng liên hệ quản lý trước khi xin thêm phép.`,
        409,
      );
    }
    if (exceedsPaidQuota(quota, requestedDays)) {
      throw new AppError(
        `Năm ${year}: phép có lương còn ${quota.remainingDays}/${PAID_QUOTA_DAYS} ngày; đơn này xin ${requestedDays} ngày.`,
        409,
      );
    }
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

  await ensureDefaultTypes();
  const leaveType = await LeaveType.findOne({
    _id: leaveTypeId,
    isActive: true,
  });
  if (!leaveType || !SUPPORTED_LEAVE_CODES.includes(leaveType.code) || leaveType.isPaid !== (leaveType.code === "paid")) {
    throw new AppError(
      "Chỉ được chọn Nghỉ có lương hoặc Nghỉ không lương.",
      400,
    );
  }

  await ensureNoConflictingLeave({
    employeeId,
    startDate,
    endDate,
    excludeRequestId,
  });

  // Bắt buộc nhân viên phải có lịch làm việc đã phân công (published) trong ngày xin nghỉ
  const scheduledDays = await getScheduledDays(employeeId, startDate, endDate);
  const scheduledDates = scheduledDays.map((item) => item.date);
  if (scheduledDates.length === 0) {
    throw new AppError(
      "Bạn không có lịch làm việc được phân công trong khoảng thời gian này nên không thể tạo đơn xin nghỉ phép.",
      400,
    );
  }

  await ensurePaidQuota({
    employeeId,
    leaveType,
    scheduledDates,
    startDate,
    endDate,
    excludeRequestId,
  });

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
    throw new AppError(
      "Bạn không thể tự duyệt đơn nghỉ phép của chính mình.",
      403,
    );
  }
  if (user.role === "manager") {
    const employee = await Employee.findById(request.employeeId)
      .select("departmentId")
      .lean();
    if (
      !employee ||
      !user.departmentId ||
      String(employee.departmentId) !== String(user.departmentId)
    ) {
      throw new AppError(
        "Trưởng phòng chỉ được xử lý đơn của nhân viên thuộc phòng ban mình.",
        403,
      );
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
  const types = await LeaveType.find({
    isActive: true,
    code: { $in: SUPPORTED_LEAVE_CODES },
  })
    .sort({ isPaid: -1 })
    .lean();
  res.status(200).json({ success: true, count: types.length, data: types });
});

exports.createLeaveType = catchAsync(async (req, res, next) => {
  return next(
    new AppError(
      "Hệ thống chỉ hỗ trợ 2 loại nghỉ cố định: paid và unpaid.",
      409,
    ),
  );
});

exports.updateLeaveType = catchAsync(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new AppError("Mã loại nghỉ phép không hợp lệ.", 400));
  }
  const type = await LeaveType.findById(req.params.id);
  if (!type) return next(new AppError("Không tìm thấy loại nghỉ phép.", 404));
  if (!SUPPORTED_LEAVE_CODES.includes(type.code)) {
    return next(new AppError("Không cho sửa loại nghỉ lịch sử.", 409));
  }
  const { name, description, isPaid, isActive } = req.body || {};
  if ((isPaid !== undefined && isPaid !== type.isPaid) || isActive === false) {
    return next(
      new AppError(
        "Không được thay đổi tính hưởng lương hoặc vô hiệu hóa 2 loại nghỉ chuẩn.",
        409,
      ),
    );
  }
  const updates = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (description !== undefined)
    updates.description = String(description).trim();
  if (updates.name === "")
    return next(new AppError("Tên loại nghỉ không được để trống.", 400));

  const updatedType = await LeaveType.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true },
  );
  res.status(200).json({
    success: true,
    message: "Đã cập nhật loại nghỉ phép.",
    data: updatedType,
  });
});

exports.getBalanceEmployees = catchAsync(async (req, res) => {
  const filter = req.user.role === "admin_hr" ? {} : req.user.departmentId ? { departmentId: req.user.departmentId } : { _id: req.user._id };
  const data = await Employee.find(filter).select("_id employeeCode fullName").sort({ fullName: 1 }).lean();
  res.status(200).json({ success: true, count: data.length, data });
});

exports.getPaidLeaveBalance = catchAsync(async (req, res, next) => {
  const yearText = String(req.query.year || currentYearVN());
  if (!/^20\d{2}$/.test(yearText)) return next(new AppError("Năm phải từ 2000 đến 2099.", 400));
  const target = req.query.employeeId || req.user._id;
  if (!mongoose.isValidObjectId(target)) return next(new AppError("Mã nhân viên không hợp lệ.", 400));
  if (String(target) !== String(req.user._id)) {
    if (!isReviewRole(req.user)) return next(new AppError("Bạn không có quyền xem số dư phép của nhân viên khác.", 403));
    const employee = await Employee.findById(target).select("departmentId").lean();
    if (!employee) return next(new AppError("Không tìm thấy nhân viên.", 404));
    if (req.user.role === "manager" && (!req.user.departmentId || String(employee.departmentId) !== String(req.user.departmentId))) {
      return next(new AppError("Bạn chỉ được xem số dư phép của nhân viên thuộc phòng ban mình.", 403));
    }
  }
  const data = await loadPaidQuota(target, Number(yearText));
  res.status(200).json({ success: true, data });
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
    calendarDays: calendarDays(startDate, endDate),
    count: days.length,
    dates: days.map((item) => item.date),
    draftDates: draftDates.filter(
      (date) => !days.some((item) => item.date === date),
    ),
    data: days,
  });
});

exports.getLeaveRequests = catchAsync(async (req, res) => {
  const filter = {};
  if (req.user.role === "admin_hr") {
    // Admin HR lấy đơn cá nhân + đơn nhân viên để duyệt ở tab riêng
  } else if (req.user.role === "manager") {
    const employees = req.user.departmentId
      ? await Employee.find({ departmentId: req.user.departmentId })
          .select("_id")
          .lean()
      : [];
    const allowedIds = new Set(employees.map((item) => String(item._id)));
    allowedIds.add(String(req.user._id));
    filter.employeeId = { $in: [...allowedIds] };
  } else {
    filter.employeeId = req.user._id;
  }

  if (
    req.query.status &&
    ["pending", "approved", "rejected", "cancelled"].includes(req.query.status)
  ) {
    filter.status = req.query.status;
  }

  const requests = await populateRequest(
    LeaveRequest.find(filter).sort({ createdAt: -1 }),
  ).lean();
  await describeRequests(requests);

  res
    .status(200)
    .json({ success: true, count: requests.length, data: requests });
});

exports.getLeaveRequestById = catchAsync(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new AppError("Mã đơn nghỉ phép không hợp lệ.", 400));
  }
  const request = await populateRequest(
    LeaveRequest.findById(req.params.id),
  ).lean();
  if (!request) return next(new AppError("Không tìm thấy đơn nghỉ phép.", 404));

  const ownRequest = String(request.employeeId?._id) === String(req.user._id);
  const canViewAll = req.user.role === "admin_hr";
  let canViewDepartment = false;
  if (req.user.role === "manager") {
    canViewDepartment =
      Boolean(req.user.departmentId && request.employeeId?.departmentId) &&
      String(request.employeeId.departmentId) === String(req.user.departmentId);
  }
  if (!ownRequest && !canViewAll && !canViewDepartment) {
    return next(new AppError("Bạn không có quyền xem đơn nghỉ phép này.", 403));
  }
  await describeRequests([request]);
  res.status(200).json({ success: true, data: request });
});

exports.createLeaveRequest = withEmployeeMutation(async (req, res) => {
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

  const populated = await populateRequest(
    LeaveRequest.findById(request._id),
  ).lean();
  await describeRequests([populated]);
  res.status(201).json({
    success: true,
    message: "Đã gửi đơn nghỉ phép thành công.",
    data: populated,
  });
}, true);

exports.updateLeaveRequest = withEmployeeMutation(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new AppError("Mã đơn nghỉ phép không hợp lệ.", 400));
  }
  const request = await LeaveRequest.findById(req.params.id);
  if (!request) return next(new AppError("Không tìm thấy đơn nghỉ phép.", 404));
  if (String(request.employeeId) !== String(req.user._id)) {
    return next(
      new AppError("Bạn chỉ được chỉnh sửa đơn nghỉ phép của chính mình.", 403),
    );
  }
  if (request.status !== "pending") {
    return next(new AppError("Chỉ được chỉnh sửa đơn đang chờ duyệt.", 409));
  }

  const { leaveTypeId, startDate, endDate, reason } = req.body || {};
  const validated = await validateRequestData({
    employeeId: req.user._id,
    leaveTypeId: leaveTypeId ?? request.leaveTypeId,
    startDate: startDate ?? request.startDate,
    endDate: endDate ?? request.endDate,
    reason: reason !== undefined ? reason : request.reason,
    excludeRequestId: request._id,
  });

  const updated = await LeaveRequest.findOneAndUpdate(
    { _id: request._id, status: "pending", updatedAt: request.updatedAt },
    { $set: { leaveTypeId: leaveTypeId ?? request.leaveTypeId, startDate: startDate ?? request.startDate, endDate: endDate ?? request.endDate, reason: validated.reason, scheduledDates: validated.scheduledDates, totalDays: validated.totalDays } },
    { new: true, runValidators: true },
  );
  if (!updated) return next(new AppError("Đơn đã thay đổi. Vui lòng tải lại danh sách.", 409));

  const populated = await populateRequest(
    LeaveRequest.findById(request._id),
  ).lean();
  await describeRequests([populated]);
  res.status(200).json({
    success: true,
    message: "Đã cập nhật đơn nghỉ phép.",
    data: populated,
  });
});

exports.deleteLeaveRequest = withEmployeeMutation(async (req, res, next) => {
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
    return next(
      new AppError(
        "Chỉ có thể xóa đơn đang chờ duyệt. Đơn đã xử lý được giữ lại để bảo toàn lịch sử.",
        409,
      ),
    );
  }
  const result = await LeaveRequest.deleteOne({ _id: request._id, status: "pending", updatedAt: request.updatedAt });
  if (!result.deletedCount) return next(new AppError("Đơn đã thay đổi. Vui lòng tải lại danh sách.", 409));
  res.status(200).json({ success: true, message: "Đã xóa đơn nghỉ phép." });
});

const reviewLeaveRequest = (status) =>
  withEmployeeMutation(async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return next(new AppError("Mã đơn nghỉ phép không hợp lệ.", 400));
    }
    const request = await LeaveRequest.findById(req.params.id);
    if (!request)
      return next(new AppError("Không tìm thấy đơn nghỉ phép.", 404));
    await assertCanReview(req.user, request);
    if (request.status !== "pending") {
      return next(
        new AppError("Đơn nghỉ phép này đã được xử lý trước đó.", 409),
      );
    }

    if (req.body?.expectedUpdatedAt && new Date(req.body.expectedUpdatedAt).getTime() !== new Date(request.updatedAt).getTime()) {
      return next(new AppError("Nội dung đơn đã thay đổi. Vui lòng tải lại trước khi xử lý.", 409));
    }
    const reviewNote = String(req.body?.reviewNote || "").trim();
    if (reviewNote.length > 1000) {
      return next(
        new AppError("Ghi chú duyệt không được vượt quá 1.000 ký tự.", 400),
      );
    }

    if (status === "approved") {
      validateDateRange(request.startDate, request.endDate);
      const [scheduledDays, drafts] = await Promise.all([
        getScheduledDays(request.employeeId, request.startDate, request.endDate),
        getDraftDates(request.employeeId, request.startDate, request.endDate),
      ]);
      const currentDates = scheduledDays.map((item) => item.date);
      if (drafts.some(d => !currentDates.includes(d))) return next(new AppError("Còn ngày làm việc chưa được xác nhận. Vui lòng hoàn tất lịch trước khi duyệt.", 409));
      const expected = req.body?.expectedScheduledDates;
      if (expected !== undefined && (!Array.isArray(expected) || expected.join(',') !== currentDates.join(','))) {
        return next(new AppError("Lịch làm việc đã thay đổi. Vui lòng tải lại danh sách và kiểm tra số ngày trước khi duyệt.", 409));
      }
      if (currentDates.length === 0) {
        return next(
          new AppError(
            "Không thể duyệt vì nhân viên không có lịch làm việc được phân công trong khoảng thời gian này.",
            400,
          ),
        );
      }
      await ensureNoConflictingLeave({
        employeeId: request.employeeId,
        startDate: request.startDate,
        endDate: request.endDate,
        excludeRequestId: request._id,
      });
      const requestType = await LeaveType.findById(request.leaveTypeId);
      if (!requestType || !requestType.isActive || !SUPPORTED_LEAVE_CODES.includes(requestType.code) || requestType.isPaid !== (requestType.code === 'paid'))
        throw new AppError("Loại nghỉ không còn phù hợp. Vui lòng yêu cầu nhân viên cập nhật đơn.", 409);
      await ensurePaidQuota({
        employeeId: request.employeeId,
        leaveType: requestType,
        scheduledDates: currentDates,
        startDate: request.startDate,
        endDate: request.endDate,
        excludeRequestId: request._id,
      });
      request.scheduledDates = currentDates;
      request.totalDays = currentDates.length;
    }

    const updated = await LeaveRequest.findOneAndUpdate(
      { _id: request._id, status: "pending", updatedAt: request.updatedAt },
      {
        $set: {
          status,
          reviewNote,
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          ...(status === "approved"
            ? {
                scheduledDates: request.scheduledDates,
                totalDays: request.totalDays,
              }
            : {}),
        },
      },
      { new: true, runValidators: true },
    );
    if (!updated)
      return next(
        new AppError(
          "Đơn vừa được người khác xử lý. Hãy tải lại danh sách.",
          409,
        ),
      );

    let payrollSyncWarning = false;
    // Đồng bộ lại bảng lương nháp (nếu có) ngay khi đơn được duyệt
    if (status === "approved" && updated.scheduledDates?.length) {
      const months = [
        ...new Set(updated.scheduledDates.map((d) => String(d).slice(0, 7))),
      ];
      await Promise.all(
        months.map((m) =>
          recalcPayroll(updated.employeeId, m).catch((error) => { payrollSyncWarning = true; console.error("Leave payroll sync failed:", error.message); }),
        ),
      );
    }

    const populated = await populateRequest(
      LeaveRequest.findById(updated._id),
    ).lean();
    await describeRequests([populated]);
    res.status(200).json({
      success: true,
      message:
        status === "approved"
          ? (payrollSyncWarning ? "Đã duyệt đơn. Cần kiểm tra lại cập nhật bảng lương." : "Đã duyệt đơn nghỉ phép.")
          : "Đã từ chối đơn nghỉ phép.",
      data: populated,
    });
  });

exports.approveLeaveRequest = reviewLeaveRequest("approved");
exports.rejectLeaveRequest = reviewLeaveRequest("rejected");
