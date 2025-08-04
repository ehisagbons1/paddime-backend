import mongoose from 'mongoose';

const verificationCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  expires: { type: Date, required: true }
});

export default mongoose.model('VerificationCode', verificationCodeSchema); 