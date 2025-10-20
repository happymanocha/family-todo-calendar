/**
 * Riddle Controller
 * Handles riddle generation and interactions
 */

const RiddleGraphService = require('../services/riddle/RiddleGraphService');
const Riddle = require('../models/Riddle');

class RiddleController {
  /**
   * Get today's riddle (generates if needed)
   */
  static async getTodaysRiddle(req, res, next) {
    try {
      const { familyId } = req.user;
      const userId = req.user.userId || req.user.id;

      // Check if riddle exists
      let riddle = await Riddle.getToday(familyId);

      if (!riddle) {
        // Generate new riddle
        try {
          const graphService = new RiddleGraphService();
          const result = await graphService.generateRiddle({ min: 5, max: 8 });

          if (result.success) {
            riddle = await Riddle.create(familyId, result.riddle);
          }
        } catch (genError) {
          const env = process.env.NODE_ENV || 'development';

          if (env === 'production') {
            return res.status(200).json({
              success: true,
              data: null,
            });
          }
          return res.status(500).json({
            success: false,
            message: 'AI riddle generation failed',
            error: genError.message,
            environment: env,
          });
        }
      }

      // Mark as viewed
      if (riddle && !riddle.viewedBy?.includes(userId)) {
        await Riddle.markViewed(familyId, userId);
      }

      return res.status(200).json({
        success: true,
        data: {
          riddle: riddle.riddle,
          category: riddle.category,
          difficulty: riddle.difficulty,
          date: riddle.date,
          solvedByYou: riddle.solvedBy?.includes(userId) || false,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reveal answer
   */
  static async revealAnswer(req, res, next) {
    try {
      const { familyId } = req.user;
      const riddle = await Riddle.getToday(familyId);

      if (!riddle) {
        return res.status(404).json({
          success: false,
          message: 'No riddle found',
        });
      }

      return res.status(200).json({
        success: true,
        data: { answer: riddle.answer },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get hint
   */
  static async getHint(req, res, next) {
    try {
      const { familyId } = req.user;
      const { hintNumber } = req.params;
      const riddle = await Riddle.getToday(familyId);

      if (!riddle) {
        return res.status(404).json({
          success: false,
          message: 'No riddle found',
        });
      }

      return res.status(200).json({
        success: true,
        data: { hint: riddle[`hint${hintNumber}`] },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark solved
   */
  static async markSolved(req, res, next) {
    try {
      const { familyId } = req.user;
      const userId = req.user.userId || req.user.id;

      await Riddle.markSolved(familyId, userId);

      return res.status(200).json({
        success: true,
        message: 'Congratulations!',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RiddleController;
