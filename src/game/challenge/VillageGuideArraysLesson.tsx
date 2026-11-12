import { useState } from 'react'
import { challengeStore, useChallengeState } from './challengeStore'
import { playAchievementJingle, playGameOverJingle } from '../../audio/soundEffects'
import { getArraysCampaignStage, setArraysCampaignStage } from '../quests/arraysCampaignStages'
import './arrayChallenge.css'
import './arrayLesson.css'
import './villageGuideArraysLesson.css'

type LessonVisual =
  | 'array'
  | 'indices'
  | 'access'
  | 'update'
  | 'insert'
  | 'delete'
  | 'append'
  | 'recap'

type LessonPanel = {
  title: string
  body: string
  example: string
  visual: LessonVisual
}

const LESSON_PANELS: readonly LessonPanel[] = [
  {
    title: 'What is an array?',
    body: 'An array stores several related values under one name. Think of it as a row of boxes: every box holds one value, and the values stay in order.',
    example: 'marks = [10, 20, 30]. One array name stores three values in three boxes.',
    visual: 'array',
  },
  {
    title: 'Every box has an index',
    body: 'Each box has a numbered position called an index. Array indexing starts at 0, not 1. So the first value is at index 0, the second at index 1, and the third at index 2.',
    example: 'For marks = [10, 20, 30], the indexes are 0, 1 and 2. The last index is always one less than the array length.',
    visual: 'indices',
  },
  {
    title: 'Access a value by its index',
    body: 'To read one value, write the array name followed by the index inside square brackets. The index points directl¶»§q«^