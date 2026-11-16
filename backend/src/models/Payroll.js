const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    month: { type: String, required: true }, // "YYYY-MM"
    totalCredit: { type: Number, default: 0 }, // tổng công (ngày công)
    totalHours: { type: Number, default: 0 }, // tổng giờ làm trong tháng
    baseSalary: { type: Number, required: true },
    hourRate: { type: Number, default: 40000 },
    allowance: { type: Number, default: 1000000 },
    adjustment: { type: Number, default: 0 }, // cộng/trừ tay
    hourBonus: { type: Number, default: 0 },
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

// Tự tính lại mỗi lần lưu (không có phạt, không có bảo hiểm)
// Không dùng tham số next: Mongoose 9 không còn truyền next vào hook này
payrollSchema.pre("validate", function () {
  this.hourBonus = Math.round(this.totalHours * this.hourRate);
  this.total =
    this.baseSalary + this.hourBonus + this.allowance + this.adjustment;
});

// Tham số thứ 3 ép lưu vào đúng collection "payrolls"
module.exports = mongoose.model("Payroll", payrollSchema, "payrolls");