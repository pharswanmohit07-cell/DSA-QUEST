export type SamuraiScrollId = 'river' | 'mountain' | 'moon' | 'phoenix' | 'lotus' | 'ember' | 'frost'
export type SamuraiStackMode = 'guided' | 'practice' | 'final'

export type SamuraiStackAction =
  | { type: 'push'; scrollId: SamuraiScrollId }
  | { type: 'peek' }
  | { type: 'pop' }

export type SamuraiStackFeedback = {
  isError: boolean
  message: string
}

export type SamuraiStackProgress = {
  mode: SamuraiStackMode
  /** Stack order is bottom-to-top; only the final item is exposed as TOP. */
  stack: SamuraiScrollId[]
  guidedStepIndex: number
  invalidActions: number
  hintsUsed: number
  hasPeekedTarget: boolean
  completed: boolean
  feedback: SamuraiStackFeedback | null
}

export const SAMURAI_SCROLLS: readonly { id: SamuraiScrollId; label: string }[] = [
  { id: 'river', label: 'River Scroll' },
  { id: 'mountain', label: 'Mountain Scroll' },
  { id: 'moon', label: 'Moon Scroll' },
  { id: 'phoenix', label: 'Phoenix Scroll' },
  { id: 'lotus', label: 'Lotus Scroll' },
  { id: 'ember', label: 'Ember Scroll' },
  { id: 'frost', label: 'Frost Scroll' },
]

export const SAMURAI_GUIDED_STEPS: readonly { action: SamuraiStackAction; label: string }[] = [
  { action: { type: 'push', scrollId: 'river' }, label: 'Push the River Scroll onto the tower.' },
  { action: { type: 'push', scrollId: 'mountain' }, label: 'Push the Mountain Scroll above the River Scroll.' },
  { action: { type: 'peek' }, label: 'Peek at the top without removing the Mountain Scroll.' },
  { action: { type: 'pop' }, label: 'Pop the Mountain Scroll. The River Scroll is now on top.' },
  { action: { type: 'peek' }, label: 'Peek again. The River Scroll is now visible at TOP.' },
]

export const SAMURAI_FINAL_STACK: readonly SamuraiScrollId[] = ['phoenix', 'lotus', 'ember', 'frost']

export function createSamuraiStackProgress(): SamuraiStackProgress {
  return {
    mode: 'guided',
    stack: [],
    guidedStepIndex: 0,
    invalidActions: 0,
    hintsUsed: 0,
    hasPeekedTarget: false,
    completed: false,
    feedback: null,
  }
}

function sameAction(left: SamuraiStackAction, right: SamuraiStackAction): boolean {
  return left.type === right.type &&
    (left.type !== 'push' || right.type === 'push' && left.scrollId === right.scrollId)
}

function scrollLabel(id: SamuraiScrollId): string {
  return SAMURAI_SCROLLS.find((scroll) => scroll.id === id)?.label ?? 'Unknown Scroll'
}

function reject(state: SamuraiStackProgress, message: string): SamuraiStackProgress {
  return {
    ...state,
    invalidActions: state.invalidActions + 1,
    feedback: { isError: true, message },
  }
}

export function applySamuraiStackAction(
  state: SamuraiStackProgress,
  action: SamuraiStackAction,
): SamuraiStackProgress {
  if (state.completed) return state

  if (state.mode === 'guided') {
    const expected = SAMURAI_GUIDED_STEPS[state.guidedStepIndex]
    if (!expected) {
      return reject(state, 'The guided sequence is complete. Move into Practice Mode when you are ready.')
    }
    if (!sameAction(action, expected.action)) {
      return reject(state, `Not quite. ${expected.label}`)
    }

    let stack = [...state.stack]
    let message = ''
    if (action.type === 'push') {
      stack.push(action.scrollId)
      message = `Pushed ${scrollLabel(action.scrollId)}. The newest scroll is now at TOP.`
    } else if (action.type === 'peek') {
      const top = stack.at(-1)
      if (!top) return reject(state, 'There is no scroll to inspect. Push a scroll first.')
      message = `Peek sees ${scrollLabel(top)}. Peek reads TOP without removing it.`
    } else {
      const top = stack.pop()
      if (!top) return reject(state, 'The tower is empty. Pop would cause stack underflow.')
      message = `Popped ${scrollLabel(top)}. The scroll below it is now at TOP.`
    }

    const guidedStepIndex = state.guidedStepIndex + 1
    if (guidedStepIndex === SAMURAI_GUIDED_STEPS.length) {
      message += ' Guided sequence complete. Enter Practice Mode to experiment.'
    }
    return {
      ...state,
      stack,
      guidedStepIndex,
      feedback: { isError: false, message },
    }
  }

  if (state.mode === 'practice') {
    if (action.type === 'push') {
      return {
        ...state,
        stack: [...state.stack, action.scrollId],
        feedback: {
          isError: false,
          message: `Pushed ${scrollLabel(action.scrollId)}. It is now the newest scroll at TOP.`,
        },
      }
    }
    const top = state.stack.at(-1)
    if (!top) {
      return reject(state, action.type === 'pop'
        ? 'Stack underflow: you cannot pop from an empty tower.'
        : 'The tower is empty. Push a scroll before using Peek.')
    }
    if (action.type === 'peek') {
      return { ...state, feedback: { isError: false, message: `Peek sees ${scrollLabel(top)}. The tower is unchanged.` } }
    }
    return {
      ...state,
      stack: state.stack.slice(0, -1),
      feedback: { isError: false, message: `Popped ${scrollLabel(top)}. The scroll below it becomes TOP.` },
    }
  }

  // The final tower is fixed: the Lotus Scroll is buried under two blockers,
  // while the Phoenix Scroll at the bottom must remain in the tower.
  if (action.type === 'push') {
    return reject(state, 'The final tower is sealed. Recover the Lotus Scroll using Peek and Pop only.')
  }
  const top = state.stack.at(-1)
  if (!top) return reject(state, 'The tower is empty. The final scroll cannot be recovered.')

  if (action.type === 'peek') {
    return {
      ...state,
      hasPeekedTarget: top === 'lotus' || state.hasPeekedTarget,
      feedback: {
        isError: false,
        message: top === 'lotus'
          ? 'Peek confirms the Lotus Scroll is at TOP. It is safe to recover it now.'
          : `Peek sees ${scrollLabel(top)}. The Lotus Scroll is still below it. The tower is unchanged.`,
      },
    }
  }

  if (top === 'phoenix') {
    return reject(state, 'Keep the Phoenix Scroll at the bottom. The Lotus Scroll has already been recovered.')
  }
  if (top === 'lotus' && !state.hasPeekedTarget) {
    return reject(state, 'Peek at the Lotus Scroll first. Peek confirms TOP without removing the scroll.')
  }

  const stack = state.stack.slice(0, -1)
  if (top === 'lotus') {
    return {
      ...state,
      stack,
      completed: true,
      feedback: { isError: false, message: 'Lotus Scroll recovered! The Phoenix Scroll remains safe at the bottom. Stack mastered.' },
    }
  }
  return {
    ...state,
    stack,
    feedback: { isError: false, message: `Popped ${scrollLabel(top)}. The Lotus Scroll is still protected below. Check TOP again.` },
  }
}

export function enterSamuraiPractice(state: SamuraiStackProgress): SamuraiStackProgress {
  if (state.mode !== 'guided' || state.guidedStepIndex !== SAMURAI_GUIDED_STEPS.length) return state
  return {
    ...state,
    mode: 'practice',
    stack: [],
    hasPeekedTarget: false,
    feedback: { isError: false, message: 'Practice Mode: experiment with Push, Peek and Pop. The newest scroll always sits at TOP.' },
  }
}

export function beginSamuraiFinalTrial(state: SamuraiStackProgress): SamuraiStackProgress {
  if (state.mode !== 'practice') return state
  return {
    ...state,
    mode: 'final',
    stack: [...SAMURAI_FINAL_STACK],
    hasPeekedTarget: false,
    completed: false,
    feedback: { isError: false, message: 'Final Trial: recover the Lotus Scroll. Remove only the top scroll, Peek when Lotus reaches TOP, then Pop it. Leave Phoenix at the bottom.' },
  }
}

export function applySamuraiStackHint(state: SamuraiStackProgress): SamuraiStackProgress {
  if (state.completed) return state
  const message = state.mode === 'final'
    ? 'Hint: Pop the Frost and Ember blockers. When Lotus reaches TOP, Peek to confirm it before you Pop it.'
    : 'Hint: Push adds to TOP, Peek reads TOP without changing the tower, and Pop removes only TOP.'
  return {
    ...state,
    hintsUsed: state.hintsUsed + 1,
    feedback: { isError: false, message },
  }
}
