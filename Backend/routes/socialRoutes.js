const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const authMiddleware = require('../middleware/authMiddleware');
const SocialGroup = require('../models/SocialGroup');
const SocialPost = require('../models/SocialPost');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper: Generate unique 6-character invite code
const generateInviteCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// Helper to extract public_id from Cloudinary URL
const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    if (match && match[1]) return match[1];
  } catch (e) {
    console.error('Error extracting public_id:', e);
  }
  return null;
};

// ============================================
// GROUP ENDPOINTS
// ============================================

// POST /api/social/groups - Create a new group
router.post('/groups', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user._id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Generate unique invite code
    let inviteCode;
    let isUnique = false;
    while (!isUnique) {
      inviteCode = generateInviteCode();
      const existing = await SocialGroup.findOne({ inviteCode });
      if (!existing) isUnique = true;
    }

    const group = new SocialGroup({
      _id: `group_${Date.now()}`,
      name: name.trim(),
      inviteCode,
      ownerId: userId,
      members: [userId], // Owner is automatically a member
    });

    await group.save();

    console.log(`✅ Created social group: ${group.name} (${inviteCode})`);

    res.json({
      success: true,
      group: {
        _id: group._id,
        name: group.name,
        inviteCode: group.inviteCode,
        ownerId: group.ownerId,
        members: group.members,
        isOwner: true,
        memberCount: 1,
        createdAt: group.createdAt,
      }
    });
  } catch (error) {
    console.error('Create Group Error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// GET /api/social/groups - Get user's groups
router.get('/groups', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await SocialGroup.find({ members: userId })
      .sort({ updatedAt: -1 })
      .lean();

    // Enrich with ownership info
    const enrichedGroups = groups.map(g => ({
      ...g,
      isOwner: g.ownerId.toString() === userId.toString(),
      memberCount: g.members.length,
    }));

    res.json({ success: true, groups: enrichedGroups });
  } catch (error) {
    console.error('Get Groups Error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// POST /api/social/groups/join - Join a group via invite code
router.post('/groups/join', authMiddleware, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user._id;

    if (!inviteCode || inviteCode.trim().length === 0) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const group = await SocialGroup.findOne({ 
      inviteCode: inviteCode.trim().toUpperCase() 
    });

    if (!group) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check if already a member
    if (group.members.some(m => m.toString() === userId.toString())) {
      return res.json({ 
        success: true, 
        message: 'Already a member',
        group: {
          ...group.toObject(),
          isOwner: group.ownerId.toString() === userId.toString(),
          memberCount: group.members.length,
        }
      });
    }

    // Add user to members
    group.members.push(userId);
    group.updatedAt = new Date();
    await group.save();

    console.log(`✅ User joined group: ${group.name}`);

    res.json({
      success: true,
      message: 'Joined successfully',
      group: {
        ...group.toObject(),
        isOwner: false,
        memberCount: group.members.length,
      }
    });
  } catch (error) {
    console.error('Join Group Error:', error);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// DELETE /api/social/groups/:groupId/leave - Leave a group
router.delete('/groups/:groupId/leave', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await SocialGroup.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Owner cannot leave - they must delete the group
    if (group.ownerId.toString() === userId.toString()) {
      return res.status(400).json({ 
        error: 'Owner cannot leave. Transfer ownership or delete the group.' 
      });
    }

    // Remove user from members
    group.members = group.members.filter(m => m.toString() !== userId.toString());
    group.updatedAt = new Date();
    await group.save();

    console.log(`✅ User left group: ${group.name}`);

    res.json({ success: true, message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave Group Error:', error);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// DELETE /api/social/groups/:groupId - Delete group (owner only)
router.delete('/groups/:groupId', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await SocialGroup.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Only owner can delete
    if (group.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the group owner can delete the group' });
    }

    // 1. Find all posts in this group
    const posts = await SocialPost.find({ groupId });

    // 2. Extract public_ids from posts with images
    const imagePublicIds = [];
    posts.forEach(post => {
      if (post.image) {
        const publicId = extractPublicId(post.image);
        if (publicId) imagePublicIds.push(publicId);
      }
    });

    // 3. Delete images from Cloudinary
    if (imagePublicIds.length > 0) {
      console.log(`☁️ Deleting ${imagePublicIds.length} images from Cloudinary for group ${group.name}`);
      // Cloudinary delete_resources takes an array of public_ids
      // It has a limit (usually 100 or 1000), but likely fine for this scale. 
      // If risky, we can chunk it or do Promise.all with destroy().
      // delete_resources is safer for batch.
      try {
          await cloudinary.api.delete_resources(imagePublicIds);
      } catch (cloudErr) {
           console.error("Cloudinary Batch Delete Error (trying individual):", cloudErr);
           // Fallback to individual
           await Promise.all(imagePublicIds.map(id => cloudinary.uploader.destroy(id)));
      }
    }

    // 4. Delete all posts in DB
    await SocialPost.deleteMany({ groupId });

    // 5. Delete the group
    await SocialGroup.findByIdAndDelete(groupId);

    console.log(`✅ Deleted group and cleaned up resources: ${group.name}`);

    res.json({ success: true, message: 'Group and all data deleted successfully' });
  } catch (error) {
    console.error('Delete Group Error:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// DELETE /api/social/groups/:groupId/members/:memberId - Remove member (owner only)
router.delete('/groups/:groupId/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user._id;

    const group = await SocialGroup.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Only owner can remove members
    if (group.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the group owner can remove members' });
    }

    // Cannot remove yourself (owner)
    if (memberId === userId.toString()) {
      return res.status(400).json({ error: 'Cannot remove yourself as owner' });
    }

    // Remove member
    group.members = group.members.filter(m => m.toString() !== memberId);
    group.updatedAt = new Date();
    await group.save();

    console.log(`✅ Removed member from group: ${group.name}`);

    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove Member Error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// GET /api/social/groups/:groupId/members - Get group members (with user info)
router.get('/groups/:groupId/members', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await SocialGroup.findById(groupId)
      .populate('members', 'name email avatar')
      .populate('ownerId', 'name email avatar')
      .lean();

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is a member
    if (!group.members.some(m => m._id.toString() === userId.toString())) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    res.json({
      success: true,
      members: group.members,
      owner: group.ownerId,
      isOwner: group.ownerId._id.toString() === userId.toString(),
    });
  } catch (error) {
    console.error('Get Members Error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// ============================================
// POST ENDPOINTS
// ============================================

// GET /api/social/groups/:groupId/posts - Get posts in a group
router.get('/groups/:groupId/posts', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Verify user is a member
    const group = await SocialGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (!group.members.some(m => m.toString() === userId.toString())) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const posts = await SocialPost.find({ groupId, isDeleted: false })
      .sort({ timestamp: -1 })
      .lean();

    // Mark which posts are editable by current user
    const enrichedPosts = posts.map(p => ({
      ...p,
      isOwn: p.authorId.toString() === userId.toString(),
    }));

    res.json({ success: true, posts: enrichedPosts });
  } catch (error) {
    console.error('Get Posts Error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST /api/social/groups/:groupId/posts - Create a post
router.post('/groups/:groupId/posts', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    const postData = req.body;

    // Verify user is a member
    const group = await SocialGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (!group.members.some(m => m.toString() === userId.toString())) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const post = new SocialPost({
      _id: postData._id || `social_post_${Date.now()}`,
      groupId,
      authorId: userId,
      authorName: req.user.name || 'Unknown',
      authorAvatar: req.user.avatar || null,
      topic: postData.topic,
      text: postData.text,
      image: postData.image,
      location: postData.location,
      mood: postData.mood,
      date: postData.date || new Date().toLocaleDateString(),
      timestamp: postData.timestamp || Date.now(),
      tags: postData.tags || [],
      uploadStatus: postData.uploadStatus || 'complete',
    });

    await post.save();

    // Update group's updatedAt for sync
    group.updatedAt = new Date();
    await group.save();

    console.log(`✅ Created social post in group: ${group.name}`);

    res.json({
      success: true,
      post: {
        ...post.toObject(),
        isOwn: true,
      }
    });
  } catch (error) {
    console.error('Create Post Error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// PUT /api/social/posts/:postId - Edit a post (author only)
router.put('/posts/:postId', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;
    const updates = req.body;

    const post = await SocialPost.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Only author can edit
    if (post.authorId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    // Apply updates
    const allowedFields = ['topic', 'text', 'image', 'location', 'mood', 'tags', 'uploadStatus'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        post[field] = updates[field];
      }
    });
    post.updatedAt = new Date();

    await post.save();

    console.log(`✅ Updated social post: ${postId}`);

    res.json({
      success: true,
      post: {
        ...post.toObject(),
        isOwn: true,
      }
    });
  } catch (error) {
    console.error('Update Post Error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// DELETE /api/social/posts/:postId - Delete a post (author only)
router.delete('/posts/:postId', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await SocialPost.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Only author can delete
    if (post.authorId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Delete image from Cloudinary if exists
    if (post.image && post.image.includes('cloudinary.com')) {
      const publicId = extractPublicId(post.image);
      if (publicId) {
        try {
          console.log(`☁️ Deleting Cloudinary image: ${publicId}`);
          await cloudinary.uploader.destroy(publicId);
        } catch (cloudError) {
          console.error('☁️ Cloudinary delete failed:', cloudError);
        }
      }
    }

    // Soft delete
    post.isDeleted = true;
    post.updatedAt = new Date();
    await post.save();

    console.log(`✅ Deleted social post: ${postId}`);

    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('Delete Post Error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ============================================
// REACTION ENDPOINTS
// ============================================

// POST /api/social/posts/:postId/reactions - Add reaction to post
router.post('/posts/:postId/reactions', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const post = await SocialPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Verify user is a member of the group
    const group = await SocialGroup.findById(post.groupId);
    if (!group || !group.members.some(m => m.toString() === userId.toString())) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Check if user already reacted with this emoji
    const existingReaction = post.reactions.find(
      r => r.userId.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingReaction) {
      return res.json({ success: true, message: 'Already reacted', reactions: post.reactions });
    }

    // Remove any existing reaction from this user (one reaction per user)
    post.reactions = post.reactions.filter(r => r.userId.toString() !== userId.toString());

    // Add new reaction
    post.reactions.push({
      userId,
      emoji,
      userName: req.user.name || 'Unknown'
    });
    post.updatedAt = new Date();
    await post.save();

    console.log(`✅ Added reaction ${emoji} to post: ${postId}`);

    res.json({ success: true, reactions: post.reactions });
  } catch (error) {
    console.error('Add Reaction Error:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// DELETE /api/social/posts/:postId/reactions - Remove reaction from post
router.delete('/posts/:postId/reactions', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await SocialPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Remove user's reaction
    post.reactions = post.reactions.filter(r => r.userId.toString() !== userId.toString());
    post.updatedAt = new Date();
    await post.save();

    console.log(`✅ Removed reaction from post: ${postId}`);

    res.json({ success: true, reactions: post.reactions });
  } catch (error) {
    console.error('Remove Reaction Error:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// ============================================
// GROUP SETTINGS ENDPOINTS
// ============================================

// PUT /api/social/groups/:groupId - Rename group (owner only)
router.put('/groups/:groupId', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name } = req.body;
    const userId = req.user._id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const group = await SocialGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Only owner can rename
    if (group.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the group owner can rename the group' });
    }

    group.name = name.trim();
    group.updatedAt = new Date();
    await group.save();

    console.log(`✅ Renamed group to: ${group.name}`);

    res.json({
      success: true,
      group: {
        ...group.toObject(),
        isOwner: true,
        memberCount: group.members.length,
      }
    });
  } catch (error) {
    console.error('Rename Group Error:', error);
    res.status(500).json({ error: 'Failed to rename group' });
  }
});

// POST /api/social/groups/:groupId/transfer - Transfer ownership (owner only)
router.post('/groups/:groupId/transfer', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { newOwnerId } = req.body;
    const userId = req.user._id;

    if (!newOwnerId) {
      return res.status(400).json({ error: 'New owner ID is required' });
    }

    const group = await SocialGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Only current owner can transfer
    if (group.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the group owner can transfer ownership' });
    }

    // Verify new owner is a member
    if (!group.members.some(m => m.toString() === newOwnerId)) {
      return res.status(400).json({ error: 'New owner must be a group member' });
    }

    // Cannot transfer to yourself
    if (newOwnerId === userId.toString()) {
      return res.status(400).json({ error: 'You are already the owner' });
    }

    group.ownerId = newOwnerId;
    group.updatedAt = new Date();
    await group.save();

    console.log(`✅ Transferred ownership of ${group.name}`);

    res.json({
      success: true,
      message: 'Ownership transferred successfully',
      group: {
        ...group.toObject(),
        isOwner: false, // Current user is no longer owner
        memberCount: group.members.length,
      }
    });
  } catch (error) {
    console.error('Transfer Ownership Error:', error);
    res.status(500).json({ error: 'Failed to transfer ownership' });
  }
});

module.exports = router;
