/**
 * Small, versioned collectible store for the seven campaign Knowledge Scrolls.
 * It survives ordinary saves and safely falls back to this page session when
 * browser storage is unavailable.
 */
export const KNOWLEDGE_SCROLL_IDS = [
  'arrays',
  'stack-operations',
  'queues',
  'linked-lists',
  'searching',
  'sorting',
  'trees',
] as const

export type KnowledgeScrollId = (typeof KNOWLEDGE_SCROLL_IDS)[number]
const STORAGE_KEY = 'dsa-quest-knowledge-scrolls-v1'
let sessionScrolls: KnowledgeScrollId[] = []

function isScrollId(value: unknown): value is KnowledgeScrollId {
  return typeof value === 'string' &&
    (KNOWLEDGE_SCROLL_IDS as readonly string[]).includes(value)
}

function readScrolls(): KnowledgeScrollId[] {
  try {
    if (typeof window === 'undefined') return [...sessionScrolls]
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return [...sessionScrolls]
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...sessionScrolls]
    const stored = [...new Set(parsed.filter(isScrollId))]
    sessionScrolls = stored
    return [...stored]
  } catch {
    return [...sessionScrolls]
  }
}

export function getKnowledgeScrolls(): readonly KnowledgeScrollId[] {
  return readScrolls()
}

export function hasKnowledgeScroll(id: KnowledgeScrollId): boolean {
  return readScrolls().includes(id)
}

/** Claims a scroll once; repeated rewards never duplicate the collectible. */
export function claimKnowledgeScroll(id: KnowledgeScrollId): boolean {
  const current = readScrolls()
  if (current.includes(id)) return false
  const next = [...current, id]
  sessionScrolls = next
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      const saved = window.localStorage.getItem(STORAGE_KEY)
      void saved // Read-back is best-effort; the session fallback still owns the reward.
    }
  } catch {
    // Session fallback still grants this earned reward.
  }
  return true
}

export function clearKnowledgeScrolls(): boolean {
  sessionScrolls = []
  try {
    if (typeof window === 'undefined') return true
    window.localStorage.removeItem(STORAGE_KEY)
    return window.localStorage.getItem(STORAGE_KEY) === null
  } catch {
    return true
  }
}
