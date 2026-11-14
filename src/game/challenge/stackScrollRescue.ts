export type StackTowerId = 'A' | 'B' | 'C'

export type StackScrollRescueMove = {
  from: StackTowerId
  to: StackTowerId
}

export type StackScrollRescueState = {
  roundIndex: number
  scrollCount: number
  moveBudget: number
  moveCount: number
  towers: Record<StackTowerId, number[]>
  invalidActions: number
  roundComplete: boolean
  failed: boolean
  completed: boolean
  feedback: { isError: boolean; message: string } | null
}

export const STACK_SCROLL_ROUNDS = [
  { scrollCount: 3, moveBudget: 9 },
  { scrollCount: 4, moveBudget: 19 },
  { scrollCount: 5, moveBudget: 39 },
] as const

function createRound(roundIndex: number, invalidActions = 0): StackScrollRescueState {
  const round = STACK_SCROLL_ROUNDS[roundIndex]
  const scrolls = Array.from({ length: round.scrollCount }, (_, index) => round.scrollCount - index)
  return {
    roundIndex,
    scrollCount: round.scrollCount,
    moveBudget: round.moveBudget,
    moveCount: 0,
    towers: { A: scrolls, B: [], C: [] },
    invalidActions,
    roundComplete: false,
    failed: false,
    completed: false,
    feedback: {
      isError: false,
      message: 'Move every scroll from tower A to tower C. Only the top scroll can move, and a larger scroll cannot sit on a smaller one.',
    },
  }
}

export function createStackScrollRescueState(): StackScrollRescueState {
  return createRound(0)
}

function reject(state: StackScrollRescueState, message: string, failed = false): StackScrollRescueState {
  return {
    ...state,
    invalidActions: state.invalidActions + 1,
    failed: state.failed || failed,
    feedback: { isError: true, message },
  }
}

/** Applies one legal Hanoi move. Towers are stored bottom-to-top. */
export function applyStackScrollRescueMove(
  state: StackScrollRescueState,
  move: StackScrollRescueMove,
): StackScrollRescueState {
  if (state.completed || state.roundComplete || state.failed) return state
  if (state.moveCount >= state.moveBudget) {
    return reject(state, 'Move budget exhausted. Retry this round to try again.', true)
  }
  if (move.from === move.to) {
    return reject(state, 'Choose two different towers for a move.')
  }
  const movingScroll = state.towers[move.from].at(-1)
  if (movingScroll === undefined) {
    return reject(state, 'That tower is empty. Choose a tower with a scroll on TOP.')
  }
  const targetTop = state.towers[move.to].at(-1)
  if (targetTop !== undefined && movingScroll > targetTop) {
    return reject(state, 'A larger scroll cannot be placed on a smaller scroll. Move the smaller top scroll first.')
  }

  const towers = {
    A: [...state.towers.A],
    B: [...state.towers.B],
    C: [...state.towers.C],
  }
  towers[move.from].pop()
  towers[move.to].push(movingScroll)
  const moveCount = state.moveCount + 1
  const roundComplete = towers.C.length === state.scrollCount
  const completed = roundComplete && state.roundIndex === STACK_SCROLL_ROUNDS.length - 1
  const failed = !roundComplete && moveCount >= state.moveBudget
  return {
    ...state,
    towers,
    moveCount,
    roundComplete,
    failed,
    completed,
    feedback: {
      isError: false,
      message: completed
        ? 'All three Scroll Rescue rounds are complete. The Stack Knowledge Scroll is ready.'
        : roundComplete
          ? 'Round cleared. Continue to the next Scroll Rescue tower.'
          : failed
            ? 'Move budget reached. Retry this round to try again.'
            : 'Move recorded. Only the exposed TOP scroll can move.',
    },
  }
}

export function advanceStackScrollRescueRound(state: StackScrollRescueState): StackScrollRescueState {
  if (!state.roundComplete || state.completed || state.roundIndex >= STACK_SCROLL_ROUNDS.length - 1) return state
  return createRound(state.roundIndex + 1, state.invalidActions)
}

export function retryStackScrollRescueRound(state: StackScrollRescueState): StackScrollRescueState {
  if (!state.failed) return state
  return createRound(state.roundIndex, state.invalidActions)
}
