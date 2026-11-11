export type ArrayDisplay = {
  label: string
  values: readonly number[]
}

export type EasyArrayQuestion = {
  id: string
  prompt: string
  arrays: readonly ArrayDisplay[]
  instruction: string
  options: readonly string[]
  correctAnswerIndex: number
  explanation: string
}

export type MediumArrayQuestion = {
  id: string
  prompt: string
  arrays: readonly ArrayDisplay[]
  hint: string
  expected: readonly number[]
  explanation: string
}

export type HardInput = readonly number[] | string
export type HardExpected = number | boolean | readonly number[]

export type HardTestCase = {
  label: string
  input: HardInput
  expected: HardExpected
}

export type HardArrayQuestion = {
  id: string
  prompt: string
  examples: readonly string[]
  hint: string
  functionName: 'isPalindrome' | 'countEven' | 'findLargest' | 'reverseArray'
  starterCode: string
  testCases: readonly HardTestCase[]
}

export type ArrayScrollQuestionSet = {
  easy: EasyArrayQuestion
  medium: MediumArrayQuestion
  hard: HardArrayQuestion
}

export const EASY_ARRAY_QUESTIONS: readonly EasyArrayQuestion[] = [
  {
    id: 'easy-add-pairs',
    prompt: 'Add the values in Array A and Array B at matching positions. Which array do you get?',
    arrays: [
      { label: 'Array A', values: [2, 4, 6] },
      { label: 'Array B', values: [1, 3, 5] },
    ],
    instruction: 'Add the first pair, then the second pair, then the third pair.',
    options: ['[3, 7, 11]', '[1, 1, 1]', '[2, 4, 6, 1, 3, 5]', '[3, 4, 6]'],
    correctAnswerIndex: 0,
    explanation: 'Add matching positions: 2 + 1 = 3, 4 + 3 = 7, and 6 + 5 = 11.',
  },
  {
    id: 'easy-find-index',
    prompt: 'In which index can you find the value 12?',
    arrays: [{ label: 'Array', values: [4, 12, 9, 6] }],
    instruction: 'Remember that array positions start counting from index 0.',
    options: ['Index 0', 'Index 1', 'Index 2', 'Index 3'],
    correctAnswerIndex: 1,
    explanation: 'The first value is at index 0, so 12 is at index 1.',
  },
  {
    id: 'easy-array-total',
    prompt: 'What is the total when you add every value in this array?',
    arrays: [{ label: 'Array', values: [3, 5, 2, 4] }],
    instruction: 'Add the four values together.',
    options: ['12', '13', '14', '15'],
    correctAnswerIndex: 2,
    explanation: '3 + 5 + 2 + 4 = 14.',
  },
  {
    id: 'easy-count-even',
    prompt: 'How many even numbers are present in this array?',
    arrays: [{ label: 'Array', values: [3, 8, 5, 10, 7, 12] }],
    instruction: 'Even numbers can be divided by 2 with no remainder.',
    options: ['2', '3', '4', '5'],
    correctAnswerIndex: 1,
    explanation: '8, 10, and 12 are even, so the answer is 3.',
  },
  {
    id: 'easy-largest',
    prompt: 'Which is the largest value in this array?',
    arrays: [{ label: 'Array', values: [14, 6, 21, 9, 17] }],
    instruction: 'Compare the values one by one.',
    options: ['14', '17', '21', '9'],
    correctAnswerIndex: 2,
    explanation: '21 is greater than every other value in the array.',
  },
]

export const MEDIUM_ARRAY_QUESTIONS: readonly MediumArrayQuestion[] = [
  {
    id: 'medium-subtract-arrays',
    prompt: 'Subtract Array B from Array A at matching positions. Type the resulting array.',
    arrays: [
      { label: 'Array A', values: [9, 7, 5] },
      { label: 'Array B', values: [4, 3, 2] },
    ],
    hint: 'Work from left to right: subtract the first pair, second pair, and third pair.',
    expected: [5, 4, 3],
    explanation: '9 − 4 = 5, 7 − 3 = 4, and 5 − 2 = 3.',
  },
  {
    id: 'medium-insert-middle',
    prompt: 'Insert 15 at index 1. Keep all the existing values and type the new array.',
    arrays: [{ label: 'Starting array', values: [10, 20, 30] }],
    hint: 'The new value goes after 10. The old values 20 and 30 move one position to the right.',
    expected: [10, 15, 20, 30],
    explanation: 'Inserting at index 1 makes room for 15 without deleting 20 or 30.',
  },
  {
    id: 'medium-delete-index',
    prompt: 'Delete the value at index 2. Type the array that remains.',
    arrays: [{ label: 'Starting array', values: [5, 10, 15, 20] }],
    hint: 'Index 0 is 5, index 1 is 10, and index 2 is 15. Remove only that value.',
    expected: [5, 10, 20],
    explanation: 'The value 15 is removed and the later value 20 shifts left.',
  },
  {
    id: 'medium-reverse-array',
    prompt: 'Reverse the order of the values. Type the new array.',
    arrays: [{ label: 'Starting array', values: [3, 6, 9, 12] }],
    hint: 'Start with the last value and work backwards.',
    expected: [12, 9, 6, 3],
    explanation: 'Reversing the array puts the last value first and the first value last.',
  },
  {
    id: 'medium-count-even',
    prompt: 'How many even values are in this array? Type the count.',
    arrays: [{ label: 'Array', values: [2, 5, 8, 11, 14, 17] }],
    hint: 'Check which values divide evenly by 2.',
    expected: [3],
    explanation: '2, 8, and 14 are even, so the count is 3.',
  },
]

export const HARD_ARRAY_QUESTIONS: readonly HardArrayQuestion[] = [
  {
    id: 'hard-palindrome',
    prompt: 'Write isPalindrome(word). Return true when the word reads the same forward and backward, and false when it does not.',
    examples: ['Same both ways: madam, level, noon', 'Not the same: array, hello'],
    hint: 'Compare the first and last letters. If they match, move one step toward the middle and compare again.',
    functionName: 'isPalindrome',
    starterCode: `function isPalindrome(word) {
  // Compare the first and last letters.
  // Move toward the middle after each matching pair.
  // Return false if a pair is different; otherwise return true.
}`,
    testCases: [
      { label: 'madam is a palindrome', input: 'madam', expected: true },
      { label: 'level is a palindrome', input: 'level', expected: true },
      { label: 'array is not a palindrome', input: 'array', expected: false },
      { label: 'hello is not a palindrome', input: 'hello', expected: false },
    ],
  },
  {
    id: 'hard-count-even',
    prompt: 'Write countEven(numbers). Return how many values in the array are divisible by 2.',
    examples: ['[2, 5, 8, 11] → 2', '[3, 7, 9] → 0'],
    hint: 'Visit each value once. If the remainder after division by 2 is 0, increase the count.',
    functionName: 'countEven',
    starterCode: `function countEven(numbers) {
  let count = 0;

  // Visit each value and count the even ones.

  return count;
}`,
    testCases: [
      { label: 'two even values', input: [2, 5, 8, 11], expected: 2 },
      { label: 'no even values', input: [3, 7, 9], expected: 0 },
      { label: 'all values are even', input: [4, 6, 10], expected: 3 },
      { label: 'empty array', input: [], expected: 0 },
    ],
  },
  {
    id: 'hard-find-largest',
    prompt: 'Write findLargest(numbers). Return the largest number in the array.',
    examples: ['[4, 9, 2, 7] → 9', '[-8, -3, -11] → -3'],
    hint: 'Start by treating the first value as the largest. Compare every later value and update it when you find a bigger one.',
    functionName: 'findLargest',
    starterCode: `function findLargest(numbers) {
  let largest = numbers[0];

  // Compare the remaining values with largest.

  return largest;
}`,
    testCases: [
      { label: 'mixed values', input: [4, 9, 2, 7], expected: 9 },
      { label: 'negative values', input: [-8, -3, -11], expected: -3 },
      { label: 'single value', input: [11], expected: 11 },
      { label: 'zero and negative values', input: [0, -4, -2], expected: 0 },
    ],
  },
  {
    id: 'hard-reverse-array',
    prompt: 'Write reverseArray(numbers). Return a new array with the values in reverse order.',
    examples: ['[2, 4, 6] → [6, 4, 2]', '[5, 9] → [9, 5]'],
    hint: 'Start from the last index and move toward index 0, adding each value to a new array.',
    functionName: 'reverseArray',
    starterCode: `function reverseArray(numbers) {
  const reversed = [];

  // Visit the original array from the last index to 0.

  return reversed;
}`,
    testCases: [
      { label: 'three values', input: [2, 4, 6], expected: [6, 4, 2] },
      { label: 'two values', input: [5, 9], expected: [9, 5] },
      { label: 'single value', input: [7], expected: [7] },
      { label: 'empty array', input: [], expected: [] },
    ],
  },
]

let lastEasyId: string | null = null
let lastMediumId: string | null = null
let lastHardId: string | null = null

function chooseQuestion<T extends { id: string }>(
  questions: readonly T[],
  previousId: string | null,
  random: () => number,
): T {
  const available = questions.length > 1 && previousId
    ? questions.filter((question) => question.id !== previousId)
    : questions
  const sample = Math.min(0.999999, Math.max(0, random()))
  return available[Math.floor(sample * available.length)]
}

/** Pick a fresh, randomized question for each difficulty tier. */
export function selectArrayScrollQuestions(random: () => number = Math.random): ArrayScrollQuestionSet {
  const easy = chooseQuestion(EASY_ARRAY_QUESTIONS, lastEasyId, random)
  const medium = chooseQuestion(MEDIUM_ARRAY_QUESTIONS, lastMediumId, random)
  const hard = chooseQuestion(HARD_ARRAY_QUESTIONS, lastHardId, random)
  lastEasyId = easy.id
  lastMediumId = medium.id
  lastHardId = hard.id
  return { easy, medium, hard }
}

export function resetArrayScrollQuestionHistory(): void {
  lastEasyId = null
  lastMediumId = null
  lastHardId = null
}
