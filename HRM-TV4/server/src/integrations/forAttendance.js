import { withHrmTransaction } from './hrmLock.js';
import { assertNoApprovedLeave } from '../services/leaveIntegrationService.js';
export function withAttendanceLeaveGuard({ employeeId, workDate, resolveWorkDate, write }) {
  if (typeof write !== 'function') throw new TypeError('Thiếu hàm write(session, workDate).');
  return withHrmTransaction(async (session) => {
    const date = resolveWorkDate ? await resolveWorkDate(session) : workDate;
    await assertNoApprovedLeave(employeeId, date, session);
    return write(session, date);
  });
}
