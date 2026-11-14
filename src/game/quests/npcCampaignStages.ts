export type NpcCampaignStage = 'learn' | 'practice' | 'implement' | 'complete'
export type NpcCampaignStageTopic = 'stack-operations' | 'queues'

export const NPC_CAMPAIGN_STAGE_EVENT = 'dsaq:npc-campaign-stage-changed'
export const NPC_CAMPAIGN_STAGES_STORAGE_KEY = 'dsaq-npc-campaign-stages-v1'

type StageMap = Record<NpcCampaignStageTopic, NpcCampaignStage>

const DEFAULT_STAGES: StageMap = {
  'stack-operations': 'learn',
  queues: 'learn',
}

let memoryStages: StageMap = { ...DEFAULT_STAGES }

function isStage(value: unknown): value is NpcCampaignStage {
  return value === 'learn' || value === 'practice' || value === 'implement' || value === 'complete'
}

function readStages(): StageMap {
  if (typeof window === 'undefined') return { ...memoryStages }
  try {
    const raw = window.localStorage.getItem(NPC_CAMPAIGN_STAGES_STORAGE_KEY)
    if (raw === null) return { ...memoryStages }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...memoryStages }
    const record = parsed as Record<string, unknown>
    memoryStages = {
      'stack-operations': isStage(record['stack-operations'])
        ? record['stack-operations']
        : memoryStages['stack-operations'],
      queues: isStage(record.queues) ? record.queues : memoryStages.queues,
    }
  } catch {
    // Keep the current session's truthful stage when browser storage is unavailable.
  }
  return { ...memoryStages }
}

function notifyStageChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(NPC_CAMPAIGN_STAGE_EVENT))
  }
}

export function getNpcCampaignStage(topic: NpcCampaignStageTopic): NpcCampaignStage {
  return readStages()[topic]
}

/** Stage display only; QuestManager remains the authority for topic mastery. */
export function setNpcCampaignStage(topic: NpcCampaignStageTopic, stage: NpcCampaignStage): void {
  memoryStages = { ...readStages(), [topic]: stage }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(NPC_CAMPAIGN_STAGES_STORAGE_KEY, JSON.stringify(memoryStages))
    } catch {
      // Preserve the current session stage if storage is unavailable.
    }
  }
  notifyStageChange()
}

/** Clears only Stack/Queue display stages for a new campaign. Scrolls are untouched. */
export function clearNpcCampaignStages(): void {
  memoryStages = { ...DEFAULT_STAGES }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(NPC_CAMPAIGN_STAGES_STORAGE_KEY)
    } catch {
      // Memory still resets for the active session.
    }
  }
  notifyStageChange()
}
