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
    explanati¶»§q«^