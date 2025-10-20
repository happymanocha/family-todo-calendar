/**
 * Safety Reviewer Agent
 * Validates G-rating and age-appropriateness
 */

const { ChatAnthropic } = require('@langchain/anthropic');
const { HumanMessage } = require('@langchain/core/messages');
const { buildSafetyPrompt } = require('../prompts/safetyPrompt');
const { SafetyReviewSchema } = require('../schemas/riddleSchemas');

class SafetyAgent {
  constructor() {
    this.model = new ChatAnthropic({
      model: 'claude-sonnet-4-5',
      temperature: 0.3, // Lower temperature for consistent judgment
      maxTokens: 500,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Review riddle for safety
   */
  async review(state) {
    console.log('[SafetyAgent] Reviewing riddle for safety...');

    if (!state.riddle) {
      console.error('[SafetyAgent] No riddle to review');
      return {
        ...state,
        status: 'failed',
        error: 'No riddle to review',
      };
    }

    try {
      const prompt = buildSafetyPrompt(state.riddle, state.ageRange);

      const response = await this.model.invoke([new HumanMessage(prompt)]);

      const content = response.content;
      const safetyResult = this.parseResponse(content);

      console.log(
        `[SafetyAgent] Review result: ${safetyResult.approved ? 'APPROVED' : 'REJECTED'}`
      );
      console.log(`[SafetyAgent] Rating: ${safetyResult.rating}`);
      console.log(`[SafetyAgent] Confidence: ${safetyResult.confidenceScore}`);

      if (safetyResult.concerns.length > 0) {
        console.log('[SafetyAgent] Concerns:', safetyResult.concerns);
      }

      return {
        ...state,
        safetyResult,
        status:
          safetyResult.approved && safetyResult.ageAppropriate
            ? 'checking_difficulty'
            : 'generating', // Go back to generator with feedback
        feedback:
          safetyResult.approved && safetyResult.ageAppropriate
            ? state.feedback
            : [
                ...state.feedback,
                `Safety review failed: ${safetyResult.feedback}. Concerns: ${safetyResult.concerns.join(', ')}`,
              ],
      };
    } catch (error) {
      console.error('[SafetyAgent] Review failed:', error.message);

      return {
        ...state,
        status: 'failed',
        error: `Safety review failed: ${error.message}`,
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
      const validated = SafetyReviewSchema.parse(parsed);

      return validated;
    } catch (error) {
      console.error('[SafetyAgent] Parse error:', error.message);
      console.error('[SafetyAgent] Raw content:', content.substring(0, 500));
      throw new Error(`Failed to parse safety review: ${error.message}`);
    }
  }
}

module.exports = SafetyAgent;
