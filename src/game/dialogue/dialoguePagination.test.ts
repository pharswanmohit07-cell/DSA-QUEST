import { describe, expect, it } from 'vitest'
import { paginateDialogueText, MAX_DIALOGUE_PAGE_CHARACTERS } from './dialoguePagination'

describe('NPC dialogue pagination', () => {
  it('keeps short dialogue on one page', () => {
    expect(paginateDialogueText('The gate is open.')).toEqual(['The gate is open.'])
  })

  it('splits long dialogue at word boundaries without losing or reordering text', () => {
    const source = Array.from({ length: 28 }, (_, index) => `Sentence${index + 1} explains the next part of the village story.`).join(' ')
    const pages = paginateDialogueText(source)

    expect(pages.length).toBeGreaterThan(1)
    expect(pages.every((page) => page.length <= MAX_DIALOGUE_PAGE_CHARACTERS)).toBe(true)
    expect(pages.join(' ')).toBe(source)
  })

  it('keeps an unusually long single word intact rather than dropping characters', () => {
    const source = `Start ${'x'.repeat(MAX_DIALOGUE_PAGE_CHARACTERS + 12)} finish`
    const pages = paginateDialogueText(source)

    expect(pages.join(' ')).toBe(source)
  })
})
