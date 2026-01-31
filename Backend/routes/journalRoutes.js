const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const authMiddleware = require('../middleware/authMiddleware');
const Journal = require('../models/Journal');

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper to extract public_id from Cloudinary URL
// Example: https://res.cloudinary.com/dv5bf64yx/image/upload/v1234567890/journal/abc123.jpg
// Returns: journal/abc123
const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  
  try {
    // Match the path after /upload/ and before the extension
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (e) {
    console.error('Error extracting public_id:', e);
  }
  return null;
};

// DELETE /api/journal/:id
// Deletes journal entry and its Cloudinary image
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const journalId = req.params.id;
    
    console.log(`🗑️ Deleting journal entry: ${journalId}`);

    // 1. Find the journal entry
    const journal = await Journal.findOne({ _id: journalId, userId });
    
    if (!journal) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    // 2. Delete image from Cloudinary if it exists
    if (journal.image && journal.image.includes('cloudinary.com')) {
      const publicId = extractPublicId(journal.image);
      if (publicId) {
        try {
          console.log(`☁️ Deleting Cloudinary image: ${publicId}`);
          const result = await cloudinary.uploader.destroy(publicId);
          console.log('☁️ Cloudinary delete result:', result);
        } catch (cloudError) {
          console.error('☁️ Cloudinary delete failed:', cloudError);
          // Continue with DB deletion even if Cloudinary fails
        }
      }
    }

    // 3. Mark as deleted (soft delete) for sync to other devices
    journal.isDeleted = true;
    journal.updatedAt = new Date();
    await journal.save();

    console.log(`✅ Journal entry marked as deleted: ${journalId}`);
    
    res.json({ 
      success: true, 
      message: 'Journal entry deleted',
      deletedId: journalId 
    });

  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// POST /api/journal/hard-delete/:id
// Permanently removes from database (optional cleanup endpoint)
router.post('/hard-delete/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const journalId = req.params.id;
    
    await Journal.deleteOne({ _id: journalId, userId });
    
    res.json({ success: true, message: 'Permanently deleted' });
  } catch (error) {
    console.error('Hard Delete Error:', error);
    res.status(500).json({ error: 'Hard delete failed' });
  }
});

module.exports = router;
