import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { auth, adminOnly } from '../middleware/auth.js';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { sendPushNotification } from '../utils/sendPushNotification.js';
import { notifyAllUsers } from '../utils/notifyAllUsers.js';
import multer from 'multer';
import Settings from '../models/Settings.js';
import express from 'express';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get last N lines from a file
function tailFile(filePath, n = 500) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.trim().split('\n');
    return lines.slice(-n).join('\n');
  } catch (err) {
    return 'Error reading log file.';
  }
}

router.get('/logs', auth, adminOnly, (req, res) => {
  const logPath = path.join(__dirname, '..', 'logs', 'combined.log');
  const logs = tailFile(logPath, 500);
  res.type('text/plain').send(logs);
});

router.get('/analytics/giftcard-sales', auth, adminOnly, async (req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  try {
    const summary = await (await import('../models/SellRequest.js')).default.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: 'completed',
        }
      },
      {
        $group: {
          _id: { giftCardCode: '$giftCardCode', faceValue: '$faceValue' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$faceValue' }
        }
      },
      { $sort: { '_id.giftCardCode': 1, '_id.faceValue': 1 } }
    ]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch analytics', error: err.message });
  }
});

// Admin test push notification endpoint
router.post('/test-push', auth, adminOnly, async (req, res) => {
  const { email, title, body } = req.body;
  const user = await User.findOne({ email });
  if (!user || !user.pushToken) {
    return res.status(404).json({ message: 'User or push token not found' });
  }
  await sendPushNotification(user.pushToken, title || 'Test', body || 'This is a test notification');
  res.json({ message: 'Notification sent' });
});

// Admin broadcast notification endpoint
router.post('/broadcast-notification', auth, adminOnly, async (req, res) => {
  const { title, body, type, data } = req.body;
  if (!title || !body) return res.status(400).json({ message: 'Title and body are required' });
  try {
    await notifyAllUsers(title, body, { type, ...data });
    res.json({ message: 'Notification sent to all users' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send notification', error: err.message });
  }
});

// Multer setup for guide video uploads
const guideVideoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads/guide-videos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'guide_' + Date.now() + ext);
  }
});
const uploadGuideVideo = multer({ storage: guideVideoStorage });

// Upload guide video (admin only)
router.post('/guide-video', auth, adminOnly, uploadGuideVideo.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No video uploaded' });
  const videoUrl = `/uploads/guide-videos/${req.file.filename}`;
  await Settings.findOneAndUpdate(
    { key: 'guideVideoUrl' },
    { value: videoUrl },
    { upsert: true, new: true }
  );
  res.json({ message: 'Guide video uploaded', url: videoUrl });
});

// Get current guide video URL
router.get('/guide-video', async (req, res) => {
  const setting = await Settings.findOne({ key: 'guideVideoUrl' });
  if (!setting) return res.json({ url: null });
  res.json({ url: setting.value });
});

// Serve guide videos statically
router.use('/uploads/guide-videos', express.static(path.join(__dirname, '../uploads/guide-videos')));

export default router; 