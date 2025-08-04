import { Schema, model } from 'mongoose';

const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    // Not required, so general notifications can be sent without a specific user
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['withdrawal', 'price_update', 'news', 'general'],
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  link: { // Optional link to navigate to a specific screen
    type: String,
  },
}, { timestamps: true });

export default model('Notification', notificationSchema); 