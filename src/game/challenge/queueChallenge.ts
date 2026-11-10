import type { QueueOperation } from './challengeTypes'

export type QueueChallengeStep = {
  label: string
  operation: QueueOperation
  expectedValue?: number
  /** The enqueue operation is expected to be rejected because the queue is full. */
  expectedOverflow?: boolean
}

export const QUEUE_SUPPLY_CAPACITY = 4

/**
 * The Farmer's guided supply-line sequence demonstrates FIFO, both queue ends,
 * bounded capacity and safe overflow rejection before the line is served.
 */
export const QUEUE_SUPPLY_STEPS: readonly QueueChallengeStep[] = [
  { label: 'Enqueue supply 12', operation: { type: 'enqueue', value: 12 } },
  { label: 'Enqueue supply 24', operation: { type: 'enqueue', value: 24 } },
  { label: 'Enqueue supply 36', operation: { type: 'enqueue', value: 36 } },
  { label: 'Enqueue supply 48', operation: { type: 'enqueue', value: 48 } },
  {
    label: 'Try enqueue 60 — expect overflow',
    operation: { type: 'enqueue', value: 60 },
    expectedOverflow: true,
  },
  { label: 'Inspect the front — expect 12', operation: { type: 'front' }, expectedValue: 12 },
  { label: 'Inspect the rear — expect 48', operation: { type: 'rear' }, expectedValue: 48 },
  { label: 'Dequeue supply 12 first', operation: { type: 'dequeue' }, expectedValue: 12 },
  { label: 'Enqueue supply 60 after space opens', operation: { type: 'enqueue', value: 60 } },
  { label: 'Inspect the new front — expect 24', operation: { type: 'front' }, expectedValue: 24 },
  { label: 'Inspect the new rear — expect 60', operation: { type: 'rear' }, expectedValue: 60 },
  { label: 'Dequeue supply 24', operation: { type: 'dequeue' }, expectedValue: 24 },
  { label: 'Dequeue supply 36', operation: { type: 'dequeue' }, expectedValue: 36 },
  { label: 'Dequeue supply 48', operation: { type: 'dequeue' }, expectedValue: 48 },
  { label: 'Dequeue supply 60 last', operation: { type: 'dequeue' }, expectedValue: 60 },
]
