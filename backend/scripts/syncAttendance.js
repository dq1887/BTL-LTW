const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const mongoose = require("mongoose");
const Schedule = require("../src/models/Schedule");
const Shift = require("../src/models/Shift");
const Attendance = require("../src/models/Attendance");
const CUTOFF_DATE = "2026-11-19";

const buildDateTime = (workDate, timeStr) => {
  const [hours, minutes] = (timeStr || "08:00")
    .split(":")
    .map((n) => String(Number(n)).padStart(2, "0"));
  return new Date(`${workDate}T${hours}:${minutes}:00.000+07:00`);
};

const syncPastAttendance = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(">>> Đã kết nối MongoDB Atlas!");

    const publishedResult = await Schedule.updateMany(
      { workDate: { $lt: CUTOFF_DATE }, status: { $ne: "published" } },
      { $set: { status: "published" } },
    );
    console.log(
      `📢 Đã duyệt (published) thêm ${publishedResult.modifiedCount} lịch trước ngày ${CUTOFF_DATE}.`,
    );

    const deleted = await Attendance.deleteMany({
      workDate: { $lt: CUTOFF_DATE },
    });
    console.log(
      `🗑️ Đã xóa ${deleted.deletedCount} bản ghi chấm công cũ trước ngày ${CUTOFF_DATE}.`,
    );

    const shifts = await Shift.find().lean();
    const shiftMap = new Map(shifts.map((s) => [String(s._id), s]));

    const pastSchedules = await Schedule.find({
      status: "published",
      workDate: { $lt: CUTOFF_DATE },
    }).lean();

    const uniqueMap = new Map();
    for (const sch of pastSchedules) {
      if (!sch.employeeId || !shiftMap.has(String(sch.shiftId))) continue;
      const key = `${String(sch.employeeId)}_${sch.workDate}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, sch);
      }
    }

    const records = [...uniqueMap.values()].map((sch) => {
      const shift = shiftMap.get(String(sch.shiftId));
      const checkInAt = buildDateTime(sch.workDate, shift.startTime);
      const checkOutAt = buildDateTime(sch.workDate, shift.endTime);

      if (checkOutAt <= checkInAt) {
        checkOutAt.setDate(checkOutAt.getDate() + 1);
      }

      const totalMinutes = Math.round((checkOutAt - checkInAt) / (1000 * 60));
      const breakMinutes = totalMinutes >= 420 ? 60 : 0;

      return {
        employeeId: sch.employeeId,
        scheduleId: shift._id,
        workDate: sch.workDate,
        checkInAt,
        checkOutAt,
        minutesWorked: totalMinutes,
        workCredit: 1,
        overtimeCredit: 0,
        breakMinutes,
        status: "present",
      };
    });

    const inserted = await Attendance.insertMany(records, { ordered: false });
    console.log(
      `✅ Hoàn tất! Đã tạo mới ${inserted.length} bản ghi chấm công (1 công chuẩn/ca).`,
    );
    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi đồng bộ chấm công:", err.message);
    process.exit(1);
  }
};

syncPastAttendance();
