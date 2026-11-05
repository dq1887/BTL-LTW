import 'dotenv/config';
import { app } from './app.js';
import { connectDatabase } from './database.js';
import { jwtSecret } from './config.js';
jwtSecret();
if (!process.env.MONGODB_URI) throw new Error('Thiếu MONGODB_URI. Sao chép server/.env.example thành server/.env và cấu hình, hoặc chạy npm run demo.');
await connectDatabase(process.env.MONGODB_URI);
app.listen(Number(process.env.PORT ?? 4000), () => console.log('HRM API: http://localhost:4000'));
