import { Router } from 'express';
import authRoutes from './auth.js';
import bankAccountRoutes from './bankAccount.js';
import withdrawalRoutes from './withdrawal.js';
import transactionRoutes from './transaction.js';
import feedbackRoutes from './feedback.js';
import pinRoutes from './pin.js';
import invitationCodeRoutes from './invitationCode.js';
import chatRoutes from './chat.js';
import giftCardRoutes from './giftCard.js';
import sellRequestRoutes from './sellRequest.js';
import notificationRoutes from './notification.js';
import settingsRoutes from './settings.js';
import adminRoutes from './admin.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/bank-accounts', bankAccountRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/transactions', transactionRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/pin', pinRoutes);
router.use('/invitation', invitationCodeRoutes);
router.use('/chat', chatRoutes);
router.use('/giftcards', giftCardRoutes);
router.use('/sell-requests', sellRequestRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin', adminRoutes);

export default router; 