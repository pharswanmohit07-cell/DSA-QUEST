import { readStoredSession } from '../multiplayer/auth'
import { getMultiplayerConfig } from '../multiplayer/realtime'
import { useSyncExternalStore } from 'react'
import { CAMPAIGN_TOPICS, createInitialCampaignProgress } from './campaignDefinitions'
import { calculateFinalMasteryGrade } from './masteryGrading'
import {
  isCampaignSaveV2,
  migrateCampaignSave,
  normalizeCampaignSaveV3,
} from './saveMigration'
import type {
  CampaignProgress,
  CampaignSave,
  CampaignSaveV2,
  CampaignSaveV3Input,
  CampaignSnapshot,
  CampaignTopicId,
  ChallengeId,
  ChallengeResult,
  MasteryGrade,
  OpeningStoryStatus,
  PlayerPosition,
  QuestId,
  QuestRecord,
  QuestViewState,
  SideQuestCompletionResult,
  SideQuestStartResult,
  SideQuestVisitResult,
  TopicCompletionResult,
} from './questTypes'
import {
  createDefaultNorthernSnowfieldScoutingProgress,
  createDefaultVillageTrainingRouteProgress,
} from './questTypes'
import { isVillageTrainingRouteEligible } from './villageTrainingRouteRouting'
import { clearElderPrologueStage } from './elderLearningStages'
import { clearKnowledgeScrolls } from './knowledgeScrolls'
import { clearArraysCampaignStage } from './arraysCampaignStages'

/**
 * Central quest state manager.
 *
 * The manager is the single owner of quest progress. It is deliberately
 * framework-free and transport-agnostic: the Phaser scene starts and completes
 * quests, the React overlays subscribe for display, and nothing else mutates
 * state. Transitions are vali¶»§q«^