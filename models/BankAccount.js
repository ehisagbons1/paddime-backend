import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  accountName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);
export default BankAccount; 