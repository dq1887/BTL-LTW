const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    month: { type: String, required: true },
    totalCredit: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    baseSalary: { type: Number, required: true },
    hourRate: { type: Number, default: 40000 },
    allowance: { type: Number, default: 1000000 },
    adjustment: { type: Number, default: 0 },
    hourBonus: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    leaveDeduction: { type: Number, default: 0 },
    totalLeaveDays: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    note: { type: String, default: "" },
    status: { type: String, enum: ["draft", "finalized"], default: "draft" },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    finalizedAt: Date,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: true },
);

payrollSchema.index({ employeeId: 1, month: 1 }, { unique: true });

payrollSchema.pre("validate", function () {
  this.hourBonus = Math.round(this.totalHours * this.hourRate);
  this.total =
    this.baseSalary +
    this.hourBonus +
    this.allowance +
    this.adjustment -
    (this.leaveDeduction || 0);
});

module.exports = mongoose.model("Payroll", payrollSchema, "payrolls");
