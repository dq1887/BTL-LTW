import { withHrmTransaction } from './hrmLock.js';
import { assertNoPendingLeave, getLeavePayrollInput } from '../services/leaveIntegrationService.js';
export function withPayrollLeaveGuard({ employeeId, from, to, workedDates = [], readWorkedDates, write }) {
  if (typeof write !== 'function') throw new TypeError('Thiếu hàm write(session, leave).');
  return withHrmTransaction(async (session) => {
    await assertNoPendingLeave(employeeId, from, to, session);
    const worked = readWorkedDates ? await readWorkedDates(session) : workedDates;
    const leave = await getLeavePayrollInput(employeeId, from, to, worked, session);
    return write(session, leave);
  });
}
