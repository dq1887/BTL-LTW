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
      type: String,
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
      default: 0,
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
    },
    lateMinutes: {
      type: Number,
      default: 0,
    },
    earlyLeaveMinutes: {
      type: Number,
      default: 0,
    },
    hasPublishedSchedule: {
      type: Boolean,
      default: false,
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
