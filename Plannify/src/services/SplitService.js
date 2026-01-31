import { ApiService } from './ApiService';

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

    getGroups: async (token) => {
        if (!token) {
            throw new Error('Authentication required');
        }
        try {
            const response = await fetch(`${API_URL}/split/groups`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch groups');
            
            // Normalize groups: ensure both _id and id are available for compatibility
            const normalizedGroups = (data.groups || []).map(group => ({
                ...group,
                id: group._id || group.id, // Ensure 'id' exists for frontend
                members: (group.members || []).map(m => ({
                    ...m,
                    id: m._id || m.id // Normalize member ids too
                }))
            }));
            
            return normalizedGroups;
        } catch (error) {
            console.error('SplitService Get Groups Error:', error);
            throw error;
        }
    },

    // ===================================
    // EXPENSE MANAGEMENT
    // ===================================

    addExpense: async (token, expenseData) => {
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

    getExpenses: async (token, groupId) => {
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
            // We need members list, but calculateBalances usually called inside component that has group info
            // For now, we assume simple balance calculation based on expense history
            
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
