import { ensure } from '../lib/errors.js';
import { withHrmTransaction } from './hrmLock.js';
import { assertNoApprovedLeave } from '../services/leaveIntegrationService.js';
export function withScheduleLeaveGuard({ affectedDays, resolveAffectedDays, write }) {
  if (typeof write !== 'function') throw new TypeError('Thiếu hàm write(session).');
  return withHrmTransaction(async (session) => {
    const days = resolveAffectedDays ? await resolveAffectedDays(session) : affectedDays;
    ensure(Array.isArray(days) && days.length > 0, 400, 'Thiếu danh sách ngày lịch bị thay đổi.');
    for (const day of days) await assertNoApprovedLeave(day.employeeId, day.workDate, session);
    return write(session);
  });
}
