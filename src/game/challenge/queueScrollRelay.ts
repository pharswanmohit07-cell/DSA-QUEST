export const QUEUE_SCROLL_RELAY_CAPACITY = 5
export const QUEUE_SCROLL_RELAY_ARRIVALS = [12, 24, 36, 48, 60, 72, 84] as const
export const QUEUE_SCROLL_RELAY_OVERFLOW_VALUE = 96

export type QueueScrollRelayAction =
  | { type: 'enqueue-next' }
  | { type: 'dequeue-front' }
  | { type: 'inspect-front' }
  | { type: 'inspect-rear' }
  | { type: 'probe-overflow' }
  | { type: 'probe-underflow' }

export type QueueScrollRelayState = {
  slots: Array<number | null>
  frontIndex: number
  size: number
  nextArrivalIndex: number
  deliveredValues: number[]
  overflowConfirmed: boolean
  frontInspected: boolean
  rearInspected: boolean
  underflowConfirmed: boolean
  invalidActions: number
  completed: boolean
  feedback: { isError: boolean; message: string } | null
}

export function createQueueScrollRelayState(): QueueScrollRelayState {
  return {
    slots: Array.from({ length: QUEUE_SCROLL_RELAY_CAPACITY }, () => null),
    frontIndex: 0,
    size: 0,
    nextArrivalIndex: 0,
    deliveredValues: [],
    overflowConfirmed: false,
    frontInspected: false,
    rearInspected: false,
    underflowConfirmed: false,
    invalidActions: 0,
    completed: false,
    feedback: {
      isError: false,
      message: 'Load the first four arrivals, dispatch two from FRONT, then load the final three to wrap around the five-slot ring.',
    },
  }
}

function reject(state: QueueScrollRelayState, message: string): QueueScrollRelayState {
  return {
    ...state,
    invalidActions: state.invalidActions + 1,
    feedback: { isError: true, message },
  }
}

function valueAt(state: QueueScrollRelayState, offset: number): number | null {
  return state.slots[(state.frontIndex + offset) % QUEUE_SCROLL_RELAY_CAPACITY]
}

/** Applies one required relay action. Invalid operations never mutate the ring. */
export function applyQueueScrollRelayAction(
  state: QueueScrollRelayState,
  action: QueueScrollRelayAction,
): QueueScrollRelayState {
  if (state.completed) return state

  if (action.type === 'enqueue-next') {
    const isInitialLoad = state.nextArrivalIndex < 4 && state.deliveredValues.length === 0
    const isWrapLoad = state.nextArrivalIndex >= 4 &&
      state.nextArrivalIndex < QUEUE_SCROLL_RELAY_ARRIVALS.length &&
      state.deliveredValues.length === 2
    if (!isInitialLoad && !isWrapLoad) {
      return reject(state, 'Follow the relay order: load four parcels, dispatch the first two, then load the final three.')
    }
    if (state.size >= QUEUE_SCROLL_RELAY_CAPACITY) {
      return reject(state, 'The five-slot ring is full. Record the overflow proof instead of overwriting a parcel.')
    }
    const value = QUEUE_SCROLL_RELAY_ARRIVALS[state.nextArrivalIndex]
    const rearIndex = (state.frontIndex + state.size) % QUEUE_SCROLL_RELAY_CAPACITY
    const slots = [...state.slots]
    slots[rearIndex] = value
    const nextArrivalIndex = state.nextArrivalIndex + 1
    return {
      ...state,
      slots,
      size: state.size + 1,
      nextArrivalIndex,
      feedback: {
        isError: false,
        message: 'Parcel ' + value + ' joined the REAR of the circular queue.',
      },
    }
  }

  if (action.type === 'dequeue-front') {
    const isFirstDispatch = state.nextArrivalIndex === 4 && state.deliveredValues.length < 2
    const isFinalDispatch = state.nextArrivalIndex === 7 &&
      state.deliveredValues.length >= 2 &&
      state.deliveredValues.length < QUEUE_SCROLL_RELAY_ARRIVALS.length &&
      state.overflowConfirmed && state.frontInspected && state.rearInspected
    if (!isFirstDispatch && !isFinalDispatch) {
      return reject(state, 'Dispatch only at the marked points in the relay. Keep the first two arrivals ahead of the final three.')
    }
    if (state.size === 0) {
      return reject(state, 'The queue is empty. Demonstrate underflow with the separate underflow proof.')
    }
    const frontValue = valueAt(state, 0)
    if (frontValue === null) return reject(state, 'The FRONT slot is empty. The queue state is invalid.')
    const slots = [...state.slots]
    slots[state.frontIndex] = null
    const frontIndex = (state.frontIndex + 1) % QUEUE_SCROLL_RELAY_CAPACITY
    const deliveredValues = [...state.deliveredValues, frontValue]
    return {
      ...state,
      slots,
      frontIndex,
      size: state.size - 1,
      deliveredValues,
      feedback: {
        isError: false,
        message: 'Dispatched parcel ' + frontValue + ' from FRONT. FIFO order is preserved.',
      },
    }
  }

  if (action.type === 'probe-overflow') {
    if (state.nextArrivalIndex !== 7 || state.size !== QUEUE_SCROLL_RELAY_CAPACITY) {
      return reject(state, 'Overflow can only be demonstrated when all five queue slots are occupied.')
    }
    return {
      ...state,
      overflowConfirmed: true,
      feedback: {
        isError: false,
        message: 'Overflow confirmed: parcel ' + QUEUE_SCROLL_RELAY_OVERFLOW_VALUE + ' was rejected. The five waiting parcels were not changed.',
      },
    }
  }

  if (action.type === 'inspect-front') {
    if (state.nextArrivalIndex !== 7 || state.size !== QUEUE_SCROLL_RELAY_CAPACITY || !state.overflowConfirmed) {
      return reject(state, 'Inspect FRONT after all seven arrivals are loaded and overflow has been demonstrated.')
    }
    const front = valueAt(state, 0)
    return {
      ...state,
      frontInspected: front === 36,
      feedback: {
        isError: front !== 36,
        message: 'FRONT inspection: parcel ' + String(front) + '. The oldest waiting parcel remains in place.',
      },
    }
  }

  if (action.type === 'inspect-rear') {
    if (state.nextArrivalIndex !== 7 || state.size !== QUEUE_SCROLL_RELAY_CAPACITY || !state.overflowConfirmed) {
      return reject(state, 'Inspect REAR after all seven arrivals are loaded and overflow has been demonstrated.')
    }
    const rear = valueAt(state, state.size - 1)
    return {
      ...state,
      rearInspected: rear === 84,
      feedback: {
        isError: rear !== 84,
        message: 'REAR inspection: parcel ' + String(rear) + '. The newest waiting parcel remains in place.',
      },
    }
  }

  if (action.type === 'probe-underflow') {
    if (state.deliveredValues.length !== QUEUE_SCROLL_RELAY_ARRIVALS.length || state.size !== 0) {
      return reject(state, 'Underflow can only be demonstrated after all seven parcels have been dispatched.')
    }
    return {
      ...state,
      underflowConfirmed: true,
      completed: state.overflowConfirmed && state.frontInspected && state.rearInspected &&
        state.deliveredValues.every((value, index) => value === QUEUE_SCROLL_RELAY_ARRIVALS[index]),
      feedback: {
        isError: false,
        message: 'Underflow confirmed: no parcel was removed from the empty queue. The circular relay is complete.',
      },
    }
  }

  return state
}
