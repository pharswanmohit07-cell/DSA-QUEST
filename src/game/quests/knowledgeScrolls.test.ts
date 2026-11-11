import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  claimKnowledgeScroll,
  clearKnowledgeScrolls,
  getKnowledgeScrolls,
  hasKnowledgeScroll,
} from './knowledgeScrolls'

describe('Knowledge Scroll collectibles', () => {
  beforeEach(() => {
    clearKnowledgeScrolls()
    localStorage.clear()
  })

  it('persists the first scroll and makes duplicate claims idempotent', () => {
    expect(claimKnowledgeScroll('arrays')).toBe(true)
    expect(claimKnowledgeScroll('arrays')).toBe(false)
    expect(hasKnowledgeScroll('arrays')).toBe(true)
    expect(getKnowledgeScrolls()).toEqual(['arrays'])
  })

  it('keeps different scrolls independent', () => {
    claimKnowledgeScroll('arrays')
    claimKnowledgeScroll('queues')
    expect(getKnowledgeScrolls()).toEqual(['arrays', 'queues'])
    expect(hasKnowledgeScroll('stack-operations')).toBe(false)
  })

  it('supports clearing collectibles for a new campaign', () => {
    claimKnowledgeScroll('arrays')
    expect(clearKnowledgeScrolls()).toBe(true)
    expect(getKnowledgeScrolls()).toEqual([])
  })

  it('grants rewards in the current session if storage is blocked', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled')
    })
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage disabled')
    })
    try {
      expect(claimKnowledgeScroll('arrays')).toBe(true)
      expect(hasKnowledgeScroll('arrays')).toBe(true)
    } finally {
      setItem.mockRestore()
      getItem.mockRestore()
    }
  })
})
