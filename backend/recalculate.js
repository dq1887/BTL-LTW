const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

const Attendance = require("./src/models/Attendance");

const run = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb+srv://admin:admin@hrm-database.87l2z1y.mongodb.net/EmployeeManagement?retryWrites=true&w=majority";

    await mongoose.connect(mongoUri);
    console.log("Đã kết nối MongoDB thành công!");

    const list = await Attendance.find({});
    console.log(
      `Bắt đầu chuẩn hóa ${list.length} bản ghi chấm công về đúng ca quy định...`,
    );

    let count = 0;
    for (const item of list) {
      const dateStr = item.workDate;
      if (!dateStr) continue;

      const isToday = dateStr === new Date().toISOString().split("T")[0];
      if (isToday && item.checkOutAt) {
        const totalMs = new Date(item.checkOutAt) - new Date(item.checkInAt);
        const totalMinutes = Math.max(0, Math.round(totalMs / 60000));
        const breakMin =
          item.breakMinutes !== undefined ? item.breakMinutes : 45;

        if (totalMinutes < 480) {
          item.minutesWorked = totalMinutes;
          item.workCredit = 0;
        } else {
          const netMinutes = Math.max(0, totalMinutes - breakMin);
          item.minutesWorked = netMinutes;
          item.workCredit = Number((netMinutes / 480).toFixed(1));
        }
        await item.save();
        continue;
      }

      const dayNum = parseInt(dateStr.split("-")[2], 10) || 1;

      if (dayNum % 4 === 0) {
        const nextDay = new Date(`${dateStr}T00:00:00.000Z`);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split("T")[0];

        item.checkInAt = new Date(`${dateStr}T22:00:00.000+07:00`);
        item.checkOutAt = new Date(`${nextDayStr}T06:00:00.000+07:00`);
        item.breakMinutes = 45;
        item.minutesWorked = 435;
        item.workCredit = 1;
        item.status = "present";
      } else if (dayNum % 5 === 0) {
        item.checkInAt = new Date(`${dateStr}T07:00:00.000+07:00`);
        item.checkOutAt = new Date(`${dateStr}T11:30:00.000+07:00`);
        item.breakMinutes = 15;
        item.minutesWorked = 255;
        item.workCredit = 0.5;
        item.status = "present";
      } else {
        item.checkInAt = new Date(`${dateStr}T08:00:00.000+07:00`);
        item.checkOutAt = new Date(`${dateStr}T17:00:00.000+07:00`);
        item.breakMinutes = 60;
        item.minutesWorked = 480;
        item.workCredit = 1;
        item.status = "present";
      }

      await item.save();
      count++;
    }

    console.log(
      `=> Đã chuẩn hóa thành công ${count} bản ghi về đúng ca cố định!`,
    );
    process.exit(0);
  } catch (error) {
    console.error("Lỗi:", error.message);
    process.exit(1);
  }
};

run();
