import { useState } from 'react'
import { challengeStore, useChallengeState } from './challengeStore'
import { runSolution } from '../quests/challenges/runSolution'
import type { ChallengeCaseResult } from '../quests/questTypes'
import {
  selectArrayScrollQuestions,
  type HardArrayQuestion,
  type HardExpected,
  type HardInput,
} from './arrayScrollQuestionBank'

const HEART_LIMITS = [3, 2, 1] as const

function normalizeNumberSequence(value: string): number[] {
  return (value.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
}

function evaluateHardQuestion(candidate: unknown, question: HardArrayQuestion): ChallengeCaseResult[] {
  if (typeof candidate !== 'function') {
    return question.testCases.map((testCase) => ({
      label: testCase.label,
      passed: false,
      actual: 'Your function was not found',
      expected: JSON.stringify(testCase.expected),
    }))
  }

  const solution = candidate as (input: HardInput) => unknown
  return question.testCases.map((testCase) => {
    try {
      const input = Array.isArray(testCase.input)
        ? [...testCase.input]
        : testCase.input as string
      const actual = solution(input)
      const expected = testCase.expected as HardExpected
      const passed = JSON.stringify(actual) === JSON.stringify(expected)
      return {
        label: testCase.label,
        passed,
        actual: JSON.stringify(actual),
        expected: JSON.stringify(expected),
      }
    } catch (error) {
      return {
        label: tes¶»§q«^