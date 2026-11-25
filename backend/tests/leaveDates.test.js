const test = require('node:test');
const assert = require('node:assert/strict');
const { calendarDays, isValidDateOnly, describeRequest, getCountedLeaveDates } = require('../src/utils/leaveDates');
const { summarizeQuota } = require('../src/utils/leaveQuota');
const sample = { _id:'old', startDate:'2026-11-18', endDate:'2026-11-30', scheduledDates:['2026-11-19','2026-11-23'], totalDays:2, status:'approved' };
test('đơn lịch sử 18–30/11 giữ 13 ngày theo lịch, 2 ngày đã duyệt', () => {
  const result = describeRequest(sample, sample.scheduledDates, []);
  assert.equal(result.calendarDays, 13);
  assert.equal(result.totalDays, 2);
  assert.equal(result.scheduleChanged, false);
});
test('cùng ngày, tháng nhuận, chuyển tháng và vắt năm', () => {
  assert.equal(calendarDays('2026-11-18','2026-11-18'),1);
  assert.equal(calendarDays('2024-02-28','2024-03-01'),3);
  assert.equal(calendarDays('2026-12-31','2027-01-02'),3);
});
test('chặn ngày sai, thứ tự sai và ngày ISO timestamp', () => {
  assert.equal(isValidDateOnly('2026-02-29'),false);
  assert.equal(isValidDateOnly('2026-11-18T00:00:00Z'),false);
  assert.equal(calendarDays('2026-11-30','2026-11-18'),null);
});
test('pending tính lại số ngày, bỏ ngày trùng và ngoài khoảng', () => {
  const result = describeRequest({...sample,status:'pending'}, ['2026-11-23','2026-11-24','2026-11-24','2026-12-01','2026-02-30'], ['2026-11-24','2026-11-25']);
  assert.deepEqual(result.scheduledDates,['2026-11-23','2026-11-24']);
  assert.deepEqual(result.draftDates,['2026-11-25']);
  assert.equal(result.scheduleChanged,true);
});
test('approved giữ nguyên số ngày đã duyệt, cảnh báo nếu lịch đổi', () => {
  const result = describeRequest(sample, ['2026-11-19','2026-11-23','2026-11-24'], []);
  assert.equal(result.totalDays,2);
  assert.equal(result.currentScheduledDates.length,3);
  assert.equal(result.scheduleChanged,true);
  assert.deepEqual(sample.scheduledDates,['2026-11-19','2026-11-23']);
});
test('đơn cũ thiếu ngày không tự tái tạo dữ liệu đã duyệt', () => {
  const result = describeRequest({...sample,totalDays:null,scheduledDates:[]}, ['2026-11-23'], []);
  assert.equal(result.totalDays,null);
  assert.equal(result.unresolved,true);
  assert.deepEqual(result.scheduledDates,[]);
});
test('đơn vắt năm nhưng chỉ có ngày làm việc năm sau không cộng nhầm năm trước', () => {
  const r = {...sample,startDate:'2026-12-31',endDate:'2027-01-02',scheduledDates:['2027-01-02'],totalDays:1};
  assert.equal(summarizeQuota([r],2026).usedDays,0);
  assert.deepEqual(summarizeQuota([r],2026).unresolvedApproved,[]);
  assert.equal(summarizeQuota([r],2027).usedDays,1);
});
test('số ngày đã duyệt và chờ duyệt không đếm trùng', () => {
  const sum = summarizeQuota([sample,{...sample,_id:'other',status:'pending'}],2026);
  assert.equal(sum.usedDays,2);
  assert.equal(sum.reservedDays,0);
  assert.equal(sum.remainingDays,10);
});
test('đơn cũ có tổng số nhưng thiếu danh sách ngày phải đối chiếu', () => {
  const r = {...sample,scheduledDates:[],totalDays:2};
  assert.deepEqual(summarizeQuota([r],2026).unresolvedApproved,['old']);
});

test('quy tắc mới: 18–30 có 9 ngày, không có lịch vẫn tính được', () => {
  assert.equal(getCountedLeaveDates('2026-11-18','2026-11-30').length,9);
  assert.deepEqual(getCountedLeaveDates('2026-11-26','2026-11-30'),['2026-11-26','2026-11-27','2026-11-30']);
});
test('ngày lễ, ngày cuối tuần và ca cuối tuần đã công bố', () => {
  assert.deepEqual(getCountedLeaveDates('2026-12-31','2027-01-04'),['2026-12-31','2027-01-04']);
  assert.deepEqual(getCountedLeaveDates('2026-11-27','2026-11-29',['2026-11-28','2026-11-28','2026-12-01']),['2026-11-27','2026-11-28']);
  assert.deepEqual(getCountedLeaveDates('2027-01-01','2027-01-01',['2027-01-01']),[]);
});
