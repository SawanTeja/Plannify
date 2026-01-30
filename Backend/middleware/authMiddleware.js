const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

// Initialize Google Client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authMiddleware = async (req, res, next) => {
  try {
    // 1. Check for Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

    // 2. Verify Token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID, // Must match your .env
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // 3. Find or Create User in MongoDB
    // "upsert" means update if exists, insert if new
    let user = await User.findOneAndUpdate(
      { googleId }, 
      { 
        email, 
        name, 
        avatar: picture,
        // We only update lastSync if explicitly handled in sync routes, 
        // so we don't auto-update it here.
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // 4. Attach user to request object
    req.user = user;
    next();

  } catch (error) {
    console.error('Auth Error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;