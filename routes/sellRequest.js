import { Router } from 'express';
import SellRequest from '../models/SellRequest.js';
import { auth, adminOnly } from '../middleware/auth.js';
import User from '../models/User.js';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' }); // You can customize storage as needed

// Create new sell request (customer)
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  const { giftCardCode, currency, faceValue, rate, total, code, cardType } = req.body;
  if (!giftCardCode || !currency || !faceValue || !rate || !total || !cardType) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (cardType === 'e-card' && !code) {
    return res.status(400).json({ message: 'Missing card code for e-card' });
  }
  let imagePaths = [];
  if (cardType === 'physical' && req.files && req.files.length > 0) {
    imagePaths = req.files.map(file => file.path); // or file.filename, or build a URL
  } else if (cardType === 'e-card' && req.body.images) {
    imagePaths = req.body.images; // e-card: images is an array (usually empty)
  }
  try {
    const reqDoc = await SellRequest.create({
      user: req.user._id,
      giftCardCode,
      currency,
      faceValue,
      rate,
      total,
      code: cardType === 'e-card' ? code : '',
      images: imagePaths,
      cardType,
    });
    // Emit Socket.IO event for admin notification
    const io = req.app.get('io');
    if (io) {
      io.emit('new_sell_request', {
        id: reqDoc._id,
        giftCardCode: reqDoc.giftCardCode,
        currency: reqDoc.currency,
        faceValue: reqDoc.faceValue,
        user: req.user._id,
        createdAt: reqDoc.createdAt,
        cardType: reqDoc.cardType,
      });
    }
    res.status(201).json(reqDoc);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// List all sell requests (admin)
router.get('/', auth, adminOnly, async (req, res) => {
  const requests = await SellRequest.find().populate('user');
  res.json(requests);
});

// List user's sell requests
router.get('/mine', auth, async (req, res) => {
  const requests = await SellRequest.find({ user: req.user._id });
  res.json(requests);
});

// Update status (admin)
router.patch('/:id/status', auth, adminOnly, async (req, res) => {
  const { status } = req.body;
  const reqDoc = await SellRequest.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true }
  );
  if (!reqDoc) return res.status(404).json({ message: 'Sell request not found' });
  // If marking as completed, update user's totalSold, level, and levelBonus
  if (status === 'completed') {
    const user = await User.findById(reqDoc.user);
    if (user) {
      // Add this sell's total to user's totalSold
      user.totalSold = (user.totalSold || 0) + (reqDoc.total || 0);
      // Level thresholds and bonuses
      const LEVELS = [
        { level: 1, min: 0, max: 500000, bonus: 0 },
        { level: 2, min: 500000, max: 1000000, bonus: 2000 },
        { level: 3, min: 1000000, max: 2000000, bonus: 5000 },
        { level: 4, min: 2000000, max: 5000000, bonus: 10000 },
        { level: 5, min: 5000000, max: Infinity, bonus: 20000 },
      ];
      let newLevel = 1;
      let newBonus = 0;
      for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (user.totalSold >= LEVELS[i].min) {
          newLevel = LEVELS[i].level;
          newBonus = LEVELS[i].bonus;
          break;
        }
      }
      user.level = newLevel;
      user.levelBonus = newBonus;
      await user.save();
    }
  }
  res.json(reqDoc);
});

// List all unmarked sell requests (admin)
router.get('/unmarked', auth, adminOnly, async (req, res) => {
  const requests = await SellRequest.find({ marked: false }).populate('user');
  res.json(requests);
});

// Mark a sell request as processed (admin)
router.patch('/:id/mark', auth, adminOnly, async (req, res) => {
  const reqDoc = await SellRequest.findByIdAndUpdate(
    req.params.id,
    { $set: { marked: true } },
    { new: true }
  );
  if (!reqDoc) return res.status(404).json({ message: 'Sell request not found' });
  res.json(reqDoc);
});

export default router; 