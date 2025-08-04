import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true }, // 'user' or 'admin'
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  messages: [messageSchema],
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'closed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

// For global automation message
const automationSchema = new mongoose.Schema({
  key: { type: String, default: 'global' },
  automationMessage: { type: String, default: '' },
});

export const Automation = mongoose.model('Automation', automationSchema);

const Chat = mongoose.model('Chat', chatSchema);
export default Chat; 