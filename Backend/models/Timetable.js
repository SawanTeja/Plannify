const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // The schedule object: { "Monday": [{ subjectId: "...", count: 1 }] }
  schedule: { type: Object, default: {} },
}, { timestamps: true, minimize: false, strict: false });

module.exports = mongoose.model('Timetable', TimetableSchema);