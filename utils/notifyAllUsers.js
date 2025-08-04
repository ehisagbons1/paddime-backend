import User from '../models/User.js';
import { sendPushNotification } from './sendPushNotification.js';

export async function notifyAllUsers(title, body, data = {}) {
  const users = await User.find({ pushToken: { $exists: true, $ne: null } });
  for (const user of users) {
    await sendPushNotification(user.pushToken, title, body, data);
  }
} 