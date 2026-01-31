const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('../config/db'); // Import our cached connection
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors()); // Allow requests from your Expo App
app.use(express.json({ limit: '10mb' })); // Higher limit for syncing large chunks of data

// Basic Route to Test Server Status
app.get('/', (req, res) => {
  res.send('Planner API is Running 🚀');
});

// Vercel Serverless Function Wrapper
// We ensure DB connects before handling the request
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// Routes (We will add these in the next steps)
app.use('/api/auth', require('../routes/authRoutes'));
app.use('/api/sync', require('../routes/syncRoutes'));
app.use('/api/journal', require('../routes/journalRoutes'));
app.use('/api/social', require('../routes/socialRoutes'));

// For Local Development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running locally on port ${PORT}`);
  });
}

// Export for Vercel
module.exports = app;