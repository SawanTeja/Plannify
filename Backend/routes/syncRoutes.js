const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Import ALL Models
const Task = require('../models/Task');
const Habit = require('../models/Habit');
const Transaction = require('../models/Transaction');
const Journal = require('../models/Journal');
const Subject = require('../models/Subject');      // <-- NEW
const Timetable = require('../models/Timetable');  // <-- NEW
const BucketItem = require('../models/BucketItem');// <-- NEW
const Gamification = require('../models/Gamification');
const Budget = require('../models/Budget'); // <-- NEW

// Helper for Singletons (Budget, Gamification, Timetable)
// These should only have ONE document per user.
// IMPORTANT: Uses delete+create to handle legacy ObjectId vs new string _id conflicts
async function applySingletonChanges(Model, userId, items) {
  if (!items || items.length === 0) return;

  // We only care about the latest one if multiple are sent
  const latest = items.sort((a, b) => {
    const tA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tB - tA;
  })[0];
  
  const { _id, ...data } = latest;
  data.userId = userId;
  data.updatedAt = new Date();

  // STEP 1: Get existing document(s) to preserve/merge data
  const existing = await Model.findOne({ userId: userId }).lean();
  
  // STEP 2: For Timetable - merge existing schedule with new schedule
  if (data.schedule && existing && existing.schedule) {
    // Merge: start with existing, overlay new values
    const mergedSchedule = { ...existing.schedule };
    for (const [dayKey, dayValue] of Object.entries(data.schedule)) {
      mergedSchedule[dayKey] = dayValue;
    }
    data.schedule = mergedSchedule;
  } else if (!data.schedule && existing && existing.schedule) {
    // If new data doesn't have schedule, preserve existing
    data.schedule = existing.schedule;
  }

  // STEP 3: Delete ALL existing documents for this user (handles duplicate _id issue)
  await Model.deleteMany({ userId: userId });

  // STEP 4: Create fresh document with correct _id
  const newDoc = {
    _id: _id || 'singleton_' + Model.modelName.toLowerCase(),
    ...data
  };
  
  try {
    await Model.create(newDoc);
  } catch (err) {
    // If create fails (e.g., validation), log but don't crash
    console.error(`Failed to create ${Model.modelName}:`, err.message);
  }
}

// Helper to process "Push" updates efficiently using MongoDB bulkWrite
async function applyChanges(Model, userId, items) {
  if (!items || items.length === 0) return;

  const operations = items.map(item => {
    const { _id, ...data } = item;
    
    // Security: Ensure we don't overwrite the userId with something insecure
    data.userId = userId;
    // Force the server to set the update time, so all devices agree on timeline
    data.updatedAt = new Date();

    // Special handling for Subject history: merge instead of replace
    // This ensures attendance data from multiple devices is combined, not overwritten
    if (data.history && typeof data.history === 'object' && Object.keys(data.history).length > 0) {
      // Use $set with dot notation to merge history keys
      const historyUpdates = {};
      for (const [dateKey, dateValue] of Object.entries(data.history)) {
        historyUpdates[`history.${dateKey}`] = dateValue;
      }
      delete data.history; // Remove from $set since we're using dot notation
      
      return {
        updateOne: {
          filter: { _id: _id, userId: userId },
          update: { 
            $set: { ...data, ...historyUpdates }
          },
          upsert: true
        }
      };
    }

    return {
      updateOne: {
        filter: { _id: _id, userId: userId }, // Security: Only update if belongs to user
        update: { $set: data },
        upsert: true // If it doesn't exist (new item), create it
      }
    };
  });

  await Model.bulkWrite(operations);
}

// MAIN SYNC ROUTE
// POST /api/sync
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 1. Get the last time this device synced
    const { lastSync, changes } = req.body; 
    
    const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);
    const currentSyncTime = new Date();

    // 2. PUSH: Apply changes from the client to MongoDB
    if (changes) {
      await Promise.all([
        applyChanges(Task, userId, changes.tasks),
        applyChanges(Habit, userId, changes.habits),
        applyChanges(Transaction, userId, changes.transactions),
        applyChanges(Journal, userId, changes.journal),
        // New Collections
        // New Collections
        applyChanges(Subject, userId, changes.subjects),
        applySingletonChanges(Timetable, userId, changes.timetable),
        applyChanges(BucketItem, userId, changes.bucketList),
        applySingletonChanges(Gamification, userId, changes.gamification),
        applySingletonChanges(Budget, userId, changes.budget) // <-- NEW 
      ]);
    }

    // 3. PULL: Fetch new data from MongoDB that this device doesn't have yet
    // logic: "Give me everything where updatedAt > my lastSyncDate"
    const [
      tasks, 
      habits, 
      transactions, 
      journal, 
      subjects, 
      timetable, 
      bucketList,
      gamification,
      budget
    ] = await Promise.all([
      Task.find({ userId, updatedAt: { $gt: lastSyncDate } }).lean(),
      Habit.find({ userId, updatedAt: { $gt: lastSyncDate } }).lean(),
      Transaction.find({ userId, updatedAt: { $gt: lastSyncDate } }).lean(),
      Journal.find({ userId, updatedAt: { $gt: lastSyncDate } }).lean(),
      // New Collections
      Subject.find({ userId, updatedAt: { $gt: lastSyncDate } }).lean(),
      Timetable.find({ userId, updatedAt: { $gt: lastSyncDate } }).lean(),
      BucketItem.find({ userId, updatedAt: { $gt: lastSyncDate } }).lean(),
      Gamification.find({ userId, updatedAt: { $gt: lastSyncDate } }).lean(),
      Budget.find({ userId, updatedAt: { $gt: lastSyncDate } }).lean() // <-- NEW 
    ]);

    // 4. Update User's lastSync field (for analytics/debugging only)
    req.user.lastSync = currentSyncTime;
    await req.user.save();

    // 5. Respond
    res.json({
      success: true,
      timestamp: currentSyncTime, // Client must save this for the next sync!
      changes: {
        tasks,
        habits,
        transactions,
        journal,
        subjects,    
        timetable,   
        bucketList,   
        gamification,
        budget  
      }
    });

  } catch (error) {
    console.error('Sync Error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// RESET ROUTE
// DELETE /api/sync/reset
router.delete('/reset', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`⚠️ RESETTING DATA FOR USER: ${userId}`);

    await Promise.all([
      Task.deleteMany({ userId }),
      Habit.deleteMany({ userId }),
      Transaction.deleteMany({ userId }),
      Journal.deleteMany({ userId }),
      Subject.deleteMany({ userId }),
      Timetable.deleteMany({ userId }),
      BucketItem.deleteMany({ userId }),
      Gamification.deleteMany({ userId }),
      Budget.deleteMany({ userId }),
    ]);

    // Reset Last Sync
    req.user.lastSync = new Date(0);
    await req.user.save();

    res.json({ success: true, message: 'All data cleared from server.' });
  } catch (error) {
    console.error('Reset Error:', error);
    res.status(500).json({ error: 'Reset failed' });
  }
});

module.exports = router;