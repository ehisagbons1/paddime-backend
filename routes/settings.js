import { Router } from 'express';
import Settings from '../models/Settings.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = Router();

// Get referral bonus amount
router.get('/referral-bonus', auth, adminOnly, async (req, res) => {
  const setting = await Settings.findOne({ key: 'referralBonusAmount' });
  res.json({ value: setting ? setting.value : 0 });
});

// Set referral bonus amount
router.post('/referral-bonus', auth, adminOnly, async (req, res) => {
  const { value } = req.body;
  if (typeof value !== 'number' || value < 0) return res.status(400).json({ message: 'Invalid value' });
  const setting = await Settings.findOneAndUpdate(
    { key: 'referralBonusAmount' },
    { value },
    { upsert: true, new: true }
  );
  res.json({ value: setting.value });
});

// Get level settings
router.get('/level-settings', auth, adminOnly, async (req, res) => {
  const setting = await Settings.findOne({ key: 'levelSettings' });
  // If not set, return default
  const defaultLevels = [
    { level: 1, min: 0, max: 500000, bonus: 0 },
    { level: 2, min: 500000, max: 1000000, bonus: 2000 },
    { level: 3, min: 1000000, max: 2000000, bonus: 5000 },
    { level: 4, min: 2000000, max: 5000000, bonus: 10000 },
    { level: 5, min: 5000000, max: Infinity, bonus: 20000 },
  ];
  res.json({ value: setting ? setting.value : defaultLevels });
});

// Set level settings
router.post('/level-settings', auth, adminOnly, async (req, res) => {
  const { value } = req.body;
  if (!Array.isArray(value)) return res.status(400).json({ message: 'Invalid value' });
  // Optionally validate each level object here
  const setting = await Settings.findOneAndUpdate(
    { key: 'levelSettings' },
    { value },
    { upsert: true, new: true }
  );
  res.json({ value: setting.value });
});

export default router; 