const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Consistent ID for sync (sent from client as 'timetable')
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // The schedule object: { "Monday": [{ subjectId: "...", count: 1 }] }
  schedule: { type: Object, default: {} },
}, { timestamps: true, minimize: false, strict: false, _id: false }); // _id: false prevents auto-generation

module.exports = mongoose.model('Timetable', TimetableSchema);