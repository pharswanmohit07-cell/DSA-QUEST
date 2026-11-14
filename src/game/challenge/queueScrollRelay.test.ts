import { describe, expect, it } from 'vitest'
import {
  applyQueueScrollRelayAction,
  createQueueScrollRelayState,
  QUEUE_SCROLL_RELAY_ARRIVALS,
  QUEUE_SCROLL_RELAY_CAPACITY,
} from './queueScrollRelay'

function apply(state: ReturnType<typeof createQueueScrollRelayState>, action: Parameters<typeof applyQueueScrollRelayAction>[1]) {
  return applyQueueScrollRelayAction(state, action)
}

describe('Queue Knowledge Scroll circular relay', () => {
  it('starts with an empty five-slot circular queue and seven ordered arrivals', () => {
    const state = createQueueScrollRelayState()
    expect(state.slots).toEqual([null, null, null, null, null])
    expect(state.frontIndex).toBe(0)
    expect(state.size).toBe(0)
    expect(QUEUE_SCROLL_RELAY_CAPACITY).toBe(5)
    expect(QUEUE_SCROLL_RELAY_ARRIVALS).toEqual([12, 24, 36, 48, 60, 72, 84])
  })

  it('requires the first four arrivals before two FRONT dispatches', () => {
    let state = createQueueScrollRelayState()
    state = apply(state, { type: 'enqueue-next' })
    state = apply(state, { type: 'enqueue-next' })
    expect(apply(state, { type: 'dequeue-front' }).deliveredValues).toEqual([])
    state = apply(state, { type: 'enqueue-next' })
    state = apply(state, { type: 'enqueue-next' })
    state = apply(state, { type: 'dequeue-front' })
    state = apply(state, { type: 'dequeue-front' })
    expect(state.deliveredValues).toEqual([12, 24])
    expect(state.nextArrivalIndex).toBe(4)
  })

  it('wraps the rear around the ring and verifies overflow plus non-mutating end inspections', () => {
    let state = createQueueScrollRelayState()
    for (let index = 0; index < 4; index += 1) state = apply(state, { type: 'enqueue-next' })
    state = apply(state, { type: 'dequeue-front' })
    state = apply(state, { type: 'dequeue-front' })
    for (let index = 0; index < 3; index += 1) state = apply(state, { type: 'enqueue-next' })
    expect(state.slots).toEqual([72, 84, 36, 48, 60])
    expect(state.frontIndex).toBe(2)
    expect(state.size).toBe(5)
    const beforeInspection = state
    state = apply(state, { type: 'probe-overflow' })
    state = apply(state, { type: 'inspect-front' })
    state = apply(state, { type: 'inspect-rear' })
    expect(state.slots).toEqual(beforeInspection.slots)
    expect(state.frontIndex).toBe(beforeInspection.frontIndex)
    expect(state.size).toBe(beforeInspection.size)
    expect(state.overflowConfirmed).toBe(true)
    expect(state.frontInspected).toBe(true)
    expect(state.rearInspected).toBe(true)
    expect(state.feedback?.message).toContain('84')
  })

  it('preserves FIFO order and confirms underflow only after all seven deliveries', () => {
    let state = createQueueScrollRelayState()
    for (let index = 0; index < 4; index += 1) state = apply(state, { type: 'enqueue-next' })
    state = apply(state, { type: 'dequeue-front' })
    state = apply(state, { type: 'dequeue-front' })
    for (let index = 0; index < 3; index += 1) state = apply(state, { type: 'enqueue-next' })
    state = apply(state, { type: 'probe-overflow' })
    state = apply(state, { type: 'inspect-front' })
    state = apply(state, { type: 'inspect-rear' })
    const delivered = []
    for (let index = 0; index < 5; index += 1) {
      state = apply(state, { type: 'dequeue-front' })
      delivered.push(state.deliveredValues.at(-1))
    }
    expect(delivered).toEqual([36, 48, 60, 72, 84])
    expect(state.size).toBe(0)
    expect(state.underflowConfirmed).toBe(false)
    state = apply(state, { type: 'probe-underflow' })
    expect(state.underflowConfirmed).toBe(true)
    expect(state.completed).toBe(true)
  })

  it('does not mutate queue contents for invalid probes, skips or inspection timing', () => {
    const state = createQueueScrollRelayState()
    const earlyInspect = apply(state, { type: 'inspect-front' })
    const earlyDequeue = apply(state, { type: 'dequeue-front' })
    const prematureOverflow = apply(state, { type: 'probe-overflow' })
    expect(earlyInspect.slots).toEqual(state.slots)
    expect(earlyDequeue.slots).toEqual(state.slots)
    expect(prematureOverflow.slots).toEqual(state.slots)
    expect(earlyInspect.invalidActions).toBe(1)
    expect(earlyDequeue.invalidActions).toBe(1)
    expect(prematureOverflow.invalidActions).toBe(1)
    expect(state.completed).toBe(false)
  })

  it('requires overflow, both inspections, FIFO deliveries and underflow proof to finish', () => {
    let state = createQueueScrollRelayState()
    for (let index = 0; index < 4; index += 1) state = apply(state, { type: 'enqueue-next' })
    state = apply(state, { type: 'dequeue-front' })
    state = apply(state, { type: 'dequeue-front' })
    for (let index = 0; index < 3; index += 1) state = apply(state, { type: 'enqueue-next' })
    state = apply(state, { type: 'probe-overflow' })
    state = apply(state, { type: 'inspect-front' })
    state = apply(state, { type: 'inspect-rear' })
    for (let index = 0; index < 5; index += 1) state = apply(state, { type: 'dequeue-front' })
    expect(state.completed).toBe(false)
    expect(apply(state, { type: 'probe-underflow' }).completed).toBe(true)
  })
})
