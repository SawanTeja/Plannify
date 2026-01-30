const mongoose = require('mongoose');

const JournalSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },  // Legacy field, optional
  topic: { type: String },    // Title of the journal entry
  text: { type: String },     // Journal body text
  image: { type: String },    // Cloudinary URL
  location: { type: String }, // Human-readable location string
  mood: { type: String },     // e.g., "😊", "😢"
  date: { type: Date, default: Date.now },
  tags: [{ type: String }],
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Journal', JournalSchema);