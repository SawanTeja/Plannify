const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({

  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currency: { type: String, default: '$' },
  totalBudget: { type: Number, default: 0 },
  currentMonth: { type: String },
  categories: { type: Array, default: [] }, // [{ id, name, limit, spent, color }]
  recurringPayments: { type: Array, default: [] }, // [{ id, desc, amount, day }]
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Budget', BudgetSchema);