import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Department, Employee, User, Schedule, Attendance, Payroll, Shift } from './integrations/referenceModels.js';
import { LeaveType } from './models/LeaveType.js';
import { LeaveRequest } from './models/LeaveRequest.js';
import { todayVN } from './lib/dates.js';
export async function seedDemo() {
  if (await Employee.countDocuments() || await LeaveRequest.countDocuments() || await User.countDocuments() || await LeaveType.countDocuments() || await Department.countDocuments() || await Schedule.countDocuments() || await Attendance.countDocuments() || await Payroll.countDocuments() || await Shift.countDocuments()) throw new Error('Seed chỉ chạy trên database trống để tránh ghi đè dữ liệu nhóm.');
  const ids = Object.fromEntries(['hr','manager','employee','other','otherManager','dept','dept2'].map((key) => [key, new mongoose.Types.ObjectId()]));
  await Department.create([{ _id: ids.dept, code: 'IT', name: 'Kỹ thuật', managerId: ids.manager }, { _id: ids.dept2, code: 'SALES', name: 'Kinh doanh', managerId: ids.otherManager }]);
  const people = [
    ['hr','HR001','Nhân sự Demo','admin_hr',ids.dept],
    ['manager','QL001','Quản lý Kỹ thuật','manager',ids.dept],
    ['employee','NV001','Nhân viên An','employee',ids.dept],
    ['other','NV002','Nhân viên Bình','employee',ids.dept2],
    ['otherManager','QL002','Quản lý Kinh doanh','manager',ids.dept2],
  ];
  const passwordHash = await bcrypt.hash('123456', 10);
  for (const [key, employeeCode, fullName, role, departmentId] of people) {
    await Employee.create({ _id: ids[key], employeeCode, fullName, departmentId, email: `${key}@example.test`, status: 'active' });
    await User.create({ username: key, passwordHash, role, employeeId: ids[key] });
  }
  await LeaveType.create([{ code: 'ANNUAL', name: 'Nghỉ phép năm', paid: true, annualQuota: 12, active: true }, { code: 'UNPAID', name: 'Nghỉ không lương', paid: false, annualQuota: null, active: true }]);
  const shift = await Shift.create({ code: 'DAY', startTime: '08:00', endTime: '17:00', breakMinutes: 60, status: 'active' });
  const base = new Date(todayVN() + 'T00:00:00Z');
  const rows = [];
  for (let i = 0; i < 90; i++) {
    const date = new Date(base); date.setUTCDate(date.getUTCDate() + i);
    if ([0,6].includes(date.getUTCDay())) continue;
    for (const key of ['hr','manager','employee','other','otherManager']) rows.push({ employeeId: ids[key], workDate: date.toISOString().slice(0,10), status: 'published', shiftId: shift._id });
  }
  await Schedule.insertMany(rows);
  return ids;
}
