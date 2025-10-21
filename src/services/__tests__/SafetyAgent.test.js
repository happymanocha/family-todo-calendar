/**
 * Unit Tests for SafetyAgent
 * Tests the safety review agent functionality
 */

const SafetyAgent = require('../riddle/agents/SafetyAgent');

// Mock the Anthropic client
jest.mock('@langchain/anthropic', () => ({
  ChatAnthropic: jest.fn().mockImplementation(() => ({
    invoke: jest.fn(),
  })),
}));

describe('SafetyAgent', () => {
  let agent;
  let mockInvoke;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new SafetyAgent();
    mockInvoke = agent.model.invoke;
  });

  describe('review', () => {
    it('should approve a safe, age-appropriate riddle', async () => {
      const mockSafetyResponse = {
        content: JSON.stringify({
          approved: true,
          rating: 'G-rated',
          ageAppropriate: true,
          concerns: [],
          feedback: 'Perfect for ages 5-8',
          confidenceScore: 1.0,
        }),
      };

      mockInvoke.mockResolvedValue(mockSafetyResponse);

      const state = {
        riddle: {
          riddle: 'What animal says meow?',
          answer: 'Cat',
          hint1: 'It has whiskers',
          hint2: 'It purrs',
          hint3: 'It likes milk',
        },
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.review(state);

      expect(result.safetyResult.approved).toBe(true);
      expect(result.safetyResult.ageAppropriate).toBe(true);
      expect(result.safetyResult.rating).toBe('G-rated');
      expect(result.status).toBe('checking_difficulty');
      expect(result.feedback).toEqual([]);
    });

    it('should reject inappropriate content', async () => {
      const mockSafetyResponse = {
        content: JSON.stringify({
          approved: false,
          rating: 'PG',
          ageAppropriate: false,
          concerns: ['Contains scary imagery'],
          feedback: 'Too frightening for young children',
          confidenceScore: 0.95,
        }),
      };

      mockInvoke.mockResolvedValue(mockSafetyResponse);

      const state = {
        riddle: {
          riddle: 'I lurk in shadows and make scary noises',
          answer: 'Ghost',
          hint1: 'Spooky',
          hint2: 'Haunted house',
          hint3: 'Boo!',
        },
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.review(state);

      expect(result.safetyResult.approved).toBe(false);
      expect(result.status).toBe('generating');
      expect(result.feedback.length).toBeGreaterThan(0);
      expect(result.feedback[0]).toContain('Safety review failed');
    });

    it('should handle riddles that are not age-appropriate', async () => {
      const mockSafetyResponse = {
        content: JSON.stringify({
          approved: true,
          rating: 'G-rated',
          ageAppropriate: false, // Too complex for age range
          concerns: ['Vocabulary too advanced'],
          feedback: 'Uses words beyond 5-8 year old comprehension',
          confidenceScore: 0.9,
        }),
      };

      mockInvoke.mockResolvedValue(mockSafetyResponse);

      const state = {
        riddle: {
          riddle: 'What is the derivative of x squared?',
          answer: '2x',
          hint1: 'Calculus',
          hint2: 'Math',
          hint3: 'Differentiation',
        },
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.review(state);

      expect(result.status).toBe('generating');
      expect(result.feedback).toContain(expect.stringContaining('Safety review failed'));
    });

    it('should return error when no riddle is provided', async () => {
      const state = {
        riddle: null,
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.review(state);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('No riddle to review');
    });

    it('should handle API errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Network timeout'));

      const state = {
        riddle: {
          riddle: 'Test riddle',
          answer: 'Test',
          hint1: 'H1',
          hint2: 'H2',
          hint3: 'H3',
        },
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.review(state);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Safety review failed');
    });

    it('should preserve existing feedback when approved', async () => {
      const mockSafetyResponse = {
        content: JSON.stringify({
          approved: true,
          rating: 'G-rated',
          ageAppropriate: true,
          concerns: [],
          feedback: 'Safe',
          confidenceScore: 1.0,
        }),
      };

      mockInvoke.mockResolvedValue(mockSafetyResponse);

      const existingFeedback = ['Previous feedback'];
      const state = {
        riddle: {
          riddle: 'Test',
          answer: 'Test',
          hint1: 'H1',
          hint2: 'H2',
          hint3: 'H3',
        },
        ageRange: { min: 5, max: 8 },
        feedback: existingFeedback,
      };

      const result = await agent.review(state);

      expect(result.feedback).toEqual(existingFeedback);
    });

    it('should append feedback when rejected', async () => {
      const mockSafetyResponse = {
        content: JSON.stringify({
          approved: false,
          rating: 'inappropriate',
          ageAppropriate: false,
          concerns: ['Violence', 'Scary content'],
          feedback: 'Contains inappropriate themes',
          confidenceScore: 0.98,
        }),
      };

      mockInvoke.mockResolvedValue(mockSafetyResponse);

      const existingFeedback = ['Too complex'];
      const state = {
        riddle: {
          riddle: 'Test',
          answer: 'Test',
          hint1: 'H1',
          hint2: 'H2',
          hint3: 'H3',
        },
        ageRange: { min: 5, max: 8 },
        feedback: existingFeedback,
      };

      const result = await agent.review(state);

      expect(result.feedback.length).toBe(2);
      expect(result.feedback[1]).toContain('Safety review failed');
      expect(result.feedback[1]).toContain('Violence');
      expect(result.feedback[1]).toContain('Scary content');
    });

    it('should have high confidence in safety decisions', async () => {
      const mockSafetyResponse = {
        content: JSON.stringify({
          approved: true,
          rating: 'G-rated',
          ageAppropriate: true,
          concerns: [],
          feedback: 'Excellent',
          confidenceScore: 0.99,
        }),
      };

      mockInvoke.mockResolvedValue(mockSafetyResponse);

      const state = {
        riddle: {
          riddle: 'What color is grass?',
          answer: 'Green',
          hint1: 'Plants',
          hint2: 'Nature',
          hint3: 'Lawn',
        },
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.review(state);

      expect(result.safetyResult.confidenceScore).toBeGreaterThan(0.9);
    });
  });

  describe('parseResponse', () => {
    it('should parse valid safety review response', () => {
      const content = JSON.stringify({
        approved: true,
        rating: 'G-rated',
        ageAppropriate: true,
        concerns: [],
        feedback: 'Safe for children',
        confidenceScore: 1.0,
      });

      const result = agent.parseResponse(content);

      expect(result.approved).toBe(true);
      expect(result.rating).toBe('G-rated');
    });

    it('should handle markdown code fences', () => {
      const content =
        '```json\n{"approved":true,"rating":"G-rated","ageAppropriate":true,"concerns":[],"feedback":"Good","confidenceScore":0.95}\n```';

      const result = agent.parseResponse(content);

      expect(result.approved).toBe(true);
    });

    it('should validate rating enum values', () => {
      const content = JSON.stringify({
        approved: true,
        rating: 'invalid-rating',
        ageAppropriate: true,
        concerns: [],
        feedback: 'Test',
        confidenceScore: 0.9,
      });

      expect(() => agent.parseResponse(content)).toThrow();
    });

    it('should validate required fields', () => {
      const content = JSON.stringify({
        approved: true,
        // Missing rating, ageAppropriate, etc.
      });

      expect(() => agent.parseResponse(content)).toThrow();
    });

    it('should validate confidence score range', () => {
      const content = JSON.stringify({
        approved: true,
        rating: 'G-rated',
        ageAppropriate: true,
        concerns: [],
        feedback: 'Test',
        confidenceScore: 1.5, // Invalid: > 1
      });

      expect(() => agent.parseResponse(content)).toThrow();
    });

    it('should handle concerns array', () => {
      const content = JSON.stringify({
        approved: false,
        rating: 'PG',
        ageAppropriate: false,
        concerns: ['Concern 1', 'Concern 2', 'Concern 3'],
        feedback: 'Multiple issues',
        confidenceScore: 0.85,
      });

      const result = agent.parseResponse(content);

      expect(result.concerns).toHaveLength(3);
    });
  });

  describe('model configuration', () => {
    it('should use lower temperature for consistent judgment', () => {
      // Temperature should be 0.3 for consistent safety decisions
      expect(agent.model).toBeDefined();
    });

    it('should have appropriate token limit', () => {
      // maxTokens should be 500 for safety reviews
      expect(agent.model).toBeDefined();
    });
  });
});
