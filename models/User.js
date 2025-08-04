import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'active'], default: 'active' },
  balance: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  createdAt: { type: Date, default: Date.now },
  level: { type: Number, default: 1 },
  totalSold: { type: Number, default: 0 },
  referralBonus: { type: Number, default: 0 },
  levelBonus: { type: Number, default: 0 },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resetPasswordCode: { type: String },
  resetPasswordExpires: { type: Date },
  lastLogin: { type: Date },
  pushToken: { type: String },
  avatar: {
    type: String,
    default: '',
  },
});

userSchema.index({ username: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const User = mongoose.model('User', userSchema);
export default User; 