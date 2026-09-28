import { apiClient } from './apiClient';
import { getData, storeData } from '../utils/storageHelper';

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
            const data = await apiClient.post('/split/groups', { name }, token);
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
            const data = await apiClient.post('/split/groups/join', { inviteCode }, token);
            return data.group;
        } catch (error) {
            if (error.data?.message === 'Already a member') {
                return error.data.group;
            }
            console.error('SplitService Join Group Error:', error);
            throw error;
        }
    },

    // --- MIGRATION UTILS ---
    migrateLegacyData: async () => {
        try {
            const hasNewGroups = await getData(CACHE_KEYS.GROUPS);
            const hasNewExpenses = await getData(CACHE_KEYS.EXPENSES);
            
            if (hasNewGroups || hasNewExpenses) {
                return;
            }

            const oldGroups = await getData('split_offline_groups');
            const oldExpenses = await getData('split_offline_expenses');

            if (oldGroups && oldGroups.length > 0) {
                console.log("Migrating Split Groups...");
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
                updatedAt: new Date()
            };
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
            
            localGroups[groupIndex].members.push(newMember);
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

    getCachedOnlineGroups: async () => {
        try {
            return await getData(CACHE_KEYS.ONLINE_GROUPS_CACHE) || [];
        } catch (_e) {
            return [];
        }
    },

    getGroups: async (token) => {
        const offlineGroups = await SplitService.getLocalGroups();
        let onlineGroups = [];
        
        if (token) {
            try {
                const data = await apiClient.get('/split/groups', token);
                onlineGroups = (data.groups || []).map(group => ({
                    ...group,
                    id: group._id || group.id, 
                    members: [
                        ...(group.members || []).map(m => ({ ...m, id: m._id || m.id })),
                        ...(group.virtualMembers || [])
                    ]
                }));

                await storeData(CACHE_KEYS.ONLINE_GROUPS_CACHE, onlineGroups);
            } catch (error) {
                console.error('SplitService Get Groups Error (Online):', error);
                onlineGroups = await SplitService.getCachedOnlineGroups();
            }
        } else {
            onlineGroups = await SplitService.getCachedOnlineGroups();
        }
        
        return [...offlineGroups, ...onlineGroups];
    },

    // Add a member (to online or offline group)
    addMember: async (token, groupId, name) => {
        if (groupId && groupId.toString().startsWith('local_')) {
            return SplitService.addLocalMember(groupId, name);
        }
        
        if (!token) throw new Error('Authentication required');
        
        try {
            const data = await apiClient.post(`/split/groups/${groupId}/members`, { name }, token);
            return data.member;
        } catch (error) {
            console.error('SplitService Add Member Error:', error);
            throw error;
        }
    },

    deleteLocalMember: async (groupId, memberId) => {
        try {
            const localGroups = await getData(CACHE_KEYS.GROUPS) || [];
            const groupIndex = localGroups.findIndex(g => (g._id === groupId || g.id === groupId));
            
            if (groupIndex === -1) throw new Error("Group not found locally");
            
            const group = localGroups[groupIndex];
            const updatedMembers = group.members.filter(m => (m._id || m.id) !== memberId);
            
            localGroups[groupIndex].members = updatedMembers;
            localGroups[groupIndex].updatedAt = new Date();

            await storeData(CACHE_KEYS.GROUPS, localGroups);
            return true;
        } catch (e) {
            console.error('Delete Local Member Error:', e);
            throw e;
        }
    },

    deleteMember: async (token, groupId, memberId) => {
        if (groupId && groupId.toString().startsWith('local_')) {
            return SplitService.deleteLocalMember(groupId, memberId);
        }

        if (!token) throw new Error('Authentication required');

        try {
            return await apiClient.delete(`/split/groups/${groupId}/members/${memberId}`, token);
        } catch (error) {
            console.error('SplitService Delete Member Error:', error);
            throw error;
        }
    },

    deleteGroup: async (token, groupId) => {
        if (!token || (groupId && groupId.toString().startsWith('local_'))) {
            try {
                const localGroups = await SplitService.getLocalGroups();
                const filteredGroups = localGroups.filter(g => g.id !== groupId && g._id !== groupId);
                await storeData(CACHE_KEYS.GROUPS, filteredGroups);
                
                const allExpenses = await getData(CACHE_KEYS.EXPENSES) || {};
                delete allExpenses[groupId];
                await storeData(CACHE_KEYS.EXPENSES, allExpenses);
                
                return true;
            } catch (e) {
                console.error('Delete Local Group Error:', e);
                throw e;
            }
        }
        
        try {
            return await apiClient.delete(`/split/groups/${groupId}`, token);
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
        if (expenseData.groupId && expenseData.groupId.toString().startsWith('local_')) {
            return SplitService.addLocalExpense(expenseData);
        }

        try {
            const data = await apiClient.post(
                `/split/groups/${expenseData.groupId}/expenses`,
                expenseData,
                token
            );
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
        } catch (_e) {
            return [];
        }
    },

    getCachedOnlineExpenses: async (groupId) => {
        try {
            return await getData(`${CACHE_KEYS.ONLINE_EXPENSES_CACHE_PREFIX}${groupId}`) || [];
        } catch (_e) {
            return [];
        }
    },

    getExpenses: async (token, groupId) => {
        if (groupId && groupId.toString().startsWith('local_')) {
            return SplitService.getLocalExpenses(groupId);
        }

        try {
            const data = await apiClient.get(`/split/groups/${groupId}/expenses`, token);
            await storeData(`${CACHE_KEYS.ONLINE_EXPENSES_CACHE_PREFIX}${groupId}`, data.expenses);
            return data.expenses;
        } catch (error) {
            console.error('SplitService Get Expenses Error:', error);
            return await SplitService.getCachedOnlineExpenses(groupId);
        }
    },

    // ===================================
    // BALANCES
    // ===================================

    calculateBalances: async (token, groupId, explicitExpenses = null) => {
        try {
            const expenses = explicitExpenses || await SplitService.getExpenses(token, groupId);
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

export default SplitService;
