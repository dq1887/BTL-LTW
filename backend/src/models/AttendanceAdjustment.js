const mongoose = require("mongoose");

const adjustmentSchema = new mongoose.Schema(
  {
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      required: [true, "Thiếu attendanceId"],
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Thiếu employeeId"],
    },
    requestReason: {
      type: String,
      required: [true, "Thiếu lý do sửa công"],
    },
    proposedIn: {
      type: Date,
      required: [true, "Thiếu giờ vào đề xuất"],
    },
    proposedOut: {
      type: Date,
      required: [true, "Thiếu giờ ra đề xuất"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending", // Ban đầu luôn là pending (Quy tắc 5)
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    reviewNote: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "AttendanceAdjustment",
  adjustmentSchema,
  "attendanceAdjustments",
);
