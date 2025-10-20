/**
 * Generator Agent
 * Creates age-appropriate riddles using Claude
 */

const { ChatAnthropic } = require('@langchain/anthropic');
const { HumanMessage } = require('@langchain/core/messages');
const { buildGeneratorPrompt } = require('../prompts/generatorPrompt');
const { RiddleOutputSchema } = require('../schemas/riddleSchemas');

class GeneratorAgent {
  constructor() {
    this.model = new ChatAnthropic({
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.8, // Higher creativity
      maxTokens: 800,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate a riddle
   */
  async generate(state) {
    console.log(`[GeneratorAgent] Attempt ${state.attempt + 1}/${state.maxAttempts}`);
    console.log(`[GeneratorAgent] Age range: ${state.ageRange.min}-${state.ageRange.max}`);

    if (state.feedback.length > 0) {
      console.log('[GeneratorAgent] Previous feedback:', state.feedback);
    }

    try {
      const prompt = buildGeneratorPrompt(state.ageRange, state.feedback);

      const response = await this.model.invoke([new HumanMessage(prompt)]);

      const content = response.content;
      console.log(`[GeneratorAgent] Raw response length: ${content.length} chars`);

      // Parse and validate the response
      const riddle = this.parseResponse(content);
      console.log(`[GeneratorAgent] Riddle generated: "${riddle.riddle.substring(0, 50)}..."`);

      return {
        ...state,
        attempt: state.attempt + 1,
        riddle,
        status: 'reviewing_safety',
        error: null,
      };
    } catch (error) {
      console.error('[GeneratorAgent] Generation failed:', error.message);

      return {
        ...state,
        attempt: state.attempt + 1,
        status: 'failed',
        error: `Generation failed: ${error.message}`,
      };
    }
  }

  /**
   * Parse and validate the response
   */
  parseResponse(content) {
    try {
      // Clean up the response - remove markdown code blocks if present
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
      const validated = RiddleOutputSchema.parse(parsed);

      return validated;
    } catch (error) {
      console.error('[GeneratorAgent] Parse error:', error.message);
      console.error('[GeneratorAgent] Raw content:', content.substring(0, 500));
      throw new Error(`Failed to parse riddle response: ${error.message}`);
    }
  }
}

module.exports = GeneratorAgent;
