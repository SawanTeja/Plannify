const mongoose = require('mongoose');

const SocialGroupSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Unique group ID
  name: { type: String, required: true }, // Group display name
  inviteCode: { type: String, unique: true, required: true }, // 6-char code
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // All members including owner
}, { timestamps: true });

// Index for finding user's groups
SocialGroupSchema.index({ members: 1 });

module.exports = mongoose.model('SocialGroup', SocialGroupSchema);
