import { useState } from 'react'
import { challengeStore, useChallengeState } from './challengeStore'
import { getArraysCampaignStage, setArraysCampaignStage } from '../quests/arraysCampaignStages'
import './arrayChallenge.css'
import './arrayLesson.css'
import './villageGuideArraysLesson.css'

type LessonVisual =
  | 'array'
  | 'indices'
  | 'access'
  | 'update'
  | 'insert'
  | 'delete'
  | 'append'
  | 'recap'

type LessonPanel = {
  title: string
  body: string
  example: string
  visual: LessonVisual
}

const LESSON_PANELS: readonly LessonPanel[] = [
  {
    title: 'What is an array?',
    body: 'An array stores several related values under one name. Think of it as a row of boxes: every box holds one value, and the values stay in order.',
    example: 'marks = [10, 20, 30]. One array name stores three values in three boxes.',
    visual: 'array',
  },
  {
    title: 'Every box has an index',
    body: 'Each box has a numbered position called an index. Array indexing starts at 0, not 1. So the first value is at index 0, the second at index 1, and the third at index 2.',
    example: 'For marks = [10, 20, 30], the indexes are 0, 1 and 2. The last index is always one less than the array length.',
    visual: 'indices',
  },
  {
    title: 'Access a value by its index',
    body: 'To read one value, write the array name followed by the index inside square brackets. The index points directly to the box you want.',
    example: 'Use array[index] to read a value. marks[0] gives 10, marks[1] gives 20, and marks[2] gives 30.',
    visual: 'access',
  },
  {
    title: 'Update a value',
    body: 'Updating changes the value inside an existing box. It does not add a new box, remove a box, or move the other values.',
    example: 'Start with [10, 20, 30]. Update index 2 to 35. The result is [10, 20, 35].',
    visual: 'update',
  },
  {
    title: 'Insert a value in the middle',
    body: 'Inserting adds a new value at a chosen position. The values from that position onward move one box to the right to make room.',
    example: 'Start with [10, 20, 30]. Insert 15 at index 1. The result is [10, 15, 20, 30].',
    visual: 'insert',
  },
  {
    title: 'Delete and append',
    body: 'Deleting removes the value at a chosen index. Values after it move one box to the left. Appending is different: it adds a new value at the end of the array.',
    example: 'Delete index 1 from [10, 20, 30] to get [10, 30]. Append 40 to [10, 20, 30] to get [10, 20, 30, 40].',
    visual: 'delete',
  },
  {
    title: 'How much work do operations take?',
    body: 'When you know an index, access and update are usually O(1): the computer can go directly to that box. Inserting or deleting in the middle is usually O(n), because other values may need to shift.',
    example: 'Remember: access/update by index → O(1). Insert/delete in the middle → O(n). Appending adds the value at the end.',
    visual: 'recap',
  },
]

const PRACTICE_QUESTIONS = [
  {
    prompt: 'What value is stored at index 1 in [10, 20, 30]?',
    options: ['10', '20', '30'],
    answer: 1,
    explanation: 'The first box is index 0, so index 1 is the second box: 20.',
  },
  {
    prompt: 'Update index 2 to 35. What is the new array?',
    options: ['[10, 20, 35]', '[10, 35, 30]', '[35, 20, 30]'],
    answer: 0,
    explanation: 'Updating replaces only the value at the chosen index. The other boxes stay in place.',
  },
  {
    prompt: 'Insert 15 at index 1 in [10, 20, 30]. What is the result?',
    options: ['[10, 15, 20, 30]', '[15, 10, 20, 30]', '[10, 20, 15, 30]'],
    answer: 0,
    explanation: 'A new box is inserted at index 1, so 20 and 30 shift one place to the right.',
  },
] as const

function LessonArrayRow({
  values,
  label,
  highlightIndex,
  newIndex,
}: {
  values: readonly number[]
  label: string
  highlightIndex?: number
  newIndex?: number
}) {
  return (
    <div className="lesson-row" aria-label={label}>
      {values.map((value, index) => (
        <div
          key={label + '-' + index}
          className={'lesson-box' + (index === highlightIndex ? ' is-highlighted' : '') + (index === newIndex ? ' is-new' : '')}
        >
          <span className="lesson-value">{value}</span>
          <span className="lesson-index">Index {index}</span>
        </div>
      ))}
    </div>
  )
}

function LessonPanelVisual({ visual }: { visual: LessonVisual }) {
  if (visual === 'array') {
    return <LessonArrayRow values={[10, 20, 30]} label="Array containing 10, 20 and 30" />
  }

  if (visual === 'indices') {
    return <LessonArrayRow values={[10, 20, 30]} label="Array values and their zero-based indexes" />
  }

  if (visual === 'access') {
    return <LessonArrayRow values={[10, 20, 30]} label="Array with index 1 highlighted" highlightIndex={1} />
  }

  if (visual === 'update') {
    return (
      <div className="lesson-insertion">
        <p className="lesson-arrow">Before updating index 2</p>
        <LessonArrayRow values={[10, 20, 30]} label="Array before update" />
        <p className="lesson-arrow">After updating index 2 to 35</p>
        <LessonArrayRow values={[10, 20, 35]} label="Array after update" newIndex={2} />
      </div>
    )
  }

  if (visual === 'insert') {
    return (
      <div className="lesson-insertion">
        <p className="lesson-arrow">Before inserting 15 at index 1</p>
        <LessonArrayRow values={[10, 20, 30]} label="Array before insertion" />
        <p className="lesson-arrow">The later values shift right</p>
        <LessonArrayRow values={[10, 15, 20, 30]} label="Array after insertion" newIndex={1} />
      </div>
    )
  }

  if (visual === 'delete') {
    return (
      <div className="lesson-insertion">
        <p className="lesson-arrow">Delete index 1</p>
        <LessonArrayRow values={[10, 20, 30]} label="Array before deletion" highlightIndex={1} />
        <p className="lesson-arrow">20 is removed and 30 shifts left</p>
        <LessonArrayRow values={[10, 30]} label="Array after deletion" newIndex={1} />
        <p className="lesson-arrow">Append 40 at the end</p>
        <LessonArrayRow values={[10, 20, 30, 40]} label="Array after appending 40" newIndex={3} />
      </div>
    )
  }

  if (visual === 'append') {
    return (
      <div className="lesson-insertion">
        <p className="lesson-arrow">Before appending</p>
        <LessonArrayRow values={[10, 20, 30]} label="Array before append" />
        <p className="lesson-arrow">Add 40 at the end</p>
        <LessonArrayRow values={[10, 20, 30, 40]} label="Array after append" newIndex={3} />
      </div>
    )
  }

  return (
    <ul className="lesson-recap" aria-label="Array lesson recap">
      <li className="lesson-recap-item"><span className="lesson-recap-mark">1</span><span>Arrays keep multiple values in an ordered row.</span></li>
      <li className="lesson-recap-item"><span className="lesson-recap-mark">2</span><span>Indexes start at <strong>0</strong>. Use <strong>array[index]</strong> to access a value.</span></li>
      <li className="lesson-recap-item"><span className="lesson-recap-mark">3</span><span>Update replaces a value; insert adds one and shifts later values right.</span></li>
      <li className="lesson-recap-item"><span className="lesson-recap-mark">4</span><span>Delete removes a value; append adds one at the end.</span></li>
      <li className="lesson-recap-item"><span className="lesson-recap-mark">5</span><span>Access/update by index: <strong>O(1)</strong>. Insert/delete in the middle: <strong>O(n)</strong>.</span></li>
    </ul>
  )
}

export function VillageGuideArraysLesson() {
  const challenge = useChallengeState()
  const [stage, setStage] = useState<'learn' | 'practice'>(() =>
    getArraysCampaignStage() === 'practice' ? 'practice' : 'learn',
  )
  const [panelIndex, setPanelIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null)
  const [heartsRemaining, setHeartsRemaining] = useState(3)
  const [practiceFailed, setPracticeFailed] = useState(false)
  const [practicePassed, setPracticePassed] = useState(false)

  if (challenge.activeChallenge !== 'village-guide-arrays') return null

  const panel = LESSON_PANELS[panelIndex]
  const question = PRACTICE_QUESTIONS[questionIndex]
  const isLastPanel = panelIndex === LESSON_PANELS.length - 1

  const leaveLesson = () => challengeStore.closeChallenge(false)

  const startPractice = () => {
    setArraysCampaignStage('practice')
    setStage('practice')
    setQuestionIndex(0)
    setSelectedAnswer(null)
    setFeedback(null)
    setHeartsRemaining(3)
    setPracticeFailed(false)
    setPracticePassed(false)
  }

  const answerQuestion = (answerIndex: number) => {
    if (feedback || practiceFailed || practicePassed) return

    const correct = answerIndex === question.answer
    setSelectedAnswer(answerIndex)

    const remaining = correct ? heartsRemaining : Math.max(0, heartsRemaining - 1)
    setHeartsRemaining(remaining)
    setFeedback({
      correct,
      text: correct
        ? 'Correct! ' + question.explanation
        : 'Not quite — the correct answer is ' + question.options[question.answer] + '. ' + question.explanation,
    })
  }

  const advancePractice = () => {
    if (!feedback) return

    if (heartsRemaining === 0) {
      setFeedback(null)
      setPracticeFailed(true)
      return
    }

    if (questionIndex === PRACTICE_QUESTIONS.length - 1) {
      setFeedback(null)
      setPracticePassed(true)
      return
    }

    setQuestionIndex((index) => index + 1)
    setSelectedAnswer(null)
    setFeedback(null)
  }

  const continuePractice = () => {
    if (!practicePassed) return
    setArraysCampaignStage('implement')
    challengeStore.transitionToArrayWorkshop()
  }

  if (stage === 'learn') {
    return (
      <div
        className="lesson-overlay"
        data-testid="guide-arrays-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Village Guide Arrays lesson"
      >
        <section className="lesson-panel">
          <header className="lesson-header">
            <div>
              <p className="lesson-eyebrow">Village Guide</p>
              <h2>{panel.title}</h2>
            </div>
            <div className="guide-arrays-lesson-actions">
              <span className="lesson-progress" aria-label={'Page ' + (panelIndex + 1) + ' of ' + LESSON_PANELS.length}>
                {panelIndex + 1} / {LESSON_PANELS.length}
              </span>
              <button
                type="button"
                className="array-challenge-close"
                data-testid="guide-arrays-close"
                onClick={leaveLesson}
                aria-label="Leave lesson"
              >
                ×
              </button>
            </div>
          </header>

          <p className="lesson-body">{panel.body}</p>
          <LessonPanelVisual visual={panel.visual} />
          <aside className="lesson-example">
            <span className="lesson-example-label">SIMPLE EXAMPLE</span>
            <p>{panel.example}</p>
          </aside>

          <footer className="lesson-footer">
            <button
              type="button"
              className="lesson-nav"
              data-testid="guide-lesson-back"
              disabled={panelIndex === 0}
              onClick={() => setPanelIndex((current) => Math.max(0, current - 1))}
            >
              Back
            </button>
            {isLastPanel ? (
              <button
                type="button"
                className="lesson-nav is-primary"
                data-testid="guide-start-practice"
                onClick={startPractice}
              >
                I understand — start practice
              </button>
            ) : (
              <button
                type="button"
                className="lesson-nav is-primary"
                data-testid="guide-lesson-next"
                onClick={() => setPanelIndex((current) => Math.min(LESSON_PANELS.length - 1, current + 1))}
              >
                Next
              </button>
            )}
          </footer>
        </section>
      </div>
    )
  }

  return (
    <div
      className="array-challenge-overlay quiz-challenge-overlay"
      data-testid="guide-arrays-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Village Guide Arrays practice"
    >
      <section className="array-challenge-panel quiz-challenge-panel">
        <header className="array-challenge-header array-practice-header">
          <div>
            <p className="array-challenge-eyebrow">Village Guide</p>
            <h2>Three practice questions</h2>
          </div>
          <div className="quiz-challenge-header-actions">
            <div
              className="quiz-challenge-hearts"
              role="img"
              aria-label={heartsRemaining + ' of 3 hearts remaining'}
            >
              {[0, 1, 2].map((heart) => (
                <span key={heart} className={heart < heartsRemaining ? 'is-full' : ''} aria-hidden="true">
                  {heart < heartsRemaining ? '♥' : '♡'}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="array-challenge-close"
              data-testid="guide-arrays-close"
              onClick={leaveLesson}
              aria-label="Leave practice"
            >
              ×
            </button>
          </div>
        </header>

        {practicePassed ? (
          <section className="quiz-challenge-result is-passed" data-testid="guide-practice-passed">
            <h3>Practice complete</h3>
            <p>You answered all three questions. You are ready for the Array Workshop.</p>
            <button
              type="button"
              data-testid="guide-practice-continue"
              onClick={continuePractice}
            >
              Continue to workshop
            </button>
          </section>
        ) : practiceFailed ? (
          <section className="quiz-challenge-result is-failed" data-testid="guide-practice-failed">
            <h3>Practice not finished</h3>
            <p>You used all three hearts. Return to the Village Guide whenever you are ready to try these questions again.</p>
            <button
              type="button"
              data-testid="guide-practice-return"
              onClick={leaveLesson}
            >
              Return to Village Guide
            </button>
          </section>
        ) : (
          <section className="quiz-challenge-question" data-testid="guide-practice-question">
            <p className="quiz-challenge-progress">
              Question {questionIndex + 1} of {PRACTICE_QUESTIONS.length}
            </p>
            <h3>{question.prompt}</h3>

            <div className="quiz-challenge-options">
              {question.options.map((option, index) => (
                <button
                  type="button"
                  key={option}
                  data-testid={'guide-practice-answer-' + index}
                  disabled={feedback !== null}
                  aria-pressed={selectedAnswer === index}
                  onClick={() => answerQuestion(index)}
                >
                  {option}
                </button>
              ))}
            </div>

            {feedback && (
              <p
                className={'array-challenge-feedback' + (feedback.correct ? ' is-success' : ' is-error')}
                data-testid="guide-practice-feedback"
                role="status"
              >
                {feedback.text}
              </p>
            )}

            {feedback && (
              <button
                type="button"
                className="quiz-challenge-continue"
                data-testid="guide-practice-next"
                onClick={advancePractice}
              >
                {heartsRemaining === 0
                  ? 'See what happens next'
                  : questionIndex + 1 === PRACTICE_QUESTIONS.length
                    ? 'Finish practice'
                    : 'Next question'}
              </button>
            )}
          </section>
        )}
      </section>
    </div>
  )
}
