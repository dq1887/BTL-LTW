const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const Payroll = require("../models/Payroll");
const LeaveRequest = require("../models/LeaveRequest");
const LeaveType = require("../models/LeaveType");
const { PAID_QUOTA_DAYS } = require("./leaveQuota");

const BASE_SALARY = {
  employee: 10_000_000,
  manager: 15_000_000,
  director: 20_000_000,
  accountant: 10_000_000,
};
const HOUR_RATE = 40_000;
const ALLOWANCE = 1_000_000;
const LEAVE_PENALTY_PER_DAY = 100_000;
const calcLeaveDeduction = (deductibleDays) =>
  Math.max(0, deductibleDays) * LEAVE_PENALTY_PER_DAY;

const norm = (s) => (s || "").toString().toLowerCase();
const round2 = (n) => Math.round(n * 100) / 100;
const round1 = (n) => Math.round(n * 10) / 10;

function getPayrollRole(emp) {
  const pos = norm(emp?.position);
  const role = norm(emp?.role);

  if (
    role === "admin_hr" ||
    pos.includes("giám đốc") ||
    norm(emp?.email).includes("nam.duong")
  )
    return "director";

  if (
    role === "accountant" ||
    role === "ke_toan" ||
    pos.includes("kế toán") ||
    pos.includes("accountant")
  )
    return "accountant";

  if (
    role === "manager" ||
    pos.includes("trưởng phòng") ||
    pos.includes("leader")
  )
    return "manager";

  return "employee";
}

const canManagePayroll = (emp) =>
  ["director", "accountant"].includes(getPayrollRole(emp));

async function loadActor(req) {
  if (req._payrollActor) return req._payrollActor;
  const id = req.user?._id || req.user?.id;
  const emp = id
    ? await Employee.findById(id).select("role position email").lean()
    : null;
  req._payrollActor = emp || req.user || {};
  return req._payrollActor;
}

async function isPayrollManager(req) {
  return canManagePayroll(await loadActor(req));
}

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function lastDayOfMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

function isMonthEnded(month) {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return today > lastDayOfMonth(month);
}

async function hasAttendance(month, employeeId) {
  const filter = { workDate: { $regex: `^${month}` } };
  if (employeeId) filter.employeeId = employeeId;
  return !!(await Attendance.exists(filter));
}

async function loadStats(month, employeeId) {
  const match = {
    workDate: { $regex: `^${month}` },
    checkOutAt: { $ne: null },
  };
  if (employeeId) {
    match.employeeId = new mongoose.Types.ObjectId(String(employeeId));
  }
  const stats = await Attendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$employeeId",
        minutes: { $sum: "$minutesWorked" },
        credit: { $sum: "$workCredit" },
        dates: { $addToSet: "$workDate" },
      },
    },
  ]);
  return new Map(stats.map((s) => [String(s._id), s]));
}

function weekdaysInRange(start, end) {
  const out = [];
  const d = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  while (d <= e) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

async function loadLeaveDates(month, employeeId) {
  const start = `${month}-01`;
  const yearStart = `${month.slice(0, 4)}-01-01`;
  const last = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  )
    .toISOString()
    .slice(0, 10);

  const filter = {
    status: "approved",
    startDate: { $lte: last },
    endDate: { $gte: yearStart },
  };
  if (employeeId) filter.employeeId = employeeId;

  const requests = await LeaveRequest.find(filter)
    .select("employeeId leaveTypeId scheduledDates startDate endDate")
    .lean();

  const types = await LeaveType.find({
    _id: { $in: requests.map((r) => r.leaveTypeId) },
  })
    .select("_id isPaid")
    .lean();
  const isPaidMap = new Map(types.map((t) => [String(t._id), t.isPaid]));

  const map = new Map();
  for (const r of requests) {
    const isPaid = isPaidMap.get(String(r.leaveTypeId));

    if (isPaid === undefined) continue;

    const dates = r.scheduledDates?.length
      ? r.scheduledDates
      : weekdaysInRange(r.startDate, r.endDate);
    const key = String(r.employeeId);
    if (!map.has(key)) {
      map.set(key, {
        unpaid: new Set(),
        paid: new Set(),
        paidBefore: new Set(),
      });
    }
    const info = map.get(key);
    for (const d of dates) {
      if (d >= start && d <= last) {
        (isPaid ? info.paid : info.unpaid).add(d);
      } else if (isPaid && d >= yearStart && d < start) {
        info.paidBefore.add(d);
      }
    }
  }
  return map;
}

function countLeave(leaveInfo, workedDates) {
  if (!leaveInfo) return 0;
  const worked = new Set(workedDates || []);

  let unpaid = 0;
  for (const d of leaveInfo.unpaid) if (!worked.has(d)) unpaid++;

  let paidThisMonth = 0;
  for (const d of leaveInfo.paid) if (!worked.has(d)) paidThisMonth++;

  const before = leaveInfo.paidBefore.size;
  const overQuota =
    Math.max(0, before + paidThisMonth - PAID_QUOTA_DAYS) -
    Math.max(0, before - PAID_QUOTA_DAYS);

  return unpaid + overQuota;
}

function countTotalLeave(leaveInfo, workedDates) {
  if (!leaveInfo) return 0;
  const worked = new Set(workedDates || []);
  let n = 0;
  for (const d of leaveInfo.unpaid) if (!worked.has(d)) n++;
  for (const d of leaveInfo.paid) if (!worked.has(d)) n++;
  return n;
}

async function computeLeave(month, employeeId) {
  const [leaveMap, statMap] = await Promise.all([
    loadLeaveDates(month, employeeId),
    loadStats(month, employeeId),
  ]);
  const info = leaveMap.get(String(employeeId));
  const worked = statMap.get(String(employeeId))?.dates;
  const leaveDays = countLeave(info, worked);
  return {
    leaveDays,
    leaveDeduction: calcLeaveDeduction(leaveDays),
    totalLeaveDays: countTotalLeave(info, worked),
  };
}

function buildRow(emp, stored, stat, month, leaveInfo) {
  const empInfo = {
    _id: emp._id,
    fullName: emp.fullName,
    employeeCode: emp.employeeCode,
    position: emp.position,
    email: emp.email,
    createdAt: emp.createdAt,
  };

  if (stored && stored.status === "finalized" && isMonthEnded(month)) {
    return {
      ...stored,
      leaveDays: stored.leaveDays ?? countLeave(leaveInfo, stat?.dates),
      leaveDeduction: stored.leaveDeduction ?? 0,
      totalLeaveDays:
        stored.totalLeaveDays ?? countTotalLeave(leaveInfo, stat?.dates),
      employeeId: empInfo,
    };
  }

  const totalHours = round2((stat?.minutes || 0) / 60);
  const totalCredit = round1(stat?.credit || 0);
  const baseSalary = stored
    ? stored.baseSalary
    : BASE_SALARY[getPayrollRole(emp)];
  const hourRate = stored ? stored.hourRate : HOUR_RATE;
  const allowance = stored ? stored.allowance : ALLOWANCE;
  const adjustment = stored ? stored.adjustment : 0;
  const hourBonus = Math.round(totalHours * hourRate);
  const leaveDays = countLeave(leaveInfo, stat?.dates);
  const leaveDeduction = calcLeaveDeduction(leaveDays);
  const totalLeaveDays = countTotalLeave(leaveInfo, stat?.dates);

  return {
    _id: stored?._id || null,
    employeeId: empInfo,
    month,
    totalCredit,
    totalHours,
    baseSalary,
    hourRate,
    allowance,
    adjustment,
    hourBonus,
    leaveDays,
    leaveDeduction,
    totalLeaveDays,
    total: baseSalary + hourBonus + allowance + adjustment - leaveDeduction,
    note: stored?.note || "",
    status: "draft",
  };
}

async function loadPayrollRows(month, onlyEmployeeId) {
  const [hasData, employees, storedList, statMap, leaveMap] = await Promise.all(
    [
      hasAttendance(month, onlyEmployeeId),
      Employee.find(onlyEmployeeId ? { _id: onlyEmployeeId } : {})
        .select("fullName employeeCode position email role createdAt")
        .lean(),
      Payroll.find(
        onlyEmployeeId ? { month, employeeId: onlyEmployeeId } : { month },
      ).lean(),
      loadStats(month, onlyEmployeeId),
      loadLeaveDates(month, onlyEmployeeId),
    ],
  );

  if (!hasData) return [];

  const storedMap = new Map(storedList.map((p) => [String(p.employeeId), p]));

  return employees
    .map((emp) =>
      buildRow(
        emp,
        storedMap.get(String(emp._id)),
        statMap.get(String(emp._id)),
        month,
        leaveMap.get(String(emp._id)),
      ),
    )

    .sort((a, b) => {
      const ta = new Date(a.employeeId.createdAt || 0).getTime();
      const tb = new Date(b.employeeId.createdAt || 0).getTime();
      if (ta !== tb) return ta - tb;
      return (a.employeeId.employeeCode || "").localeCompare(
        b.employeeId.employeeCode || "",
        undefined,
        { numeric: true },
      );
    });
}

async function finalizeMonth(month, userId) {
  const rows = await loadPayrollRows(month);
  const now = new Date();

  const ops = rows
    .filter((r) => r.status !== "finalized")
    .map((r) => ({
      updateOne: {
        filter: { employeeId: r.employeeId._id, month },
        update: {
          $set: {
            totalCredit: r.totalCredit,
            totalHours: r.totalHours,
            baseSalary: r.baseSalary,
            hourRate: r.hourRate,
            allowance: r.allowance,
            adjustment: r.adjustment,
            hourBonus: r.hourBonus,
            leaveDays: r.leaveDays,
            leaveDeduction: r.leaveDeduction,
            totalLeaveDays: r.totalLeaveDays,
            total: r.total,
            note: r.note,
            status: "finalized",
            finalizedBy: userId,
            finalizedAt: now,
          },
        },
        upsert: true,
      },
    }));

  if (ops.length > 0) {
    await Payroll.bulkWrite(ops, { ordered: false });
  }

  const [summary] = await Payroll.aggregate([
    { $match: { month, status: "finalized" } },
    { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$total" } } },
  ]);

  return {
    changed: ops.length,
    saved: summary?.count || 0,
    total: summary?.total || 0,
    finalizedAt: now,
  };
}

async function recalcPayroll(employeeId, month) {
  const payroll = await Payroll.findOne({ employeeId, month });
  if (!payroll || payroll.status === "finalized") return payroll;

  const stat = (await loadStats(month, employeeId)).get(String(employeeId));
  payroll.totalHours = round2((stat?.minutes || 0) / 60);
  payroll.totalCredit = round1(stat?.credit || 0);
  const leave = await computeLeave(month, employeeId);
  payroll.leaveDays = leave.leaveDays;
  payroll.leaveDeduction = leave.leaveDeduction;
  payroll.totalLeaveDays = leave.totalLeaveDays;
  await payroll.save();
  return payroll;
}

module.exports = {
  BASE_SALARY,
  HOUR_RATE,
  ALLOWANCE,
  LEAVE_PENALTY_PER_DAY,
  calcLeaveDeduction,
  computeLeave,
  round1,
  round2,
  getPayrollRole,
  canManagePayroll,
  loadActor,
  isPayrollManager,
  currentMonth,
  isMonthEnded,
  lastDayOfMonth,
  hasAttendance,
  loadStats,
  loadPayrollRows,
  finalizeMonth,
  recalcPayroll,
};
