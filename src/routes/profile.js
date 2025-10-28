/**
 * Profile Routes
 * API routes for user profile management
 */

const express = require('express');
const ProfileController = require('../controllers/ProfileController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// All profile routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/v1/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/', ProfileController.getProfile);

/**
 * @route   PUT /api/v1/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/', ProfileController.updateProfile);

module.exports = router;
