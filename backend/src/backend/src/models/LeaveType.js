import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  paid: { type: Boolean, required: true },
  annualQuota: { type: Number, default: null, min: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true, collection: 'leavetypes' });
export const LeaveType = mongoose.models.LeaveType ?? mongoose.model('LeaveType', schema);


