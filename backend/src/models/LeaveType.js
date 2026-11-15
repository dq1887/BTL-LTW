const mongoose = require("mongoose");

const leaveTypeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", trim: true, maxlength: 300 },
    isPaid: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LeaveType", leaveTypeSchema, "leavetypes");
