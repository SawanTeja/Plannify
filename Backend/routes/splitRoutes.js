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

// POST /api/split/groups/:id/members - Add virtual member
router.post('/groups/:id/members', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const userId = req.user._id;

        const group = await SplitGroup.findById(id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        // Only members (or just creator provided logic?) can add members. 
        // Requirement: "the admin can add members". Assuming creator for now, or any member? 
        // Let's allow any member to add virtual members for flexibility, or restriction to creator if strict.
        // User said "admin". Let's check ownerId.
        if (group.ownerId.toString() !== userId.toString()) {
             return res.status(403).json({ error: 'Only admin can add members' });
        }

        if (!name) return res.status(400).json({ error: 'Member name required' });

        const newVirtual = {
            id: `virtual_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name
        };
        group.virtualMembers.push(newVirtual);
        
        // Log activity
        group.activities.push({
            text: `${req.user.name} added ${name} (offline)`,
            date: new Date()
        });

        await group.save();
        res.json({ success: true, member: newVirtual, group });
    } catch (error) {
        console.error('Add Virtual Member Error:', error);
        res.status(500).json({ error: 'Failed to add member' });
    }
});

// GET /api/split/groups - Get user's groups
router.get('/groups', authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;
        // Find groups where user is a member OR owner 
        const groups = await SplitGroup.find({ members: userId })
            .populate('members', 'name email') // Basic user info
            .sort({ updatedAt: -1 });

        res.json({ success: true, groups });
    } catch (error) {
        console.error('Get Groups Error:', error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

// DELETE /api/split/groups/:id - Delete a group (Owner only)
router.delete('/groups/:id', authMiddleware, async (req, res) => {
    try {
        const group = await SplitGroup.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (group.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this group' });
        }

        // Delete group
        await SplitGroup.findByIdAndDelete(req.params.id);
        
        // Delete associated expenses
        await SplitExpense.deleteMany({ groupId: req.params.id });

        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Delete Group Error:', error);
        res.status(500).json({ message: 'Server error' });
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
            ownerId: userId,
            members: [userId],
            virtualMembers: [],
            activities: [{
                text: `${req.user.name} created the group`,
                date: new Date()
            }]
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
        group.activities.push({
            text: `${req.user.name} joined the group`,
            date: new Date()
        });
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
        // Touch group update time & Log
        group.updatedAt = new Date();
        group.activities.push({
            text: `${req.user.name} added expense: ${description}`,
            date: new Date()
        });
        await group.save();

        res.json({ success: true, expense });

    } catch (error) {
        console.error('Add Expense Error:', error);
        res.status(500).json({ error: 'Failed to add expense' });
    }
});


module.exports = router;
