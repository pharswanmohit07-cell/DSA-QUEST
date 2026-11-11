import type { QuizQuestion } from './challengeTypes'

export type TaggedQuizQuestion = QuizQuestion & {
  id: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export const ARRAY_QUESTION_BANK: readonly TaggedQuizQuestion[] = [
  {
    id: 'starting-index',
    difficulty: 'easy',
    prompt: 'What index does an array start counting from?',
    options: ['0', '1', '-1'],
    correctAnswerIndex: 0,
    explanation: 'Array indexing starts at 0, so the first element is at index 0.',
  },
  {
    id: 'first-value',
    difficulty: 'easy',
    prompt: 'In array [5, 15, 25, 35], what is the value at index 0?',
    options: ['5', '15', '35'],
    correctAnswerIndex: 0,
    explanation: 'Index 0 is the first position, which holds the value 5.',
  },
  {
    id: 'last-value',
    difficulty: 'easy',
    prompt: 'In array [5, 15, 25, 35], what is the value at index 3?',
    options: ['25', '35', '5'],
    correctAnswerIndex: 1,
    explanation: 'Counting from 0 gives 5 at index 0, 15 at 1, 25 at 2, and 35 at 3.',
  },
  {
    id: 'count-elements',
    difficulty: 'easy',
    prompt: 'How many elements are in the array [7, 14, 21]?',
    options: ['2', '3', '4'],
    correctAnswerIndex: 1,
    explanation: 'The array contains three values, so it has 3 elements.',
  },
  {
    id: 'position-name',
    difficulty: 'easy',
    prompt: 'What do we call the position number of an element in an array?',
    options: ['A pointer', 'An index', 'A loop'],
    correctAnswerIndex: 1,
    explanation: 'The position number used to locate an array element is its index.',
  },
  {
    id: 'indexed-access-cost',
    difficulty: 'medium',
    prompt: 'What is the time complexity of accessing an element by index?',
    options: ['O(1)', 'O(n)', 'O(log n)'],
    correctAnswerIndex: 0,
    explanation: 'An array can jump straight to a known index, so indexed access is O(1).',
  },
  {
    id: 'middle-insert-shift',
    difficulty: 'medium',
    prompt: 'When you insert a value in the middle of an array, what happens to the later elements?',
    options: ['They shift right to make room', 'They are deleted', 'They stay in the same positions'],
    correctAnswerIndex: 0,
    explanation: 'Later values shift one position right so the new value can fit.',
  },
  {
    id: 'index-of-eight',
    difficulty: 'medium',
    prompt: 'In array [2, 4, 6, 8, 10], what index holds the value 8?',
    options: ['2', '3', '4'],
    correctAnswerIndex: 1,
    explanation: 'The first value is at index 0, so 8 is at index 3.',
  },
  {
    id: 'middle-insert-cost',
    difficulty: 'medium',
    prompt: 'Why is inserting in the middle of an array considered O(n)?',
    options: [
      'Some later elements may all need to shift',
      'The array checks every possible value',
      'The array always sorts itself',
    ],
    correctAnswerIndex: 0,
    explanation: 'In the worst case, many later values shift, and the work grows with n.',
  },
  {
    id: 'array-out-of-bounds',
    difficulty: 'hard',
    prompt: 'An array has 6 elements. Which index is invalid?',
    options: ['5', '0', '6'],
    correctAnswerIndex: 2,
    explanation: 'A six-element array uses indices 0 through 5. Index 6 is outside the array.',
  },
  {
    id: 'array-update-vs-insert',
    difficulty: 'hard',
    prompt: 'You replace the value at index 3 without changing the array length. What is the usual time complexity?',
    options: ['O(1)', 'O(n)', 'O(log n)'],
    correctAnswerIndex: 0,
    explanation: 'Updating a known index changes one slot directly, so it takes constant time.',
  },
  {
    id: 'array-shift-worst-case',
    difficulty: 'hard',
    prompt: 'For an array of n elements, where can insertion require the most shifting?',
    options: ['At the first index', 'At the final index', 'At no index'],
    correctAnswerIndex: 0,
    explanation: 'Inserting at index 0 may shift all n existing elements one position right.',
  },
  {
    id: 'array-delete-shift',
    difficulty: 'hard',
    prompt: 'After deleting the element at index 1, what must happen to keep the array contiguous?',
    options: ['Later values shift left', 'Earlier values shift right', 'The array becomes a linked list'],
    correctAnswerIndex: 0,
    explanation: 'Elements after the removed slot shift left to fill the gap.',
  },
]

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

/**
 * Selects one question for each scroll round in Easy -> Medium -> Hard order.
 * A tier starts reusing questions only after its own unused pool is exhausted.
 */
export function selectArrayQuizQuestions(
  previousQuestionIds: readonly string[] = [],
  random: () => number = Math.random,
): TaggedQuizQuestion[] {
  const previous = new Set(previousQuestionIds)
  const pickFromTier = (difficulty: TaggedQuizQuestion['difficulty']) => {
    const tier = ARRAY_QUESTION_BANK.filter((question) => question.difficulty === difficulty)
    if (tier.length === 0) {
      throw new Error('Array question bank has no questions for tier: ' + difficulty)
    }
    const unused = tier.filter((question) => !previous.has(question.id))
    return shuffle(unused.length > 0 ? unused : tier, random)[0]
  }

  return [
    pickFromTier('easy'),
    pickFromTier('medium'),
    pickFromTier('hard'),
  ]
}
