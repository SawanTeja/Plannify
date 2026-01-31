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
  date: { type: String },     // Display date string (e.g., "31/01/2026")
  timestamp: { type: Number }, // Unix timestamp for sorting
  tags: [{ type: String }],
  uploadStatus: { type: String }, // 'pending', 'complete', 'failed'
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Journal', JournalSchema);