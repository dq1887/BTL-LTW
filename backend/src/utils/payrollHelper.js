const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const Payroll = require("../models/Payroll");
const LeaveRequest = require("../models/LeaveRequest");

const BASE_SALARY = {
  employee: 10_000_000,
  manager: 15_000_000,
  director: 20_000_000,
  accountant: 10_000_000, // chưa có yêu cầu riêng, tạm để bằng nhân viên
};
const HOUR_RATE = 40_000;
const ALLOWANCE = 1_000_000;

// Nghỉ phép: được nghỉ tối đa 2 ngày/tháng không bị trừ.
// Từ ngày nghỉ thứ 3 trở đi, mỗi ngày nghỉ bị trừ 200.000 đ.
const LEAVE_FREE_DAYS = 2;
const LEAVE_PENALTY_PER_DAY = 200_000;
const calcLeaveDeduction = (days) =>
  Math.max(0, days - LEAVE_FREE_DAYS) * LEAVE_PENALTY_PER_DAY;

const norm = (s) => (s || "").toString().toLowerCase();
const round2 = (n) => Math.round(n * 100) / 100;
const round1 = (n) => Math.round(n * 10) / 10;

// Xác định vai trò tính lương của một nhân viên
//  - Giám đốc    : role admin_hr, hoặc position chứa "giám đốc", hoặc email nam.duong
//  - Kế toán     : role accountant, hoặc position chứa "kế toán"
//  - Trưởng phòng: role manager, hoặc position chứa "trưởng phòng" / "leader"
//  - Còn lại là nhân viên
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

// Kế toán và giám đốc có quyền như nhau: xem lương mọi người, sửa lương, chốt lương
const canManagePayroll = (emp) =>
  ["director", "accountant"].includes(getPayrollRole(emp));

// Đọc lại người đang đăng nhập từ DATABASE (role, position, email luôn mới nhất)
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

// Ngày cuối cùng của tháng "YYYY-MM" -> "YYYY-MM-DD"
function lastDayOfMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

// Tháng đã kết thúc chưa? (chỉ khi qua hết ngày cuối tháng mới được chốt lương)
function isMonthEnded(month) {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return today > lastDayOfMonth(month);
}

// Tháng này có dữ liệu chấm công không? (của cả công ty, hoặc của 1 nhân viên)
async function hasAttendance(month, employeeId) {
  const filter = { workDate: { $regex: `^${month}` } };
  if (employeeId) filter.employeeId = employeeId;
  return !!(await Attendance.exists(filter));
}

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
        dates: { $addToSet: "$workDate" }, // các ngày thực sự đi làm
      },
    },
  ]);
  return new Map(stats.map((s) => [String(s._id), s]));
}

// Liệt kê các ngày làm việc (T2-T6) trong khoảng start..end
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

// Các ngày nghỉ phép ĐÃ DUYỆT trong tháng, gộp theo nhân viên: Map<employeeId, Set<ngày>>
// Ưu tiên scheduledDates (lịch đã công bố), nếu rỗng thì lấy theo khoảng startDate..endDate.
async function loadLeaveDates(month, employeeId) {
  const start = `${month}-01`;
  const last = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  )
    .toISOString()
    .slice(0, 10);

  const filter = {
    status: "approved",
    startDate: { $lte: last },
    endDate: { $gte: start },
  };
  if (employeeId) filter.employeeId = employeeId;

  const requests = await LeaveRequest.find(filter)
    .select("employeeId scheduledDates startDate endDate")
    .lean();

  const map = new Map();
  for (const r of requests) {
    const dates = r.scheduledDates?.length
      ? r.scheduledDates
      : weekdaysInRange(r.startDate, r.endDate);
    const key = String(r.employeeId);
    if (!map.has(key)) map.set(key, new Set());
    for (const d of dates) if (d >= start && d <= last) map.get(key).add(d);
  }
  return map;
}

// Số ngày nghỉ tính tiền = ngày nghỉ đã duyệt mà nhân viên không đi làm thực tế
function countLeave(leaveSet, workedDates) {
  if (!leaveSet) return 0;
  const worked = new Set(workedDates || []);
  let n = 0;
  for (const d of leaveSet) if (!worked.has(d)) n++;
  return n;
}

// Tính nghỉ phép + tiền trừ của 1 nhân viên trong 1 tháng
async function computeLeave(month, employeeId) {
  const [leaveMap, statMap] = await Promise.all([
    loadLeaveDates(month, employeeId),
    loadStats(month, employeeId),
  ]);
  const leaveDays = countLeave(
    leaveMap.get(String(employeeId)),
    statMap.get(String(employeeId))?.dates,
  );
  return { leaveDays, leaveDeduction: calcLeaveDeduction(leaveDays) };
}

// Dựng 1 dòng bảng lương (chưa ghi database)
//  - Đã chốt (và tháng đã kết thúc): dùng đúng số liệu đã lưu trong database
//  - Chưa chốt / tháng chưa hết: lấy số giờ mới nhất từ chấm công, giữ các giá trị đã sửa tay (nếu có)
function buildRow(emp, stored, stat, month, leaveSet) {
  const empInfo = {
    _id: emp._id,
    fullName: emp.fullName,
    employeeCode: emp.employeeCode,
    position: emp.position,
    email: emp.email,
    createdAt: emp.createdAt,
  };

  // Chỉ phiếu của tháng ĐÃ KẾT THÚC mới được coi là đã chốt.
  // Tháng chưa hết thì luôn tính tự động theo chấm công / nghỉ phép mới nhất.
  if (stored && stored.status === "finalized" && isMonthEnded(month)) {
    return {
      ...stored,
      // Phiếu chốt từ trước khi có cột nghỉ phép: hiển thị số ngày nghỉ thực tế,
      // còn tiền trừ giữ nguyên số đã chốt (chốt lại phiếu để áp dụng quy tắc mới)
      leaveDays: stored.leaveDays ?? countLeave(leaveSet, stat?.dates),
      leaveDeduction: stored.leaveDeduction ?? 0,
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
  const leaveDays = countLeave(leaveSet, stat?.dates);
  const leaveDeduction = calcLeaveDeduction(leaveDays);

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
    total: baseSalary + hourBonus + allowance + adjustment - leaveDeduction,
    note: stored?.note || "",
    status: "draft",
  };
}

// Tải bảng lương của cả công ty (hoặc 1 người). KHÔNG ghi database.
// Tháng không có dữ liệu chấm công thì trả về danh sách rỗng (không tính lương).
async function loadPayrollRows(month, onlyEmployeeId) {
  const [hasData, employees, storedList, statMap, leaveMap] = await Promise.all([
    hasAttendance(month, onlyEmployeeId),
    Employee.find(onlyEmployeeId ? { _id: onlyEmployeeId } : {})
      .select("fullName employeeCode position email role createdAt")
      .lean(),
    Payroll.find(
      onlyEmployeeId ? { month, employeeId: onlyEmployeeId } : { month },
    ).lean(),
    loadStats(month, onlyEmployeeId),
    loadLeaveDates(month, onlyEmployeeId),
  ]);

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
    // Nhân viên cũ ở trên, nhân viên mới thêm vào luôn nằm ở cuối
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
            leaveDays: r.leaveDays,
            leaveDeduction: r.leaveDeduction,
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
async function recalcPayroll(employeeId, month) {
  const payroll = await Payroll.findOne({ employeeId, month });
  if (!payroll || payroll.status === "finalized") return payroll;

  const stat = (await loadStats(month, employeeId)).get(String(employeeId));
  payroll.totalHours = round2((stat?.minutes || 0) / 60);
  payroll.totalCredit = round1(stat?.credit || 0);
  const leave = await computeLeave(month, employeeId);
  payroll.leaveDays = leave.leaveDays;
  payroll.leaveDeduction = leave.leaveDeduction;
  await payroll.save(); // hook pre("validate") tự tính lại tiền
  return payroll;
}

module.exports = {
  BASE_SALARY,
  HOUR_RATE,
  ALLOWANCE,
  LEAVE_FREE_DAYS,
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