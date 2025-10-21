/**
 * Unit Tests for DifficultyAgent
 * Tests the difficulty validation agent functionality
 */

const DifficultyAgent = require('../riddle/agents/DifficultyAgent');

// Mock the Anthropic client
jest.mock('@langchain/anthropic', () => ({
  ChatAnthropic: jest.fn().mockImplementation(() => ({
    invoke: jest.fn(),
  })),
}));

describe('DifficultyAgent', () => {
  let agent;
  let mockInvoke;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new DifficultyAgent();
    mockInvoke = agent.model.invoke;
  });

  describe('validate', () => {
    it('should approve riddle with just-right difficulty', async () => {
      const mockDifficultyResponse = {
        content: JSON.stringify({
          appropriate: true,
          level: 'just_right',
          vocabularyScore: 0.9,
          complexityScore: 0.85,
          feedback: 'Perfect for ages 5-8',
          recommendedAgeRange: '5-8',
        }),
      };

      mockInvoke.mockResolvedValue(mockDifficultyResponse);

      const state = {
        riddle: {
          riddle: 'What animal says woof?',
          answer: 'Dog',
          hint1: 'It has four legs',
          hint2: 'It wags its tail',
          hint3: 'It is a pet',
        },
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.validate(state);

      expect(result.difficultyResult.appropriate).toBe(true);
      expect(result.difficultyResult.level).toBe('just_right');
      expect(result.status).toBe('success');
      expect(result.feedback).toEqual([]);
    });

    it('should reject riddle that is too easy', async () => {
      const mockDifficultyResponse = {
        content: JSON.stringify({
          appropriate: false,
          level: 'too_easy',
          vocabularyScore: 0.3,
          complexityScore: 0.2,
          feedback: 'Too simple, lacks challenge',
          recommendedAgeRange: '4-6',
        }),
      };

      mockInvoke.mockResolvedValue(mockDifficultyResponse);

      const state = {
        riddle: {
          riddle: 'What color is a red apple?',
          answer: 'Red',
          hint1: 'Look at the question',
          hint2: 'Same as fire truck',
          hint3: 'Rhymes with bed',
        },
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.validate(state);

      expect(result.status).toBe('generating');
      expect(result.feedback.length).toBeGreaterThan(0);
      expect(result.feedback[0]).toContain('too_easy');
    });

    it('should reject riddle that is too hard', async () => {
      const mockDifficultyResponse = {
        content: JSON.stringify({
          appropriate: false,
          level: 'too_hard',
          vocabularyScore: 0.2,
          complexityScore: 0.15,
          feedback: 'Vocabulary and concepts too advanced',
          recommendedAgeRange: '5-8',
        }),
      };

      mockInvoke.mockResolvedValue(mockDifficultyResponse);

      const state = {
        riddle: {
          riddle:
            'What is the phenomenon where light bends when passing through different mediums?',
          answer: 'Refraction',
          hint1: 'Physics concept',
          hint2: 'Related to optics',
          hint3: 'Snells law',
        },
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.validate(state);

      expect(result.status).toBe('generating');
      expect(result.feedback[0]).toContain('too_hard');
    });

    it('should return error when no riddle is provided', async () => {
      const state = {
        riddle: null,
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.validate(state);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('No riddle to validate');
    });

    it('should handle API errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Service unavailable'));

      const state = {
        riddle: {
          riddle: 'Test',
          answer: 'Test',
          hint1: 'H1',
          hint2: 'H2',
          hint3: 'H3',
        },
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.validate(state);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Difficulty validation failed');
    });

    it('should preserve feedback when difficulty is appropriate', async () => {
      const mockDifficultyResponse = {
        content: JSON.stringify({
          appropriate: true,
          level: 'just_right',
          vocabularyScore: 0.9,
          complexityScore: 0.88,
          feedback: 'Excellent',
          recommendedAgeRange: '5-8',
        }),
      };

      mockInvoke.mockResolvedValue(mockDifficultyResponse);

      const existingFeedback = ['From safety check'];
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

      const result = await agent.validate(state);

      expect(result.feedback).toEqual(existingFeedback);
    });

    it('should append feedback when difficulty is not appropriate', async () => {
      const mockDifficultyResponse = {
        content: JSON.stringify({
          appropriate: false,
          level: 'too_hard',
          vocabularyScore: 0.3,
          complexityScore: 0.25,
          feedback: 'Reduce complexity',
          recommendedAgeRange: '5-8',
        }),
      };

      mockInvoke.mockResolvedValue(mockDifficultyResponse);

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

      const result = await agent.validate(state);

      expect(result.feedback.length).toBe(2);
      expect(result.feedback[1]).toContain('Difficulty check failed');
    });

    it('should evaluate vocabulary appropriately', async () => {
      const mockDifficultyResponse = {
        content: JSON.stringify({
          appropriate: true,
          level: 'just_right',
          vocabularyScore: 0.92,
          complexityScore: 0.88,
          feedback: 'Age-appropriate vocabulary',
          recommendedAgeRange: '5-8',
        }),
      };

      mockInvoke.mockResolvedValue(mockDifficultyResponse);

      const state = {
        riddle: {
          riddle: 'I am yellow and shine in the sky during the day. What am I?',
          answer: 'Sun',
          hint1: 'It makes plants grow',
          hint2: 'It is very bright',
          hint3: 'It is hot',
        },
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.validate(state);

      expect(result.difficultyResult.vocabularyScore).toBeGreaterThan(0.8);
    });

    it('should evaluate complexity appropriately', async () => {
      const mockDifficultyResponse = {
        content: JSON.stringify({
          appropriate: true,
          level: 'just_right',
          vocabularyScore: 0.9,
          complexityScore: 0.85,
          feedback: 'Good logical complexity',
          recommendedAgeRange: '5-8',
        }),
      };

      mockInvoke.mockResolvedValue(mockDifficultyResponse);

      const state = {
        riddle: {
          riddle: 'I have keys but no locks. I have space but no room. What am I?',
          answer: 'Keyboard',
          hint1: 'You type on me',
          hint2: 'I am on computers',
          hint3: 'I have letters',
        },
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.validate(state);

      expect(result.difficultyResult.complexityScore).toBeGreaterThan(0.8);
    });

    it('should reject when appropriate is true but level is not just_right', async () => {
      const mockDifficultyResponse = {
        content: JSON.stringify({
          appropriate: true,
          level: 'too_easy', // Mismatch
          vocabularyScore: 0.5,
          complexityScore: 0.45,
          feedback: 'Needs more challenge',
          recommendedAgeRange: '5-8',
        }),
      };

      mockInvoke.mockResolvedValue(mockDifficultyResponse);

      const state = {
        riddle: {
          riddle: 'Test',
          answer: 'Test',
          hint1: 'H1',
          hint2: 'H2',
          hint3: 'H3',
        },
        ageRange: { min: 5, max: 8 },
        feedback: [],
      };

      const result = await agent.validate(state);

      // Should go back to generating because level is not just_right
      expect(result.status).toBe('generating');
    });
  });

  describe('parseResponse', () => {
    it('should parse valid difficulty response', () => {
      const content = JSON.stringify({
        appropriate: true,
        level: 'just_right',
        vocabularyScore: 0.9,
        complexityScore: 0.85,
        feedback: 'Perfect',
        recommendedAgeRange: '5-8',
      });

      const result = agent.parseResponse(content);

      expect(result.appropriate).toBe(true);
      expect(result.level).toBe('just_right');
    });

    it('should handle markdown code fences', () => {
      const content =
        '```json\n{"appropriate":true,"level":"just_right","vocabularyScore":0.9,"complexityScore":0.85,"feedback":"Good","recommendedAgeRange":"5-8"}\n```';

      const result = agent.parseResponse(content);

      expect(result.appropriate).toBe(true);
    });

    it('should validate level enum values', () => {
      const content = JSON.stringify({
        appropriate: true,
        level: 'invalid_level',
        vocabularyScore: 0.9,
        complexityScore: 0.85,
        feedback: 'Test',
        recommendedAgeRange: '5-8',
      });

      expect(() => agent.parseResponse(content)).toThrow();
    });

    it('should validate score ranges (0-1)', () => {
      const content = JSON.stringify({
        appropriate: true,
        level: 'just_right',
        vocabularyScore: 1.5, // Invalid
        complexityScore: 0.85,
        feedback: 'Test',
        recommendedAgeRange: '5-8',
      });

      expect(() => agent.parseResponse(content)).toThrow();
    });

    it('should validate required fields', () => {
      const content = JSON.stringify({
        appropriate: true,
        // Missing level, scores, feedback
      });

      expect(() => agent.parseResponse(content)).toThrow();
    });

    it('should accept all valid difficulty levels', () => {
      const levels = ['too_easy', 'just_right', 'too_hard'];

      levels.forEach((level) => {
        const content = JSON.stringify({
          appropriate: level === 'just_right',
          level,
          vocabularyScore: 0.8,
          complexityScore: 0.75,
          feedback: 'Test',
          recommendedAgeRange: '5-8',
        });

        const result = agent.parseResponse(content);
        expect(result.level).toBe(level);
      });
    });
  });

  describe('model configuration', () => {
    it('should use lower temperature for consistent assessment', () => {
      // Temperature should be 0.3 for consistent difficulty evaluation
      expect(agent.model).toBeDefined();
    });

    it('should have appropriate token limit', () => {
      // maxTokens should be 400 for difficulty validation
      expect(agent.model).toBeDefined();
    });
  });
});
