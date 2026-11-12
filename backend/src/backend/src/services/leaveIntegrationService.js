import { LeaveRequest } from '../models/LeaveRequest.js';
import { ensure } from '../lib/errors.js';
import { dateOnly } from '../lib/dates.js';
import { objectId } from '../validators/leave.js';
function range(employeeId, from, to) {
  const id = objectId.parse(String(employeeId));
  dateOnly.parse(from); dateOnly.parse(to);
  ensure(from <= to, 400, 'Khoáº£ng ngÃ y khÃ´ng há»£p lá»‡.');
  return id;
}
export async function readApprovedLeaveDays(employeeId, from, to, session = null) {
  const id = range(employeeId, from, to);
  const docs = await LeaveRequest.find({ employeeId: id, status: 'approved', fromDate: { $lte: to }, toDate: { $gte: from } }).session(session);
  return docs.flatMap((item) => item.leaveDates.filter((date) => date >= from && date <= to).map((date) => ({ employeeId: id, date, paid: item.paidSnapshot === true, requestId: String(item._id), leaveTypeId: String(item.leaveTypeId) }))).sort((a, b) => a.date.localeCompare(b.date));
}
export async function assertNoApprovedLeave(employeeId, workDate, session = null) {
  const id = range(employeeId, workDate, workDate);
  ensure(!await LeaveRequest.exists({ employeeId: id, status: 'approved', leaveDates: workDate }).session(session), 409, 'NgÃ y nÃ y Ä‘Ã£ cÃ³ nghá»‰ phÃ©p Ä‘Æ°á»£c duyá»‡t.', 'APPROVED_LEAVE_CONFLICT');
}
export async function assertNoPendingLeave(employeeId, from, to, session = null) {
  const id = range(employeeId, from, to);
  ensure(!await LeaveRequest.exists({ employeeId: id, status: 'pending', fromDate: { $lte: to }, toDate: { $gte: from } }).session(session), 409, 'CÃ²n Ä‘Æ¡n nghá»‰ Ä‘ang chá» duyá»‡t trong ká»³.', 'PENDING_LEAVE');
}
export async function getLeavePayrollInput(employeeId, from, to, workedDates = [], session = null) {
  const days = await readApprovedLeaveDays(employeeId, from, to, session);
  const worked = new Set(workedDates.map((date) => dateOnly.parse(date)));
  ensure(!days.some((day) => worked.has(day.date)), 409, 'CÃ³ ngÃ y vá»«a cÃ³ cÃ´ng thá»±c táº¿ vá»«a cÃ³ phÃ©p Ä‘Ã£ duyá»‡t. Cáº§n xá»­ lÃ½ trÆ°á»›c khi tÃ­nh lÆ°Æ¡ng.', 'ATTENDANCE_LEAVE_CONFLICT');
  const paidDates = [...new Set(days.filter((day) => day.paid).map((day) => day.date))];
  const unpaidDates = [...new Set(days.filter((day) => !day.paid).map((day) => day.date))];
  return { paidDates, unpaidDates, paidLeaveDays: paidDates.length, unpaidLeaveDays: unpaidDates.length, days };
}


