import mongoose from 'mongoose';
const schema = new mongoose.Schema({ _id: String, revision: { type: Number, default: 0 } }, { collection: 'hrmLocks' });
export const HrmLock = mongoose.models.HrmLock ?? mongoose.model('HrmLock', schema);
export async function initHrmLock() {
  await HrmLock.updateOne({ _id: 'leave-integrity' }, { $setOnInsert: { revision: 0 } }, { upsert: true });
}
export async function withHrmTransaction(work) {
  return mongoose.connection.transaction(async (session) => {
    await HrmLock.updateOne({ _id: 'leave-integrity' }, { $inc: { revision: 1 } }, { session });
    return work(session);
  });
}
