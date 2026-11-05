import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import { app } from '../src/app.js';
import { connectDatabase } from '../src/database.js';
import { seedDemo } from '../src/seed.js';
import { LeaveRequest } from '../src/models/LeaveRequest.js';
import { LeaveType } from '../src/models/LeaveType.js';
import { Employee, User, Schedule, Attendance, Payroll } from '../src/integrations/referenceModels.js';
import { assertNoApprovedLeave, assertNoPendingLeave } from '../src/services/leaveService.js';
import { withHrmTransaction } from '../src/integrations/hrmLock.js';

let mongo, ids, annual, unpaid;
const tokens = {};
const auth = (role = 'employee') => ({ Authorization: `Bearer ${tokens[role]}` });
const make = (patch = {}, role = 'employee') => request(app).post('/api/leave-requests').set(auth(role)).send({ leaveTypeId: String(annual._id), fromDate: '2026-11-09', toDate: '2026-11-10', reason: 'Việc gia đình', ...patch });
const review = (id, role = 'manager') => request(app).post(`/api/leave-requests/${id}/approve`).set(auth(role)).send({ note: 'Đồng ý' });

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-only-at-least-32-characters-long';
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' }, binary: { version: '7.0.24' } });
  await connectDatabase(mongo.getUri('hrm_test'));
  ids = await seedDemo();
  for (const username of ['hr','manager','employee','other','otherManager']) {
    const user = await User.findOne({ username });
    tokens[username] = jwt.sign({}, process.env.JWT_SECRET, { subject: String(user._id), expiresIn: '1h' });
  }
  annual = await LeaveType.findOne({ code: 'ANNUAL' }); unpaid = await LeaveType.findOne({ code: 'UNPAID' });
  await Schedule.deleteMany({});
  for (const employeeId of [ids.hr, ids.manager, ids.employee, ids.other, ids.otherManager]) {
    await Schedule.insertMany(['2026-11-09','2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-16','2026-11-17','2026-11-18','2026-11-19','2026-11-20','2026-11-23','2026-11-24','2026-11-25','2026-12-31','2027-01-04'].map((workDate) => ({ employeeId, workDate, status: 'published' })));
  }
});
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
beforeEach(async () => {
  await LeaveRequest.deleteMany({}); await Attendance.deleteMany({}); await Payroll.deleteMany({});
  await LeaveType.updateOne({ _id: annual._id }, { annualQuota: 12, active: true });
  await Employee.updateOne({ _id: ids.employee }, { status: 'active' });
  await Schedule.updateMany({}, { status: 'published' });
});

describe('API nghỉ phép với MongoDB transaction thật', () => {
  it('01 HR CRUD loại nghỉ, unique code và chặn nhân viên', async () => {
    const body = { code: 'SPECIAL', name: 'Nghỉ đặc biệt', paid: false, annualQuota: null, active: true };
    expect((await request(app).post('/api/leave-types').set(auth()).send(body)).status).toBe(403);
    const created = await request(app).post('/api/leave-types').set(auth('hr')).send(body);
    expect(created.status).toBe(201); const id = created.body.data.id;
    expect((await request(app).post('/api/leave-types').set(auth('hr')).send(body)).status).toBe(409);
    expect((await request(app).get(`/api/leave-types/${id}`).set(auth())).status).toBe(200);
    expect((await request(app).patch(`/api/leave-types/${id}`).set(auth('hr')).send({ name: 'Nghỉ đặc biệt mới' })).status).toBe(200);
    expect((await request(app).delete(`/api/leave-types/${id}`).set(auth('hr'))).status).toBe(204);
  });
  it('02 chặn ngày sai thứ tự, ngày không có thật và ID sai', async () => {
    expect((await make({ fromDate: '2026-11-11', toDate: '2026-11-10' })).status).toBe(400);
    expect((await make({ fromDate: '2026-02-30' })).status).toBe(400);
    expect((await make({ leaveTypeId: 'bad' })).status).toBe(400);
  });
  it('03 pending tạo đúng ngày theo lịch published, không đếm cuối tuần', async () => {
    const result = await make({ fromDate: '2026-11-13', toDate: '2026-11-16' });
    expect(result.status).toBe(201); expect(result.body.data.status).toBe('pending');
    expect(result.body.data.leaveDates).toEqual(['2026-11-13','2026-11-16']); expect(result.body.data.requestedDays).toBe(2);
  });
  it('04 chặn trùng khoảng ngày cả pending và approved', async () => {
    const result = await make(); expect((await make()).status).toBe(409);
    expect((await review(result.body.data.id)).status).toBe(200); expect((await make()).status).toBe(409);
  });
  it('05 chặn vượt quota', async () => {
    expect((await make({ toDate: '2026-11-25' })).status).toBe(409);
  });
  it('06 Manager duyệt đúng phòng, Manager khác phòng bị chặn', async () => {
    const result = await make(); const id = result.body.data.id;
    expect((await review(id, 'otherManager')).status).toBe(403);
    expect((await review(id)).status).toBe(200);
    const balance = await request(app).get(`/api/leave-balances/${ids.employee}?year=2026`).set(auth());
    expect(balance.body.data.find((b) => b.leaveTypeId === String(annual._id)).remainingDays).toBe(10);
  });
  it('07 chặn tự duyệt cả Manager và HR', async () => {
    for (const role of ['manager','hr']) { const result = await make({}, role); expect((await review(result.body.data.id, role)).status).toBe(403); }
  });
  it('08 HR hủy approved hoàn phép đúng một lần', async () => {
    const result = await make(); const id = result.body.data.id; await review(id);
    const url = `/api/leave-requests/${id}/cancel`;
    expect((await request(app).post(url).set(auth()).send({ note: 'Không nghỉ nữa' })).status).toBe(403);
    expect((await request(app).post(url).set(auth('hr')).send({ note: 'Đã xác nhận hủy' })).status).toBe(200);
    expect((await request(app).post(url).set(auth('hr')).send({ note: 'Hủy lần hai' })).status).toBe(409);
    const balance = await request(app).get(`/api/leave-balances/${ids.employee}?year=2026`).set(auth());
    expect(balance.body.data.find((b) => b.leaveTypeId === String(annual._id)).remainingDays).toBe(12);
  });
  it('09 chủ đơn sửa/xóa pending; không sửa approved', async () => {
    const r = await make(); const url = `/api/leave-requests/${r.body.data.id}`;
    expect((await request(app).patch(url).set(auth('other')).send({ reason: 'Đổi lý do' })).status).toBe(403);
    expect((await request(app).patch(url).set(auth()).send({ toDate: '2026-11-11' })).body.data.requestedDays).toBe(3);
    expect((await request(app).delete(url).set(auth())).status).toBe(204);
    const second = await make(); await review(second.body.data.id);
    expect((await request(app).patch(`/api/leave-requests/${second.body.data.id}`).set(auth()).send({ reason: 'Đổi lý do' })).status).toBe(409);
  });
  it('10 từ chối cần lý do, lịch sử người duyệt và không trừ phép', async () => {
    const r = await make(); const url = `/api/leave-requests/${r.body.data.id}/reject`;
    expect((await request(app).post(url).set(auth('manager')).send({ note: '' })).status).toBe(400);
    const rejected = await request(app).post(url).set(auth('manager')).send({ note: 'Cần bổ sung thông tin' });
    expect(rejected.body.data.status).toBe('rejected');
    const detail = await request(app).get(`/api/leave-requests/${r.body.data.id}`).set(auth());
    expect(detail.body.data.history[1].actorId.username).toBe('manager');
    expect((await make()).status).toBe(201);
  });
  it('11 lọc quyền: employee chỉ thấy mình, manager thấy phòng; chặn detail và balance người khác', async () => {
    const own = await make(); await make({}, 'other');
    const list = await request(app).get('/api/leave-requests').set(auth());
    expect(list.body.data).toHaveLength(1); expect(list.body.data[0].id).toBe(own.body.data.id);
    expect((await request(app).get(`/api/leave-balances/${ids.other}`).set(auth())).status).toBe(403);
    expect((await request(app).get(`/api/leave-requests/${own.body.data.id}`).set(auth('other'))).status).toBe(403);
    expect((await request(app).get('/api/leave-requests').set(auth('hr'))).body.data).toHaveLength(2);
  });
  it('12 chặn duyệt phép nếu ngày có chấm công thực tế', async () => {
    const r = await make(); const schedule = await Schedule.findOne({ employeeId: ids.employee, workDate: '2026-11-09' });
    await Attendance.create({ employeeId: ids.employee, scheduleId: schedule._id, checkInAt: new Date(), workCredit: 1 });
    expect((await review(r.body.data.id)).body.code).toBe('ATTENDANCE_CONFLICT');
  });
  it('13 chặn hủy approved khi kỳ lương đã chốt', async () => {
    const r = await make(); await review(r.body.data.id);
    await Payroll.create({ employeeId: ids.employee, period: '2026-11', status: 'closed' });
    const response = await request(app).post(`/api/leave-requests/${r.body.data.id}/cancel`).set(auth('hr')).send({ note: 'Hủy vì đổi lịch' });
    expect(response.status).toBe(409); expect(response.body.code).toBe('PAYROLL_CLOSED');
  });
  it('14 tính phép theo năm riêng khi đơn qua năm', async () => {
    await LeaveType.updateOne({ _id: annual._id }, { annualQuota: 1 });
    const r = await make({ fromDate: '2026-12-31', toDate: '2027-01-04' });
    expect(r.status).toBe(201); expect((await review(r.body.data.id)).status).toBe(200);
    for (const year of [2026,2027]) {
      const b = await request(app).get(`/api/leave-balances/${ids.employee}?year=${year}`).set(auth());
      expect(b.body.data.find((v) => v.leaveTypeId === String(annual._id)).remainingDays).toBe(0);
    }
  });
  it('15 xuất ngày cho TV3/TV5 phân biệt có lương và không lương', async () => {
    const a = await make(); await review(a.body.data.id);
    const b = await make({ leaveTypeId: String(unpaid._id), fromDate: '2026-11-11', toDate: '2026-11-11' }); await review(b.body.data.id);
    const feed = await request(app).get(`/api/leave-approved-days?employeeId=${ids.employee}&from=2026-11-01&to=2026-11-30`).set(auth('hr'));
    expect(feed.body.data.filter((d) => d.paid)).toHaveLength(2); expect(feed.body.data.filter((d) => !d.paid)).toHaveLength(1);
  });
  it('16 hai đơn tạo đồng thời trùng lịch: chỉ một thành công', async () => {
    const results = await Promise.all([make(), make()]); expect(results.map((r) => r.status).sort()).toEqual([201,409]);
  });
  it('17 hai đơn duyệt đồng thời vượt quota: chỉ một thành công', async () => {
    await LeaveType.updateOne({ _id: annual._id }, { annualQuota: 2 });
    const a = await make(); const b = await make({ fromDate: '2026-11-11', toDate: '2026-11-12' });
    const results = await Promise.all([review(a.body.data.id), review(b.body.data.id)]);
    expect(results.map((r) => r.status).sort()).toEqual([200,409]);
  });
  it('18 chặn đổi chính sách/xóa loại đã có đơn, cho tắt', async () => {
    await make(); const url = `/api/leave-types/${annual._id}`;
    expect((await request(app).patch(url).set(auth('hr')).send({ paid: false })).status).toBe(409);
    expect((await request(app).delete(url).set(auth('hr'))).status).toBe(409);
    expect((await request(app).patch(url).set(auth('hr')).send({ active: false })).status).toBe(200);
  });
  it('19 không có lịch published và thay đổi lịch sau gửi phải báo lỗi', async () => {
    expect((await make({ fromDate: '2026-11-14', toDate: '2026-11-15' })).body.code).toBe('NO_SCHEDULE');
    const r = await make(); await Schedule.updateOne({ employeeId: ids.employee, workDate: '2026-11-10' }, { status: 'draft' });
    expect((await review(r.body.data.id)).body.code).toBe('SCHEDULE_CHANGED');
  });
  it('20 xác thực, ID không tồn tại, không lộ hash, chặn mass assignment', async () => {
    expect((await request(app).get('/api/leave-requests')).status).toBe(401);
    expect((await request(app).get('/api/leave-requests/111111111111111111111111').set(auth())).status).toBe(404);
    expect((await make({ status: 'approved' })).status).toBe(400);
    expect((await make({ employeeId: String(ids.other) })).status).toBe(403);
    const login = await request(app).post('/api/auth/login').send({ username: 'employee', password: '123456' });
    expect(login.status).toBe(200); expect(JSON.stringify(login.body)).not.toContain('passwordHash');
    expect((await request(app).post('/api/auth/login').send({ username: 'employee', password: 'wrong' })).status).toBe(401);
  });
  it('21 TV3 guard chặn ngày có phép, TV5 guard chặn đơn pending', async () => {
    const r = await make();
    await expect(withHrmTransaction((session) => assertNoPendingLeave(ids.employee, '2026-11-01', '2026-11-30', session))).rejects.toMatchObject({ status: 409 });
    await review(r.body.data.id);
    await expect(withHrmTransaction((session) => assertNoApprovedLeave(ids.employee, '2026-11-09', session))).rejects.toMatchObject({ status: 409 });
  });
  it('23 xem trước đơn đúng lịch, không tạo bản ghi, chặn vượt quyền', async () => {
    const body = { leaveTypeId: String(annual._id), fromDate: '2026-11-09', toDate: '2026-11-10' };
    const preview = await request(app).post('/api/leave-requests/preview').set(auth()).send(body);
    expect(preview.status).toBe(200); expect(preview.body.data.requestedDays).toBe(2);
    expect(preview.body.data.years[0].remainingAfter).toBe(10);
    expect(await LeaveRequest.countDocuments()).toBe(0);
    expect((await request(app).post('/api/leave-requests/preview').set(auth()).send({ ...body, employeeId: String(ids.other) })).status).toBe(403);
  });
  it('22 khóa nhân viên vô hiệu hóa token cũ', async () => {
    await Employee.updateOne({ _id: ids.employee }, { status: 'inactive' });
    expect((await request(app).get('/api/leave-requests').set(auth())).status).toBe(403);
  });
});
