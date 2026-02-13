import { ApiService } from './ApiService';
import { getData, storeData } from '../utils/storageHelper';

// Reuse the base URL from ApiService or define a helper
const API_URL = 'https://plannify-red.vercel.app/api'; 

const CACHE_KEYS = {
    GROUPS: 'splitfund_groups',      // Matches SyncHelper
    EXPENSES: 'splitfund_expenses',  // Matches SyncHelper
    ONLINE_GROUPS_CACHE: 'split_online_groups_cache', // Separate cache for online groups to avoid conflicts during sync
    ONLINE_EXPENSES_CACHE_PREFIX: 'split_online_expenses_cache_'
};

export const SplitService = {
    // ===================================
    // GROUP MANAGEMENT
    // ===================================

    createGroup: async (token, name) => {
        if (!token) {
            throw new Error('Authentication required');
        }
        try {
            const response = await fetch(`${API_URL}/split/groups`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create group');
            return data.group;
        } catch (error) {
            console.error('SplitService Create Group Error:', error);
            throw error;
        }
    },

    joinGroup: async (token, inviteCode) => {
        if (!token) {
            throw new Error('Authentication required');
        }
        try {
            const response = await fetch(`${API_URL}/split/groups/join`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ inviteCode })
            });
            const data = await response.json();
            if (!response.ok) {
                 // Return the group even if "Already a member" 
                 if (data.message === 'Already a member') return data.group;
                 throw new Error(data.error || 'Failed to join group');
            }
            return data.group;
        } catch (error) {
            console.error('SplitService Join Group Error:', error);
            throw error;
        }
    },



    // --- MIGRATION UTILS ---
    migrateLegacyData: async () => {
        try {
            // Check if we have data in new keys
            const hasNewGroups = await getData(CACHE_KEYS.GROUPS);
            const hasNewExpenses = await getData(CACHE_KEYS.EXPENSES);
            
            if (hasNewGroups || hasNewExpenses) {
                // Migration likely already done or new data exists. 
                // We could merge, but let's assume if new data exists we are good.
                // Or we can double check if old data exists and is not in new.
                // For safety, let's just do it if new is EMPTY.
                 return;
            }

            // Check old keys
            const oldGroups = await getData('split_offline_groups');
            const oldExpenses = await getData('split_offline_expenses');

            if (oldGroups && oldGroups.length > 0) {
                console.log("Migrating Split Groups...");
                // Add 'updatedAt' if missing
                const migratedGroups = oldGroups.map(g => ({
                    ...g,
                    updatedAt: g.updatedAt || new Date() 
                }));
                await storeData(CACHE_KEYS.GROUPS, migratedGroups);
            }

            if (oldExpenses && Object.keys(oldExpenses).length > 0) {
                console.log("Migrating Split Expenses...");
                await storeData(CACHE_KEYS.EXPENSES, oldExpenses);
            }
            
        } catch (e) {
            console.error("Migration Failed:", e);
        }
    },

    // --- OFFLINE GROUPS ---
    createLocalGroup: async (name, members) => {
        try {
            const localGroups = await getData(CACHE_KEYS.GROUPS) || [];
            const newGroup = {
                id: `local_group_${Date.now()}`,
                _id: `local_group_${Date.now()}`,
                name,
                members: members.map(m => ({ ...m, id: m.id || m._id })),
                isOffline: true,
                createdAt: new Date(),
                updatedAt: new Date() // Important for sync
            };
            // Add to beginning
            localGroups.unshift(newGroup);
            await storeData(CACHE_KEYS.GROUPS, localGroups);
            return newGroup;
        } catch (e) {
            console.error('Create Local Group Error:', e);
            throw e;
        }
    },

    addLocalMember: async (groupId, memberName) => {
        try {
            const localGroups = await getData(CACHE_KEYS.GROUPS) || [];
            const groupIndex = localGroups.findIndex(g => (g._id === groupId || g.id === groupId));
            
            if (groupIndex === -1) throw new Error("Group not found locally");
            
            const newMember = {
                id: `local_user_${Date.now()}`,
                _id: `local_user_${Date.now()}`,
                name: memberName
            };
            
            // Update member list
            localGroups[groupIndex].members.push(newMember);
            
            // Update timestamp for sync
            localGroups[groupIndex].updatedAt = new Date();

            await storeData(CACHE_KEYS.GROUPS, localGroups);
            return newMember;
        } catch (e) {
            console.error('Add Local Member Error:', e);
            throw e;
        }
    },

    getLocalGroups: async () => {
        try {
            return await getData(CACHE_KEYS.GROUPS) || [];
        } catch (e) {
            console.error('Get Local Groups Error:', e);
            return [];
        }
    },

    // Get cached online groups (for instant load)
    getCachedOnlineGroups: async () => {
        try {
            return await getData(CACHE_KEYS.ONLINE_GROUPS_CACHE) || [];
        } catch (e) {
            return [];
        }
    },

    getGroups: async (token) => {
        // 1. Fetch Offline Groups (Always source of truth for local)
        const offlineGroups = await SplitService.getLocalGroups();

        // 2. Fetch Online Groups
        let onlineGroups = [];
        
        // Try loading cached online groups first if we want to return early, 
        // but this function is usually called when we WANT to refresh.
        // So we will just perform the fetch and update cache.
        
        if (token) {
            try {
                const response = await fetch(`${API_URL}/split/groups`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();
                if (response.ok) {
                    onlineGroups = (data.groups || []).map(group => ({
                        ...group,
                        id: group._id || group.id, 
                        // Merge real members and virtual members
                        members: [
                            ...(group.members || []).map(m => ({ ...m, id: m._id || m.id })),
                            ...(group.virtualMembers || [])
                        ]
                    }));

                    // Update Cache
                    await storeData(CACHE_KEYS.ONLINE_GROUPS_CACHE, onlineGroups);
                }
            } catch (error) {
                console.error('SplitService Get Groups Error (Online):', error);
                // Fallback to cache if network fails
                onlineGroups = await SplitService.getCachedOnlineGroups();
            }
        } else {
             // If no token, maybe we still have cached online groups from before?
             // Best to just show offline if not logged in, or show cached if user just lost internet but was logged in.
             onlineGroups = await SplitService.getCachedOnlineGroups();
        }
        
        return [...offlineGroups, ...onlineGroups];
    },

    // Add a virtual member (to online or offline group)
    addMember: async (token, groupId, name) => {
        // If offline group
        if (groupId && groupId.toString().startsWith('local_')) {
            return SplitService.addLocalMember(groupId, name);
        }
        
        // If online group
        if (!token) throw new Error('Authentication required');
        
        try {
            const response = await fetch(`${API_URL}/split/groups/${groupId}/members`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to add member');
            return data.member;
        } catch (error) {
            console.error('SplitService Add Member Error:', error);
            throw error;
        }
    },

    deleteGroup: async (token, groupId) => {
        // Handle Offline Deletion
        if (!token || (groupId && groupId.toString().startsWith('local_'))) {
            try {
                // Delete Group from Local Storage
                const localGroups = await SplitService.getLocalGroups();
                const filteredGroups = localGroups.filter(g => g.id !== groupId && g._id !== groupId);
                await storeData(CACHE_KEYS.GROUPS, filteredGroups);
                
                // Delete Expenses
                const allExpenses = await getData(CACHE_KEYS.EXPENSES) || {};
                delete allExpenses[groupId]; // Remove expenses for this specific group
                await storeData(CACHE_KEYS.EXPENSES, allExpenses);
                
                return true;
            } catch (e) {
                console.error('Delete Local Group Error:', e);
                throw e;
            }
        }
        
        // Handle Online Deletion
        try {
            const response = await fetch(`${API_URL}/split/groups/${groupId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to delete group');
            }
            return await response.json();
        } catch (e) {
            console.error('Delete Online Group Error:', e);
            throw e;
        }
    },

    // ===================================
    // EXPENSE MANAGEMENT
    // ===================================

    addLocalExpense: async (expenseData) => {
        try {
            const allExpenses = await getData(CACHE_KEYS.EXPENSES) || {};
            const groupExpenses = allExpenses[expenseData.groupId] || [];
            
            const newExpense = {
                ...expenseData,
                id: `local_exp_${Date.now()}`,
                _id: `local_exp_${Date.now()}`,
                date: new Date(),
                updatedAt: new Date()
            };
            
            groupExpenses.unshift(newExpense);
            allExpenses[expenseData.groupId] = groupExpenses;
            await storeData(CACHE_KEYS.EXPENSES, allExpenses);
            return newExpense;
        } catch (e) {
             console.error('Add Local Expense Error:', e);
             throw e;
        }
    },

    addExpense: async (token, expenseData) => {
        // Check if group is offline
        if (expenseData.groupId && expenseData.groupId.toString().startsWith('local_')) {
            return SplitService.addLocalExpense(expenseData);
        }

        // expenseData: { groupId, description, amount, paidBy, splitType, splits, type }
        try {
            const response = await fetch(`${API_URL}/split/groups/${expenseData.groupId}/expenses`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(expenseData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to add expense');
            return data.expense;
        } catch (error) {
            console.error('SplitService Add Expense Error:', error);
            throw error;
        }
    },

    getLocalExpenses: async (groupId) => {
         try {
            const allExpenses = await getData(CACHE_KEYS.EXPENSES) || {};
            return allExpenses[groupId] || [];
        } catch (e) {
            return [];
        }
    },

    getCachedOnlineExpenses: async (groupId) => {
        try {
            return await getData(`${CACHE_KEYS.ONLINE_EXPENSES_CACHE_PREFIX}${groupId}`) || [];
        } catch (e) {
            return [];
        }
    },

    getExpenses: async (token, groupId) => {
        if (groupId && groupId.toString().startsWith('local_')) {
            return SplitService.getLocalExpenses(groupId);
        }

        try {
             const response = await fetch(`${API_URL}/split/groups/${groupId}/expenses`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch expenses');
            
            // Cache successful response
            await storeData(`${CACHE_KEYS.ONLINE_EXPENSES_CACHE_PREFIX}${groupId}`, data.expenses);
            
            return data.expenses;
        } catch (error) {
            console.error('SplitService Get Expenses Error:', error);
            // Fallback to cache
            return await SplitService.getCachedOnlineExpenses(groupId);
        }
    },

    // ===================================
    // BALANCES
    // ===================================

    calculateBalances: async (token, groupId) => {
        try {
            // Note: getExpenses now handles caching/fallback internally
            const expenses = await SplitService.getExpenses(token, groupId);
            
            const balances = {};
            
            expenses.forEach(exp => {
                const payerId = exp.paidBy;
                const amount = parseFloat(exp.amount);
                
                if (balances[payerId] === undefined) balances[payerId] = 0;
                balances[payerId] += amount;

                if (exp.splits) {
                    Object.entries(exp.splits).forEach(([uid, owed]) => {
                         if (balances[uid] === undefined) balances[uid] = 0;
                         balances[uid] -= parseFloat(owed);
                    });
                }
            });

            return balances;
        } catch (error) {
             console.error('SplitService Balance Error:', error);
             return {};
        }
    }
};
