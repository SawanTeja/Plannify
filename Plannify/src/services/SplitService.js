import { ApiService } from './ApiService';
import { getData, storeData } from '../utils/storageHelper';

// Reuse the base URL from ApiService or define a helper
const API_URL = 'https://plannify-red.vercel.app/api'; 

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



    // --- OFFLINE GROUPS ---
    createLocalGroup: async (name, members) => {
        try {
            const localGroups = await getData('split_offline_groups') || [];
            const newGroup = {
                id: `local_group_${Date.now()}`,
                _id: `local_group_${Date.now()}`,
                name,
                members: members.map(m => ({ ...m, id: m.id || m._id })),
                isOffline: true,
                createdAt: new Date()
            };
            localGroups.unshift(newGroup);
            await storeData('split_offline_groups', localGroups);
            return newGroup;
        } catch (e) {
            console.error('Create Local Group Error:', e);
            throw e;
        }
    },

    addLocalMember: async (groupId, memberName) => {
        try {
            const localGroups = await getData('split_offline_groups') || [];
            const groupIndex = localGroups.findIndex(g => (g._id === groupId || g.id === groupId));
            
            if (groupIndex === -1) throw new Error("Group not found locally");
            
            const newMember = {
                id: `local_user_${Date.now()}`,
                _id: `local_user_${Date.now()}`,
                name: memberName
            };
            
            localGroups[groupIndex].members.push(newMember);
            await storeData('split_offline_groups', localGroups);
            return newMember;
        } catch (e) {
            console.error('Add Local Member Error:', e);
            throw e;
        }
    },

    getLocalGroups: async () => {
        try {
            return await getData('split_offline_groups') || [];
        } catch (e) {
            console.error('Get Local Groups Error:', e);
            return [];
        }
    },

    getGroups: async (token) => {
        // Fetch both online and offline
        let onlineGroups = [];
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
                }
            } catch (error) {
                console.error('SplitService Get Groups Error (Online):', error);
                // Don't throw if just offline, but if token provided we expect online
            }
        }
        
        const offlineGroups = await SplitService.getLocalGroups();
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
        if (!token) {
            try {
                // Delete Group
                const localGroups = await SplitService.getLocalGroups();
                const filteredGroups = localGroups.filter(g => g.id !== groupId);
                await storeData('split_offline_groups', filteredGroups);
                
                // Delete Expenses
                const allExpenses = await getData('split_offline_expenses') || {};
                delete allExpenses[groupId]; // Remove expenses for this specific group
                await storeData('split_offline_expenses', allExpenses);
                
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
            const allExpenses = await getData('split_offline_expenses') || {};
            const groupExpenses = allExpenses[expenseData.groupId] || [];
            
            const newExpense = {
                ...expenseData,
                id: `local_exp_${Date.now()}`,
                _id: `local_exp_${Date.now()}`,
                date: new Date()
            };
            
            groupExpenses.unshift(newExpense);
            allExpenses[expenseData.groupId] = groupExpenses;
            await storeData('split_offline_expenses', allExpenses);
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
            const allExpenses = await getData('split_offline_expenses') || {};
            return allExpenses[groupId] || [];
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
            return data.expenses;
        } catch (error) {
            console.error('SplitService Get Expenses Error:', error);
            throw error;
        }
    },

    // ===================================
    // BALANCES
    // ===================================

    calculateBalances: async (token, groupId) => {
        try {
            const expenses = await SplitService.getExpenses(token, groupId);
            
            // Note: Ideally we should pass members list to this function or fetch group here
            // But to save calls, we are relying on "paidBy" appearing in expenses or frontend handling 0s
            // However, to show 0 balance for virtual members who haven't participated yet, 
            // the frontend logic (GroupScreen) now iterates over group.members.
            // So this function just needs to return accurate non-zero diffs.
            // But let's be safe and return what we know.
            
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
