const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Changed from ObjectId to String for sync compatibility
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, default: 'General' },
  priority: { type: String, default: 'Medium' }, // Added
  duration: { type: String }, // Added
  date: { type: String }, // Added: YYYY-MM-DD string from frontend
  completed: { type: Boolean, default: false }, // Added: Matches frontend key
  isCompleted: { type: Boolean, default: false }, // kept for legacy or duplicate
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// Compound index to speed up fetching tasks for a specific user
TaskSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Task', TaskSchema);