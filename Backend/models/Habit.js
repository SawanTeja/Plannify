const mongoose = require('mongoose');

const HabitSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  frequency: { type: String, default: 'Daily' },
  category: { type: String, default: 'Health' }, 
  duration: { type: String }, // Added: Fix "time and stuff" not saving
  history: { type: Map, of: Object, default: {} },
  completedDates: [{ type: Date }], 
  streak: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Habit', HabitSchema);