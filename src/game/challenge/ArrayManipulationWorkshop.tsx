import { useState } from 'react'
import { challengeStore, useChallengeState } from './challengeStore'
import { ARRAY_WORKSHOP_STEPS, type ArrayWorkshopOperation } from './arrayManipulationWorkshop'
import './arrayManipulationWorkshop.css'

const OPERATION_LABELS: Record<ArrayWorkshopOperation['type'], string> = {
  access: 'Access',
  update: 'Update',
  insert: 'Insert',
  delete: 'Delete',
  append: 'Append',
}

export function ArrayManipulationWorkshop() {
  const challenge = useChallengeState()
  const [operation, setOperation] = useState<ArrayWorkshopOperation['type']>('access')
  const [indexInput, setIndexInput] = useState('1')
  const [valueInput, setValueInput] = useState('')
  const [hintVisible, setHintVisible] = useState(false)
  const [completion, setCompletion] = useState<{ firstCompletion: boolean } | null>(null)

  if (challenge.activeChallenge !== 'array-manipulation-workshop') return null

  const step = ARRAY_WORKSHOP_STEPS[challenge.arrayWorkshopStepIndex]
  const runOperation = () => {
    if (!step) return

    const requiresIndex = operation !== 'append'
    const requiresValue = operation !== 'access' && operation !== 'delete'
    if (requiresIndex && indexInput.trim() === '') {
      challengeStore.recordArrayWorkshopInvalidAction('Enter an index before running this operation.')
      return
    }
    if (requiresValue && valueInput.trim() === '') {
      challengeStore.recordArrayWorkshopInvalidAction('Enter a number for the value.')
      return
    }

    const index = Number(indexInput)
    const value = Number(valueInput)
    const candidate: ArrayWorkshopOperation =
      operation === 'access' || operation === 'delete'
        ? { type: operation, index }
        : operation === 'append'
          ? { type: operation, value }
          : { type: operation, index, value }

    const advanced = challengeStore.executeArrayWorkshopOperation(candidate)
    if (!advanced) return

    setHintVisible(false)
    setValueInput('')
    const snapshot = challengeStore.getSnapshot()
    if (snapshot.isComplete && snapshot.arrayWorkshopStepIndex === ARRAY_WORKSHOP_STEPS.length) {
      const result = challengeStore.completeArraysWorkshop()
      if (result.completed) {
        setCompletion({ firstCompletion: result.firstCompletion })
      } else {
        challengeStore.recordArrayWorkshopInvalidAction(
          'The workshop could not confirm your campaign reward. Your progress is saved; try again.',
        )
      }
      return
    }

    const nextStep = ARRAY_WORKSHOP_STEPS[snapshot.arrayWorkshopStepIndex]
    setOperation(nextStep.operation.type)
    setIndexInput('index' in nextStep.operation ? String(nextStep.operation.index) : '')
  }

  const showHint = () => {
    challengeStore.recordArrayWorkshopHint()
    setHintVisible(true)
  }

  const close = () => challengeStore.closeChallenge(false)

  return (
    <div className="array-challenge-overlay" data-testid="array-workshop-overlay" role="dialog" aria-modal="true" aria-label="Array Manipulation Workshop">
      <section className="array-challenge-panel array-workshop-panel">
        <header className="array-challenge-header">
          <div>
            <p className="array-challenge-eyebrow">Village Guide</p>
            <h2>Array Manipulation Workshop</h2>
          </div>
          {!completion && <button type="button" className="array-challenge-close" data-testid="workshop-close" aria-label="Leave workshop" onClick={close}>×</button>}
        </header>

        {completion ? (
          <section className="array-workshop-completion" data-testid="arrays-mastered">
            <p className="array-challenge-eyebrow">Campaign achievement</p>
            <h3>ARRAYS MASTERED!</h3>
            {completion.firstCompletion ? (
              <>
                <p>You completed all five array operations. Your campaign reward has been recorded.</p>
                <div className="array-workshop-rewards"><strong>+50 XP</strong><strong>Arrays Relic</strong></div>
              </>
            ) : (
              <p>Workshop complete. Your Arrays campaign reward was already claimed on its first completion.</p>
            )}
            <button type="button" className="array-workshop-primary" data-testid="workshop-finish" onClick={close}>Return to the Village Guide</button>
          </section>
        ) : step ? (
          <>
            <p className="array-workshop-progress">Operation {challenge.arrayWorkshopStepIndex + 1} of {ARRAY_WORKSHOP_STEPS.length}</p>
            <section className="array-workshop-task">
              <h3>{step.title}</h3>
              <p>{step.instruction}</p>
            </section>
            <div className="array-workshop-boxes" aria-label="Live array values">
              {challenge.arrayWorkshopValues.map((value, index) => (
                <button
                  key={`${index}-${value}`}
                  type="button"
                  className={indexInput === String(index) ? 'is-selected' : ''}
                  data-testid={`workshop-array-index-${index}`}
                  onClick={() => setIndexInput(String(index))}
                >
                  <strong>{value}</strong>
                  <span>Index {index}</span>
                </button>
              ))}
              <span className="array-workshop-size">Length: {challenge.arrayWorkshopValues.length}</span>
            </div>

            <div className="array-workshop-controls">
              <label>
                Operation
                <select data-testid="workshop-operation" value={operation} onChange={(event) => setOperation(event.target.value as ArrayWorkshopOperation['type'])}>
                  {Object.entries(OPERATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              {operation !== 'append' && (
                <label>
                  Index
                  <input data-testid="workshop-index" type="number" min="0" value={indexInput} onChange={(event) => setIndexInput(event.target.value)} />
                </label>
              )}
              {operation !== 'access' && operation !== 'delete' && (
                <label>
                  Value
                  <input data-testid="workshop-value" type="number" value={valueInput} onChange={(event) => setValueInput(event.target.value)} />
                </label>
              )}
              <button type="button" className="array-workshop-primary" data-testid="workshop-run" onClick={runOperation}>Run operation</button>
            </div>

            <div className="array-workshop-footer">
              <button type="button" className="array-workshop-hint" data-testid="workshop-hint" onClick={showHint}>Show hint</button>
              {hintVisible && (
                <p className="array-workshop-hint-text" data-testid="workshop-hint-text">
                  Try: {step.operation.type}
                  {'index' in step.operation ? ` at index ${step.operation.index}` : ''}
                  {'value' in step.operation ? ` with value ${step.operation.value}` : ''}.
                </p>
              )}
            </div>
            {challenge.feedback && (
              <p className={`array-workshop-feedback ${challenge.feedback.isError ? 'is-error' : 'is-ok'}`} role="status" data-testid="workshop-feedback">
                {challenge.feedback.message}
              </p>
            )}
          </>
        ) : null}
      </section>
    </div>
  )
}
