import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QuestManager } from './QuestManager'
import { QuestTracker } from './QuestTracker'
import { isInsideNorthernSnowfieldTrigger } from './northernSnowfieldTrigger'
import { migrateCampaignSave } from './saveMigration'
import type { CampaignSave, LegacyQuestSave } from './questTypes'
import { setArraysCampaignStage } from './arraysCampaignStages'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const SAVE_KEY = 'dsa-quest-save-v3'
const legacySave: LegacyQuestSave = {
  version: 1,
  savedAt: 123,
  quests: {
    'speak-with-elder': 'completed',
    'array-sorting-challenge': 'completed',
  },
  xp: 137.5,
  position: { x: 282.25, y: 408.75 },
}

let host: HTMLDivElement | undefined
let root: Root | undefined

function seedCanonicalSave(): CampaignSave {
  const save = migrateCampaignSave(legacySave)
  if (!save) throw new Error('Expected a valid V3 fixture')
  QuestManager.restore(save)
  if (!QuestManager.save()) throw new Error('Expected fixture save to persist')
  return QuestManager.getSave()!
}

function loadPersistedSave(): CampaignSave {
  QuestManager.reset()
  const save = QuestManager.getSave()
  if (!save) throw new Error('Expected a persisted V3 save')
  QuestManager.restore(save)
  return save
}

function render(node: ReactNode): HTMLDivElement {
  host = document.createE¶»§q«^