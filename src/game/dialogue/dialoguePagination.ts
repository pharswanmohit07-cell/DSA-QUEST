export const MAX_DIALOGUE_PAGE_CHARACTERS = 90

/**
 * Splits a long NPC line into readable pages without losing its wording.
 * Whitespace is normalized once, then pages break only between words.
 */
export function paginateDialogueText(
  text: string,
  maxCharacters = MAX_DIALOGUE_PAGE_CHARACTERS,
): string[] {
  const normalized = text.trim().replace(/\s+/g, ' ')
  if (!normalized) return ['']

  const safeLimit = Number.isFinite(maxCharacters)
    ? Math.max(1, Math.floor(maxCharacters))
    : MAX_DIALOGUE_PAGE_CHARACTERS
  const words = normalized.split(' ')
  const pages: string[] = []
  let currentPage = ''

  for (const word of words) {
    const nextLength = currentPage.length + (currentPage ? 1 : 0) + word.length
    if (currentPage && nextLength > safeLimit) {
      pages.push(currentPage)
      currentPage = word
    } else {
      currentPage = currentPage ? `${currentPage} ${word}` : word
    }
  }

  if (currentPage) pages.push(currentPage)
  return pages
}
