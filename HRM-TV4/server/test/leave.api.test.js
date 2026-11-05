import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
vi.mock('../src/models/LeaveRequest.js', async () => ({ LeaveRequest: (await import('./helpers/memoryModel.js')).makeModel('LeaveRequest') }));
vi.mock('../src/models/LeaveType.js', async () => ({ LeaveType: (await import('./helpers/memoryModel.js')).makeModel('LeaveType') }));
vi.mock('../src/integrations/referenceModels.js', async () => {
  const { makeModel } = await import('./helpers/memoryModel.js');
  return Object.fromEntries(['Employee', 'Department', 'User', 'Schedule', 'Shift', 'Attendance', 'Payroll'].map((name) => [name, makeModel(name)]));
});
vi.mock('../src/integrations/hrmLock.js', () => ({ withHrmTransaction: (work) => work({ testSession: true }) }));
import { app } from '../src/app.js';
import { LeaveRequest } from '../src/models/LeaveRequest.js';
import { LeaveType } from '../src/models/LeaveType.js';
import { Employee, Department, Schedule, User, Attendance, Payroll } from '../src/integrations/referenceModels.js';
import { resetModels } from './helpers/memoryModel.js';
import { getLeavePayrollInput, assertNoApprovedLeave, assertNoPendingLeave } from '../src/services/leaveIntegrationService.js';
import { withAttendanceLeaveGuard } from '../src/integrations/forAttendance.js';
import { createLeaveAwareAttendanceService } from '../src/integrations/attendanceRecipe.js';
import { createLeaveAwarePayrollService } from '../src/integrations/payrollRecipe.js';
import { withScheduleLeaveGuard } from '../src/integrations/forSchedule.js';
import { withPayrollLeaveGuard } from '../src/integrations/forPayroll.js';
let annual, unpaid;
const ids = Object.fromEntries(['employee', 'manager', 'hr', 'other', 'otherManager', 'it', 'sales'].map((name, index) => [name, String(index + 1).padStart(24, '0')]));
const users = {}; const headers = (name = 'employee') => ({ Authorization: 'Bearer ' + jwt.sign({}, process.env.JWT_SECRET, { subject: users[name], algorithm: 'HS256' }) });
const data = (extra = {}) => ({ leaveTypeId: annual._id, fromDate: '2026-11-09', toDate: '2026-11-10', reason: 'Giải quyết việc gia đình', ...extra });
const create = (extra = {}, name = 'employee') => request(app).post('/api/leave-requests').set(headers(name)).send(data(extra));
const approve = (id, name = 'manager') => request(app).post(`/api/leave-requests/${id}/approve`).set(headers(name)).send({});
const remaining = async () => (await request(app).get(`/api/leave-balances/${ids.employee}?year=2026`).set(headers())).body.data.find((row) => row.leaveTypeId === annual._id).remainingDays;
beforeEach(async () => {
  process.env.JWT_SECRET = 'api-contract-test-secret-at-least-32-characters'; resetModels();
  await Department.create([{ _id: ids.it, managerId: ids.manager }, { _id: ids.sales, managerId: ids.otherManager }]);
  const passwordHash = await bcrypt.hash('123456', 4);
  for (const name of ['employee', 'manager', 'hr', 'other', 'otherManager']) {
    await Employee.create({ _id: ids[name], employeeCode: name, fullName: name, departmentId: ['other', 'otherManager'].includes(name) ? ids.sales : ids.it, status: 'active' });
    users[name] = (await User.create({ username: name, employeeId: ids[name], passwordHash, role: name === 'hr' ? 'admin_hr' : name.toLowerCase().includes('manager') ? 'manager' : 'employee' }))._id;
    for (const workDate of ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-12-31', '2027-01-04']) await Schedule.create({ employeeId: ids[name], workDate, status: 'published' });
  }
  annual = await LeaveType.create({ code: 'ANNUAL', name: 'Phép năm', paid: true, annualQuota: 12, active: true });
  unpaid = await LeaveType.create({ code: 'UNPAID', name: 'Không lương', paid: false, annualQuota: null, active: true });
});
describe('HTTP API + nghiệp vụ thật, model được giả lập trong bộ nhớ', () => {
  it('01 HR CRUD loại nghỉ, unique và phân quyền', async () => {
    const body = { code: 'special', name: 'Nghỉ đặc biệt', paid: true, annualQuota: 3 };
    expect((await request(app).post('/api/leave-types').set(headers()).send(body)).status).toBe(403);
    const result = await request(app).post('/api/leave-types').set(headers('hr')).send(body);
    expect(result.status).toBe(201); expect(result.body.data.code).toBe('SPECIAL');
    expect((await request(app).post('/api/leave-types').set(headers('hr')).send(body)).status).toBe(409);
    const url = `/api/leave-types/${result.body.data.id}`;
    expect((await request(app).get(url).set(headers())).status).toBe(200);
    expect((await request(app).patch(url).set(headers('hr')).send({ name: 'Tên mới' })).status).toBe(200);
    expect((await request(app).delete(url).set(headers('hr'))).status).toBe(204);
  });
  it('02 chặn ngày ngược/ngày không có thật và không lưu', async () => {
    expect((await create({ toDate: '2026-11-08' })).status).toBe(400);
    expect((await create({ fromDate: '2026-02-30' })).status).toBe(400);
    expect(LeaveRequest.rows).toHaveLength(0);
  });
  it('03 không trùng khoảng pending hoặc approved', async () => {
    const first = await create(); expect((await create()).status).toBe(409);
    await approve(first.body.data.id); expect((await create()).status).toBe(409);
  });
  it('04 approvedDays + requestedDays không vượt quota, duyệt kiểm tra lại', async () => {
    annual.annualQuota = 2;
    const a = await create(); const b = await create({ fromDate: '2026-11-11', toDate: '2026-11-12' });
    expect(a.status).toBe(201); expect(b.status).toBe(201);
    expect((await approve(a.body.data.id)).status).toBe(200);
    const rejected = await approve(b.body.data.id); expect(rejected.status).toBe(409); expect(rejected.body.code).toBe('QUOTA_EXCEEDED');
  });
  it('05 tạo pending đúng ngày published, pending chưa trừ phép', async () => {
    const schedule = Schedule.rows.find((row) => row.employeeId === ids.employee && row.workDate === '2026-11-10'); schedule.status = 'draft';
    const result = await create(); expect(result.status).toBe(201); expect(result.body.data.status).toBe('pending');
    expect(result.body.data.requestedDays).toBe(1); expect(result.body.data.leaveDates).toEqual(['2026-11-09']); expect(await remaining()).toBe(12);
  });
  it('06 Manager duyệt đúng phòng và sai phòng bị chặn', async () => {
    const result = await create(); expect((await approve(result.body.data.id, 'otherManager')).status).toBe(403);
    expect((await approve(result.body.data.id)).status).toBe(200); expect(await remaining()).toBe(10);
  });
  it('07 cấm tự duyệt cho cả Manager và HR', async () => { for (const name of ['manager', 'hr']) { const result = await create({}, name); expect((await approve(result.body.data.id, name)).status).toBe(403); } });
  it('08 HR hủy approved hoàn phép đúng một lần', async () => {
    const result = await create(); await approve(result.body.data.id); expect(await remaining()).toBe(10);
    const url = `/api/leave-requests/${result.body.data.id}/cancel`;
    expect((await request(app).post(url).set(headers()).send({ note: 'Không nghỉ nữa' })).status).toBe(403);
    expect((await request(app).post(url).set(headers('hr')).send({ note: 'Xác nhận hủy' })).status).toBe(200);
    expect(await remaining()).toBe(12); expect((await request(app).post(url).set(headers('hr')).send({ note: 'Hủy lại lần nữa' })).status).toBe(409);
  });
  it('09 preview đếm đúng ngày, quota sau duyệt và không lưu đơn', async () => {
    const body = { ...data() }; delete body.reason;
    const result = await request(app).post('/api/leave-requests/preview').set(headers()).send(body);
    expect(result.status).toBe(200); expect(result.body.data.requestedDays).toBe(2); expect(result.body.data.years[0].remainingAfter).toBe(10); expect(LeaveRequest.rows).toHaveLength(0);
    expect((await request(app).post('/api/leave-requests/preview').set(headers()).send({ ...body, employeeId: ids.other })).status).toBe(403);
  });
  it('10 chủ đơn CRUD pending, chặn đổi chủ và đơn approved', async () => {
    const result = await create(); const url = `/api/leave-requests/${result.body.data.id}`;
    expect((await request(app).patch(url).set(headers()).send({})).status).toBe(400);
    expect((await request(app).patch(url).set(headers()).send({ employeeId: ids.other })).status).toBe(400);
    expect((await request(app).patch(url).set(headers()).send({ toDate: '2026-11-11' })).body.data.requestedDays).toBe(3);
    expect((await request(app).get(url).set(headers('other'))).status).toBe(403);
    expect((await request(app).delete(url).set(headers())).status).toBe(204);
    const second = await create(); await approve(second.body.data.id);
    expect((await request(app).patch(`/api/leave-requests/${second.body.data.id}`).set(headers()).send({ reason: 'Lý do mới' })).status).toBe(409);
  });
  it('11 từ chối cần lý do và lưu lịch sử, không trừ phép', async () => {
    const result = await create(); const url = `/api/leave-requests/${result.body.data.id}/reject`;
    expect((await request(app).post(url).set(headers('manager')).send({ note: '' })).status).toBe(400);
    expect((await request(app).post(url).set(headers('manager')).send({ note: 'Cần xem lại lịch' })).body.data.status).toBe('rejected');
    expect(await remaining()).toBe(12);
    const detail = await request(app).get(`/api/leave-requests/${result.body.data.id}`).set(headers());
    expect(detail.body.data.history[1].actorId.username).toBe('manager');
  });
  it('12 công thực tế chặn duyệt phép và guard chiều ngược', async () => {
    const result = await create(); const schedule = Schedule.rows.find((row) => row.employeeId === ids.employee && row.workDate === '2026-11-09');
    await Attendance.create({ employeeId: ids.employee, scheduleId: schedule._id, checkOutAt: new Date() });
    expect((await approve(result.body.data.id)).body.code).toBe('ATTENDANCE_CONFLICT'); Attendance.rows = [];
    await approve(result.body.data.id);
    await expect(assertNoApprovedLeave(ids.employee, '2026-11-09')).rejects.toMatchObject({ code: 'APPROVED_LEAVE_CONFLICT' });
    const write = vi.fn(); await expect(withAttendanceLeaveGuard({ employeeId: ids.employee, workDate: '2026-11-09', write })).rejects.toMatchObject({ status: 409 }); expect(write).not.toHaveBeenCalled();
  });
  it('13 khóa kỳ chặn hủy approved', async () => {
    const result = await create(); await approve(result.body.data.id); await Payroll.create({ employeeId: ids.employee, period: '2026-11', status: 'closed' });
    const cancelled = await request(app).post(`/api/leave-requests/${result.body.data.id}/cancel`).set(headers('hr')).send({ note: 'Xác nhận hủy' });
    expect(cancelled.body.code).toBe('PAYROLL_CLOSED'); expect(await remaining()).toBe(10);
  });
  it('14 quota tách riêng qua năm', async () => {
    annual.annualQuota = 1; const result = await create({ fromDate: '2026-12-31', toDate: '2027-01-04' }); expect(result.status).toBe(201); expect((await approve(result.body.data.id)).status).toBe(200);
    for (const year of [2026, 2027]) { const balance = await request(app).get(`/api/leave-balances/${ids.employee}?year=${year}`).set(headers()); expect(balance.body.data.find((row) => row.leaveTypeId === annual._id).remainingDays).toBe(0); }
  });
  it('15 xuất paid/unpaid và TV5 không cộng trùng công', async () => {
    const a = await create(); await approve(a.body.data.id);
    const b = await create({ leaveTypeId: unpaid._id, fromDate: '2026-11-11', toDate: '2026-11-11' }); await approve(b.body.data.id);
    const result = await getLeavePayrollInput(ids.employee, '2026-11-01', '2026-11-30', ['2026-11-12']);
    expect(result.paidLeaveDays).toBe(2); expect(result.unpaidLeaveDays).toBe(1);
    await expect(getLeavePayrollInput(ids.employee, '2026-11-01', '2026-11-30', ['2026-11-09'])).rejects.toMatchObject({ code: 'ATTENDANCE_LEAVE_CONFLICT' });
  });
  it('16 loại đã dùng chỉ đổi tên/active; PATCH tên không tự bật', async () => {
    await create(); const url = `/api/leave-types/${annual._id}`;
    expect((await request(app).patch(url).set(headers('hr')).send({ annualQuota: 99 })).status).toBe(409);
    expect((await request(app).delete(url).set(headers('hr'))).status).toBe(409);
    await request(app).patch(url).set(headers('hr')).send({ active: false });
    expect((await request(app).patch(url).set(headers('hr')).send({ name: 'Tên mới' })).body.data.active).toBe(false);
    const items = await request(app).get('/api/leave-types').set(headers()); expect(items.body.data.find((item) => item.id === annual._id).used).toBe(true);
  });
  it('17 thay đổi lịch sau gửi buộc lưu lại đơn', async () => {
    const result = await create(); Schedule.rows.find((row) => row.employeeId === ids.employee && row.workDate === '2026-11-10').status = 'draft';
    expect((await approve(result.body.data.id)).body.code).toBe('SCHEDULE_CHANGED');
    expect((await request(app).patch(`/api/leave-requests/${result.body.data.id}`).set(headers()).send({ reason: 'Cập nhật theo lịch mới' })).body.data.requestedDays).toBe(1);
    expect((await approve(result.body.data.id)).status).toBe(200);
  });
  it('18 xác thực thật và không lộ hash', async () => {
    expect((await request(app).get('/api/leave-requests')).status).toBe(401);
    const result = await request(app).post('/api/auth/login').send({ username: 'employee', password: '123456' }); expect(result.status).toBe(200); expect(result.body.data.token).toBeTruthy(); expect(JSON.stringify(result.body)).not.toContain('passwordHash');
    Employee.rows.find((row) => row._id === ids.employee).status = 'inactive';
    expect((await request(app).get('/api/leave-requests').set(headers())).body.code).toBe('EMPLOYEE_INACTIVE');
  });
  it('19 TV5 chặn pending, chuyển dữ liệu vào hàm ghi chung session', async () => {
    const result = await create(); const write = vi.fn(async (session, leave) => ({ session, paid: leave.paidLeaveDays }));
    await expect(assertNoPendingLeave(ids.employee, '2026-11-01', '2026-11-30')).rejects.toMatchObject({ code: 'PENDING_LEAVE' });
    await expect(withPayrollLeaveGuard({ employeeId: ids.employee, from: '2026-11-01', to: '2026-11-30', write })).rejects.toMatchObject({ status: 409 }); expect(write).not.toHaveBeenCalled();
    await approve(result.body.data.id); expect((await withPayrollLeaveGuard({ employeeId: ids.employee, from: '2026-11-01', to: '2026-11-30', write })).paid).toBe(2);
  });
  it('21 lịch đã có phép không được thay đổi qua adapter TV2', async () => {
    const result = await create(); await approve(result.body.data.id); const write = vi.fn(async (session) => session);
    await expect(withScheduleLeaveGuard({ affectedDays: [{ employeeId: ids.employee, workDate: '2026-11-09' }], write })).rejects.toMatchObject({ code: 'APPROVED_LEAVE_CONFLICT' }); expect(write).not.toHaveBeenCalled();
    await withScheduleLeaveGuard({ affectedDays: [{ employeeId: ids.employee, workDate: '2026-11-12' }], write }); expect(write).toHaveBeenCalledOnce();
  });
  it('22 code giao TV3 lấy ngày từ Schedule thật, không tin ngày payload', async () => {
    const result = await create(); await approve(result.body.data.id);
    const schedule = Schedule.rows.find((row) => row.employeeId === ids.employee && row.workDate === '2026-11-09'); const saveAttendance = vi.fn();
    const record = createLeaveAwareAttendanceService({ Schedule, saveAttendance });
    await expect(record({ employeeId: ids.employee, scheduleId: schedule._id, payload: { workDate: '2026-11-12' } })).rejects.toMatchObject({ code: 'APPROVED_LEAVE_CONFLICT' }); expect(saveAttendance).not.toHaveBeenCalled();
  });
  it('23 code giao TV5 chuyển công và leave trong cùng session', async () => {
    const result = await create(); await approve(result.body.data.id); const readWorkedDates = vi.fn(async () => ['2026-11-12']); const savePayroll = vi.fn(async (data) => data);
    const calculate = createLeaveAwarePayrollService({ readWorkedDates, savePayroll }); const output = await calculate({ employeeId: ids.employee, from: '2026-11-01', to: '2026-11-30' });
    expect(output.leave.paidLeaveDays).toBe(2); expect(output.session).toEqual({ testSession: true }); expect(readWorkedDates.mock.calls[0][0].session).toBe(output.session);
  });
  it('20 scope, lọc trạng thái, tìm kiếm và dữ liệu đơn được populate', async () => {
    await create(); await create({}, 'other');
    const own = await request(app).get('/api/leave-requests?status=pending&q=employee').set(headers()); expect(own.body.data).toHaveLength(1); expect(own.body.data[0].employeeId.fullName).toBe('employee');
    expect((await request(app).get('/api/leave-requests').set(headers('manager'))).body.data).toHaveLength(1);
    expect((await request(app).get('/api/leave-requests').set(headers('hr'))).body.data).toHaveLength(2);
  });
});
