/**
 * Unit Tests for RiddleGraphService
 * Tests the LangGraph orchestration workflow
 */

const RiddleGraphService = require('../riddle/RiddleGraphService');

// Mock all agents
jest.mock('../riddle/agents/GeneratorAgent');
jest.mock('../riddle/agents/SafetyAgent');
jest.mock('../riddle/agents/DifficultyAgent');

const GeneratorAgent = require('../riddle/agents/GeneratorAgent');
const SafetyAgent = require('../riddle/agents/SafetyAgent');
const DifficultyAgent = require('../riddle/agents/DifficultyAgent');

describe('RiddleGraphService', () => {
  let service;
  let mockGenerate;
  let mockReview;
  let mockValidate;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockGenerate = jest.fn();
    mockReview = jest.fn();
    mockValidate = jest.fn();

    GeneratorAgent.mockImplementation(() => ({
      generate: mockGenerate,
    }));

    SafetyAgent.mockImplementation(() => ({
      review: mockReview,
    }));

    DifficultyAgent.mockImplementation(() => ({
      validate: mockValidate,
    }));

    service = new RiddleGraphService();
  });

  describe('generateRiddle', () => {
    it('should successfully generate a valid riddle on first attempt', async () => {
      const mockRiddle = {
        riddle: 'What has four legs but cannot walk?',
        answer: 'A table',
        hint1: 'You eat on it',
        hint2: 'Made of wood',
        hint3: 'In your dining room',
        category: 'object',
        estimatedDifficulty: 'easy',
      };

      // Mock successful generation
      mockGenerate.mockResolvedValue({
        attempt: 1,
        riddle: mockRiddle,
        status: 'reviewing_safety',
        error: null,
      });

      // Mock successful safety review
      mockReview.mockResolvedValue({
        safetyResult: {
          approved: true,
          rating: 'G-rated',
          ageAppropriate: true,
          concerns: [],
          feedback: 'Safe',
          confidenceScore: 1.0,
        },
        status: 'checking_difficulty',
      });

      // Mock successful difficulty validation
      mockValidate.mockResolvedValue({
        difficultyResult: {
          appropriate: true,
          level: 'just_right',
          vocabularyScore: 0.9,
          complexityScore: 0.85,
          feedback: 'Perfect',
        },
        status: 'success',
      });

      const result = await service.generateRiddle({ min: 5, max: 8 });

      expect(result.success).toBe(true);
      expect(result.riddle.riddle).toBe('What has four legs but cannot walk?');
      expect(result.riddle.metadata.attemptsTaken).toBe(1);
      expect(result.riddle.metadata.safetyRating).toBe('G-rated');
      expect(result.riddle.metadata.difficultyLevel).toBe('just_right');
    });

    it('should retry when safety review fails', async () => {
      const mockRiddle1 = {
        riddle: 'Scary riddle',
        answer: 'Ghost',
        hint1: 'Boo',
        hint2: 'Haunted',
        hint3: 'Spooky',
        category: 'person',
        estimatedDifficulty: 'medium',
      };

      const mockRiddle2 = {
        riddle: 'What animal says meow?',
        answer: 'Cat',
        hint1: 'Pet',
        hint2: 'Purrs',
        hint3: 'Whiskers',
        category: 'animal',
        estimatedDifficulty: 'easy',
      };

      // First attempt - rejected
      mockGenerate.mockResolvedValueOnce({
        attempt: 1,
        riddle: mockRiddle1,
        status: 'reviewing_safety',
        error: null,
      });

      mockReview.mockResolvedValueOnce({
        safetyResult: {
          approved: false,
          rating: 'PG',
          ageAppropriate: false,
          concerns: ['Scary content'],
          feedback: 'Too scary',
          confidenceScore: 0.95,
        },
        status: 'generating',
        feedback: ['Safety review failed: Too scary. Concerns: Scary content'],
      });

      // Second attempt - approved
      mockGenerate.mockResolvedValueOnce({
        attempt: 2,
        riddle: mockRiddle2,
        status: 'reviewing_safety',
        error: null,
      });

      mockReview.mockResolvedValueOnce({
        safetyResult: {
          approved: true,
          rating: 'G-rated',
          ageAppropriate: true,
          concerns: [],
          feedback: 'Safe',
          confidenceScore: 1.0,
        },
        status: 'checking_difficulty',
      });

      mockValidate.mockResolvedValueOnce({
        difficultyResult: {
          appropriate: true,
          level: 'just_right',
          vocabularyScore: 0.9,
          complexityScore: 0.85,
          feedback: 'Perfect',
        },
        status: 'success',
      });

      const result = await service.generateRiddle({ min: 5, max: 8 });

      expect(result.success).toBe(true);
      expect(result.riddle.metadata.attemptsTaken).toBe(2);
      expect(mockGenerate).toHaveBeenCalledTimes(2);
    });

    it('should retry when difficulty validation fails', async () => {
      const mockRiddle1 = {
        riddle: 'What is 1+1?',
        answer: '2',
        hint1: 'Math',
        hint2: 'Easy',
        hint3: 'Two',
        category: 'number',
        estimatedDifficulty: 'easy',
      };

      const mockRiddle2 = {
        riddle: 'What has hands but cannot clap?',
        answer: 'Clock',
        hint1: 'Tells time',
        hint2: 'On wall',
        hint3: 'Tick tock',
        category: 'object',
        estimatedDifficulty: 'easy',
      };

      // First attempt - too easy
      mockGenerate.mockResolvedValueOnce({
        attempt: 1,
        riddle: mockRiddle1,
        status: 'reviewing_safety',
        error: null,
      });

      mockReview.mockResolvedValueOnce({
        safetyResult: {
          approved: true,
          rating: 'G-rated',
          ageAppropriate: true,
          concerns: [],
          feedback: 'Safe',
          confidenceScore: 1.0,
        },
        status: 'checking_difficulty',
      });

      mockValidate.mockResolvedValueOnce({
        difficultyResult: {
          appropriate: false,
          level: 'too_easy',
          vocabularyScore: 0.3,
          complexityScore: 0.2,
          feedback: 'Too simple',
        },
        status: 'generating',
        feedback: ['Difficulty check failed: Too simple. Level: too_easy'],
      });

      // Second attempt - just right
      mockGenerate.mockResolvedValueOnce({
        attempt: 2,
        riddle: mockRiddle2,
        status: 'reviewing_safety',
        error: null,
      });

      mockReview.mockResolvedValueOnce({
        safetyResult: {
          approved: true,
          rating: 'G-rated',
          ageAppropriate: true,
          concerns: [],
          feedback: 'Safe',
          confidenceScore: 1.0,
        },
        status: 'checking_difficulty',
      });

      mockValidate.mockResolvedValueOnce({
        difficultyResult: {
          appropriate: true,
          level: 'just_right',
          vocabularyScore: 0.9,
          complexityScore: 0.85,
          feedback: 'Perfect',
        },
        status: 'success',
      });

      const result = await service.generateRiddle({ min: 5, max: 8 });

      expect(result.success).toBe(true);
      expect(result.riddle.metadata.attemptsTaken).toBe(2);
    });

    it('should fail after max attempts', async () => {
      // All attempts fail safety
      mockGenerate.mockResolvedValue({
        attempt: 1,
        riddle: {
          riddle: 'Bad riddle',
          answer: 'Bad',
          hint1: 'H1',
          hint2: 'H2',
          hint3: 'H3',
          category: 'object',
          estimatedDifficulty: 'easy',
        },
        status: 'reviewing_safety',
        error: null,
      });

      mockReview.mockResolvedValue({
        safetyResult: {
          approved: false,
          rating: 'inappropriate',
          ageAppropriate: false,
          concerns: ['Bad content'],
          feedback: 'Inappropriate',
          confidenceScore: 0.99,
        },
        status: 'generating',
        feedback: ['Safety review failed'],
      });

      const result = await service.generateRiddle({ min: 5, max: 8 });

      expect(result.success).toBe(false);
      expect(mockGenerate).toHaveBeenCalledTimes(3); // Max attempts
    });

    it('should handle generation errors', async () => {
      mockGenerate.mockResolvedValue({
        attempt: 1,
        status: 'failed',
        error: 'API error',
      });

      const result = await service.generateRiddle({ min: 5, max: 8 });

      expect(result.success).toBe(false);
    });

    it('should use default age range when not provided', async () => {
      mockGenerate.mockResolvedValue({
        attempt: 1,
        riddle: {
          riddle: 'Test',
          answer: 'Test',
          hint1: 'H1',
          hint2: 'H2',
          hint3: 'H3',
          category: 'object',
          estimatedDifficulty: 'easy',
        },
        status: 'reviewing_safety',
        error: null,
      });

      mockReview.mockResolvedValue({
        safetyResult: {
          approved: true,
          rating: 'G-rated',
          ageAppropriate: true,
          concerns: [],
          feedback: 'Safe',
          confidenceScore: 1.0,
        },
        status: 'checking_difficulty',
      });

      mockValidate.mockResolvedValue({
        difficultyResult: {
          appropriate: true,
          level: 'just_right',
          vocabularyScore: 0.9,
          complexityScore: 0.85,
          feedback: 'Perfect',
        },
        status: 'success',
      });

      await service.generateRiddle();

      // Verify default age range was used (5-8)
      expect(mockGenerate).toHaveBeenCalled();
    });

    it('should include metadata in final riddle', async () => {
      mockGenerate.mockResolvedValue({
        attempt: 1,
        riddle: {
          riddle: 'Test',
          answer: 'Test',
          hint1: 'H1',
          hint2: 'H2',
          hint3: 'H3',
          category: 'animal',
          estimatedDifficulty: 'medium',
        },
        status: 'reviewing_safety',
        error: null,
      });

      mockReview.mockResolvedValue({
        safetyResult: {
          approved: true,
          rating: 'G-rated',
          ageAppropriate: true,
          concerns: [],
          feedback: 'Safe',
          confidenceScore: 0.99,
        },
        status: 'checking_difficulty',
      });

      mockValidate.mockResolvedValue({
        difficultyResult: {
          appropriate: true,
          level: 'just_right',
          vocabularyScore: 0.88,
          complexityScore: 0.82,
          feedback: 'Good',
        },
        status: 'success',
      });

      const result = await service.generateRiddle({ min: 6, max: 7 });

      expect(result.riddle.metadata).toBeDefined();
      expect(result.riddle.metadata.attemptsTaken).toBe(1);
      expect(result.riddle.metadata.safetyRating).toBe('G-rated');
      expect(result.riddle.metadata.difficultyLevel).toBe('just_right');
      expect(result.riddle.metadata.vocabularyScore).toBe(0.88);
      expect(result.riddle.metadata.complexityScore).toBe(0.82);
    });
  });

  describe('workflow construction', () => {
    it('should initialize all agents', () => {
      expect(service.generatorAgent).toBeDefined();
      expect(service.safetyAgent).toBeDefined();
      expect(service.difficultyAgent).toBeDefined();
    });

    it('should build workflow graph', () => {
      expect(service.workflow).toBeDefined();
    });
  });
});
