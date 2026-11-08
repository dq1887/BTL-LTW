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
      type: String, // Dạng chuỗi YYYY-MM-DD để tránh lệch múi giờ
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
      enum: [0, 0.5, 1],
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

// Mỗi nhân viên chỉ có 1 bản ghi công cho mỗi ngày làm việc (Quy tắc 1)
attendanceSchema.index({ employeeId: 1, workDate: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
