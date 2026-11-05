import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from './database.js';
import { seedDemo } from './seed.js';
if (!process.env.MONGODB_URI) throw new Error('Thiếu MONGODB_URI');
await connectDatabase(process.env.MONGODB_URI);
await seedDemo();
console.log('Đã tạo dữ liệu demo; tài khoản hr, manager, employee, other, otherManager / 123456.');
await mongoose.disconnect();
