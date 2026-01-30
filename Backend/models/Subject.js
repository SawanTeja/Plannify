const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  // History is a Map: "2023-10-27": { p: 1, a: 0 }
  // History is a Map: "2023-10-27": { p: 1, a: 0 }
  history: { type: Object, default: {} }, 
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Subject', SubjectSchema);