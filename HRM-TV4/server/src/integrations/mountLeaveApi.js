import mongoose from 'mongoose';
import { LeaveType } from '../models/LeaveType.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { createLeaveRouter } from '../routes/leaveRoutes.js';
import { createLeaveActorAdapter } from './identityAdapter.js';
import { initHrmLock } from './hrmLock.js';
export async function mountLeaveApi(app, { authenticate, mapVerifiedUser, prefix = '/api' }) {
  if (typeof authenticate !== 'function') throw new TypeError('Cần middleware xác thực của TV1.');
  if (mongoose.connection.readyState !== 1) throw new Error('Kết nối MongoDB chung trước khi mount module nghỉ phép.');
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('Module nghỉ phép cần replica set hoặc Atlas để dùng transaction.');
  await Promise.all([LeaveType.init(), LeaveRequest.init()]);
  await initHrmLock();
  app.use(prefix, createLeaveRouter({ authenticate: [authenticate, createLeaveActorAdapter(mapVerifiedUser)] }));
}
