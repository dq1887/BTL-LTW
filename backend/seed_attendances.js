const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const mongoose = require("mongoose");

const Employee = require("./src/models/Employee");
const Attendance = require("./src/models/Attendance");
const AttendanceAdjustment = require("./src/models/AttendanceAdjustment");

const seedAttendanceData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(">>> Đã kết nối MongoDB thành công!");

    const employees = await Employee.find({});
    console.log(`>>> Tìm thấy ${employees.length} nhân viên trong hệ thống.`);

    if (employees.length === 0) {
      console.log(
        ">>> Chưa có nhân viên nào! Hãy chạy seed_50_employees trước.",
      );
      process.exit(1);
    }

    await Attendance.deleteMany({});
    await AttendanceAdjustment.deleteMany({});
    console.log(
      ">>> Đã làm sạch collection attendances & attendanceadjustments cũ!",
    );

    const sampleDates = [
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
    ];

    const attendanceRecords = [];

    employees.forEach((emp, empIdx) => {
      sampleDates.forEach((dateStr, dateIdx) => {
        const pattern = (empIdx + dateIdx) % 10;

        let checkInAt = null;
        let checkOutAt = null;
        let breakMinutes = 60;
        let minutesWorked = 0;
        let workCredit = 0;
        let status = "present";

        if (pattern === 0) {
          status = "absent";
          checkInAt = null;
          checkOutAt = null;
          minutesWorked = 0;
          workCredit = 0;
        } else if (pattern === 1) {
          status = "present";
          checkInAt = new Date(`${dateStr}T08:00:00.000Z`);
          checkOutAt = new Date(`${dateStr}T12:00:00.000Z`);
          breakMinutes = 0;
          minutesWorked = 240;
          workCredit = 0.5;
        } else if (pattern === 2) {
          status = "late";
          checkInAt = new Date(`${dateStr}T08:30:00.000Z`);
          checkOutAt = new Date(`${dateStr}T17:30:00.000Z`);
          breakMinutes = 60;
          minutesWorked = 480;
          workCredit = 1;
        } else if (pattern === 3) {
          status = "early_leave";
          checkInAt = new Date(`${dateStr}T08:00:00.000Z`);
          checkOutAt = new Date(`${dateStr}T15:30:00.000Z`);
          breakMinutes = 60;
          minutesWorked = 390;
          workCredit = 1;
        } else {
          status = "present";
          checkInAt = new Date(`${dateStr}T08:00:00.000Z`);
          checkOutAt = new Date(`${dateStr}T17:00:00.000Z`);
          breakMinutes = 60;
          minutesWorked = 480;
          workCredit = 1;
        }

        attendanceRecords.push({
          employeeId: emp._id,
          workDate: dateStr,
          checkInAt,
          checkOutAt,
          breakMinutes,
          minutesWorked,
          workCredit,
          status,
        });
      });
    });

    // 6. Nạp toàn bộ dữ liệu chấm công vào collection `attendances`
    const insertedAttendances = await Attendance.insertMany(attendanceRecords);
    console.log(
      `>>> Đã nạp thành công ${insertedAttendances.length} bản ghi chấm công cho 50 nhân viên!`,
    );

    // 7. Tạo sẵn 3 đơn khiếu nại (AttendanceAdjustment) mẫu để phục vụ Demo
    // Lấy 3 bản ghi bị chấm 0.5 công hoặc vắng mặt để khiếu nại:
    const imperfectRecords = insertedAttendances.filter(
      (att) => att.workCredit < 1 && att.checkInAt !== null,
    );

    if (imperfectRecords.length >= 2) {
      const adjustmentSamples = [
        {
          attendanceId: imperfectRecords[0]._id,
          employeeId: imperfectRecords[0].employeeId,
          requestReason:
            "Quên bấm máy chấm công lúc ra về do bận gặp khách hàng đột xuất",
          proposedIn: new Date(`${imperfectRecords[0].workDate}T08:00:00.000Z`),
          proposedOut: new Date(
            `${imperfectRecords[0].workDate}T17:00:00.000Z`,
          ),
          status: "pending", // Chờ Quản lý/HR duyệt
          reviewNote: "",
        },
        {
          attendanceId: imperfectRecords[1]._id,
          employeeId: imperfectRecords[1].employeeId,
          requestReason: "Hệ thống nhận diện máy chấm công bị lỗi mạng",
          proposedIn: new Date(`${imperfectRecords[1].workDate}T08:00:00.000Z`),
          proposedOut: new Date(
            `${imperfectRecords[1].workDate}T17:30:00.000Z`,
          ),
          status: "pending", // Chờ Quản lý/HR duyệt
          reviewNote: "",
        },
      ];

      await AttendanceAdjustment.insertMany(adjustmentSamples);
      console.log(">>> Đã tạo sẵn 2 đơn khiếu nại mẫu ở trạng thái pending!");
    }

    console.log(">>> HOÀN TẤT NẠP DỮ LIỆU CHẤM CÔNG & KHIẾU NẠI!");
    process.exit(0);
  } catch (error) {
    console.error("Lỗi khi seed dữ liệu chấm công:", error);
    process.exit(1);
  }
};

seedAttendanceData();
