const mongoose = require('mongoose');

const splitExpenseSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Custom ID: 'expense_' + timestamp
  groupId: { type: String, required: true, ref: 'SplitGroup' },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User ID
  splitType: { type: String, enum: ['Equally', 'Percent', 'Shares', 'Adjust', 'Exact', 'Payment'], default: 'Equally' },
  splits: { type: Map, of: Number }, // Map of UserId -> Amount Owed
  type: { type: String, enum: ['expense', 'payment'], default: 'expense' },
  date: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SplitExpense', splitExpenseSchema);
