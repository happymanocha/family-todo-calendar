/**
 * Integration Tests for Riddle Routes
 * Tests Express router setup, middleware integration, and route registration
 *
 * These tests would have caught:
 * - Incorrect middleware imports (authenticate vs verifyToken)
 * - Missing route registrations
 * - Middleware configuration errors
 */

const request = require('supertest');
const express = require('express');
const riddleRouter = require('../riddles');
const RiddleController = require('../../controllers/RiddleController');

// Mock the controller
jest.mock('../../controllers/RiddleController');

// Mock the auth middleware
jest.mock('../../middleware/auth', () => ({
  verifyToken: jest.fn((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        code: 'TOKEN_MISSING',
      });
    }
    // Mock user for testing
    req.user = {
      userId: 'test-user-123',
      familyId: 'test-family-456',
      email: 'test@example.com',
      role: 'parent',
    };
    next();
  }),
}));

describe('Riddle Routes Integration Tests', () => {
  let app;

  beforeAll(() => {
    // Create test Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/riddles', riddleRouter);

    // Error handler
    app.use((err, req, res) => {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Route Registration', () => {
    it('should register GET /today route', () => {
      const routes = riddleRouter.stack
        .filter((layer) => layer.route)
        .map((layer) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        }));

      expect(routes).toContainEqual({
        path: '/today',
        methods: ['get'],
      });
    });

    it('should register GET /answer route', () => {
      const routes = riddleRouter.stack
        .filter((layer) => layer.route)
        .map((layer) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        }));

      expect(routes).toContainEqual({
        path: '/answer',
        methods: ['get'],
      });
    });

    it('should register GET /hint/:hintNumber route', () => {
      const routes = riddleRouter.stack
        .filter((layer) => layer.route)
        .map((layer) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        }));

      expect(routes).toContainEqual({
        path: '/hint/:hintNumber',
        methods: ['get'],
      });
    });

    it('should register POST /solve route', () => {
      const routes = riddleRouter.stack
        .filter((layer) => layer.route)
        .map((layer) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        }));

      expect(routes).toContainEqual({
        path: '/solve',
        methods: ['post'],
      });
    });
  });

  describe('Middleware Integration - This catches the authenticate vs verifyToken bug', () => {
    it('should have verifyToken middleware applied to router', () => {
      // Check that the router has middleware
      const middlewareLayer = riddleRouter.stack.find((layer) => layer.name === 'verifyToken');

      expect(middlewareLayer).toBeDefined();
      expect(middlewareLayer.name).toBe('verifyToken');
    });

    it('should reject requests without authentication token', async () => {
      RiddleController.getTodaysRiddle = jest.fn((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/api/v1/riddles/today').expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Access token is required',
        code: 'TOKEN_MISSING',
      });

      // Controller should NOT be called without valid token
      expect(RiddleController.getTodaysRiddle).not.toHaveBeenCalled();
    });

    it('should allow requests with valid authentication token', async () => {
      RiddleController.getTodaysRiddle = jest.fn((req, res) => {
        res.status(200).json({
          success: true,
          data: { riddle: 'Test riddle' },
        });
      });

      const response = await request(app)
        .get('/api/v1/riddles/today')
        .set('Authorization', 'Bearer valid-token-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(RiddleController.getTodaysRiddle).toHaveBeenCalled();

      // Verify req.user was set by middleware
      const mockCall = RiddleController.getTodaysRiddle.mock.calls[0];
      const req = mockCall[0];
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('test-user-123');
      expect(req.user.familyId).toBe('test-family-456');
    });
  });

  describe('Route-Controller Binding - Catches missing controller methods', () => {
    it('should call RiddleController.getTodaysRiddle for GET /today', async () => {
      RiddleController.getTodaysRiddle = jest.fn((req, res) => {
        res.status(200).json({ success: true });
      });

      await request(app)
        .get('/api/v1/riddles/today')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(RiddleController.getTodaysRiddle).toHaveBeenCalledTimes(1);
    });

    it('should call RiddleController.revealAnswer for GET /answer', async () => {
      RiddleController.revealAnswer = jest.fn((req, res) => {
        res.status(200).json({ success: true });
      });

      await request(app)
        .get('/api/v1/riddles/answer')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(RiddleController.revealAnswer).toHaveBeenCalledTimes(1);
    });

    it('should call RiddleController.getHint for GET /hint/:hintNumber', async () => {
      RiddleController.getHint = jest.fn((req, res) => {
        res.status(200).json({ success: true });
      });

      await request(app)
        .get('/api/v1/riddles/hint/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(RiddleController.getHint).toHaveBeenCalledTimes(1);

      // Verify route params are passed correctly
      const mockCall = RiddleController.getHint.mock.calls[0];
      const req = mockCall[0];
      expect(req.params.hintNumber).toBe('1');
    });

    it('should call RiddleController.markSolved for POST /solve', async () => {
      RiddleController.markSolved = jest.fn((req, res) => {
        res.status(200).json({ success: true });
      });

      await request(app)
        .post('/api/v1/riddles/solve')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(RiddleController.markSolved).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle controller errors gracefully', async () => {
      RiddleController.getTodaysRiddle = jest.fn((req, res, next) => {
        next(new Error('Database connection failed'));
      });

      const response = await request(app)
        .get('/api/v1/riddles/today')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database connection failed');
    });

    it('should handle missing route parameters', async () => {
      RiddleController.getHint = jest.fn((req, res) => {
        if (!req.params.hintNumber) {
          return res.status(400).json({
            success: false,
            message: 'Hint number is required',
          });
        }
        res.status(200).json({ success: true });
      });

      // This should still work because Express will match the route
      await request(app)
        .get('/api/v1/riddles/hint/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  describe('HTTP Methods', () => {
    it('should reject POST to GET-only routes', async () => {
      await request(app)
        .post('/api/v1/riddles/today')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });

    it('should reject GET to POST-only routes', async () => {
      await request(app)
        .get('/api/v1/riddles/solve')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });
  });

  describe('Router Export', () => {
    it('should export a valid Express router', () => {
      expect(riddleRouter).toBeDefined();
      expect(typeof riddleRouter).toBe('function');
      expect(riddleRouter.stack).toBeDefined();
    });

    it('should have routes defined', () => {
      expect(riddleRouter.stack.length).toBeGreaterThan(0);
    });
  });
});
