import { LeaveType } from '../models/LeaveType.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { withHrmTransaction } from '../integrations/hrmLock.js';
import { getEmployee, canReadEmployee, assertReviewer, visibleEmployees, publishedDates, assertNoAttendance, assertPayrollOpen } from '../integrations/hrmGateway.js';
import { ensure } from '../lib/errors.js';
import { daysByYear } from '../lib/dates.js';
import { readApprovedLeaveDays } from './leaveIntegrationService.js';
import { requestInput } from '../validators/leave.js';

const history = (actor, action, note = '') => ({ actorId: actor.id, action, note, at: new Date() });
const populated = (query) => query.populate('employeeId', 'employeeCode fullName departmentId').populate('leaveTypeId', 'code name paid annualQuota active').populate('reviewerId', 'username').populate('history.actorId', 'username');
export async function requestDetail(actor, id) {
  const doc = await LeaveRequest.findById(id);
  ensure(doc, 404, 'Không tìm thấy đơn nghỉ.');
  ensure(await canReadEmployee(actor, doc.employeeId), 403, 'Không được xem đơn của nhân viên này.');
  return populated(LeaveRequest.findById(id));
}
export async function listRequests(actor, filters) {
  const allowed = (await visibleEmployees(actor)).map((e) => String(e._id));
  if (filters.employeeId) ensure(allowed.includes(filters.employeeId), 403, 'Không được xem nhân viên này.');
  const query = { employeeId: filters.employeeId ?? { $in: allowed } };
  if (filters.status) query.status = filters.status;
  if (filters.from) query.toDate = { $gte: filters.from };
  if (filters.to) query.fromDate = { $lte: filters.to };
  const docs = await populated(LeaveRequest.find(query).sort({ createdAt: -1 }));
  const q = filters.q?.trim().toLocaleLowerCase();
  return q ? docs.filter((d) => [d.reason, d.employeeId?.fullName, d.employeeId?.employeeCode, d.leaveTypeId?.name].some((s) => s?.toLocaleLowerCase().includes(q))) : docs;
}
async function quotaCheck(employeeId, type, dates, session, excludeId) {
  if (type.annualQuota === null) return;
  const query = { employeeId, leaveTypeId: type._id, status: 'approved' };
  if (excludeId) query._id = { $ne: excludeId };
  const approved = await LeaveRequest.find(query).session(session);
  const used = daysByYear(approved.flatMap((r) => r.leaveDates));
  for (const [year, days] of Object.entries(daysByYear(dates))) {
    ensure((used[year] ?? 0) + days <= type.annualQuota, 409, `Vượt hạn mức phép năm ${year}: còn ${Math.max(0, type.annualQuota - (used[year] ?? 0))} ngày.`, 'QUOTA_EXCEEDED');
  }
}
async function validateBusiness(data, session, excludeId) {
  const employee = await getEmployee(data.employeeId, session);
  ensure(employee.status === 'active', 409, 'Nhân viên đã ngừng hoạt động.');
  const type = await LeaveType.findById(data.leaveTypeId).session(session);
  ensure(type, 404, 'Không tìm thấy loại nghỉ.');
  ensure(type.active, 409, 'Loại nghỉ đã ngừng sử dụng.');
  const overlap = { employeeId: data.employeeId, status: { $in: ['pending', 'approved'] }, fromDate: { $lte: data.toDate }, toDate: { $gte: data.fromDate } };
  if (excludeId) overlap._id = { $ne: excludeId };
  ensure(!await LeaveRequest.exists(overlap).session(session), 409, 'Khoảng ngày trùng đơn đang chờ hoặc đã duyệt.', 'DATE_OVERLAP');
  const dates = await publishedDates(data.employeeId, data.fromDate, data.toDate, session);
  ensure(dates.length > 0, 400, 'Không có lịch làm đã công bố trong khoảng ngày này.', 'NO_SCHEDULE');
  await assertPayrollOpen(data.employeeId, data.fromDate, data.toDate, session);
  await quotaCheck(data.employeeId, type, dates, session, excludeId);
  return { dates, type };
}
export async function createRequest(actor, input) {
  const employeeId = input.employeeId ?? actor.employeeId;
  ensure(employeeId === actor.employeeId || actor.role === 'admin_hr', 403, 'Chỉ được tạo đơn cho bản thân; HR có thể tạo hộ.');
  return withHrmTransaction(async (session) => {
    const { dates } = await validateBusiness({ ...input, employeeId }, session);
    const [doc] = await LeaveRequest.create([{ ...input, employeeId, leaveDates: dates, requestedDays: dates.length, history: [history(actor, 'created')] }], { session });
    return doc;
  });
}
export async function editRequest(actor, id, patch) {
  return withHrmTransaction(async (session) => {
    const doc = await LeaveRequest.findById(id).session(session);
    ensure(doc, 404, 'Không tìm thấy đơn nghỉ.');
    ensure(String(doc.employeeId) === actor.employeeId || actor.role === 'admin_hr', 403, 'Không được sửa đơn của người khác.');
    ensure(doc.status === 'pending', 409, 'Chỉ sửa được đơn đang chờ.');
    const data = requestInput.parse({ employeeId: String(doc.employeeId), leaveTypeId: String(doc.leaveTypeId), fromDate: doc.fromDate, toDate: doc.toDate, reason: doc.reason, ...patch });
    const { dates } = await validateBusiness(data, session, id);
    Object.assign(doc, data, { leaveDates: dates, requestedDays: dates.length });
    doc.history.push(history(actor, 'updated'));
    await doc.save({ session }); return doc;
  });
}
export async function reviewRequest(actor, id, action, note) {
  return withHrmTransaction(async (session) => {
    const doc = await LeaveRequest.findById(id).session(session);
    ensure(doc, 404, 'Không tìm thấy đơn nghỉ.');
    await assertReviewer(actor, doc.employeeId, session);
    ensure(doc.status === 'pending', 409, 'Đơn không còn ở trạng thái chờ duyệt.');
    if (action === 'approved') {
      const { dates, type } = await validateBusiness({ employeeId: String(doc.employeeId), leaveTypeId: String(doc.leaveTypeId), fromDate: doc.fromDate, toDate: doc.toDate }, session, id);
      ensure(JSON.stringify(dates) === JSON.stringify([...doc.leaveDates]), 409, 'Lịch làm đã thay đổi. Sửa/lưu lại đơn trước khi duyệt.', 'SCHEDULE_CHANGED');
      await assertNoAttendance(doc.employeeId, dates, session);
      doc.paidSnapshot = type.paid; doc.typeNameSnapshot = type.name;
    }
    doc.status = action; doc.reviewerId = actor.id; doc.reviewedAt = new Date(); doc.reviewNote = note;
    doc.history.push(history(actor, action, note));
    await doc.save({ session }); return doc;
  });
}
export async function cancelRequest(actor, id, note) {
  return withHrmTransaction(async (session) => {
    const doc = await LeaveRequest.findById(id).session(session);
    ensure(doc, 404, 'Không tìm thấy đơn nghỉ.');
    ensure(doc.status === 'pending' || doc.status === 'approved', 409, 'Chỉ hủy được đơn đang chờ hoặc đã duyệt.');
    if (doc.status === 'approved') ensure(actor.role === 'admin_hr', 403, 'Chỉ HR được hủy đơn đã duyệt.');
    else ensure(String(doc.employeeId) === actor.employeeId || actor.role === 'admin_hr', 403, 'Không được hủy đơn của người khác.');
    await assertPayrollOpen(doc.employeeId, doc.fromDate, doc.toDate, session);
    doc.status = 'cancelled'; doc.cancelledBy = actor.id; doc.cancelledAt = new Date(); doc.cancelReason = note;
    doc.history.push(history(actor, 'cancelled', note));
    await doc.save({ session }); return doc;
  });
}
export async function deleteRequest(actor, id) {
  return withHrmTransaction(async (session) => {
    const doc = await LeaveRequest.findById(id).session(session);
    ensure(doc, 404, 'Không tìm thấy đơn nghỉ.');
    ensure(String(doc.employeeId) === actor.employeeId || actor.role === 'admin_hr', 403, 'Không được xóa đơn của người khác.');
    ensure(doc.status === 'pending', 409, 'Chỉ xóa được đơn đang chờ; dùng hủy để lưu lịch sử đơn đã duyệt.');
    await assertPayrollOpen(doc.employeeId, doc.fromDate, doc.toDate, session);
    await doc.deleteOne({ session });
  });
}
export async function balances(actor, employeeId, year) {
  await getEmployee(employeeId);
  ensure(await canReadEmployee(actor, employeeId), 403, 'Không được xem số dư của nhân viên này.');
  const types = await LeaveType.find().sort({ code: 1 });
  const requests = await LeaveRequest.find({ employeeId, status: { $in: ['approved', 'pending'] } });
  return types.map((type) => {
    const own = requests.filter((r) => String(r.leaveTypeId) === String(type._id));
    const count = (status) => own.filter((r) => r.status === status).flatMap((r) => r.leaveDates).filter((d) => d.startsWith(`${year}-`)).length;
    const usedDays = count('approved');
    return { leaveTypeId: String(type._id), name: type.name, paid: type.paid, active: type.active, annualQuota: type.annualQuota, usedDays, pendingDays: count('pending'), remainingDays: type.annualQuota === null ? null : type.annualQuota - usedDays, year };
  });
}
export async function saveType(id, data) {
  return withHrmTransaction(async (session) => {
    if (!id) { const [doc] = await LeaveType.create([data], { session }); return doc; }
    const doc = await LeaveType.findById(id).session(session);
    ensure(doc, 404, 'Không tìm thấy loại nghỉ.');
    const used = await LeaveRequest.exists({ leaveTypeId: id }).session(session);
    if (used) {
      const policyChanged = ['code', 'paid', 'annualQuota'].some((key) => data[key] !== undefined && data[key] !== doc[key]);
      ensure(!policyChanged, 409, 'Loại nghỉ đã có đơn: chỉ sửa tên/trạng thái; tạo loại mới nếu đổi chính sách.');
    }
    Object.assign(doc, data); await doc.save({ session }); return doc;
  });
}
export async function deleteType(id) {
  return withHrmTransaction(async (session) => {
    const doc = await LeaveType.findById(id).session(session);
    ensure(doc, 404, 'Không tìm thấy loại nghỉ.');
    ensure(!await LeaveRequest.exists({ leaveTypeId: id }).session(session), 409, 'Loại nghỉ đã có đơn. Hãy tắt trạng thái hoạt động thay vì xóa.');
    await doc.deleteOne({ session });
  });
}
export async function approvedDays(actor, employeeId, from, to) {
  await getEmployee(employeeId);
  ensure(await canReadEmployee(actor, employeeId), 403, 'Không được đọc dữ liệu nhân viên này.');
  return readApprovedLeaveDays(employeeId, from, to);
}
export async function previewRequest(actor, input, requestId) {
  const employeeId = input.employeeId ?? actor.employeeId;
  ensure(employeeId === actor.employeeId || actor.role === 'admin_hr', 403, 'Chỉ được xem trước đơn của bản thân; HR có thể tạo hộ.');
  if (requestId) {
    const doc = await LeaveRequest.findById(requestId);
    ensure(doc, 404, 'Không tìm thấy đơn nghỉ.');
    ensure(String(doc.employeeId) === employeeId && (employeeId === actor.employeeId || actor.role === 'admin_hr'), 403, 'Không được sửa đơn này.');
    ensure(doc.status === 'pending', 409, 'Chỉ sửa được đơn đang chờ.');
  }
  const { dates, type } = await validateBusiness({ ...input, employeeId }, null, requestId);
  const approved = await LeaveRequest.find({ employeeId, leaveTypeId: type._id, status: 'approved' });
  const used = daysByYear(approved.flatMap((item) => item.leaveDates));
  return {
    requestedDays: dates.length, leaveDates: dates, paid: type.paid,
    years: Object.entries(daysByYear(dates)).map(([year, days]) => ({ year: Number(year), days, remainingBefore: type.annualQuota === null ? null : type.annualQuota - (used[year] ?? 0), remainingAfter: type.annualQuota === null ? null : type.annualQuota - (used[year] ?? 0) - days })),
  };
}
export { assertNoApprovedLeave, assertNoPendingLeave } from './leaveIntegrationService.js';
