const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PAID_QUOTA_DAYS,
  getYearsInRange,
  countDaysForYear,
  summarizeQuota,
  exceedsPaidQuota,
} = require("../src/utils/leaveQuota");

test("hạn mức 12 ngày", () => assert.equal(PAID_QUOTA_DAYS, 12));
test("đếm ngày published không đếm trùng", () => {
  assert.equal(
    countDaysForYear(["2026-11-23", "2026-11-23", "2026-11-24"], 2026),
    2,
  );
});
test("nghỉ vắt năm được tách đúng năm", () => {
  assert.deepEqual(getYearsInRange("2026-12-31", "2027-01-02"), [2026, 2027]);
  assert.equal(countDaysForYear(["2026-12-31", "2027-01-02"], 2026), 1);
});
test("approved trừ ngày, pending giữ chỗ, rejected bỏ qua", () => {
  const summary = summarizeQuota(
    [
      {
        _id: "a",
        status: "approved",
        startDate: "2026-01-01",
        endDate: "2026-01-05",
        totalDays: 2,
        scheduledDates: ["2026-01-02", "2026-01-03"],
      },
      {
        _id: "b",
        status: "pending",
        startDate: "2026-07-01",
        endDate: "2026-07-02",
        totalDays: 1,
        scheduledDates: ["2026-07-01"],
      },
      {
        _id: "c",
        status: "rejected",
        startDate: "2026-08-01",
        endDate: "2026-08-09",
        scheduledDates: ["2026-08-01"],
      },
    ],
    2026,
  );
  assert.equal(summary.usedDays, 2);
  assert.equal(summary.reservedDays, 1);
  assert.equal(summary.remainingDays, 9);
});
test("đơn paid đã duyệt mà không có lịch phải cảnh báo, không coi bằng 0 hợp lệ", () => {
  const r = summarizeQuota(
    [
      {
        _id: "old",
        status: "approved",
        startDate: "2026-11-16",
        endDate: "2026-11-18",
        scheduledDates: [],
      },
    ],
    2026,
  );
  assert.deepEqual(r.unresolvedApproved, ["old"]);
});

test("chặn cấp vượt 12, cho cấp đủ 12", () => {
  const q = { usedDays: 9, reservedDays: 2 };
  assert.equal(exceedsPaidQuota(q, 1), false);
  assert.equal(exceedsPaidQuota(q, 2), true);
});
