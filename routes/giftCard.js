import { Router } from 'express';
import GiftCard from '../models/GiftCard.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = Router();

// List all gift cards (admin or public)
router.get('/', async (req, res) => {
  const cards = await GiftCard.find();
  res.json(cards);
});

// Add new gift card (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  const { code, currencies, offers } = req.body;
  if (!code || !currencies || !offers) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const card = await GiftCard.create({ code, currencies, offers });
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update gift card (admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { code, currencies, offers } = req.body;
  try {
    const card = await GiftCard.findByIdAndUpdate(
      req.params.id,
      { $set: { code, currencies, offers } },
      { new: true }
    );
    if (!card) return res.status(404).json({ message: 'Gift card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete gift card (admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const card = await GiftCard.findByIdAndDelete(req.params.id);
    if (!card) return res.status(404).json({ message: 'Gift card not found' });
    res.json({ message: 'Gift card deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// List user's gift cards
router.get('/user', auth, async (req, res) => {
  const cards = await GiftCard.find({ owner: req.user._id });
  res.json(cards);
});

// Send gift card to another user
router.post('/send', auth, async (req, res) => {
  const { cardId, recipientId } = req.body;
  const card = await GiftCard.findOne({ _id: cardId, owner: req.user._id });
  if (!card) return res.status(404).json({ message: 'Gift card not found' });
  card.owner = recipientId;
  card.status = 'sent';
  await card.save();
  res.json({ message: 'Gift card sent' });
});

// Redeem gift card
router.post('/redeem', auth, async (req, res) => {
  const { cardId } = req.body;
  const card = await GiftCard.findOne({ _id: cardId, owner: req.user._id });
  if (!card) return res.status(404).json({ message: 'Gift card not found' });
  card.status = 'redeemed';
  await card.save();
  res.json({ message: 'Gift card redeemed' });
});

export default router; 