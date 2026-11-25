const PAID_QUOTA_DAYS = 12;
const SUPPORTED_LEAVE_CODES = ["paid", "unpaid"];
const yearOf = (date) => Number(String(date).slice(0, 4));

function getYearsInRange(startDate, endDate) {
  const a = yearOf(startDate);
  const b = yearOf(endDate);
  const result = [];
  for (let year = a; year <= b; year++) result.push(year);
  return result;
}

function countDaysForYear(dates, year) {
  if (!Array.isArray(dates)) return 0;
  return new Set(
    dates.filter(
      (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && yearOf(d) === Number(year),
    ),
  ).size;
}

function getRequestDaysForYear(request, year) {
  const fromScheduled = countDaysForYear(request.scheduledDates, year);
  if (fromScheduled > 0) return fromScheduled;
  if (
    typeof request.totalDays === "number" &&
    request.totalDays > 0 &&
    yearOf(request.startDate) === Number(year)
  ) {
    return request.totalDays;
  }
  return 0;
}

function summarizeQuota(requests, year) {
  let usedDays = 0;
  let reservedDays = 0;
  const unresolvedApproved = [];

  for (const request of requests) {
    const n = getRequestDaysForYear(request, year);
    if (request.status === "approved") {
      usedDays += n;
      if (
        !n &&
        request.startDate <= `${year}-12-31` &&
        request.endDate >= `${year}-01-01`
      ) {
        unresolvedApproved.push(String(request._id));
      }
    } else if (request.status === "pending") {
      reservedDays += n;
    }
  }

  return {
    usedDays,
    reservedDays,
    remainingDays: Math.max(0, PAID_QUOTA_DAYS - usedDays - reservedDays),
    unresolvedApproved,
  };
}

function exceedsPaidQuota(summary, requestedDays) {
  return (
    summary.usedDays + summary.reservedDays + requestedDays > PAID_QUOTA_DAYS
  );
}

module.exports = {
  PAID_QUOTA_DAYS,
  SUPPORTED_LEAVE_CODES,
  getYearsInRange,
  countDaysForYear,
  getRequestDaysForYear,
  summarizeQuota,
  exceedsPaidQuota,
};
