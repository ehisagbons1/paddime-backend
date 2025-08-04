import { Router } from 'express';
import Chat, { Automation } from '../models/Chat.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = Router();

// Get user's chat
router.get('/', auth, async (req, res) => {
  let chat = await Chat.findOne({ user: req.user._id });
  if (!chat) {
    chat = await Chat.create({ user: req.user._id, messages: [] });
  }
  res.json(chat);
});

// Send message (user or admin)
router.post('/message', auth, async (req, res) => {
  const { text, sender, userId } = req.body; // sender: 'user' or 'admin'
  let chat;
  if (sender === 'admin' && userId) {
    // Admin replying to a user
    chat = await Chat.findOne({ user: userId });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (chat.status !== 'accepted') return res.status(403).json({ message: 'Chat not accepted' });
    chat.messages.push({ sender, text });
    await chat.save();
    return res.json(chat);
  } else {
    // User sending message
    chat = await Chat.findOne({ user: req.user._id });
    if (!chat) {
      chat = await Chat.create({ user: req.user._id, messages: [], status: 'pending' });
    }
    chat.messages.push({ sender, text });
    await chat.save();
    // If chat is pending, send automation message if set
    if (chat.status === 'pending') {
      const auto = await Automation.findOne({ key: 'global' });
      if (auto && auto.automationMessage) {
        chat.messages.push({ sender: 'admin', text: auto.automationMessage });
        await chat.save();
      }
    }
    return res.json(chat);
  }
});

// Admin: list all chats
router.get('/all', auth, adminOnly, async (req, res) => {
  const chats = await Chat.find().populate('user');
  res.json(chats);
});

// Admin: set chat status (accept/reject)
router.patch('/:id/status', auth, adminOnly, async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'accepted', 'rejected', 'closed'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  const chat = await Chat.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!chat) return res.status(404).json({ message: 'Chat not found' });
  res.json(chat);
});

// Get global automation message
router.get('/automation-message', auth, adminOnly, async (req, res) => {
  let auto = await Automation.findOne({ key: 'global' });
  if (!auto) auto = await Automation.create({ key: 'global', automationMessage: '' });
  res.json({ automationMessage: auto.automationMessage });
});

// Set global automation message
router.patch('/automation-message', auth, adminOnly, async (req, res) => {
  const { automationMessage } = req.body;
  let auto = await Automation.findOne({ key: 'global' });
  if (!auto) auto = await Automation.create({ key: 'global', automationMessage });
  else auto.automationMessage = automationMessage;
  await auto.save();
  res.json({ automationMessage: auto.automationMessage });
});

export default router; 