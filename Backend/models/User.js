const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true }, // From Google Auth
  email: { type: String, required: true, unique: true },
  name: { type: String },
  avatar: { type: String },
  lastSync: { type: Date, default: Date.now } // Tracks when they last pulled data
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);