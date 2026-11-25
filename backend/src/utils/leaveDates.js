// Ngày nghiệp vụ YYYY-MM-DD; UTC chỉ để tính khoảng ngày, không đổi múi giờ.
const DAY_MS = 86400000;
function isValidDateOnly(value) {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function calendarDays(start, end) {
  if (!isValidDateOnly(start) || !isValidDateOnly(end) || start > end) return null;
  return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS + 1;
}
function validDates(dates, start, end) {
  if (!Array.isArray(dates) || calendarDays(start, end) === null) return [];
  return [...new Set(dates.filter(d => isValidDateOnly(d) && d >= start && d <= end))].sort();
}
function currentYearVN() {
  return Number(new Intl.DateTimeFormat('en', {year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh'}).format(new Date()));
}
function describeRequest(request, published, drafts) {
  const { startDate: start, endDate: end, status } = request;
  const current = validDates(published, start, end);
  const draftDates = validDates(drafts, start, end).filter(d => !current.includes(d));
  const stored = validDates(request.scheduledDates, start, end);
  const snapshotValid = stored.length > 0 && stored.length === request.totalDays && stored.length === request.scheduledDates?.length;
  const pending = status === 'pending';
  const changed = !snapshotValid || stored.join(',') !== current.join(',');
  return {
    calendarDays: calendarDays(start, end),
    scheduledDates: pending ? current : stored,
    totalDays: pending ? (current.length || null) : (snapshotValid ? stored.length : null),
    currentScheduledDates: current,
    draftDates,
    scheduleChanged: ['pending','approved'].includes(status) && changed,
    unresolved: !pending && !snapshotValid,
  };
}
module.exports = { isValidDateOnly, calendarDays, validDates, currentYearVN, describeRequest };
