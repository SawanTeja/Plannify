const mongoose = require('mongoose');

const JournalSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  mood: { type: String }, // e.g., "Happy", "Stressed"
  date: { type: Date, default: Date.now },
  tags: [{ type: String }],
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Journal', JournalSchema);