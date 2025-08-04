import mongoose from 'mongoose';

const sellRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  giftCardCode: { type: String, required: true },
  currency: { type: String, required: true },
  faceValue: { type: Number, required: true },
  rate: { type: Number, required: true },
  total: { type: Number, required: true },
  code: { type: String, required: function() { return this.cardType === 'e-card'; } },
  cardType: { type: String, enum: ['e-card', 'physical'], required: true, default: 'e-card' },
  images: [{ type: String }],
  status: { type: String, enum: ['pending', 'doing', 'cancel', 'completed'], default: 'pending' },
  marked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const SellRequest = mongoose.model('SellRequest', sellRequestSchema);
export default SellRequest; 