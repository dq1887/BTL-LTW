import { withPayrollLeaveGuard } from './forPayroll.js';
export function createLeaveAwarePayrollService({ readWorkedDates, savePayroll }) {
  if (typeof readWorkedDates !== 'function' || typeof savePayroll !== 'function') throw new TypeError('Cần readWorkedDates và savePayroll của TV5.');
  return function calculatePayroll({ employeeId, from, to, context }) {
    return withPayrollLeaveGuard({
      employeeId, from, to,
      readWorkedDates: (session) => readWorkedDates({ employeeId, from, to, session }),
      write: (session, leave) => savePayroll({ employeeId, from, to, context, leave, session }),
    });
  };
}
