/**
 * Difficulty Validator Agent
 * Checks age-appropriateness and difficulty level
 */

const { ChatAnthropic } = require('@langchain/anthropic');
const { HumanMessage } = require('@langchain/core/messages');
const { buildDifficultyPrompt } = require('../prompts/difficultyPrompt');
const { DifficultyValidationSchema } = require('../schemas/riddleSchemas');

class DifficultyAgent {
  constructor() {
    this.model = new ChatAnthropic({
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.3, // Lower temperature for consistent assessment
      maxTokens: 400,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Validate riddle difficulty
   */
  async validate(state) {
    console.log('[DifficultyAgent] Validating difficulty...');

    if (!state.riddle) {
      console.error('[DifficultyAgent] No riddle to validate');
      return {
        ...state,
        status: 'failed',
        error: 'No riddle to validate',
      };
    }

    try {
      const prompt = buildDifficultyPrompt(state.riddle, state.ageRange);

      const response = await this.model.invoke([new HumanMessage(prompt)]);

      const content = response.content;
      const difficultyResult = this.parseResponse(content);

      console.log(`[DifficultyAgent] Difficulty: ${difficultyResult.level}`);
      console.log(`[DifficultyAgent] Appropriate: ${difficultyResult.appropriate}`);
      console.log(`[DifficultyAgent] Vocabulary: ${difficultyResult.vocabularyScore}`);
      console.log(`[DifficultyAgent] Complexity: ${difficultyResult.complexityScore}`);

      // Check if riddle is appropriate
      const isAppropriate = difficultyResult.appropriate && difficultyResult.level === 'just_right';

      if (!isAppropriate) {
        console.log(`[DifficultyAgent] Feedback: ${difficultyResult.feedback}`);
      }

      return {
        ...state,
        difficultyResult,
        status: isAppropriate ? 'success' : 'generating', // Go back if not appropriate
        feedback: isAppropriate
          ? state.feedback
          : [
              ...state.feedback,
              `Difficulty check failed: ${difficultyResult.feedback}. Level: ${difficultyResult.level}`,
            ],
      };
    } catch (error) {
      console.error('[DifficultyAgent] Validation failed:', error.message);

      return {
        ...state,
        status: 'failed',
        error: `Difficulty validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Parse and validate the response
   */
  parseResponse(content) {
    try {
      let cleaned = content.trim();

      // Remove markdown code fences
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      // Try to find JSON in the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      const parsed = JSON.parse(cleaned);

      // Validate with Zod schema
      const validated = DifficultyValidationSchema.parse(parsed);

      return validated;
    } catch (error) {
      console.error('[DifficultyAgent] Parse error:', error.message);
      console.error('[DifficultyAgent] Raw content:', content.substring(0, 500));
      throw new Error(`Failed to parse difficulty validation: ${error.message}`);
    }
  }
}

module.exports = DifficultyAgent;
