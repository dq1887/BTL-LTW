/**
 * TV4 xuất dữ liệu tổng hợp cho TV5. Không sửa công thức TV5.
 * TV5 chỉ dùng những ngày nghỉ đã duyệt có lịch published (scheduledDates).
 * Khi nhân viên đi làm thực tế cùng một ngày, không cộng ngày nghỉ paid thêm lần nữa.
 */
const LeaveRequest = require("../models/LeaveRequest");
const LeaveType = require("../models/LeaveType");

async function getLeavePayrollSummary(employeeId, month, workedDates = []) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("Tháng phải có định dạng YYYY-MM");
  }
  const start = `${month}-01`;
  const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))
    .toISOString().slice(0, 10);
  const requests = await LeaveRequest.find({
    employeeId,
    status: "approved",
    startDate: { $lte: last },
    endDate: { $gte: start },
  }).select("leaveTypeId scheduledDates totalDays startDate endDate").lean();
  const types = await LeaveType.find({_id: {$in:requests.map(r => r.leaveTypeId)}})
    .select("_id isPaid").lean();
  const typeMap = new Map(types.map(t => [String(t._id), t.isPaid]));
  const worked = new Set(workedDates);
  const paid = new Set();
  const unpaid = new Set();
  const incompleteRequestIds = [];
  const missingLeaveTypeIds = [];
  for (const r of requests) {
    if (!r.scheduledDates?.length) {
      incompleteRequestIds.push(String(r._id));
      continue;
    }
    if (!typeMap.has(String(r.leaveTypeId))) {
      missingLeaveTypeIds.push(String(r.leaveTypeId));
      continue;
    }
    const target = typeMap.get(String(r.leaveTypeId)) ? paid : unpaid;
    for (const d of r.scheduledDates) {
      if (d >= start && d <= last) target.add(d);
    }
  }
  const payablePaidLeaveDates = [...paid].filter(d => !worked.has(d)).sort();
  return {
    month,
    paidLeaveDays: payablePaidLeaveDates.length,
    unpaidLeaveDays: [...unpaid].filter(d => !worked.has(d)).length,
    paidLeaveDates: payablePaidLeaveDates,
    conflictDates: [...paid].filter(d => worked.has(d)).sort(),
    incompleteRequestIds,
    missingLeaveTypeIds,
  };
}
module.exports = { getLeavePayrollSummary };
