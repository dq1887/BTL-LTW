import mongoose from 'mongoose';
import { LeaveType } from './models/LeaveType.js';
import { LeaveRequest } from './models/LeaveRequest.js';
import { User } from './integrations/referenceModels.js';
import { initHrmLock } from './integrations/hrmLock.js';
export async function connectDatabase(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('Cần MongoDB replica set hoặc Atlas để bảo đảm transaction. Dùng npm run demo để thử nhanh.');
  await Promise.all([LeaveType.init(), LeaveRequest.init(), User.init()]);
  await initHrmLock();
}
