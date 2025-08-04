import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { auth, adminOnly } from '../middleware/auth.js';
import Pin from '../models/Pin.js';
import sendEmail from '../utils/sendEmail.js';
import crypto from 'crypto';
import InvitationCode from '../models/InvitationCode.js';
import SellRequest from '../models/SellRequest.js';
import Withdrawal from '../models/Withdrawal.js';
import Transaction from '../models/Transaction.js';
import Settings from '../models/Settings.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import VerificationCode from '../models/VerificationCode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Multer setup for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, req.user._id + '_' + Date.now() + ext);
  }
});
const uploadAvatar = multer({ storage: avatarStorage });

// Register (User)
router.post('/register', async (req, res) => {
  const { username, email, password, invitationCode } = req.body;
  try {
    // Check for unique username (case-insensitive)
    const existingUser = await User.findOne({ username: { $regex: `^${username}$`, $options: 'i' } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    let invitedBy = undefined;
    let referralBonus = 0;
    let bonusSetting = await Settings.findOne({ key: 'referralBonusAmount' });
    let bonusAmount = bonusSetting ? Number(bonusSetting.value) : 0;
    if (invitationCode) {
      const codeDoc = await InvitationCode.findOne({ code: invitationCode });
      if (codeDoc) {
        invitedBy = codeDoc.user;
        referralBonus = bonusAmount;
        // Credit inviter
        const inviter = await User.findById(codeDoc.user);
        if (inviter) {
          inviter.referralBonus = (inviter.referralBonus || 0) + bonusAmount;
          inviter.balance = (inviter.balance || 0) + bonusAmount;
          await inviter.save();
        }
      }
    }
    const user = await User.create({ username, email, password: hashed, verified: true, invitedBy, referralBonus, balance: referralBonus });
    res.json({ message: 'Registration successful. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Register (Admin)
router.post('/admin/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    // Check for unique username (case-insensitive)
    const existingUser = await User.findOne({ username: { $regex: `^${username}$`, $options: 'i' } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed, isAdmin: true, verified: true });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, isAdmin: true } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login (User/Admin)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.verified) return res.status(403).json({ message: 'Please verify your email before logging in.' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // Send login notification email
    try {
        const loginTime = new Date().toLocaleString('en-US', { timeZone: 'UTC' });
        const ip = req.ip;
        await sendEmail({
            to: user.email,
            subject: 'Security Alert: New Login to Your Paddime Account',
            text: `Hi ${user.name},\n\nWe detected a new login to your Paddime account.\n\nTime: ${loginTime}\nIP Address: ${ip}\n\nIf this was not you, please secure your account immediately by changing your password.\n\nThank you,\nThe Paddime Team`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>New Login Detected</h2>
                    <p>Hi ${user.name},</p>
                    <p>Your Paddime account was just accessed from a new device or location. Here are the details:</p>
                    <ul>
                        <li><strong>Time:</strong> ${loginTime} (UTC)</li>
                        <li><strong>IP Address:</strong> ${ip}</li>
                    </ul>
                    <p>If this was you, you can safely disregard this email.</p>
                    <p><strong>If this was not you,</strong> please <a href="${process.env.FRONTEND_URL}/change-password">click here to change your password</a> immediately to secure your account.</p>
                    <hr>
                    <p>Thank you for using Paddime!</p>
                </div>
            `
        });
    } catch (emailError) {
        console.error('Failed to send login notification email:', emailError);
        // Do not block login if email fails
    }

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, status: user.status } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Change Password
router.post('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Email
router.post('/update-email', auth, async (req, res) => {
  const { newEmail, pin } = req.body;
  if (!newEmail || !pin) {
    return res.status(400).json({ message: 'New email and PIN are required.' });
  }
  // Check if email is already taken
  if (await User.findOne({ email: newEmail })) {
    return res.status(400).json({ message: 'Email already exists.' });
  }
  // Check PIN
  const pinDoc = await Pin.findOne({ user: req.user._id });
  if (!pinDoc) return res.status(400).json({ message: 'PIN not set.' });
  const bcrypt = await import('bcryptjs');
  const pinMatch = await bcrypt.compare(pin, pinDoc.pinHash);
  if (!pinMatch) return res.status(400).json({ message: 'Invalid PIN.' });
  // Update email
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  user.email = newEmail;
  await user.save();
  res.json({ message: 'Email updated successfully.' });
});

// ADMIN: List all users
router.get('/users', auth, adminOnly, async (req, res) => {
  const users = await User.find().populate('invitedBy', 'name email');
  res.json(users);
});

// ADMIN: Update user (name, email, status)
router.put('/users/:id', auth, adminOnly, async (req, res) => {
  const { name, email, status } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { name, email, status } },
    { new: true }
  );
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// ADMIN: Delete user
router.delete('/users/:id', auth, adminOnly, async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User deleted' });
});

// ADMIN: Set user status (pending/active)
router.patch('/users/:id/status', auth, adminOnly, async (req, res) => {
  const { status } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true }
  );
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// ADMIN: Add funds to user balance
router.patch('/users/:id/balance', auth, adminOnly, async (req, res) => {
  const { amount } = req.body;
  if (typeof amount !== 'number' || isNaN(amount)) {
    return res.status(400).json({ message: 'Amount must be a number' });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.balance = (user.balance || 0) + amount;
  await user.save();

  // Send email alert to user
  try {
    const sendEmail = (await import('../utils/sendEmail.js')).default;
    await sendEmail({
      to: user.email,
      subject: 'Funds Credited to Your Account',
      text: `Hello ${user.name || ''},\n\n₦${amount.toLocaleString()} has been credited to your Paddime account.\nYour new balance is ₦${user.balance.toLocaleString()}.`,
      html: `<div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 0; margin: 0;"><div style="max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); overflow: hidden;"><div style="background: #e6e94b; padding: 32px 0; text-align: center;"><h1 style="color: #222; margin: 0; font-size: 2.2rem; letter-spacing: 2px;">Paddime</h1></div><div style="padding: 32px 24px 24px 24px;"><h2 style="color: #222; margin-top: 0;">Funds Credited</h2><p style="font-size: 16px; color: #444;">Hello${user.name ? ' ' + user.name : ''},</p><p style="font-size: 16px; color: #444;">₦${amount.toLocaleString()} has been credited to your Paddime account.</p><div style="background: #e6e94b; color: #222; font-size: 1.5rem; font-weight: bold; letter-spacing: 2px; padding: 12px 0; border-radius: 8px; text-align: center; margin: 24px 0;">New Balance: ₦${user.balance.toLocaleString()}</div><p style="font-size: 15px; color: #888;">Thank you for using Paddime.</p></div></div><div style="text-align: center; color: #aaa; font-size: 13px; margin-top: 24px;">&copy; ${new Date().getFullYear()} Paddime</div></div>`
    });
  } catch (err) {
    console.error('Failed to send fund alert email:', err);
  }

  res.json(user);
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({
    id: user._id,
    username: user.username,
    email: user.email,
    isAdmin: user.isAdmin,
    status: user.status,
    balance: user.balance || 0,
    createdAt: user.createdAt,
    avatar: user.avatar,
    lastSeen: user.lastLogin,
  });
});

// Email verification endpoint
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Invalid or missing token.');
  const user = await User.findOne({ emailVerificationToken: token });
  if (!user) return res.status(400).send('Invalid or expired verification token.');
  user.verified = true;
  user.emailVerificationToken = undefined;
  await user.save();
  res.send('Email verified successfully! You can now log in.');
});

// Forgot Password - Request Reset Code
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetPasswordCode = code;
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiry
  await user.save();
  // Send code to email
  await sendEmail({
    to: email,
    subject: 'Password Reset Code',
    text: `Your password reset code is: ${code}`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #f9f9f9; min-height: 100vh; padding: 0; margin: 0;">
        <div style="max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); overflow: hidden;">
          <div style="background: #e6e94b; padding: 32px 0; text-align: center;">
            <h1 style="color: #222; margin: 0; font-size: 2.2rem; letter-spacing: 2px;">Paddime</h1>
          </div>
          <div style="padding: 32px 24px 24px 24px;">
            <h2 style="color: #222; margin-top: 0;">Password Reset Code</h2>
            <p style="font-size: 16px; color: #444;">Hello,</p>
            <p style="font-size: 16px; color: #444;">You requested to reset your password. Use the code below to continue:</p>
            <div style="background: #e6e94b; color: #222; font-size: 2rem; font-weight: bold; letter-spacing: 6px; padding: 18px 0; border-radius: 8px; text-align: center; margin: 24px 0;">${code}</div>
            <p style="font-size: 15px; color: #888;">This code will expire in 15 minutes.</p>
            <p style="font-size: 15px; color: #888;">If you did not request this, you can ignore this email.</p>
          </div>
        </div>
        <div style="text-align: center; color: #aaa; font-size: 13px; margin-top: 24px;">&copy; ${new Date().getFullYear()} Paddime</div>
      </div>
    `
  });
  res.json({ message: 'Password reset code sent to your email.' });
});

// Verify Reset Code
router.post('/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: 'Email and code are required.' });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (!user.resetPasswordCode || !user.resetPasswordExpires) {
    return res.status(400).json({ message: 'No reset code found. Please request a new one.' });
  }
  if (user.resetPasswordCode !== code) {
    return res.status(400).json({ message: 'Invalid code.' });
  }
  if (user.resetPasswordExpires < new Date()) {
    return res.status(400).json({ message: 'Code has expired.' });
  }
  res.json({ message: 'Code verified. You may now reset your password.' });
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: 'Email, code, and new password are required.' });
  }
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (!user.resetPasswordCode || !user.resetPasswordExpires) {
    return res.status(400).json({ message: 'No reset code found. Please request a new one.' });
  }
  if (user.resetPasswordCode !== code) {
    return res.status(400).json({ message: 'Invalid code.' });
  }
  if (user.resetPasswordExpires < new Date()) {
    return res.status(400).json({ message: 'Code has expired.' });
  }
  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordCode = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  res.json({ message: 'Password has been reset successfully.' });
});

// ADMIN: Get full user details (profile, sell requests, withdrawals, transactions)
router.get('/users/:id/details', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const sellRequests = await SellRequest.find({ user: user._id });
    const withdrawals = await Withdrawal.find({ user: user._id }).populate('bankAccount');
    const transactions = await Transaction.find({ user: user._id });
    res.json({ user, sellRequests, withdrawals, transactions });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN: Get total user count
router.get('/users/count', auth, adminOnly, async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN: Send bulk email to all users
router.post('/send-bulk-email', auth, adminOnly, async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ message: 'Subject and message are required.' });
  try {
    const users = await User.find({ status: 'active' });
    const sendEmail = (await import('../utils/sendEmail.js')).default;
    let sent = 0, failed = 0;
    for (const user of users) {
      try {
        await sendEmail({
          to: user.email,
          subject,
          text: message,
          html: `<div style="font-family: Arial, sans-serif; background: #f4f7fb; padding: 0; margin: 0;"><div style="max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); overflow: hidden;"><div style="background: #30399F; padding: 32px 0; text-align: center;"><img src='https://raw.githubusercontent.com/yourusername/yourrepo/main/giftcard-app/assets/logo.png' alt='Paddime Logo' style='height:48px;margin-bottom:8px;'/><h1 style='color:#fff;margin:0;font-size:2.2rem;letter-spacing:2px;'>Paddime</h1></div><div style='padding:32px 24px 24px 24px;'><p style='font-size:16px;color:#222;'>${message.replace(/\n/g,'<br/>')}</p></div></div><div style='text-align:center;color:#aaa;font-size:13px;margin-top:24px;'>&copy; ${new Date().getFullYear()} Paddime</div></div>`
        });
        sent++;
      } catch (err) {
        failed++;
      }
    }
    res.json({ message: `Emails sent: ${sent}, failed: ${failed}` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send emails.' });
  }
});

// ADMIN: List all admins
router.get('/admins', auth, adminOnly, async (req, res) => {
  const admins = await User.find({ isAdmin: true }).select('-password');
  res.json(admins);
});

// ADMIN: Add new admin
router.post('/admins', auth, adminOnly, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }
  if (await User.findOne({ email })) {
    return res.status(400).json({ message: 'Email already exists.' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed, isAdmin: true, verified: true });
  res.json({ message: 'Admin created successfully.', admin: { id: user._id, name: user.name, email: user.email, isAdmin: true } });
});

// ADMIN: Change admin password
router.post('/admins/:id/change-password', auth, adminOnly, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ message: 'New password is required.' });
  const admin = await User.findById(req.params.id);
  if (!admin || !admin.isAdmin) return res.status(404).json({ message: 'Admin not found.' });
  admin.password = await bcrypt.hash(newPassword, 10);
  await admin.save();
  res.json({ message: 'Password changed successfully.' });
});

// ADMIN: Delete admin (cannot delete self or last admin)
router.delete('/admins/:id', auth, adminOnly, async (req, res) => {
  if (req.user._id.toString() === req.params.id) {
    return res.status(400).json({ message: 'You cannot delete your own admin account.' });
  }
  const adminCount = await User.countDocuments({ isAdmin: true });
  if (adminCount <= 1) {
    return res.status(400).json({ message: 'Cannot delete the last admin.' });
  }
  const admin = await User.findById(req.params.id);
  if (!admin || !admin.isAdmin) return res.status(404).json({ message: 'Admin not found.' });
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'Admin deleted successfully.' });
});

// Save Expo push token for notifications
router.post('/push-token', auth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'No token provided' });
    req.user.pushToken = token;
    await req.user.save();
    res.json({ message: 'Push token saved' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save push token' });
  }
});

// POST /user/avatar - upload and update avatar
router.post('/user/avatar', auth, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const avatarPath = '/uploads/avatars/' + req.file.filename;
    await User.findByIdAndUpdate(req.user._id, { avatar: avatarPath });
    res.json({ success: true, avatar: avatarPath });
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
});

// Send registration verification code
router.post('/send-code', async (req, res) => {
  const { email, username } = req.body;
  if (!email || !username) return res.status(400).json({ message: 'Email and username are required.' });
  // Check for unique username (case-insensitive)
  const existingUser = await User.findOne({ username: { $regex: `^${username}$`, $options: 'i' } });
  if (existingUser) {
    return res.status(400).json({ message: 'This username already exists.' });
  }
  // Check for unique email
  const existingEmail = await User.findOne({ email: { $regex: `^${email}$`, $options: 'i' } });
  if (existingEmail) {
    return res.status(400).json({ message: 'This email is already used by another username.' });
  }
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 51 * 1000); // 51 seconds from now
  // Upsert code for this email
  await VerificationCode.findOneAndUpdate(
    { email },
    { code, expires },
    { upsert: true, new: true }
  );
  // Send code via email
  await sendEmail({
    to: email,
    subject: 'Your Padime Verification Code',
    text: `Your verification code is: ${code}\nThis code will expire in 51 seconds.`,
    html: `<div style=\"font-family: Arial, sans-serif; font-size: 18px;\">Your Padime verification code is: <b>${code}</b><br>This code will expire in 51 seconds.</div>`
  });
  res.json({ message: 'Verification code sent.' });
});

// Verify registration code
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ valid: false, message: 'Email and code are required.' });
  const record = await VerificationCode.findOne({ email });
  if (!record) return res.status(400).json({ valid: false, message: 'No code found for this email.' });
  if (record.code !== code) return res.status(400).json({ valid: false, message: 'Invalid code.' });
  if (record.expires < new Date()) return res.status(400).json({ valid: false, message: 'Code expired.' });
  // Optionally delete the code after successful verification
  await VerificationCode.deleteOne({ email });
  res.json({ valid: true });
});

export default router; 