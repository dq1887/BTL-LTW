const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const Payroll = require("../models/Payroll");

const BASE_SALARY = {
  employee: 10_000_000,
  manager: 15_000_000,
  director: 20_000_000,
  accountant: 10_000_000, // chưa có yêu cầu riêng, tạm để bằng nhân viên
};
const HOUR_RATE = 40_000;
const ALLOWANCE = 1_000_000;

const norm = (s) => (s || "").toString().toLowerCase();
const round2 = (n) => Math.round(n * 100) / 100;
const round1 = (n) => Math.round(n * 10) / 10;

// Xác định vai trò tính lương của một nhân viên
function getPayrollRole(emp) {
  const pos = norm(emp?.position);
  const role = norm(emp?.role);

  if (
    role === "admin_hr" ||
    pos.includes("giám đốc") ||
    norm(emp?.email).includes("nam.duong")
  )
    return "director";

  if (pos.includes("kế toán") || pos.includes("accountant")) return "accountant";

  if (
    role === "manager" ||
    pos.includes("trưởng phòng") ||
    pos.includes("leader")
  )
    return "manager";

  return "employee";
}

// Chỉ kế toán và giám đốc được sửa/chốt lương, xem lương mọi người
const canManagePayroll = (emp) =>
  ["director", "accountant"].includes(getPayrollRole(emp));

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// Tổng phút + tổng công từ bảng chấm công, gộp theo nhân viên (1 truy vấn)
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
      },
    },
  ]);
  return new Map(stats.map((s) => [String(s._id), s]));
}

// Dựng 1 dòng bảng lương (chưa ghi database)
//  - Đã chốt: dùng đúng số liệu đã lưu trong database
//  - Chưa chốt: lấy số giờ mới nhất từ chấm công, giữ các giá trị đã sửa tay (nếu có)
function buildRow(emp, stored, stat, month) {
  const empInfo = {
    _id: emp._id,
    fullName: emp.fullName,
    employeeCode: emp.employeeCode,
    position: emp.position,
    email: emp.email,
  };

  if (stored && stored.status === "finalized") {
    return { ...stored, employeeId: empInfo };
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
    total: baseSalary + hourBonus + allowance + adjustment,
    note: stored?.note || "",
    status: "draft",
  };
}

// Tải bảng lương của cả công ty (hoặc 1 người). 3 truy vấn gộp, KHÔNG ghi database
async function loadPayrollRows(month, onlyEmployeeId) {
  const [employees, storedList, statMap] = await Promise.all([
    Employee.find(onlyEmployeeId ? { _id: onlyEmployeeId } : {})
      .select("fullName employeeCode position email role")
      .lean(),
    Payroll.find(
      onlyEmployeeId ? { month, employeeId: onlyEmployeeId } : { month },
    ).lean(),
    loadStats(month, onlyEmployeeId),
  ]);

  const storedMap = new Map(storedList.map((p) => [String(p.employeeId), p]));

  return employees
    .map((emp) =>
      buildRow(
        emp,
        storedMap.get(String(emp._id)),
        statMap.get(String(emp._id)),
        month,
      ),
    )
    .sort((a, b) =>
      (a.employeeId.employeeCode || "").localeCompare(
        b.employeeId.employeeCode || "",
      ),
    );
}

// CHỐT LƯƠNG: ghi mọi bảng lương chưa chốt vào database với trạng thái finalized.
// Bản ghi chưa có thì tạo mới, bản ghi đã có (ví dụ vừa sửa) thì cập nhật lại.
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

  // Đọc lại từ database để xác nhận số liệu đã lưu
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

// Tự cập nhật khi nhân viên vào ca / tan ca:
// chỉ cập nhật bản ghi nháp đã có trong database, bản đã chốt thì giữ nguyên.
// (Bản chưa có trong database luôn được tính mới mỗi lần mở trang.)
async function recalcPayroll(employeeId, month) {
  const payroll = await Payroll.findOne({ employeeId, month });
  if (!payroll || payroll.status === "finalized") return payroll;

  const stat = (await loadStats(month, employeeId)).get(String(employeeId));
  payroll.totalHours = round2((stat?.minutes || 0) / 60);
  payroll.totalCredit = round1(stat?.credit || 0);
  await payroll.save(); // hook pre("validate") tự tính lại tiền
  return payroll;
}

module.exports = {
  BASE_SALARY,
  HOUR_RATE,
  ALLOWANCE,
  round1,
  round2,
  getPayrollRole,
  canManagePayroll,
  currentMonth,
  loadStats,
  loadPayrollRows,
  finalizeMonth,
  recalcPayroll,
};