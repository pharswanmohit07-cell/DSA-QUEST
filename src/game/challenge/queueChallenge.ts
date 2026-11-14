import type { QueueOperation } from './challengeTypes'

export type QueueChallengeStep = {
  label: string
  operation: QueueOperation
  expectedValue?: number
  /** The enqueue operation is expected to be rejected because the queue is full. */
  expectedOverflow?: boolean
}

export const QUEUE_SUPPLY_CAPACITY = 4

export type QueueDeliveryParcel = {
  value: number
  cargo: string
  destination: string
  description: string
}

/** The Farmer's numeric queue values represent real parcels on a village route. */
export const QUEUE_DELIVERY_MANIFEST: readonly QueueDeliveryParcel[] = [
  { value: 12, cargo: 'Rice sack', destination: 'North Cottage', description: 'Food delivery' },
  { value: 24, cargo: 'Medicine kit', destination: 'Village Clinic', description: 'Medical supplies' },
  { value: 36, cargo: 'Seed crate', destination: 'East Farm', description: 'Planting supplies' },
  { value: 48, cargo: 'Timber bundle', destination: 'Village Workshop', description: 'Building supplies' },
  { value: 60, cargo: 'Fish basket', destination: 'Riverside Home', description: 'Fresh food delivery' },
]

export function getQueueDeliveryParcel(value: number): QueueDeliveryParcel | undefined {
  return QUEUE_DELIVERY_MANIFEST.find((parcel) => parcel.value === value)
}

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
  { label: 'Deliver the front parcel — Rice sack (12) first', operation: { type: 'dequeue' }, expectedValue: 12 },
  { label: 'Load Fish basket (60) after a space opens', operation: { type: 'enqueue', value: 60 } },
  { label: 'Inspect the new front — expect 24', operation: { type: 'front' }, expectedValue: 24 },
  { label: 'Inspect the new rear — expect 60', operation: { type: 'rear' }, expectedValue: 60 },
  { label: 'Deliver Medicine kit (24) to the Clinic', operation: { type: 'dequeue' }, expectedValue: 24 },
  { label: 'Deliver Seed crate (36) to East Farm', operation: { type: 'dequeue' }, expectedValue: 36 },
  { label: 'Deliver Timber bundle (48) to the Workshop', operation: { type: 'dequeue' }, expectedValue: 48 },
  { label: 'Deliver the final Fish basket (60) to Riverside Home', operation: { type: 'dequeue' }, expectedValue: 60 },
]
