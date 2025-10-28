/**
 * API v1 Routes
 * Version 1 of the API
 */

const express = require('express');
const router = express.Router();

// Import v1 route modules
const authRoutes = require('../auth');
const todoRoutes = require('../todos');
const familyRoutes = require('../families');
const riddleRoutes = require('../riddles');
const profileRoutes = require('../profile');

// Health check for v1
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API v1 is healthy',
    version: 'v1',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Mount v1 route modules
router.use('/auth', authRoutes);
router.use('/todos', todoRoutes);
router.use('/families', familyRoutes);
router.use('/riddles', riddleRoutes);
router.use('/profile', profileRoutes);

module.exports = router;
