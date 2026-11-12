import { useState } from 'react'
import { challengeStore, useChallengeState } from './challengeStore'
import type { StackOp } from './challengeTypes'
import './arrayChallenge.css'

function describeOperation(op: StackOp): string {
  return op.type === 'push' ? `Push ${op.value}` : 'Pop'
}

export function ArrayChallenge() {
  const challenge = useChallengeState()
  const [pushValue, setPushValue] = useState('')

  if (challenge.activeChallenge !== 'array-stack-operations') {
    return null
  }

  const push = () => {
    const value = Number(pushValue)
    if (pushValue.trim() === '' || !Number.isFinite(value)) {
      challengeStore.setFeedback('Enter a valid number before pushing it onto the stack.')
      return
    }
    if (challengeStore.executeOp({ type: 'push', value })) {
      setPushValue('')
    }
  }

  const pop = () => {
    challengeStore.executeOp({ type: 'pop' })
  }

  return (
    <div className="array-challenge-overlay" data-testid="challenge-overlay" role="dialog" aria-modal="true" aria-label="Village gate-opening challenge">
      <section className="array-challenge-panel">
        <header className="array-challenge-header">
          <div>
            <p className="array-challenge-eyebrow">Old Man's Gate Puzzle</p>
            <h2>Open the Village Gate</h2>
          </div>
          {!challenge.isComplete && (
            <button
              type="button"
              className="array-challenge-close"
              data-testid="challenge-close"
  ¶»§q«^