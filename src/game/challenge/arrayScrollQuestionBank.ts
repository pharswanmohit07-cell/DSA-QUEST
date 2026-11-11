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
    options: ['[3, 7, 11]', '[1, 1, 1]', '[2, 4, 6, 1, 3, 5]', '[3, 4, 6]'¶»§q«^