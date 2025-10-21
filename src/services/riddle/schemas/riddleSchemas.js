/**
 * Riddle Schemas
 * Zod schemas for validating riddle data structures
 */

const { z } = require('zod');

/**
 * Riddle generation output schema
 */
const RiddleOutputSchema = z.object({
  riddle: z.string().min(10).max(500).describe('The riddle question'),
  answer: z.string().min(1).max(100).describe('The answer to the riddle'),
  hint1: z.string().min(5).max(200).describe('First gentle hint'),
  hint2: z.string().min(5).max(200).describe('Second more direct hint'),
  hint3: z.string().min(5).max(200).describe('Third almost-obvious hint'),
  category: z
    .enum(['animal', 'nature', 'object', 'food', 'number', 'person', 'place'])
    .describe('Riddle category'),
  estimatedDifficulty: z.enum(['easy', 'medium']).describe('Difficulty level'),
});

/**
 * Safety review result schema
 */
const SafetyReviewSchema = z.object({
  approved: z.boolean().describe('Whether the riddle passes safety checks'),
  rating: z.enum(['G-rated', 'PG', 'inappropriate']).describe('Content rating'),
  ageAppropriate: z.boolean().describe('Whether appropriate for target age'),
  concerns: z.array(z.string()).describe('List of safety concerns'),
  feedback: z.string().describe('Explanation of decision'),
  confidenceScore: z.number().min(0).max(1).describe('Confidence in the review'),
});

/**
 * Difficulty validation result schema
 */
const DifficultyValidationSchema = z.object({
  appropriate: z.boolean().describe('Whether difficulty matches age range'),
  level: z.enum(['too_easy', 'just_right', 'too_hard']).describe('Difficulty assessment'),
  vocabularyScore: z.number().min(0).max(1).describe('Vocabulary appropriateness (0-1)'),
  complexityScore: z.number().min(0).max(1).describe('Logical complexity score (0-1)'),
  feedback: z.string().describe('Explanation of assessment'),
  recommendedAgeRange: z.string().describe('Recommended age range'),
});

/**
 * LangGraph State schema
 */
const RiddleStateSchema = z.object({
  attempt: z.number().int().min(0).max(3).describe('Current attempt number'),
  maxAttempts: z.number().int().default(3).describe('Maximum retry attempts'),
  ageRange: z
    .object({
      min: z.number().int().default(5),
      max: z.number().int().default(8),
    })
    .describe('Target age range'),
  riddle: RiddleOutputSchema.nullable().describe('Generated riddle data'),
  safetyResult: SafetyReviewSchema.nullable().describe('Safety review result'),
  difficultyResult: DifficultyValidationSchema.nullable().describe('Difficulty check result'),
  feedback: z.array(z.string()).default([]).describe('Feedback from failed attempts'),
  status: z
    .enum(['generating', 'reviewing_safety', 'checking_difficulty', 'success', 'failed'])
    .default('generating')
    .describe('Current workflow status'),
  error: z.string().nullable().describe('Error message if failed'),
});

module.exports = {
  RiddleOutputSchema,
  SafetyReviewSchema,
  DifficultyValidationSchema,
  RiddleStateSchema,
};
