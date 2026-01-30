const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Endpoint: GET /api/auth/me
// Protected by authMiddleware
router.get('/me', authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
    message: "User authenticated successfully"
  });
});

module.exports = router;