const DAY_MS = 86400000;
const { isHoliday, isWeekend } = require("./payrollCalc");
function isValidDateOnly(value) {
  if (typeof value !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
function calendarDays(start, end) {
  if (!isValidDateOnly(start) || !isValidDateOnly(end) || start > end)
    return null;
  return (
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      DAY_MS +
    1
  );
}
function validDates(dates, start, end) {
  if (!Array.isArray(dates) || calendarDays(start, end) === null) return [];
  return [
    ...new Set(
      dates.filter((d) => isValidDateOnly(d) && d >= start && d <= end),
    ),
  ].sort();
}

function getCountedLeaveDates(start, end, published = []) {
  const span = calendarDays(start, end);
  if (span === null) return [];
  const explicit = new Set(validDates(published, start, end));
  const result = [];
  const first = Date.parse(`${start}T00:00:00Z`);
  for (let i = 0; i < span; i++) {
    const date = new Date(first + i * DAY_MS);
    const day = date.toISOString().slice(0, 10);
    if (
      isHoliday(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
      )
    )
      continue;
    if (!isWeekend(date.getUTCDay()) || explicit.has(day)) result.push(day);
  }
  return result;
}
function currentYearVN() {
  return Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date()),
  );
}
function describeRequest(request, countedDates, drafts) {
  const { startDate: start, endDate: end, status } = request;
  const current = validDates(countedDates, start, end);
  const draftDates = validDates(drafts, start, end).filter(
    (d) => !current.includes(d),
  );
  const stored = validDates(request.scheduledDates, start, end);
  const snapshotValid =
    stored.length > 0 &&
    stored.length === request.totalDays &&
    stored.length === request.scheduledDates?.length;
  const pending = status === "pending";
  const changed = !snapshotValid || stored.join(",") !== current.join(",");
  return {
    calendarDays: calendarDays(start, end),
    scheduledDates: pending ? current : stored,
    totalDays: pending
      ? current.length || null
      : snapshotValid
        ? stored.length
        : null,
    currentScheduledDates: current,
    draftDates,
    scheduleChanged: ["pending", "approved"].includes(status) && changed,
    unresolved: !pending && !snapshotValid,
  };
}
module.exports = {
  isValidDateOnly,
  calendarDays,
  validDates,
  currentYearVN,
  describeRequest,
  getCountedLeaveDates,
};
