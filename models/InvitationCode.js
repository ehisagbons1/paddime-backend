import mongoose from 'mongoose';

const invitationCodeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

const InvitationCode = mongoose.model('InvitationCode', invitationCodeSchema);
export default InvitationCode; 