import { beforeEach, describe, expect, it } from 'vitest'
import {
  ARRAY_STACK_TARGETS,
  getRandomArrayStackTarget,
  resetArrayStackTargetHistory,
} from './arrayStackTargets'

describe('random village gate puzzle targets', () => {
  beforeEach(() => resetArrayStackTargetHistory())

  it('selects one of the available sequences', () => {
    const target = getRandomArrayStackTarget(() => 0.42)
    expect(ARRAY_STACK_TARGETS).toContainEqual(target)
  })

  it('avoids repeating the previous sequence on consecutive visits', () => {
    const first = getRandomArrayStackTarget(() => 0)
    const second = getRandomArrayStackTarget(() => 0)
    expect(second).not.toEqual(first)
  })

  it('selects different sequences when the random value changes', () => {
    const first = getRandomArrayStackTarget(() => 0)
    const second = getRandomArrayStackTarget(() => 0.8)
    expect(second).not.toEqual(first)
  })
})
