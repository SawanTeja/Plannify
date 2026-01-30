const mongoose = require('mongoose');

const BucketItemSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  category: { type: String, default: 'Other ✨' },
  completed: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }, // Soft Delete for sync
}, { timestamps: true });

module.exports = mongoose.model('BucketItem', BucketItemSchema);