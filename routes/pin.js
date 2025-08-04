import { Router } from 'express';
import bcrypt from 'bcryptjs';
import Pin from '../models/Pin.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// Get PIN status
router.get('/', auth, async (req, res) => {
  const pin = await Pin.findOne({ user: req.user._id });
  res.json({ hasPin: !!pin });
});

// Set PIN
router.post('/set', auth, async (req, res) => {
  const { pin } = req.body;
  if (!/^[0-9]{4}$/.test(pin)) return res.status(400).json({ message: 'PIN must be 4 digits' });
  const hash = await bcrypt.hash(pin, 10);
  await Pin.findOneAndUpdate(
    { user: req.user._id },
    { pinHash: hash },
    { upsert: true, new: true }
  );
  res.json({ message: 'PIN set successfully' });
});

// Change PIN
router.post('/change', auth, async (req, res) => {
  const { currentPin, newPin } = req.body;
  const pinDoc = await Pin.findOne({ user: req.user._id });
  if (!pinDoc) return res.status(404).json({ message: 'No PIN set' });
  const match = await bcrypt.compare(currentPin, pinDoc.pinHash);
  if (!match) return res.status(400).json({ message: 'Current PIN is incorrect' });
  if (!/^[0-9]{4}$/.test(newPin)) return res.status(400).json({ message: 'PIN must be 4 digits' });
  pinDoc.pinHash = await bcrypt.hash(newPin, 10);
  await pinDoc.save();
  res.json({ message: 'PIN changed successfully' });
});

export default router; 