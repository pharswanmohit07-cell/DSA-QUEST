import type { ChallengeTarget } from './challengeTypes'

/** Distinct target sequences for the Old Man's village-gate puzzle. */
export const ARRAY_STACK_TARGETS: readonly ChallengeTarget[] = [
  [
    { type: 'push', value: 5 },
    { type: 'push', value: 8 },
    { type: 'pop' },
    { type: 'push', value: 3 },
  ],
  [
    { type: 'push', value: 7 },
    { type: 'push', value: 4 },
    { type: 'pop' },
    { type: 'push', value: 9 },
  ],
  [
    { type: 'push', value: 2 },
    { type: 'push', value: 6 },
    { type: 'push', value: 1 },
    { type: 'pop' },
  ],
  [
    { type: 'push', value: 9 },
    { type: 'push', value: 3 },
    { type: 'pop' },
    { type: 'push', value: 7 },
  ],
  [
    { type: 'push', value: 4 },
    { type: 'push', value: 8 },
    { type: 'pop' },
    { type: 'push', value: 6 },
  ],
]

let lastArrayStackTargetIndex = -1

/** Select randomly; two consecutive visits never receive the same sequence. */
export function getRandomArrayStackTarget(random: () => number = Math.random): ChallengeTarget {
  let index = Math.floor(random() * ARRAY_STACK_TARGETS.length)
  if (index === lastArrayStackTargetIndex) {
    index = (index + 1) % ARRAY_STACK_TARGETS.length
  }
  lastArrayStackTargetIndex = index
  return ARRAY_STACK_TARGETS[index].map((operation) => ({ ...operation })) as ChallengeTarget
}

export function resetArrayStackTargetHistory(): void {
  lastArrayStackTargetIndex = -1
}
