/**
 * Riddle Graph Service
 * LangGraph workflow for multi-agent riddle generation
 */

const { StateGraph, END } = require('@langchain/langgraph');
const { MemorySaver } = require('@langchain/langgraph');
const GeneratorAgent = require('./agents/GeneratorAgent');
const SafetyAgent = require('./agents/SafetyAgent');
const DifficultyAgent = require('./agents/DifficultyAgent');

class RiddleGraphService {
  constructor() {
    this.generatorAgent = new GeneratorAgent();
    this.safetyAgent = new SafetyAgent();
    this.difficultyAgent = new DifficultyAgent();

    // Build the workflow graph
    this.workflow = this.buildWorkflow();
    this.app = null;
  }

  /**
   * Build the LangGraph workflow
   */
  buildWorkflow() {
    // Define the state graph
    const workflow = new StateGraph({
      channels: {
        attempt: {
          value: (left, right) => right ?? left ?? 0,
          default: () => 0,
        },
        maxAttempts: {
          value: (left, right) => right ?? left ?? 3,
          default: () => 3,
        },
        ageRange: {
          value: (left, right) => right ?? left ?? { min: 5, max: 8 },
          default: () => ({ min: 5, max: 8 }),
        },
        riddle: {
          value: (left, right) => right ?? left ?? null,
          default: () => null,
        },
        safetyResult: {
          value: (left, right) => right ?? left ?? null,
          default: () => null,
        },
        difficultyResult: {
          value: (left, right) => right ?? left ?? null,
          default: () => null,
        },
        feedback: {
          value: (left, right) => right ?? left ?? [],
          default: () => [],
        },
        status: {
          value: (left, right) => right ?? left ?? 'generating',
          default: () => 'generating',
        },
        error: {
          value: (left, right) => right ?? left ?? null,
          default: () => null,
        },
      },
    });

    // Add nodes
    workflow.addNode('generate', async (state) => {
      console.log('\n[Graph] Node: GENERATE');
      return await this.generatorAgent.generate(state);
    });

    workflow.addNode('review_safety', async (state) => {
      console.log('\n[Graph] Node: REVIEW_SAFETY');
      return await this.safetyAgent.review(state);
    });

    workflow.addNode('check_difficulty', async (state) => {
      console.log('\n[Graph] Node: CHECK_DIFFICULTY');
      return await this.difficultyAgent.validate(state);
    });

    // Set entry point
    workflow.setEntryPoint('generate');

    // Add edges
    workflow.addConditionalEdges(
      'generate',
      (state) => {
        console.log(`[Graph] After generate - status: ${state.status}, attempt: ${state.attempt}`);

        // Check if we failed
        if (state.status === 'failed') {
          return 'end';
        }

        // Check if we exceeded max attempts
        if (state.attempt >= state.maxAttempts && state.status !== 'reviewing_safety') {
          console.log('[Graph] Max attempts reached');
          return 'end';
        }

        // Proceed to safety review
        return 'review_safety';
      },
      {
        review_safety: 'review_safety',
        end: END,
      }
    );

    workflow.addConditionalEdges(
      'review_safety',
      (state) => {
        console.log(`[Graph] After safety - status: ${state.status}`);

        // Safety failed, go back to generate if we have attempts left
        if (state.status === 'generating') {
          if (state.attempt >= state.maxAttempts) {
            console.log('[Graph] Max attempts reached after safety check');
            return 'end';
          }
          console.log('[Graph] Safety rejected, retrying generation');
          return 'generate';
        }

        // Safety passed, check difficulty
        if (state.status === 'checking_difficulty') {
          return 'check_difficulty';
        }

        // Failed
        return 'end';
      },
      {
        generate: 'generate',
        check_difficulty: 'check_difficulty',
        end: END,
      }
    );

    workflow.addConditionalEdges(
      'check_difficulty',
      (state) => {
        console.log(`[Graph] After difficulty - status: ${state.status}`);

        // Success!
        if (state.status === 'success') {
          console.log('[Graph] ✅ All validations passed!');
          return 'end';
        }

        // Difficulty check failed, retry if we have attempts
        if (state.status === 'generating') {
          if (state.attempt >= state.maxAttempts) {
            console.log('[Graph] Max attempts reached after difficulty check');
            return 'end';
          }
          console.log('[Graph] Difficulty rejected, retrying generation');
          return 'generate';
        }

        // Failed
        return 'end';
      },
      {
        generate: 'generate',
        end: END,
      }
    );

    return workflow;
  }

  /**
   * Compile the workflow
   */
  async compile() {
    if (!this.app) {
      // Use memory saver for checkpointing (optional)
      const checkpointer = new MemorySaver();
      this.app = this.workflow.compile({ checkpointer });
      console.log('[Graph] Workflow compiled');
    }
    return this.app;
  }

  /**
   * Generate a validated riddle
   */
  async generateRiddle(ageRange = { min: 5, max: 8 }) {
    console.log('\n=== Starting Riddle Generation Workflow ===');
    console.log(`Age range: ${ageRange.min}-${ageRange.max}`);

    try {
      // Compile the workflow
      const app = await this.compile();

      // Initial state
      const initialState = {
        attempt: 0,
        maxAttempts: 3,
        ageRange,
        riddle: null,
        safetyResult: null,
        difficultyResult: null,
        feedback: [],
        status: 'generating',
        error: null,
      };

      // Run the workflow
      const config = {
        configurable: { thread_id: `riddle-${Date.now()}` },
      };

      let finalState = initialState;

      // Stream through the workflow
      for await (const state of await app.stream(initialState, config)) {
        // Get the last value in the state object
        const values = Object.values(state);
        if (values.length > 0) {
          finalState = values[0];
        }
      }

      console.log('\n=== Workflow Complete ===');
      console.log(`Final status: ${finalState.status}`);
      console.log(`Attempts used: ${finalState.attempt}/${finalState.maxAttempts}`);

      // Check if successful
      if (finalState.status === 'success' && finalState.riddle) {
        console.log('✅ Successfully generated validated riddle!');

        return {
          success: true,
          riddle: {
            ...finalState.riddle,
            metadata: {
              ageRange: finalState.ageRange,
              attemptsTaken: finalState.attempt,
              safetyRating: finalState.safetyResult?.rating,
              safetyConfidence: finalState.safetyResult?.confidenceScore,
              difficultyLevel: finalState.difficultyResult?.level,
              vocabularyScore: finalState.difficultyResult?.vocabularyScore,
              complexityScore: finalState.difficultyResult?.complexityScore,
              generatedAt: new Date().toISOString(),
            },
          },
        };
      }
      // Failed to generate
      console.error('❌ Failed to generate valid riddle');
      console.error(`Error: ${finalState.error}`);
      console.error(`Feedback: ${finalState.feedback.join('; ')}`);

      throw new Error(
        finalState.error ||
          `Failed to generate valid riddle after ${finalState.attempt} attempts. ` +
            `Feedback: ${finalState.feedback.slice(-1)[0] || 'Unknown reason'}`
      );
    } catch (error) {
      console.error('[Graph] Generation failed:', error.message);
      throw error;
    }
  }
}

module.exports = RiddleGraphService;
