import { Attendance, Department, Employee, Payroll, Schedule } from './referenceModels.js';
import { ensure } from '../lib/errors.js';
import { periodsInRange } from '../lib/dates.js';

export async function getEmployee(employeeId, session) {
  const employee = await Employee.findById(employeeId).session(session ?? null);
  ensure(employee, 404, 'Không tìm thấy nhân viên.');
  return employee;
}
export async function canReadEmployee(actor, employeeId, session) {
  if (actor.role === 'admin_hr' || String(actor.employeeId) === String(employeeId)) return true;
  if (actor.role !== 'manager') return false;
  const employee = await getEmployee(employeeId, session);
  return Boolean(await Department.exists({ _id: employee.departmentId, managerId: actor.employeeId }).session(session ?? null));
}
export async function assertReviewer(actor, employeeId, session) {
  ensure(actor.role === 'admin_hr' || actor.role === 'manager', 403, 'Chỉ Manager/HR được duyệt hoặc từ chối.');
  ensure(String(actor.employeeId) !== String(employeeId), 403, 'Không được tự duyệt/từ chối đơn của mình.');
  ensure(await canReadEmployee(actor, employeeId, session), 403, 'Nhân viên không thuộc phòng bạn quản lý.');
}
export async function visibleEmployees(actor) {
  if (actor.role === 'admin_hr') return Employee.find().sort({ employeeCode: 1 });
  if (actor.role === 'manager') {
    const departments = await Department.find({ managerId: actor.employeeId }).distinct('_id');
    return Employee.find({ $or: [{ departmentId: { $in: departments } }, { _id: actor.employeeId }] }).sort({ employeeCode: 1 });
  }
  return Employee.find({ _id: actor.employeeId });
}
export async function publishedDates(employeeId, fromDate, toDate, session) {
  const schedules = await Schedule.find({ employeeId, status: 'published', workDate: { $gte: fromDate, $lte: toDate } }).session(session ?? null);
  return [...new Set(schedules.map((item) => item.workDate))].sort();
}
export async function assertNoAttendance(employeeId, dates, session) {
  const schedules = await Schedule.find({ employeeId, workDate: { $in: dates } }).session(session);
  const existing = await Attendance.exists({ employeeId, scheduleId: { $in: schedules.map((item) => item._id) }, $or: [{ checkInAt: { $ne: null } }, { checkOutAt: { $ne: null } }, { workCredit: { $gt: 0 } }] }).session(session);
  ensure(!existing, 409, 'Ngày xin nghỉ đã ghi nhận công thực tế. Cần xử lý công trước khi duyệt phép.', 'ATTENDANCE_CONFLICT');
}
export async function assertPayrollOpen(employeeId, fromDate, toDate, session) {
  const closed = await Payroll.exists({ employeeId, period: { $in: periodsInRange(fromDate, toDate) }, status: 'closed' }).session(session);
  ensure(!closed, 409, 'Khoảng ngày thuộc kỳ lương đã chốt.', 'PAYROLL_CLOSED');
}
