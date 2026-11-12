import mongoose from 'mongoose';
const ref = (model, required = true) => ({ type: mongoose.Schema.Types.ObjectId, ref: model, required });
const historySchema = new mongoose.Schema({
  action: String, actorId: ref('Employee'), at: { type: Date, default: Date.now }, note: String,
}, { _id: false });
const schema = new mongoose.Schema({
  employeeId: ref('Employee'), leaveTypeId: ref('LeaveType'),
  fromDate: { type: String, required: true }, toDate: { type: String, required: true },
  requestedDays: { type: Number, required: true, min: 1 },
  leaveDates: { type: [String], required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  reviewerId: ref('Employee', false), reviewedAt: Date, reviewNote: String,
  paidSnapshot: Boolean, typeNameSnapshot: String,
  cancelledBy: ref('Employee', false), cancelledAt: Date, cancelReason: String,
  history: { type: [historySchema], default: [] },
}, { timestamps: true, collection: 'leaverequests' });
schema.index({ employeeId: 1, status: 1, fromDate: 1, toDate: 1 });
export const LeaveRequest = mongoose.models.LeaveRequest ?? mongoose.model('LeaveRequest', schema);


