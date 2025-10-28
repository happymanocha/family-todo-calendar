/**
 * Profile Controller
 * Handles user profile operations
 */

const User = require('../models/User');

class ProfileController {
  /**
   * Get current user profile
   */
  static async getProfile(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      const updates = req.body;

      // Validate allowed fields
      const allowedFields = ['firstName', 'lastName', 'dateOfBirth', 'sex', 'phone', 'avatar'];
      const invalidFields = Object.keys(updates).filter((field) => !allowedFields.includes(field));

      if (invalidFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid fields: ${invalidFields.join(', ')}`,
        });
      }

      // Validate sex if provided
      if (updates.sex && !['male', 'female', 'other'].includes(updates.sex.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid sex value. Must be: male, female, or other',
        });
      }

      // Validate dateOfBirth if provided
      if (updates.dateOfBirth) {
        const date = new Date(updates.dateOfBirth);
        if (isNaN(date.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid date format for dateOfBirth',
          });
        }
      }

      const updatedUser = await User.updateProfile(userId, updates);

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProfileController;
