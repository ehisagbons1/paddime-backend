import { Router } from 'express';
import Notification from '../models/Notification.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// Get notifications for a user (personal and general)
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { user: req.user._id }, // User-specific notifications
        { user: { $exists: false } } // General notifications
      ]
    }).sort({ createdAt: -1 }); // Sort by newest first
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark a notification as read
router.post('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, $or: [{ user: req.user._id }, { user: { $exists: false } }] },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 