import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  bankAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  adminComment: { type: String, default: '' },
  marked: { type: Boolean, default: false },
});

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);
export default Withdrawal; 