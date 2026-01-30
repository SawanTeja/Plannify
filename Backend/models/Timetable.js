const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
  _id: { type: String, default: 'timetable' }, // String ID, defaults to 'timetable' if not provided
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // The schedule object: { "Monday": [{ subjectId: "...", count: 1 }] }
  schedule: { type: Object, default: {} },
}, { timestamps: true, minimize: false, strict: false, _id: false }); // _id: false prevents auto-generation

module.exports = mongoose.model('Timetable', TimetableSchema);