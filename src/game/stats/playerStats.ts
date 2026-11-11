import { getSeenArrayQuizQuestionIds } from '../challenge/challengeStore'
import { QuestManager, type QuestSave } from '../quests/QuestManager'
import { CAMPAIGN_TOPICS } from '../quests/campaignDefinitions'
import type {
  CampaignProgress,
  MasteryGrade,
  QuestId,
  QuestRecord,
  QuestStatus,
} from '../quests/questTypes'

const PROFILE_KEY = 'dsaq-player-profile-v1'
const PROFILE_VERSION = 1

/** One level requires exactly 100 cumulative XP. Level 1 starts at 0 XP. */
const XP_PER_LEVEL = 100

export type PlayerProfile = {
  version: 1
  name: string
  hasChosenName: boolean
  /** Reserved for future visual customization; currently always empty. */
  appearance: Record<string, never>
}

export type PlayerNameValidation =
  | { valid: true; normalizedName: string }
  | { valid: false; error: string }

export type SetPlayerNameResult =
  | { ok: true; profile: PlayerProfile }
  | { ok: false; error: string }

/**
 * The single name validator used when saving and when reading stored profiles.
 * Repeated whitespace collapses to one ordinary space before length/rule checks.
 */
export function validatePlayerName(value: string): PlayerNameValidation {
  const normalizedName = value.trim().replace(/\s+/g, ' ')
  if (!normalizedName) {
    return { valid: false, error: 'Enter a name for your hero.' }
  }
  if (normalizedName.length > 16) {
    return { valid: false, error: 'Name must be 16 characters or fewer.' }
  }
  if (!/^[A-Za-z0-9 _-]+$/.test(normalizedName)) {
    retur¶»§q«^