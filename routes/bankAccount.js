import { Router } from 'express';
import BankAccount from '../models/BankAccount.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// List bank accounts
router.get('/', auth, async (req, res) => {
  const accounts = await BankAccount.find({ user: req.user._id });
  res.json(accounts);
});

// Add bank account
router.post('/', auth, async (req, res) => {
  const { bankName, accountNumber, accountName } = req.body;
  // Check if user already has 2 accounts
  const count = await BankAccount.countDocuments({ user: req.user._id });
  if (count >= 2) {
    return res.status(400).json({ message: 'You can only have up to 2 bank accounts.' });
  }
  const account = await BankAccount.create({
    user: req.user._id,
    bankName,
    accountNumber,
    accountName,
  });
  res.status(201).json(account);
});

// Delete bank account
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await BankAccount.deleteOne({ _id: req.params.id, user: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Bank account not found or not owned by user.' });
    }
    res.json({ message: 'Bank account deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 