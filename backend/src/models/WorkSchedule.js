const mongoose = require("mongoose");

const workScheduleSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
    },
    workDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "cancelled"],
      default: "draft",
      index: true,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "workschedules" },
);

workScheduleSchema.index({ employeeId: 1, workDate: 1, status: 1 });

module.exports = mongoose.model("WorkSchedule", workScheduleSchema);
