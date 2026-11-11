import { useState } from 'react'
import { challengeStore, useChallengeState } from './challengeStore'
import './arrayLesson.css'

/** A guided, beginner-first introduction to the array ideas used in practice. */
type Panel = {
  id: string
  title: string
  body: string
  example: string
  visual: 'array' | 'indices' | 'highlight' | 'insertion' | 'recap'
}

const LESSON_PANELS: readonly Panel[] = [
  {
    id: 'definition',
    title: 'What is an array?',
    body: 'An array is one variable that can store many related values. Imagine a row of boxes: every box holds one value, and the boxes stay in order.',
    example: 'Think of an array as a row of numbered boxes. One name, many values: marks = [10, 20, 30, 40, 50].',
    visual: 'array',
  },
  {
    id: 'indexing',
    title: 'Every box has a position',
    body: 'Each box has a position number called an index. In most programming languages, counting starts at 0. The first box is 0, the next is 1, and the next is 2.',
    example: 'For marks = [10, 20, 30, 40, 50], the first value is at index 0 and the second value is at index 1.',
    visual: 'indices',
  },
  {
    id: 'zero-based',
    title: 'How do I read a value?',
    body: 'To get a value, write the array name and the index in square brackets. Remember that index 2 points to the third box because counting began at 0.',
    example: 'marks[0] gives 10. marks[2] gives 30. With five values, the valid indices are 0, 1, 2, 3 and 4.',
    visual: 'highlight',
  },
  {
  ¶»§q«^