import { Router } from 'express';
import Feedback from '../models/Feedback.js';
import { auth, adminOnly } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';

const router = Router();

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/feedback'); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Submit feedback with images
router.post('/', auth, upload.array('images', 3), async (req, res) => {
  const { message } = req.body;
  const imagePaths = req.files ? req.files.map(f => f.path) : [];
  const feedback = await Feedback.create({ user: req.user._id, message, images: imagePaths });
  res.status(201).json(feedback);
});

// Admin: list all feedback
router.get('/all', auth, adminOnly, async (req, res) => {
  const feedbacks = await Feedback.find().populate('user');
  res.json(feedbacks);
});

export default router; 