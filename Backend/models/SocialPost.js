const mongoose = require('mongoose');

const SocialPostSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  groupId: { type: String, ref: 'SocialGroup', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String }, // Denormalized for display
  authorAvatar: { type: String }, // Denormalized for display
  topic: { type: String },
  text: { type: String },
  image: { type: String }, // Cloudinary URL
  location: { type: String },
  mood: { type: String },
  date: { type: String }, // Display date string
  timestamp: { type: Number }, // Unix timestamp for sorting
  tags: [{ type: String }],
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String },
    userName: { type: String }, // Denormalized for display
  }],
  uploadStatus: { type: String }, // 'pending', 'complete', 'failed'
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// Index for fetching posts by group
SocialPostSchema.index({ groupId: 1, timestamp: -1 });
// Index for author lookups
SocialPostSchema.index({ authorId: 1 });

module.exports = mongoose.model('SocialPost', SocialPostSchema);
