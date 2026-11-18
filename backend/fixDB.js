require("dotenv").config();
const mongoose = require("mongoose");
const Attendance = require("./src/models/Attendance");
const Schedule = require("./src/models/Schedule");

require("./src/models/Shift");

const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const calculateCredits = (inTime, outTime, shiftStartStr, shiftEndStr) => {
  const round2 = (n) => Math.round(n * 100) / 100;
  const totalMinutes = Math.max(
    0,
    (new Date(outTime) - new Date(inTime)) / 60000,
  );

  if (!shiftStartStr || !shiftEndStr) {
    return {
      workCredit: 0,
      overtimeCredit: round2(totalMinutes / 60),
      totalMinutes: Math.round(totalMinutes),
    };
  }

  const shiftStartMins = parseTime(shiftStartStr);
  const shiftEndMins = parseTime(shiftEndStr);
  const shiftTotalMins = shiftEndMins - shiftStartMins;

  const actualStartMins =
    new Date(inTime).getHours() * 60 + new Date(inTime).getMinutes();
  const actualEndMins =
    new Date(outTime).getHours() * 60 + new Date(outTime).getMinutes();

  const overlapStart = Math.max(actualStartMins, shiftStartMins);
  const overlapEnd = Math.min(actualEndMins, shiftEndMins);
  const inShiftMinutes = Math.max(0, overlapEnd - overlapStart);
  const overtimeMinutes = Math.max(0, totalMinutes - inShiftMinutes);

  return {
    workCredit: round2(inShiftMinutes / shiftTotalMins),
    overtimeCredit: round2(overtimeMinutes / 60),
    totalMinutes: Math.round(totalMinutes),
  };
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log("⏳ Đã kết nối Database. Đang dọn dẹp dữ liệu cũ...");

    const attendances = await Attendance.find({ checkOutAt: { $ne: null } });
    let count = 0;

    for (let att of attendances) {
      let inDate = new Date(att.checkInAt);
      let outDate = new Date(att.checkOutAt);

      if ((outDate - inDate) / 60000 > 720) {
        outDate = new Date(inDate.getTime() + 8 * 60 * 60000);
        att.checkOutAt = outDate;
      }

      const schedule = await Schedule.findOne({
        employeeId: att.employeeId,
        workDate: att.workDate,
        status: "published",
      }).populate("shiftId");

      let shiftStart = null;
      let shiftEnd = null;
      if (schedule && schedule.shiftId) {
        shiftStart = schedule.shiftId.startTime;
        shiftEnd = schedule.shiftId.endTime;
      }

      const { workCredit, overtimeCredit, totalMinutes } = calculateCredits(
        inDate,
        outDate,
        shiftStart,
        shiftEnd,
      );

      att.minutesWorked = totalMinutes;
      att.workCredit = workCredit;
      att.overtimeCredit = overtimeCredit;
      att.status = totalMinutes > 0 ? "present" : "absent";

      await att.save();
      count++;
    }

    console.log(
      `✅ ĐÃ SỬA THÀNH CÔNG! Đã tính lại công chuẩn xác cho ${count} bản ghi.`,
    );
    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi:", err);
    process.exit(1);
  }
})();
