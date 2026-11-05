import { ensure } from '../lib/errors.js';
import { withAttendanceLeaveGuard } from './forAttendance.js';
export function createLeaveAwareAttendanceService({ Schedule, saveAttendance }) {
  if (!Schedule || typeof saveAttendance !== 'function') throw new TypeError('Cần Schedule thật và hàm saveAttendance của TV3.');
  return function recordAttendance({ employeeId, scheduleId, payload }) {
    return withAttendanceLeaveGuard({
      employeeId,
      resolveWorkDate: async (session) => {
        const schedule = await Schedule.findById(scheduleId).session(session);
        ensure(schedule, 404, 'Không tìm thấy lịch làm.');
        ensure(String(schedule.employeeId) === String(employeeId), 403, 'Lịch không thuộc nhân viên này.');
        ensure(schedule.status === 'published', 409, 'Lịch làm chưa được công bố.');
        return schedule.workDate;
      },
      write: (session, workDate) => saveAttendance({ ...payload, employeeId, scheduleId, workDate, session }),
    });
  };
}
