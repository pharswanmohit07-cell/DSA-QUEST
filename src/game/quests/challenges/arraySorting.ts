import type { ChallengeCaseResult, ChallengeId } from '../questTypes'

/**
 * The Array Sorting Challenge.
 *
 * The player writes a JavaScript function and it is genuinely executed against
 * a set of hidden-ish inputs, rather than being string-matched against a known
 * answer. That means any correct solution passes, including one the game has
 * never seen, which is what a DSA exercise should reward.
 */

export type ChallengeOption = {
  id: string
  label: string
}

export type ChallengeDefinition = {
  id: ChallengeId
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  prompt: string
  /** Signature hint shown above the editor. */
  starterCode: string
  /** Instructions shown beside the editor. */
  instructions: string[]
  constraints: string[]
  /** Extra multiple-choice options offered alongside the code editor. */
  options: ChallengeOption[]
  /** The id of the correct multiple-choice option. */
  correctOptionId: string
  /**
   * Runs the player's function against the test cases.
   *
   * Receives the compiled function and returns one result per case. Throwing
   * anywhere in the user's code is caught and reported as a failure rather than
   * escaping into the render loop.
   */
  evaluate(solution: (...args: never[]) => unknown): ChallengeCaseResult[]
}

type SortCase = {
  label: string
  input: number[]
  expected: number[]
}

const SORT_CASES: SortCase[] = [
  { label: 'already sorted', input: [1, 2, 3, 4, 5], expected: [1, 2, 3, 4, 5] },
  { label: 'reverse order', input: [5, 4, 3, 2, 1], expected: [1, 2, 3, 4, 5] },
  { label: 'duplicates', input: [3, 1, 3, 2, 1], expected: [1, 1, 2, 3, 3] },
  { label: 'negatives', input: [-1, 5, -3, 0, 2], expected: [-3, -1, 0, 2, 5] },
  { label: 'single element', input: [7], expected: [7] },
  { label: 'empty', input: [], expected: [] },
]

const format = (value: unknown): string => {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export const ARRAY_SORTING_CHALLENGE: ChallengeDefinition = {
  id: 'array-sorting',
  title: 'Array Sorting',
  difficulty: 'Easy',
  prompt: [
    'Implement `sortArray(arr)` so that it returns the array sorted in ascending',
    'order, smallest to largest.',
    '',
    'You may use any sorting technique you like. Do not modify the original array.',
  ].join('\n'),
  starterCode: [
    '// Return a NEW array sorted in ascending order.',
    '// Do not modify the input.',
    'function sortArray(arr) {',
    '  // your solution here',
    '}',
  ].join('\n'),
  instructions: [
    'Return a new array containing the same numbers in ascending order.',
    'The original array must not be modified.',
    'An empty array and a single-element array are already sorted.',
  ],
  constraints: [
    'Negative numbers are allowed',
    'Duplicates are allowed',
    'Handles 0 to 1000 elements',
  ],
  options: [
    { id: 'a', label: 'Bubble sort' },
    { id: 'b', label: 'Merge sort' },
    { id: 'c', label: 'Quick sort' },
    { id: 'd', label: 'Counting sort' },
  ],
  correctOptionId: 'a',
  evaluate(solution) {
    return SORT_CASES.map((testCase) => {
      // Each case gets a fresh copy so a mutating solution cannot poison
      // later cases through a shared array.
      const input = [...testCase.input]
      try {
        const result = (solution as (value: number[]) => unknown)(input)
        const passed = Array.isArray(result) && JSON.stringify(result) === JSON.stringify(testCase.expected)
        return {
          label: testCase.label,
          passed,
          actual: format(result),
          expected: format(testCase.expected),
        }
      } catch (error) {
        return {
          label: testCase.label,
          passed: false,
          actual: `threw: ${error instanceof Error ? error.message : String(error)}`,
          expected: format(testCase.expected),
        }
      }
    })
  },
}

const CHALLENGES: Record<ChallengeId, ChallengeDefinition> = {
  'array-sorting': ARRAY_SORTING_CHALLENGE,
}

export function getChallenge(id: ChallengeId): ChallengeDefinition {
  return CHALLENGES[id]
}
