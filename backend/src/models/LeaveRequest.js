const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    // Snapshot các ngày thực sự có ca được phân công tại thời điểm gửi đơn.
    scheduledDates: { type: [String], required: true, default: [] },
    totalDays: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: "", trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

leaveRequestSchema.index({ employeeId:  1, createdAt: -1 });
leaveRequestSchema.index({ employeeId: 1, status: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema, "leaverequests");
