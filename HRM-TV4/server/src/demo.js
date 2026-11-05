import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import { app } from './app.js';
import { connectDatabase } from './database.js';
import { seedDemo } from './seed.js';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
console.log('Đang khởi tạo MongoDB demo; lần đầu cần Internet để tải MongoDB binary.');
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' }, binary: { version: '7.0.24' } });
console.log('MongoDB đã sẵn sàng. Đang chuẩn bị database và dữ liệu mẫu…');
await connectDatabase(mongo.getUri('hrm_tv4_demo'));
await seedDemo();
const server = app.listen(4000, () => console.log('DEMO API http://localhost:4000 | hr / manager / employee / other / otherManager — mật khẩu 123456. Dữ liệu reset khi tắt demo.'));
async function stop() { server.close(); await mongoose.disconnect(); await mongo.stop(); process.exit(0); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
