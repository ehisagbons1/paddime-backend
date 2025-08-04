import { Router } from 'express';
import InvitationCode from '../models/InvitationCode.js';
import { auth, adminOnly } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// Get user's invitation code
router.get('/', auth, async (req, res) => {
  let code = await InvitationCode.findOne({ user: req.user._id });
  if (!code) {
    // Generate if not exists
    const randomDigits = Math.floor(10000000 + Math.random() * 90000000); // 8 digits
    const newCode = `pad${randomDigits}`;
    code = await InvitationCode.create({ user: req.user._id, code: newCode });
  }
  res.json({ code: code.code });
});

// Validate invitation code
router.post('/validate', async (req, res) => {
  const { code } = req.body;
  const found = await InvitationCode.findOne({ code });
  res.json({ valid: !!found });
});

// ADMIN: Generate invitation code for any user by email
router.post('/admin-generate', auth, adminOnly, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  const User = (await import('../models/User.js')).default;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  let code = await InvitationCode.findOne({ user: user._id });
  if (!code) {
    const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
    const newCode = `pad${randomDigits}`;
    code = await InvitationCode.create({ user: user._id, code: newCode });
  }
  res.json({ code: code.code });
});

export default router; 