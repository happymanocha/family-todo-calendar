/**
 * Difficulty Validator Agent Prompt
 * Checks age-appropriateness and difficulty level
 */

const buildDifficultyPrompt = (riddle, ageRange) => {
  return `You are an educational content expert specializing in child development for ages ${ageRange.min}-${ageRange.max}.

Evaluate this riddle's difficulty and appropriateness:

Riddle: "${riddle.riddle}"
Answer: "${riddle.answer}"

CONSIDER:
1. Vocabulary Level
   - Are all words in the riddle familiar to ${ageRange.min}-${ageRange.max} year olds?
   - Do children this age encounter these words in daily life?

2. Logical Complexity
   - Can a ${ageRange.min}-${ageRange.max} year old follow the logic?
   - Is the reasoning straightforward?
   - Are there too many steps to solve it?

3. Required Knowledge
   - Do children this age know these concepts?
   - Have they experienced these things?
   - Is specialized knowledge required?

4. Abstract Thinking
   - Is abstract reasoning required?
   - At ages ${ageRange.min}-${ageRange.max}, children think concretely

DIFFICULTY ASSESSMENT:
- too_easy: Answer is immediately obvious, no thinking required
- just_right: Requires some thought but solvable by target age
- too_hard: Requires knowledge/skills beyond target age

FORMAT your response as JSON:
{
  "appropriate": true or false,
  "level": "too_easy" or "just_right" or "too_hard",
  "vocabularyScore": 0.0 to 1.0 (1.0 = perfect for age),
  "complexityScore": 0.0 to 1.0 (1.0 = ideal complexity),
  "feedback": "Brief explanation",
  "recommendedAgeRange": "X-Y"
}

EXAMPLES:

Good (just_right):
Riddle: "I'm yellow, I peel me to eat me, monkeys love me. What am I?"
Answer: "Banana"
→ appropriate: true, level: "just_right", vocabularyScore: 1.0, complexityScore: 0.9

Too Hard:
Riddle: "I'm invisible but you feel me, I can be gentle or powerful, I make trees sway."
Answer: "Wind"
→ appropriate: false, level: "too_hard", feedback: "Concept of 'invisible' is too abstract for 5-year-olds"

Too Easy:
Riddle: "I say meow and have whiskers. What am I?"
Answer: "Cat"
→ appropriate: false, level: "too_easy", feedback: "Answer is immediately obvious from first word"

Evaluate the riddle now:`;
};

module.exports = { buildDifficultyPrompt };
