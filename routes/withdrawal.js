import { Router } from 'express';
import Withdrawal from '../models/Withdrawal.js';
import { auth, adminOnly } from '../middleware/auth.js';
import User from '../models/User.js';
import Pin from '../models/Pin.js';
import sendEmail from '../utils/sendEmail.js';
import Notification from '../models/Notification.js';

const router = Router();

// List user's withdrawals
router.get('/', auth, async (req, res) => {
  const withdrawals = await Withdrawal.find({ user: req.user._id }).populate('bankAccount');
  res.json(withdrawals);
});

// Create withdrawal
router.post('/', auth, async (req, res) => {
  const { amount, bankAccount, pin } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  // PIN check
  const pinDoc = await Pin.findOne({ user: req.user._id });
  if (!pinDoc) return res.status(400).json({ message: 'PIN not set. Please set your PIN first.' });
  const bcrypt = await import('bcryptjs');
  const pinMatch = await bcrypt.compare(pin, pinDoc.pinHash);
  if (!pin || !pinMatch) {
    return res.status(400).json({ message: 'Invalid PIN' });
  }
  if (typeof amount !== 'number' && typeof amount !== 'string') return res.status(400).json({ message: 'Invalid amount' });
  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ message: 'Invalid amount' });
  if ((user.balance || 0) < amt) return res.status(400).json({ message: 'Insufficient balance' });
  user.balance -= amt;
  await user.save();
  const withdrawal = await Withdrawal.create({
    user: req.user._id,
    amount: amt,
    bankAccount,
    status: 'pending',
  });
  res.status(201).json(withdrawal);
});

// Admin: list all withdrawals
router.get('/all', auth, adminOnly, async (req, res) => {
  const withdrawals = await Withdrawal.find().populate('user bankAccount');
  res.json(withdrawals);
});

// Admin: update withdrawal status and comment
router.patch('/:id', auth, adminOnly, async (req, res) => {
  const { status, adminComment } = req.body;
  const update = {};
  if (status) update.status = status;
  if (adminComment !== undefined) update.adminComment = adminComment;
  if (status === 'completed') update.completedAt = new Date();
  
  const withdrawal = await Withdrawal.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).populate('user bankAccount');
  if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });
  
  // Create notification and send email if status is completed
  if (status === 'completed' && withdrawal.user) {
    // Create in-app notification
    try {
      await Notification.create({
        user: withdrawal.user._id,
        title: 'Withdrawal Completed',
        message: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} has been completed successfully.`,
        type: 'withdrawal',
        link: '/wallet' // Example link to the wallet screen
      });
    } catch (error) {
      console.error('Failed to create withdrawal notification:', error);
      // Do not fail the main request if notification creation fails
    }

    // Send email notification
    const completionDate = new Date();
    const formattedDate = completionDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedTime = completionDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    try {
      await sendEmail({
        to: withdrawal.user.email,
        subject: 'Withdrawal Completed - Paddime',
        text: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} has been completed successfully. Transaction completed on ${formattedDate} at ${formattedTime}. Thank you for using Paddime!`,
        html: `
          <div style="font-family: Arial, sans-serif; background: #f9f9f9; min-height: 100vh; padding: 0; margin: 0;">
            <div style="max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); overflow: hidden;">
              <div style="background: #e6e94b; padding: 32px 0; text-align: center;">
                <h1 style="color: #222; margin: 0; font-size: 2.2rem; letter-spacing: 2px;">Paddime</h1>
              </div>
              <div style="padding: 32px 24px 24px 24px;">
                <h2 style="color: #222; margin-top: 0;">Withdrawal Completed</h2>
                <p style="font-size: 16px; color: #444;">Hello ${withdrawal.user.name},</p>
                <p style="font-size: 16px; color: #444;">Your withdrawal has been processed successfully!</p>
                <div style="background: #e6e94b; color: #222; font-size: 1.5rem; font-weight: bold; padding: 18px 0; border-radius: 8px; text-align: center; margin: 24px 0;">₦${withdrawal.amount.toLocaleString()}</div>
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p style="margin: 4px 0; font-size: 14px; color: #666;"><strong>Transaction Date:</strong> ${formattedDate}</p>
                  <p style="margin: 4px 0; font-size: 14px; color: #666;"><strong>Transaction Time:</strong> ${formattedTime}</p>
                  <p style="margin: 4px 0; font-size: 14px; color: #666;"><strong>Bank Account:</strong> ${withdrawal.bankAccount ? withdrawal.bankAccount.bankName + ' - ' + withdrawal.bankAccount.accountNumber : 'N/A'}</p>
                  <p style="margin: 4px 0; font-size: 14px; color: #666;"><strong>Status:</strong> <span style="color: #27ae60; font-weight: bold;">Completed</span></p>
                </div>
                <p style="font-size: 16px; color: #444; margin-top: 24px;">The funds have been transferred to your bank account and should reflect in your account shortly.</p>
                <p style="font-size: 16px; color: #444; margin-top: 16px;">Thank you for using Paddime!</p>
              </div>
            </div>
            <div style="text-align: center; color: #aaa; font-size: 13px; margin-top: 24px;">&copy; ${new Date().getFullYear()} Paddime</div>
          </div>
        `
      });
    } catch (error) {
      console.error('Failed to send withdrawal completion email:', error);
      // Don't fail the request if email fails
    }
  }
  
  res.json(withdrawal);
});

// Mark a withdrawal as processed/reviewed
router.patch('/:id/mark', auth, adminOnly, async (req, res) => {
  const withdrawal = await Withdrawal.findByIdAndUpdate(
    req.params.id,
    { $set: { marked: true } },
    { new: true }
  );
  if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });
  res.json(withdrawal);
});

export default router; 