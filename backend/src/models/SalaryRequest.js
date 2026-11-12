const mongoose = require("mongoose");

const salaryRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    month: { type: String, required: true },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "resolved", "rejected"],
      default: "pending",
    },
    reply: { type: String, default: "" },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    handledAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("SalaryRequest", salaryRequestSchema);