import { useState } from 'react'
import { challengeStore, useChallengeState } from './challengeStore'
import { ARRAY_WORKSHOP_STEPS, type ArrayWorkshopOperation } from './arrayManipulationWorkshop'
import './arrayManipulationWorkshop.css'

type OperationChoice = ArrayWorkshopOperation['type'] | ''

const OPERATION_LABELS: Record<ArrayWorkshopOperation['type'], string> = {
  access: 'Access',
  update: 'Update',
  insert: 'Insert',
  delete: 'Delete',
  append: 'Append',
}

function isValueOperation(operation: OperationChoice): boolean {
  return operation === 'update' || operation === 'insert' || operation === 'append'
}

function isIndexedOperation(operation: OperationChoice): boolean {
  return operation !== '' && operation !== 'append'
}

export function ArrayManipulationWorkshop() {
  const challenge = useChallengeState()
  const [operation, setOperation] = useState<OperationChoice>('')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [valueInput, setValueInput] = useState('')
  const [hintVisible, setHintVisible] = useState(false)
  const [completion, setCompletion] = useState<{ firstCompletion: boolean } | null>(null)

  if (challenge.activeChallenge !== 'array-manipulation-workshop') return null

  const step = ARRAY_WORKSHOP_STEPS[challenge.arrayWorkshopStepIndex]
  const isMaster = step?.allowAnyOrder === true
  const operationChoices = isMaster
    ? (['update', 'insert', 'append'] as const)
    : (Object.keys(OPERATION_LABELS) as ArrayWorkshopOperation['type'][])

  const runOperation = () => {
    if (!step) return
    if (!operation) {
      challengeStore.recordArrayWorkshopInvalidAction('Choose an operation before running your move.')
      return
    }
    if (isIndexedOperation(operation) && selectedIndex === null) {
      challengeStore.recordArrayWorkshopInvalidAction(
        operation === 'insert'
          ? 'Select the gap where the new value belongs.'
          : 'Select an array cell before running this operation.',
      )
      return
    }
    if (isValueOperation(operation) && valueInput.trim() === '') {
      challengeStore.recordArrayWorkshopInvalidAction('Enter a number for the value.')
      return
    }

    const value = Number(valueInput)
    if (isValueOperation(operation) && !Number.isFinite(value)) {
      challengeStore.recordArrayWorkshopInvalidAction('Enter a valid finite number for the value.')
      return
    }

    const candidate: ArrayWorkshopOperation =
      operation === 'access' || operation === 'delete'
        ? { type: operation, index: selectedIndex as number }
        : operation === 'append'
          ? { type: operation, value }
          : { type: operation, index: selectedIndex as number, value }

    const accepted = challengeStore.executeArrayWorkshopOperation(candidate)
    if (!accepted) return

    setOperation('')
    setSelectedIndex(null)
    setValueInput('')
    setHintVisible(false)

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
    }
  }

  const showHint = () => {
    challengeStore.recordArrayWorkshopHint()
    setHintVisible(true)
  }

  const close = () => challengeStore.closeChallenge(false)

  return (
    <div
      className="array-challenge-overlay"
      data-testid="array-workshop-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Array Manipulation Workshop"
    >
      <section className="array-challenge-panel array-workshop-panel">
        <header className="array-challenge-header">
          <div>
            <p className="array-challenge-eyebrow">Village Guide</p>
            <h2>Array Manipulation Workshop</h2>
          </div>
          {!completion && (
            <button
              type="button"
              className="array-challenge-close"
              data-testid="workshop-close"
              aria-label="Leave workshop"
              onClick={close}
            >
              ×
            </button>
          )}
        </header>

        {completion ? (
          <section className="array-workshop-completion" data-testid="arrays-mastered">
            <p className="array-challenge-eyebrow">Campaign achievement</p>
            <h3>ARRAYS MASTERED!</h3>
            {completion.firstCompletion ? (
              <>
                <p>You completed all five array stages. Your campaign reward has been recorded.</p>
                <div className="array-workshop-rewards"><strong>+50 XP</strong><strong>Arrays Relic</strong></div>
              </>
            ) : (
              <p>Workshop complete. Your Arrays campaign reward was already claimed on its first completion.</p>
            )}
            <button type="button" className="array-workshop-primary" data-testid="workshop-finish" onClick={close}>
              Return to the Village Guide
            </button>
          </section>
        ) : step ? (
          <>
            <p className="array-workshop-progress">
              Stage {challenge.arrayWorkshopStepIndex + 1} of {ARRAY_WORKSHOP_STEPS.length}
              {isMaster && (
                <span data-testid="workshop-master-progress">
                  {' '}· Master operations {challenge.arrayWorkshopOperationIndex} / {step.operations.length}
                </span>
              )}
            </p>

            <section className="array-workshop-task">
              <h3>{step.title}</h3>
              <p>{step.instruction}</p>
              {step.targetValues && (
                <div className="array-workshop-target" data-testid="workshop-target-array">
                  <span>Target array</span>
                  <strong>[{step.targetValues.join(', ')}]</strong>
                </div>
              )}
            </section>

            <div className="array-workshop-array-heading">
              <span>Live array · select a cell or insertion gap</span>
              <span>Length: {challenge.arrayWorkshopValues.length}</span>
            </div>
            <div className="array-workshop-boxes" aria-label="Live array values">
              {challenge.arrayWorkshopValues.map((value, index) => (
                <div className="array-workshop-cell-wrap" key={`${index}-${value}`}>
                  {operation === 'insert' && (
                    <button
                      type="button"
                      className={`array-workshop-gap${selectedIndex === index ? ' is-selected' : ''}`}
                      data-testid={`workshop-insert-gap-${index}`}
                      aria-label={`Select insertion gap at index ${index}`}
                      aria-pressed={selectedIndex === index}
                      onClick={() => setSelectedIndex(index)}
                    >
                      +
                    </button>
                  )}
                  <button
                    type="button"
                    className={`array-workshop-cell${selectedIndex === index && operation !== 'insert' ? ' is-selected' : ''}`}
                    data-testid={`workshop-array-index-${index}`}
                    aria-label={`Value ${value}, index ${index}`}
                    aria-pressed={selectedIndex === index && operation !== 'insert'}
                    onClick={() => setSelectedIndex(index)}
                  >
                    <strong>{value}</strong>
                    <span>Index {index}</span>
                  </button>
                </div>
              ))}
              {operation === 'insert' && (
                <button
                  type="button"
                  className={`array-workshop-gap array-workshop-gap-end${selectedIndex === challenge.arrayWorkshopValues.length ? ' is-selected' : ''}`}
                  data-testid={`workshop-insert-gap-${challenge.arrayWorkshopValues.length}`}
                  aria-label={`Select insertion gap at index ${challenge.arrayWorkshopValues.length}`}
                  aria-pressed={selectedIndex === challenge.arrayWorkshopValues.length}
                  onClick={() => setSelectedIndex(challenge.arrayWorkshopValues.length)}
                >
                  +
                </button>
              )}
              {challenge.arrayWorkshopValues.length === 0 && (
                <span className="array-workshop-empty">The array is empty. Append a value to begin.</span>
              )}
            </div>

            <div className="array-workshop-controls">
              <label>
                Operation
                <select
                  data-testid="workshop-operation"
                  value={operation}
                  onChange={(event) => {
                    setOperation(event.target.value as OperationChoice)
                    setSelectedIndex(null)
                    setValueInput('')
                  }}
                >
                  <option value="">Choose an operation…</option>
                  {operationChoices.map((choice) => (
                    <option key={choice} value={choice}>{OPERATION_LABELS[choice]}</option>
                  ))}
                </select>
              </label>
              <div className="array-workshop-selection" data-testid="workshop-selected-index" aria-live="polite">
                {selectedIndex === null
                  ? (operation === 'insert' ? 'Choose an insertion gap' : 'Choose an array cell')
                  : `${operation === 'insert' ? 'Insert at' : 'Selected index'}: ${selectedIndex}`}
              </div>
              {isValueOperation(operation) && (
                <label>
                  Value
                  <input
                    data-testid="workshop-value"
                    type="number"
                    step="any"
                    value={valueInput}
                    placeholder={operation === 'append' ? 'New ending value' : 'Enter a number'}
                    onChange={(event) => setValueInput(event.target.value)}
                  />
                </label>
              )}
              <button type="button" className="array-workshop-primary" data-testid="workshop-run" onClick={runOperation}>
                Run operation
              </button>
            </div>

            <div className="array-workshop-footer">
              <button type="button" className="array-workshop-hint" data-testid="workshop-hint" onClick={showHint}>
                Show hint
              </button>
              {hintVisible && (
                <p className="array-workshop-hint-text" data-testid="workshop-hint-text">
                  {step.hint}
                </p>
              )}
            </div>
            {step.complexity && (
              <p className="array-workshop-complexity" data-testid="workshop-complexity">
                {step.complexity}
              </p>
            )}
            {challenge.feedback && (
              <p
                className={`array-workshop-feedback ${challenge.feedback.isError ? 'is-error' : 'is-ok'}`}
                role="status"
                data-testid="workshop-feedback"
              >
                {challenge.feedback.message}
              </p>
            )}
          </>
        ) : null}
      </section>
    </div>
  )
}
