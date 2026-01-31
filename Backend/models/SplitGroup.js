const mongoose = require('mongoose');

const splitGroupSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Custom ID: 'group_' + timestamp
  name: { type: String, required: true },
  inviteCode: { type: String, required: true, unique: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  virtualMembers: [{ 
    id: String, 
    name: String 
  }],
  activities: [{
    text: String,
    date: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SplitGroup', splitGroupSchema);
