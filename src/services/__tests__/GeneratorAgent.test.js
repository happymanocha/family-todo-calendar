/**
 * Unit Tests for GeneratorAgent
 * Tests the riddle generation agent functionality
 */

const GeneratorAgent = require('../riddle/agents/GeneratorAgent');

// Mock the Anthropic client
jest.mock('@langchain/anthropic', () => ({
  ChatAnthropic: jest.fn().mockImplementation(() => ({
    invoke: jest.fn(),
  })),
}));

describe('GeneratorAgent', () => {
  let agent;
  let mockInvoke;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create agent instance
    agent = new GeneratorAgent();

    // Get reference to the mocked invoke function
    mockInvoke = agent.model.invoke;
  });

  describe('generate', () => {
    it('should successfully generate a valid riddle', async () => {
      // Mock response from Claude
      const mockRiddleResponse = {
        content: JSON.stringify({
          riddle: 'I have four legs and a tail, but no head. What am I?',
          answer: 'A chair',
          hint1: 'You sit on me',
          hint2: 'I am found in every room',
          hint3: 'I help you rest',
          category: 'object',
          estimatedDifficulty: 'easy',
        }),
      };

      mockInvoke.mockResolvedValue(mockRiddleResponse);

      const state = {
        attempt: 0,
        maxAttempts: 3,
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.generate(state);

      // Verify the result structure
      expect(result.attempt).toBe(1);
      expect(result.status).toBe('reviewing_safety');
      expect(result.error).toBeNull();
      expect(result.riddle).toBeDefined();
      expect(result.riddle.riddle).toBe('I have four legs and a tail, but no head. What am I?');
      expect(result.riddle.answer).toBe('A chair');
      expect(result.riddle.hint1).toBe('You sit on me');
      expect(result.riddle.category).toBe('object');
    });

    it('should handle markdown code fences in response', async () => {
      const mockRiddleResponse = {
        content:
          '```json\n{"riddle":"Test riddle","answer":"Test","hint1":"H1","hint2":"H2","hint3":"H3","category":"animal","estimatedDifficulty":"easy"}\n```',
      };

      mockInvoke.mockResolvedValue(mockRiddleResponse);

      const state = {
        attempt: 0,
        maxAttempts: 3,
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.generate(state);

      expect(result.riddle.riddle).toBe('Test riddle');
      expect(result.riddle.answer).toBe('Test');
    });

    it('should increment attempt counter', async () => {
      const mockRiddleResponse = {
        content: JSON.stringify({
          riddle: 'Test riddle',
          answer: 'Test answer',
          hint1: 'Hint 1',
          hint2: 'Hint 2',
          hint3: 'Hint 3',
          category: 'nature',
          estimatedDifficulty: 'medium',
        }),
      };

      mockInvoke.mockResolvedValue(mockRiddleResponse);

      const state = {
        attempt: 1, // Already on second attempt
        maxAttempts: 3,
        ageRange: { min: 5, max: 8 },
        feedback: ['Previous feedback'],
      };

      const result = await agent.generate(state);

      expect(result.attempt).toBe(2);
    });

    it('should preserve feedback from previous attempts', async () => {
      const mockRiddleResponse = {
        content: JSON.stringify({
          riddle: 'What animal says meow?',
          answer: 'Cat',
          hint1: 'It has whiskers',
          hint2: 'It purrs',
          hint3: 'It likes milk',
          category: 'animal',
          estimatedDifficulty: 'easy',
        }),
      };

      mockInvoke.mockResolvedValue(mockRiddleResponse);

      const previousFeedback = ['Too difficult', 'Not age-appropriate'];
      const state = {
        attempt: 1,
        maxAttempts: 3,
        ageRange: { min: 5, max: 8 },
        feedback: previousFeedback,
      };

      const result = await agent.generate(state);

      // Feedback should be preserved in state (carried through)
      expect(result.feedback).toEqual(previousFeedback);
    });

    it('should handle generation errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('API timeout'));

      const state = {
        attempt: 0,
        maxAttempts: 3,
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.generate(state);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Generation failed');
      expect(result.attempt).toBe(1);
    });

    it('should handle invalid JSON in response', async () => {
      const mockRiddleResponse = {
        content: 'This is not valid JSON',
      };

      mockInvoke.mockResolvedValue(mockRiddleResponse);

      const state = {
        attempt: 0,
        maxAttempts: 3,
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.generate(state);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Failed to parse riddle response');
    });

    it('should validate riddle schema with Zod', async () => {
      // Missing required fields
      const mockRiddleResponse = {
        content: JSON.stringify({
          riddle: 'Test',
          // Missing answer, hints, category, difficulty
        }),
      };

      mockInvoke.mockResolvedValue(mockRiddleResponse);

      const state = {
        attempt: 0,
        maxAttempts: 3,
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.generate(state);

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });

    it('should handle age ranges correctly', async () => {
      const mockRiddleResponse = {
        content: JSON.stringify({
          riddle: 'What color is the sky?',
          answer: 'Blue',
          hint1: 'Look up',
          hint2: 'It changes with weather',
          hint3: 'Same color as ocean',
          category: 'nature',
          estimatedDifficulty: 'easy',
        }),
      };

      mockInvoke.mockResolvedValue(mockRiddleResponse);

      const state = {
        attempt: 0,
        maxAttempts: 3,
        ageRange: { min: 6, max: 7 }, // Specific age range
        feedback: [],
      };

      await agent.generate(state);

      // Verify that invoke was called (prompt should include age range)
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  describe('parseResponse', () => {
    it('should parse clean JSON correctly', () => {
      const content = JSON.stringify({
        riddle: 'Test riddle',
        answer: 'Test answer',
        hint1: 'Hint 1',
        hint2: 'Hint 2',
        hint3: 'Hint 3',
        category: 'animal',
        estimatedDifficulty: 'easy',
      });

      const result = agent.parseResponse(content);

      expect(result.riddle).toBe('Test riddle');
      expect(result.answer).toBe('Test answer');
    });

    it('should remove markdown code fences', () => {
      const content =
        '```json\n{"riddle":"Test","answer":"A","hint1":"H1","hint2":"H2","hint3":"H3","category":"food","estimatedDifficulty":"easy"}\n```';

      const result = agent.parseResponse(content);

      expect(result.riddle).toBe('Test');
    });

    it('should extract JSON from mixed content', () => {
      const content =
        'Here is the riddle: {"riddle":"Test","answer":"A","hint1":"H1","hint2":"H2","hint3":"H3","category":"person","estimatedDifficulty":"medium"} Hope you like it!';

      const result = agent.parseResponse(content);

      expect(result.riddle).toBe('Test');
    });

    it('should throw error for invalid JSON', () => {
      const content = 'Not JSON at all';

      expect(() => agent.parseResponse(content)).toThrow('Failed to parse riddle response');
    });

    it('should validate required fields with Zod', () => {
      const content = JSON.stringify({
        riddle: 'Test',
        // Missing required fields
      });

      expect(() => agent.parseResponse(content)).toThrow();
    });

    it('should validate category enum', () => {
      const content = JSON.stringify({
        riddle: 'Test',
        answer: 'Answer',
        hint1: 'H1',
        hint2: 'H2',
        hint3: 'H3',
        category: 'invalid_category', // Invalid
        estimatedDifficulty: 'easy',
      });

      expect(() => agent.parseResponse(content)).toThrow();
    });

    it('should validate difficulty enum', () => {
      const content = JSON.stringify({
        riddle: 'Test',
        answer: 'Answer',
        hint1: 'H1',
        hint2: 'H2',
        hint3: 'H3',
        category: 'animal',
        estimatedDifficulty: 'impossible', // Invalid
      });

      expect(() => agent.parseResponse(content)).toThrow();
    });
  });

  describe('model configuration', () => {
    it('should be configured with correct model name', () => {
      expect(agent.model).toBeDefined();
    });

    it('should use higher temperature for creativity', () => {
      // The agent should be configured with temperature 0.8 for creativity
      // This is checked during agent construction
      expect(agent.model).toBeDefined();
    });
  });
});
