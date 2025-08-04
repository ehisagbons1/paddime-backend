import mongoose from 'mongoose';

const giftCardSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  currencies: [{ type: String, required: true }],
  offers: { type: Object, required: true }, // { USD: {faceValue, waitTime, ...}, ... }
  createdAt: { type: Date, default: Date.now },
});

const GiftCard = mongoose.model('GiftCard', giftCardSchema);
export default GiftCard; 