// Cấu hình + công thức tính lương (hàm thuần, không đụng database)

const CONFIG = {
  HOURS_PER_DAY: 8,
  ANNUAL_LEAVE_QUOTA: 12, // ngày phép năm có lương / năm

  // Hệ số làm thêm giờ
  OT_RATE: { weekday: 1.5, weekend: 2, holiday: 3 },

  // Tắt/bật khoản trừ (đặt false nếu không muốn tính)
  ENABLE_INSURANCE: true,
  ENABLE_PIT: true,

  // Bảo hiểm bắt buộc phần người lao động
  INSURANCE: {
    bhxh: 0.08,
    bhyt: 0.015,
    bhtn: 0.01,
    capBhxhBhyt: 50_600_000, // 20 x mức tham chiếu 2.530.000 (từ 01/07/2026)
    capBhtn: 106_200_000, // 20 x lương tối thiểu vùng I 5.310.000
  },

  // Thuế TNCN từ 2026 (biểu 5 bậc, tính theo tháng)
  PIT: {
    personal: 15_500_000,
    dependent: 6_200_000,
    brackets: [
      [10_000_000, 0.05],
      [30_000_000, 0.1],
      [60_000_000, 0.2],
      [100_000_000, 0.3],
      [Infinity, 0.35],
    ],
  },

  // Ngày lễ cố định (MM-DD). Tết âm lịch, Giỗ Tổ, ngày nghỉ bù...
  // thay đổi mỗi năm nên thêm tay vào EXTRA_HOLIDAYS dạng "YYYY-MM-DD".
  FIXED_HOLIDAYS: ["01-01", "04-30", "05-01", "09-02"],
  EXTRA_HOLIDAYS: [],
};

const FIXED = new Set(CONFIG.FIXED_HOLIDAYS);
const EXTRA = new Set(CONFIG.EXTRA_HOLIDAYS);

const pad = (n) => String(n).padStart(2, "0");
const round2 = (n) => Math.round(n * 100) / 100;
const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

const isWeekend = (dow) => dow === 0 || dow === 6;
const isHoliday = (y, m, d) =>
  FIXED.has(`${pad(m)}-${pad(d)}`) || EXTRA.has(`${y}-${pad(m)}-${pad(d)}`);

// Công chuẩn (T2-T6, gồm cả lễ rơi vào ngày thường) và số ngày lễ ngày thường
const monthInfo = (month) => {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let standardDays = 0;
  let holidayDays = 0;
  for (let d = 1; d <= last; d++) {
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (isWeekend(dow)) continue;
    standardDays++;
    if (isHoliday(y, m, d)) holidayDays++;
  }
  return { standardDays, holidayDays };
};

// "YYYY-MM-DD" hoặc Date -> số ngày (UTC)
const toDayIndex = (v) => {
  if (!v) return null;
  let y, m, d;
  if (v instanceof Date) {
    y = v.getUTCFullYear();
    m = v.getUTCMonth() + 1;
    d = v.getUTCDate();
  } else {
    [y, m, d] = String(v).slice(0, 10).split("-").map(Number);
  }
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d) / 86400000;
};

// Duyệt từng ngày từ start đến end (tối đa 367 ngày)
const forEachDay = (start, end, fn) => {
  const a = toDayIndex(start);
  const b = toDayIndex(end || start);
  if (a == null || b == null) return;
  for (let i = a; i <= Math.min(b, a + 366); i++) {
    const dt = new Date(i * 86400000);
    fn(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), dt.getUTCDay());
  }
};

// Thuế lũy tiến từng phần
const progressiveTax = (income) => {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of CONFIG.PIT.brackets) {
    if (income <= lower) break;
    tax += (Math.min(income, upper) - lower) * rate;
    lower = upper;
  }
  return Math.round(tax);
};

/**
 * CÔNG THỨC TÍNH LƯƠNG
 *
 * Lương 1 công       = Lương cơ bản / Công chuẩn (số ngày T2-T6 trong tháng)
 * Công hưởng lương   = công làm (chấm công) + ngày lễ + nghỉ phép có lương
 *                      (tối đa = công chuẩn)
 * Lương theo công    = Lương 1 công x Công hưởng lương
 *                      (nghỉ không lương / vắng mặt tự động không được tính)
 * Lương OT           = Lương 1 giờ x (OT thường x 150% + cuối tuần x 200% + lễ x 300%)
 * Tổng thu nhập      = Lương theo công + Lương OT + Phụ cấp + Điều chỉnh
 * Bảo hiểm           = 10,5% lương cơ bản (có mức trần)
 * Thu nhập tính thuế = Tổng thu nhập - phần OT miễn thuế - Bảo hiểm - giảm trừ gia cảnh
 * Thực nhận          = Tổng thu nhập - Bảo hiểm - Thuế TNCN
 *
 * Kết quả dùng đúng tên trường cũ của model:
 *   totalCredit = công hưởng lương, hourBonus = lương OT, total = thực nhận
 */
const calculate = (p) => {
  const fallback = /^\d{4}-\d{2}$/.test(String(p.month || ""))
    ? monthInfo(p.month)
    : { standardDays: 0, holidayDays: 0 };
  const hasStd = num(p.standardDays) > 0;
  const std = hasStd ? num(p.standardDays) : fallback.standardDays;
  const holidayDays = hasStd ? num(p.holidayDays) : fallback.holidayDays;

  const base = num(p.baseSalary);
  const dailyRate = std > 0 ? base / std : 0;
  const hourlyRate = dailyRate / CONFIG.HOURS_PER_DAY;

  const paidDays = round2(
    Math.min(std, num(p.workDays) + holidayDays + num(p.paidLeaveDays)),
  );
  // Đủ công chuẩn thì nhận đúng lương cơ bản (tránh lệch 1 đ do làm tròn)
  const salaryByDays =
    std > 0 && paidDays >= std ? base : Math.round(dailyRate * paidDays);

  const otWd = num(p.otWeekdayHours);
  const otWe = num(p.otWeekendHours);
  const otHo = num(p.otHolidayHours);
  const { weekday, weekend, holiday } = CONFIG.OT_RATE;
  const otPay = Math.round(
    hourlyRate * (otWd * weekday + otWe * weekend + otHo * holiday),
  );
  // Phần chênh lệch so với giờ làm bình thường được miễn thuế
  const otPremium = Math.max(
    0,
    Math.round(otPay - hourlyRate * (otWd + otWe + otHo)),
  );

  const gross = salaryByDays + otPay + num(p.allowance) + num(p.adjustment);

  const I = CONFIG.INSURANCE;
  const insurance = CONFIG.ENABLE_INSURANCE
    ? Math.round(
        Math.min(base, I.capBhxhBhyt) * (I.bhxh + I.bhyt) +
          Math.min(base, I.capBhtn) * I.bhtn,
      )
    : 0;

  const taxableIncome = Math.max(
    0,
    gross -
      otPremium -
      insurance -
      CONFIG.PIT.personal -
      num(p.dependents) * CONFIG.PIT.dependent,
  );
  const pit = CONFIG.ENABLE_PIT ? progressiveTax(taxableIncome) : 0;

  return {
    totalCredit: paidDays,
    salaryByDays,
    hourBonus: otPay,
    otPremium,
    gross,
    insurance,
    taxableIncome,
    pit,
    total: gross - insurance - pit,
  };
};

module.exports = {
  CONFIG,
  pad,
  round2,
  isHoliday,
  isWeekend,
  monthInfo,
  forEachDay,
  calculate,
};