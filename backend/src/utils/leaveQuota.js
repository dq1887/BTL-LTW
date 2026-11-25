const { isValidDateOnly, validDates, calendarDays } = require('./leaveDates');
const PAID_QUOTA_DAYS = 12;
const SUPPORTED_LEAVE_CODES = ['paid', 'unpaid'];
const yearOf = date => Number(String(date).slice(0, 4));
function getYearsInRange(start, end) {
  if (calendarDays(start, end) === null) return [];
  return Array.from({length: yearOf(end) - yearOf(start) + 1}, (_, i) => yearOf(start) + i);
}
function countDaysForYear(dates, year) {
  return new Set((Array.isArray(dates) ? dates : []).filter(d => isValidDateOnly(d) && yearOf(d) === Number(year))).size;
}
function getRequestDaysForYear(request, year) {
  return countDaysForYear(validDates(request.scheduledDates, request.startDate, request.endDate), year);
}
function summarizeQuota(requests, year) {
  const used = new Set();
  const reserved = new Set();
  const unresolvedApproved = [];
  for (const r of requests) {
    const dates = validDates(r.scheduledDates, r.startDate, r.endDate);
    if (r.status === 'approved') {
      const overlap = calendarDays(r.startDate, r.endDate) === null || (r.startDate <= `${year}-12-31` && r.endDate >= `${year}-01-01`);
      // Không suy diễn ngày từ totalDays, nhất là đơn vắt qua năm.
      if (overlap && (!dates.length || dates.length !== r.scheduledDates?.length || r.totalDays !== dates.length)) unresolvedApproved.push(String(r._id));
      dates.filter(d => yearOf(d) === Number(year)).forEach(d => used.add(d));
    } else if (r.status === 'pending') {
      dates.filter(d => yearOf(d) === Number(year)).forEach(d => reserved.add(d));
    }
  }
  for (const d of used) reserved.delete(d);
  return { usedDays: used.size, reservedDays: reserved.size, remainingDays: Math.max(0, PAID_QUOTA_DAYS - used.size - reserved.size), unresolvedApproved };
}
function exceedsPaidQuota(summary, requestedDays) {
  return summary.usedDays + summary.reservedDays + requestedDays > PAID_QUOTA_DAYS;
}
module.exports = { PAID_QUOTA_DAYS, SUPPORTED_LEAVE_CODES, getYearsInRange, countDaysForYear, getRequestDaysForYear, summarizeQuota, exceedsPaidQuota };
