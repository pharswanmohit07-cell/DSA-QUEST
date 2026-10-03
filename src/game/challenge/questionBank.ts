import type { QuizQuestion } from './challengeTypes'

export type TaggedQuizQuestion = QuizQuestion & {
  id: string
  difficulty: 'easy' | 'medium'
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
]

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

/** Selects two easy and one medium question, avoiding the previous attempt. */
export function selectArrayQuizQuestions(
  previousQuestionIds: readonly string[] = [],
  random: () => number = Math.random,
): TaggedQuizQuestion[] {
  const previous = new Set(previousQuestionIds)
  const easy = shuffle(
    ARRAY_QUESTION_BANK.filter((question) => question.difficulty === 'easy' && !previous.has(question.id)),
    random,
  )
  const medium = shuffle(
    ARRAY_QUESTION_BANK.filter((question) => question.difficulty === 'medium' && !previous.has(question.id)),
    random,
  )

  if (easy.length < 2 || medium.length < 1) {
    throw new Error('Array question bank needs at least two unused easy and one unused medium question')
  }

  return shuffle([easy[0], easy[1], medium[0]], random)
}
