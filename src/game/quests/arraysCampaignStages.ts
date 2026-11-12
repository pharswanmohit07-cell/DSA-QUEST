export type ArraysCampaignStage = 'learn' | 'practice' | 'implement' | 'complete'

export const ARRAYS_CAMPAIGN_STAGE_EVENT = 'dsaq:arrays-campaign-stage-changed'
const ARRAYS_CAMPAIGN_STAGE_KEY = 'dsaq-arrays-campaign-stage-v1'
const ARRAYS_SCROLL_ACK_KEY = 'dsaq-arrays-scroll-guide-ack-v1'

let memoryStage: ArraysCampaignStage = 'learn'

function isArraysCampaignStage(value: unknown): value is ArraysCampaignStage {
  return value === 'learn' || value === 'practice' || value === 'implement' || value === 'complete'
}

/** Reads the Guide's independently persisted stage without changing V3 save data. */
export function getArraysCampaignStage(): ArraysCampaignStage {
  if (typeof window === 'undefined') return memoryStage
  try {
    const stored = window.localStorage.getItem(ARRAYS_CAMPAIGN_STAGE_KEY)
    if (isArraysCampaignStage(stored)) {
      memoryStage = stored
      return stored
    }
  } catch {
    // The current session can continue from the in-memory stage if storage is unavailable.
  }
  return memoryStage
}

/** Persists a Guide stage and notifies the quest tracker. */
export function setArraysCampaignStage(stage: ArraysCampaignStage): void {
  memoryStage = stage
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ARRAYS_CAMPAIGN_STAGE_KEY, stage)
    } catch {
      // Preserve the stage for the active session even when storage is unavailable.
    }
    window.dispatchEvent(new Event(ARRAYS_CAMPAIGN_STAGE_EVENT))
  }
}

/** Wheth¶»§q«^