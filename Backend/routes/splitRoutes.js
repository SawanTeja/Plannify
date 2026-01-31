const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const authMiddleware = require('../middleware/authMiddleware');
const SplitGroup = require('../models/SplitGroup');
const SplitExpense = require('../models/SplitExpense');

// Helper: Generate unique 6-character invite code
const generateInviteCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// ==========================
// GROUP ROUTES
// ==========================

// GET /api/split/groups - Get user's groups
router.get('/groups', authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;
        const groups = await SplitGroup.find({ members: userId })
            .populate('members', 'name email') // Basic user info
            .sort({ updatedAt: -1 });

        res.json({ success: true, groups });
    } catch (error) {
        console.error('Get Groups Error:', error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

// POST /api/split/groups - Create a new group
router.post('/groups', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user._id;

        if (!name) return res.status(400).json({ error: 'Group name is required' });

        let inviteCode;
        let isUnique = false;
        while (!isUnique) {
            inviteCode = generateInviteCode();
            const existing = await SplitGroup.findOne({ inviteCode });
            if (!existing) isUnique = true;
        }

        const group = new SplitGroup({
            _id: `group_${Date.now()}`,
            name,
            inviteCode,
            ownerId: userId,
            members: [userId]
        });

        await group.save();
        res.json({ success: true, group });

    } catch (error) {
        console.error('Create Group Error:', error);
        res.status(500).json({ error: 'Failed to create group' });
    }
});

// POST /api/split/groups/join - Join via code
router.post('/groups/join', authMiddleware, async (req, res) => {
    try {
        const { inviteCode } = req.body;
        const userId = req.user._id;

        if (!inviteCode) return res.status(400).json({ error: 'Invite code is required' });

        const group = await SplitGroup.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
        if (!group) return res.status(404).json({ error: 'Invalid invite code' });

        if (group.members.includes(userId)) {
            return res.json({ success: true, group, message: 'Already a member' });
        }

        group.members.push(userId);
        group.updatedAt = new Date();
        await group.save();

        const updatedGroup = await SplitGroup.findById(group._id).populate('members', 'name email');
        res.json({ success: true, group: updatedGroup });

    } catch (error) {
        console.error('Join Group Error:', error);
        res.status(500).json({ error: 'Failed to join group' });
    }
});

// ==========================
// EXPENSE ROUTES
// ==========================

// GET /api/split/groups/:groupId/expenses
router.get('/groups/:groupId/expenses', authMiddleware, async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Verify membership
        const group = await SplitGroup.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (!group.members.includes(userId)) return res.status(403).json({ error: 'Not a member' });

        const expenses = await SplitExpense.find({ groupId }).sort({ date: -1 });
        res.json({ success: true, expenses });

    } catch (error) {
        console.error('Get Expenses Error:', error);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

// POST /api/split/groups/:groupId/expenses
router.post('/groups/:groupId/expenses', authMiddleware, async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;
        const { description, amount, paidBy, splitType, splits, type } = req.body;

        const group = await SplitGroup.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (!group.members.includes(userId)) return res.status(403).json({ error: 'Not a member' });

        const expense = new SplitExpense({
            _id: `expense_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            groupId,
            description,
            amount,
            paidBy, // This can be different from creator
            splitType,
            splits,
            type: type || 'expense',
            createdBy: userId
        });

        await expense.save();

        // Touch group update time
        group.updatedAt = new Date();
        await group.save();

        res.json({ success: true, expense });

    } catch (error) {
        console.error('Add Expense Error:', error);
        res.status(500).json({ error: 'Failed to add expense' });
    }
});


module.exports = router;
