import { getData, storeData } from './storageHelper';

const COLLECTIONS = {
  tasks: 'tasks', 
  habits: 'habits_data', // Fixed: was 'habits'
  journal: 'journal_data', // Fixed: was 'journal_entries'
  // Attendance
  subjects: 'att_subjects',
  timetable: 'att_schedule',
  // Bucket List
  // Bucket List
  bucketList: 'bucket_list',
  // Gamification
  gamification: 'user_gamification',
  // Budget Settings (Currency, Categories, Recurring, etc.)
  budget: 'budget_data'
};

export const SyncHelper = {
  getChanges: async (lastSyncTime) => {
    // Initialize the changes object with ALL possible keys
    const changes = { 
        tasks: [], 
        habits: [], 
        transactions: [], 
        journal: [], 
        subjects: [], 
        timetable: [], 
 
        bucketList: [],
        gamification: [],
        budget: []  // Add budget settings container 
    };
    
    const lastSync = lastSyncTime ? new Date(lastSyncTime).getTime() : 0;

    // 1. Handle Standard Collections
    for (const [backendKey, storageKey] of Object.entries(COLLECTIONS)) {
      let data = await getData(storageKey);

      // Handle Timetable, Gamification, & Budget Settings (Single Object Wrapper)
      if (backendKey === 'timetable' || backendKey === 'gamification' || backendKey === 'budget') { // Added 'budget'
         if (data && data.updatedAt) {
             const txTime = new Date(data.updatedAt).getTime();
             if (txTime > lastSync) {
                 // Ensure _id is set for backend
                 if (!data._id) data._id = backendKey === 'budget' ? 'budget_settings' : backendKey;
                 
                 // For Budget, we strictly DO NOT want to send the transactions array here
                 // because that is handled separately by the 'transactions' key.
                 if (backendKey === 'budget') {
                      const { transactions, ...settings } = data;
                      changes[backendKey].push(settings); 
                 } else {
                      changes[backendKey].push(data);
                 }
             }
         }
         continue;
      }
      
      // Handle Arrays (Tasks, Habits, Journal, Subjects, BucketList)
      if (data && Array.isArray(data)) {
        changes[backendKey] = data.filter(item => {
           // Handle items created before we added updatedAt (treat as new)
           const itemTime = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
           // If it has no timestamp, we assume it needs syncing if it's not empty
           if (!item.updatedAt) return true; 
           return itemTime > lastSync;
        });
      }
    }

    // 2. SPECIAL HANDLE: Budget Transactions
    // Budget is complex because it is nested inside "budget_data"
    const budgetData = await getData("budget_data");
    if (budgetData && budgetData.transactions) {
        changes.transactions = budgetData.transactions.filter(tx => {
            const txTime = tx.updatedAt ? new Date(tx.updatedAt).getTime() : 0;
            if (!tx.updatedAt) return true; // Sync if timestamp is missing
            return txTime > lastSync;
        });
    }

    return changes;
  },

  applyServerChanges: async (serverData) => {
    let hasChanges = false;

    // 1. Handle Standard Collections
    for (const [backendKey, storageKey] of Object.entries(COLLECTIONS)) {
      if (!serverData[backendKey] || serverData[backendKey].length === 0) continue;
      
      // Handle Timetable, Gamification, & Budget Settings Special Case (Replace Logic)
      if (backendKey === 'timetable' || backendKey === 'gamification' || backendKey === 'budget') { // Added 'budget'
          // Server sends an array. We must find the NEWEST one.
          const sorted = serverData[backendKey].sort((a, b) => {
              const tA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
              const tB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
              return tB - tA; // Descending
          });
          
          if (sorted.length === 0) continue;
          const latest = sorted[0];
          
          if (backendKey === 'budget') {
             // For budget, we must merge carefully to NOT lose local transactions
             const currentBudget = (await getData("budget_data")) || {};
             // We update everything EXCEPT transactions
             const newBudget = { 
                 ...currentBudget, 
                 ...latest, 
                 transactions: currentBudget.transactions || [] // Preserve transactions
             };
             await storeData("budget_data", newBudget);
          } else if (backendKey === 'timetable') {
             // SYNC FIX: Normalize timetable format and merge schedules
             const currentTimetable = (await getData(storageKey)) || {};
             const localSchedule = currentTimetable.schedule || {};
             const serverSchedule = latest.schedule || {};
             
             // Merge schedules: combine local and server weekday mappings
             // Server wins on conflict (last-write-wins)
             const mergedSchedule = { ...localSchedule };
             for (const [day, classes] of Object.entries(serverSchedule)) {
                 // Replace entire day's schedule with server version
                 mergedSchedule[day] = classes;
             }
             
             const normalized = {
                 _id: latest._id || 'timetable',
                 schedule: mergedSchedule,
                 updatedAt: latest.updatedAt || new Date()
             };
             await storeData(storageKey, normalized);
          } else {
              await storeData(storageKey, latest);
          }
          hasChanges = true;
          continue;
      }

      // Handle Array Merging (Tasks, Habits, etc.)
      const localData = (await getData(storageKey)) || [];
      const mergedData = mergeArrays(localData, serverData[backendKey]);
      
      await storeData(storageKey, mergedData);
      hasChanges = true;
    }

    // 2. SPECIAL HANDLE: Budget Transactions
    if (serverData.transactions && serverData.transactions.length > 0) {
        const budgetData = (await getData("budget_data")) || { transactions: [], categories: [] };
        
        // Merge the transactions array
        budgetData.transactions = mergeArrays(budgetData.transactions || [], serverData.transactions);
        
        // Recalculate 'Spent' for Categories
        // This ensures the UI progress bars update immediately without a restart
        if (budgetData.categories) {
            budgetData.categories = budgetData.categories.map(cat => {
                const totalSpent = budgetData.transactions
                    .filter(t => t.category === cat.name && t.type === 'expense')
                    .reduce((sum, t) => sum + (t.amount || 0), 0);
                return { ...cat, spent: totalSpent };
            });
        }

        await storeData("budget_data", budgetData);
        hasChanges = true;
    }

    return hasChanges;
  },
};

// --- HELPER FUNCTION ---
// Merges two arrays based on unique IDs (_id or id)
// Server data always overwrites local data if IDs match
const mergeArrays = (local, server) => {
    const merged = [...(local || [])];
    if (!server) return merged;

    server.forEach(serverItem => {
        if (!serverItem) return;
        // Find if item exists locally (check both _id and legacy id)
        const index = merged.findIndex(l => 
            (l && l._id && l._id === serverItem._id) || 
            (l && l.id && l.id == serverItem._id)
        );

        if (index > -1) {
            // DEEP MERGE: Handle 'history' for subjects (attendance data)
            if (merged[index].history && serverItem.history) {
                const mergedHistory = { ...merged[index].history };
                for (const [dateKey, dateValue] of Object.entries(serverItem.history)) {
                    // Server wins if conflict (last-write-wins)
                    mergedHistory[dateKey] = dateValue;
                }
                merged[index] = { ...merged[index], ...serverItem, history: mergedHistory };
            } else {
                // Standard shallow merge for items without history
                merged[index] = { ...merged[index], ...serverItem };
            }
        } else {
            // Add new item from server
            merged.push(serverItem);
        }
    });
    
    return merged;
};