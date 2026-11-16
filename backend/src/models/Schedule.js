const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
    },
    workDate: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
  },
  { timestamps: true },
);

scheduleSchema.index({ employeeId: 1, workDate: 1 }, { unique: true });

module.exports = mongoose.model("Schedule", scheduleSchema);
