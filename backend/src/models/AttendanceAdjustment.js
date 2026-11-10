const mongoose = require("mongoose");

const attendanceAdjustmentSchema = new mongoose.Schema(
  {
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    requestReason: {
      type: String,
      required: true,
    },
    proposedIn: {
      type: Date,
      required: true,
    },
    proposedOut: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
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
  attendanceAdjustmentSchema,
  "attendanceadjustments",
);
