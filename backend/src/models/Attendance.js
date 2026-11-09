const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Thiếu employeeId"],
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    workDate: {
      type: String,
      required: [true, "Thiếu workDate"],
    },
    checkInAt: {
      type: Date,
      default: null,
    },
    checkOutAt: {
      type: Date,
      default: null,
    },
    breakMinutes: {
      type: Number,
      default: 60,
    },
    minutesWorked: {
      type: Number,
      default: 0,
    },
    workCredit: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["present", "late", "early_leave", "absent"],
      default: "present",
    },
  },
  { timestamps: true },
);

attendanceSchema.index({ employeeId: 1, workDate: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
