import mongoose from 'mongoose';

const pinSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pinHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Pin = mongoose.model('Pin', pinSchema);
export default Pin; 