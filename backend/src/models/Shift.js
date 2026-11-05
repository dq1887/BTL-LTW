const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    breakMinutes: { type: Number, default: 60 },
  },
  { timestamps: true },
);
