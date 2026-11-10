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
    workCredit: {
      type: Number,
      default: 0,
    },
    breakMinutes: {
      type: Number,
      default: 60,
    },
    status: {
      type: String,
      enum: ["present", "late", "absent"],
      default: "present",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Attendance", attendanceSchema, "attendances");
