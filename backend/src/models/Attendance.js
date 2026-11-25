const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
    },
    workDate: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    checkInAt: {
      type: Date,
      default: null,
    },
    checkOutAt: {
      type: Date,
      default: null,
    },
    minutesWorked: {
      type: Number,
      default: 0,
    },
    standardMinutes: {
      type: Number,
      default: 0, // Thời gian chuẩn (phút làm trong ca published)
    },
    overtimeMinutes: {
      type: Number,
      default: 0, // Tăng ca (phút làm ngoài ca)
    },
    lateMinutes: {
      type: Number,
      default: 0, // Đi muộn (phút)
    },
    earlyLeaveMinutes: {
      type: Number,
      default: 0, // Về sớm (phút)
    },
    hasPublishedSchedule: {
      type: Boolean,
      default: false, // Có lịch published trong ngày hay không
    },
    workCredit: {
      type: Number,
      default: 0,
    },
    overtimeCredit: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["present", "late", "absent"],
      default: "present",
    },
  },
  { timestamps: true },
);

attendanceSchema.index({ employeeId: 1, workDate: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema, "attendances");
