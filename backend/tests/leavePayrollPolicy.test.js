const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const { getCountedLeaveDates } = require("../src/utils/leaveDates");
let requests, attendance;
const query = (data) => ({
  select() {
    return this;
  },
  lean() {
    return Promise.resolve(data);
  },
});
const mock = {
  mongoose: {
    Types: {
      ObjectId: class {
        constructor(id) {
          this.id = id;
        }
      },
    },
  },
  "../models/Attendance": { aggregate: async () => attendance },
  "../models/Employee": {},
  "../models/Payroll": {},
  "../models/LeaveRequest": {
    find: (f) =>
      query(
        requests.filter(
          (r) =>
            r.status === f.status &&
            r.employeeId === f.employeeId &&
            r.startDate <= f.startDate.$lte &&
            r.endDate >= f.endDate.$gte,
        ),
      ),
  },
  "../models/LeaveType": {
    find: () =>
      query([
        { _id: "paid", isPaid: true },
        { _id: "unpaid", isPaid: false },
      ]),
  },
};
let computeLeave;
const original = Module._load;
try {
  Module._load = function (name, ...args) {
    return Object.hasOwn(mock, name)
      ? mock[name]
      : original.call(this, name, ...args);
  };
  ({ computeLeave } = require("../src/utils/payrollHelper"));
} finally {
  Module._load = original;
}
const row = (type, startDate, endDate, status = "approved") => ({
  employeeId: "emp",
  leaveTypeId: type,
  status,
  startDate,
  endDate,
  scheduledDates: getCountedLeaveDates(startDate, endDate),
});
test.beforeEach(() => {
  requests = [];
  attendance = [];
});
test("lương đọc 3 ngày có lương đã duyệt từ danh sách ngày, không truy vấn lịch phân ca", async () => {
  requests = [row("paid", "2026-11-26", "2026-11-30")];
  assert.deepEqual(await computeLeave("2026-11", "emp"), {
    leaveDays: 0,
    leaveDeduction: 0,
    totalLeaveDays: 3,
  });
});
test("lương chỉ tính đơn đã duyệt; không trùng ngày đi làm thực tế", async () => {
  requests = [
    row("unpaid", "2026-11-26", "2026-11-30"),
    row("paid", "2026-11-23", "2026-11-25", "pending"),
  ];
  attendance = [{ _id: "emp", dates: ["2026-11-27"] }];
  assert.deepEqual(await computeLeave("2026-11", "emp"), {
    leaveDays: 2,
    leaveDeduction: 200000,
    totalLeaveDays: 2,
  });
});
