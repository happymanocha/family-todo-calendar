/**
 * Integration Tests for RiddleController
 * Tests controller logic with mocked services and models
 *
 * These tests would have caught:
 * - Missing service method calls
 * - Incorrect error handling
 * - Response format issues
 * - Database interaction errors
 */

const RiddleController = require('../RiddleController');
const RiddleGraphService = require('../../services/riddle/RiddleGraphService');
const Riddle = require('../../models/Riddle');

// Mock the service and model
jest.mock('../../services/riddle/RiddleGraphService');
jest.mock('../../models/Riddle');

describe('RiddleController Integration Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock request object
    mockReq = {
      user: {
        userId: 'user-123',
        id: 'user-123',
        familyId: 'family-456',
        email: 'test@example.com',
        role: 'parent',
      },
      params: {},
      body: {},
      headers: {},
    };

    // Mock response object with chainable methods
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock next function
    mockNext = jest.fn();

    // Reset environment
    process.env.NODE_ENV = 'development';
  });

  describe('getTodaysRiddle', () => {
    it('should return existing riddle if already generated', async () => {
      const existingRiddle = {
        id: 'riddle-1',
        familyId: 'family-456',
        riddle: 'What has four legs but cannot walk?',
        answer: 'A table',
        hint1: 'Furniture',
        hint2: 'You eat on it',
        hint3: 'Made of wood',
        category: 'object',
        difficulty: 'easy',
        date: '2025-10-20',
        viewedBy: [],
        solvedBy: [],
      };

      Riddle.getToday = jest.fn().mockResolvedValue(existingRiddle);
      Riddle.markViewed = jest.fn().mockResolvedValue(true);

      await RiddleController.getTodaysRiddle(mockReq, mockRes, mockNext);

      expect(Riddle.getToday).toHaveBeenCalledWith('family-456');
      expect(Riddle.markViewed).toHaveBeenCalledWith('family-456', 'user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          riddle: 'What has four legs but cannot walk?',
          category: 'object',
          difficulty: 'easy',
          date: '2025-10-20',
          solvedByYou: false,
        },
      });
    });

    it('should generate new riddle if none exists', async () => {
      const generatedRiddle = {
        riddle: 'What animal has a long neck?',
        answer: 'Giraffe',
        hint1: 'African animal',
        hint2: 'Very tall',
        hint3: 'Yellow with brown spots',
        category: 'animal',
        estimatedDifficulty: 'easy',
      };

      const savedRiddle = {
        ...generatedRiddle,
        id: 'riddle-2',
        familyId: 'family-456',
        date: '2025-10-20',
        difficulty: 'easy',
        viewedBy: [],
        solvedBy: [],
      };

      Riddle.getToday = jest.fn().mockResolvedValue(null);

      const mockGraphService = {
        generateRiddle: jest.fn().mockResolvedValue({
          success: true,
          riddle: generatedRiddle,
        }),
      };
      RiddleGraphService.mockImplementation(() => mockGraphService);

      Riddle.create = jest.fn().mockResolvedValue(savedRiddle);
      Riddle.markViewed = jest.fn().mockResolvedValue(true);

      await RiddleController.getTodaysRiddle(mockReq, mockRes, mockNext);

      expect(Riddle.getToday).toHaveBeenCalledWith('family-456');
      expect(mockGraphService.generateRiddle).toHaveBeenCalledWith({
        min: 5,
        max: 8,
      });
      expect(Riddle.create).toHaveBeenCalledWith('family-456', generatedRiddle);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          riddle: 'What animal has a long neck?',
          category: 'animal',
          difficulty: 'easy',
          date: '2025-10-20',
          solvedByYou: false,
        },
      });
    });

    it('should handle AI generation failure in production gracefully', async () => {
      process.env.NODE_ENV = 'production';

      Riddle.getToday = jest.fn().mockResolvedValue(null);

      const mockGraphService = {
        generateRiddle: jest.fn().mockRejectedValue(new Error('API timeout')),
      };
      RiddleGraphService.mockImplementation(() => mockGraphService);

      await RiddleController.getTodaysRiddle(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: null,
      });
    });

    it('should show error details in development when AI generation fails', async () => {
      process.env.NODE_ENV = 'development';

      Riddle.getToday = jest.fn().mockResolvedValue(null);

      const mockGraphService = {
        generateRiddle: jest.fn().mockRejectedValue(new Error('Claude API error')),
      };
      RiddleGraphService.mockImplementation(() => mockGraphService);

      await RiddleController.getTodaysRiddle(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'AI riddle generation failed',
        error: 'Claude API error',
        environment: 'development',
      });
    });

    it('should not mark as viewed if already viewed', async () => {
      const existingRiddle = {
        id: 'riddle-1',
        familyId: 'family-456',
        riddle: 'Test riddle',
        answer: 'Test',
        category: 'object',
        difficulty: 'easy',
        date: '2025-10-20',
        viewedBy: ['user-123'], // Already viewed
        solvedBy: [],
      };

      Riddle.getToday = jest.fn().mockResolvedValue(existingRiddle);
      Riddle.markViewed = jest.fn().mockResolvedValue(true);

      await RiddleController.getTodaysRiddle(mockReq, mockRes, mockNext);

      expect(Riddle.markViewed).not.toHaveBeenCalled();
    });

    it('should show solvedByYou as true if user solved it', async () => {
      const existingRiddle = {
        id: 'riddle-1',
        familyId: 'family-456',
        riddle: 'Test riddle',
        answer: 'Test',
        category: 'object',
        difficulty: 'easy',
        date: '2025-10-20',
        viewedBy: ['user-123'],
        solvedBy: ['user-123'], // User solved it
      };

      Riddle.getToday = jest.fn().mockResolvedValue(existingRiddle);

      await RiddleController.getTodaysRiddle(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          solvedByYou: true,
        }),
      });
    });

    it('should call next() on unexpected errors', async () => {
      Riddle.getToday = jest.fn().mockRejectedValue(new Error('Database error'));

      await RiddleController.getTodaysRiddle(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Database error');
    });
  });

  describe('revealAnswer', () => {
    it('should return answer for existing riddle', async () => {
      const existingRiddle = {
        id: 'riddle-1',
        familyId: 'family-456',
        riddle: 'What has four legs but cannot walk?',
        answer: 'A table',
        category: 'object',
        difficulty: 'easy',
        date: '2025-10-20',
      };

      Riddle.getToday = jest.fn().mockResolvedValue(existingRiddle);

      await RiddleController.revealAnswer(mockReq, mockRes, mockNext);

      expect(Riddle.getToday).toHaveBeenCalledWith('family-456');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { answer: 'A table' },
      });
    });

    it('should return 404 if no riddle exists', async () => {
      Riddle.getToday = jest.fn().mockResolvedValue(null);

      await RiddleController.revealAnswer(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'No riddle found',
      });
    });

    it('should call next() on errors', async () => {
      Riddle.getToday = jest.fn().mockRejectedValue(new Error('DB error'));

      await RiddleController.revealAnswer(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getHint', () => {
    it('should return hint 1', async () => {
      const existingRiddle = {
        id: 'riddle-1',
        familyId: 'family-456',
        riddle: 'Test riddle',
        answer: 'Test',
        hint1: 'First hint',
        hint2: 'Second hint',
        hint3: 'Third hint',
      };

      mockReq.params.hintNumber = '1';
      Riddle.getToday = jest.fn().mockResolvedValue(existingRiddle);

      await RiddleController.getHint(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { hint: 'First hint' },
      });
    });

    it('should return hint 2', async () => {
      const existingRiddle = {
        id: 'riddle-1',
        familyId: 'family-456',
        hint1: 'First hint',
        hint2: 'Second hint',
        hint3: 'Third hint',
      };

      mockReq.params.hintNumber = '2';
      Riddle.getToday = jest.fn().mockResolvedValue(existingRiddle);

      await RiddleController.getHint(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { hint: 'Second hint' },
      });
    });

    it('should return hint 3', async () => {
      const existingRiddle = {
        id: 'riddle-1',
        familyId: 'family-456',
        hint1: 'First hint',
        hint2: 'Second hint',
        hint3: 'Third hint',
      };

      mockReq.params.hintNumber = '3';
      Riddle.getToday = jest.fn().mockResolvedValue(existingRiddle);

      await RiddleController.getHint(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { hint: 'Third hint' },
      });
    });

    it('should return 404 if no riddle exists', async () => {
      mockReq.params.hintNumber = '1';
      Riddle.getToday = jest.fn().mockResolvedValue(null);

      await RiddleController.getHint(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'No riddle found',
      });
    });

    it('should call next() on errors', async () => {
      mockReq.params.hintNumber = '1';
      Riddle.getToday = jest.fn().mockRejectedValue(new Error('DB error'));

      await RiddleController.getHint(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('markSolved', () => {
    it('should mark riddle as solved by user', async () => {
      Riddle.markSolved = jest.fn().mockResolvedValue(true);

      await RiddleController.markSolved(mockReq, mockRes, mockNext);

      expect(Riddle.markSolved).toHaveBeenCalledWith('family-456', 'user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Congratulations!',
      });
    });

    it('should use userId from req.user.userId if available', async () => {
      mockReq.user.userId = 'custom-user-id';
      delete mockReq.user.id;

      Riddle.markSolved = jest.fn().mockResolvedValue(true);

      await RiddleController.markSolved(mockReq, mockRes, mockNext);

      expect(Riddle.markSolved).toHaveBeenCalledWith('family-456', 'custom-user-id');
    });

    it('should use id if userId not available', async () => {
      delete mockReq.user.userId;
      mockReq.user.id = 'id-field-user';

      Riddle.markSolved = jest.fn().mockResolvedValue(true);

      await RiddleController.markSolved(mockReq, mockRes, mockNext);

      expect(Riddle.markSolved).toHaveBeenCalledWith('family-456', 'id-field-user');
    });

    it('should call next() on errors', async () => {
      Riddle.markSolved = jest.fn().mockRejectedValue(new Error('DB error'));

      await RiddleController.markSolved(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Error Handling Consistency', () => {
    it('should always call next() for unexpected errors in getTodaysRiddle', async () => {
      Riddle.getToday = jest.fn().mockRejectedValue(new Error('Unexpected'));

      await RiddleController.getTodaysRiddle(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should always call next() for unexpected errors in revealAnswer', async () => {
      Riddle.getToday = jest.fn().mockRejectedValue(new Error('Unexpected'));

      await RiddleController.revealAnswer(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should always call next() for unexpected errors in getHint', async () => {
      Riddle.getToday = jest.fn().mockRejectedValue(new Error('Unexpected'));

      await RiddleController.getHint(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should always call next() for unexpected errors in markSolved', async () => {
      Riddle.markSolved = jest.fn().mockRejectedValue(new Error('Unexpected'));

      await RiddleController.markSolved(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
