import { Router } from 'express';
import Transaction from '../models/Transaction.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// List user's transactions
router.get('/', auth, async (req, res) => {
  const txs = await Transaction.find({ user: req.user._id });
  res.json(txs);
});

// Create transaction
router.post('/', auth, async (req, res) => {
  const { type, amount, details, status } = req.body;
  const tx = await Transaction.create({
    user: req.user._id,
    type,
    amount,
    details,
    status: status || 'pending',
  });
  res.status(201).json(tx);
});

export default router; 