import { useState } from 'react'
import { challengeStore, useChallengeState } from './challengeStore'
import './arrayLesson.css'

/** A guided, beginner-first introduction to the array ideas used in practice. */
type Panel = {
  id: string
  title: string
  body: string
  example: string
  visual: 'array' | 'indices' | 'highlight' | 'insertion' | 'recap'
}

const LESSON_PANELS: readonly Panel[] = [
  {
    id: 'definition',
    title: 'What is an array?',
    body: 'An array is one variable that can store many related values. Imagine a row of boxes: every box holds one value, and the boxes stay in order.',
    example: 'Think of an array as a row of numbered boxes. One name, many values: marks = [10, 20, 30, 40, 50].',
    visual: 'array',
  },
  {
    id: 'indexing',
    title: 'Every box has a position',
    body: 'Each box has a position number called an index. In most programming languages, counting starts at 0. The first box is 0, the next is 1, and the next is 2.',
    example: 'For marks = [10, 20, 30, 40, 50], the first value is at index 0 and the second value is at index 1.',
    visual: 'indices',
  },
  {
    id: 'zero-based',
    title: 'How do I read a value?',
    body: 'To get a value, write the array name and the index in square brackets. Remember that index 2 points to the third box because counting began at 0.',
    example: 'marks[0] gives 10. marks[2] gives 30. With five values, the valid indices are 0, 1, 2, 3 and 4.',
    visual: 'highlight',
  },
  {
    id: 'access',
    title: 'Finding a value is quick',
    body: 'When you already know the index, the computer can go straight to that value. It does not have to check every value before it.',
    example: 'marks[3] gives 40. This is called O(1): finding a value by its index takes about the same amount of work even when the array gets bigger.',
    visual: 'highlight',
  },
  {
    id: 'insertion',
    title: 'Adding a value in the middle',
    body: 'To add a value in the middle, the array must make room. The values from that position onward move one box to the right, so no old value is lost.',
    example: 'Before: [10, 20, 30]. Insert 15 at index 1. After: [10, 15, 20, 30]. This can take O(n) work because several values may need to move.',
    visual: 'insertion',
  },
  {
    id: 'recap',
    title: 'Recap',
    body: 'You have learned the three most useful ideas. Read the points below once, then continue to the practice questions.',
    example: 'You can now read a value by its index and explain why inserting a value in the middle may require shifting other values.',
    visual: 'recap',
  },
]

const DEMO_ARRAY = [10, 20, 30, 40, 50]

function PanelVisual({ visual }: { visual: Panel['visual'] }) {
  if (visual === 'array') {
    return (
      <div className="lesson-row" aria-label="Array visualization">
        {DEMO_ARRAY.map((value, boxIndex) => (
          <div key={boxIndex} className="lesson-box"><span className="lesson-value">{value}</span></div>
        ))}
      </div>
    )
  }
  if (visual === 'indices') {
    return (
      <div className="lesson-row" aria-label="Array with indices">
        {DEMO_ARRAY.map((value, boxIndex) => (
          <div key={boxIndex} className="lesson-box">
            <span className="lesson-value">{value}</span>
            <span className="lesson-index">[{boxIndex}]</span>
          </div>
        ))}
      </div>
    )
  }
  if (visual === 'highlight') {
    return (
      <div className="lesson-row" aria-label="Array with highlighted index">
        {DEMO_ARRAY.map((value, boxIndex) => (
          <div key={boxIndex} className={`lesson-box${boxIndex === 2 ? ' is-highlighted' : ''}`}>
            <span className="lesson-value">{value}</span>
            <span className="lesson-index">[{boxIndex}]</span>
          </div>
        ))}
        <p className="lesson-annotation">marks[2] → 30 (third value)</p>
      </div>
    )
  }
  if (visual === 'insertion') {
    return (
      <div className="lesson-insertion">
        <div className="lesson-row" aria-label="Array before insertion">
          {[10, 20, 30].map((value, boxIndex) => (
            <div key={boxIndex} className="lesson-box">
              <span className="lesson-value">{value}</span>
              <span className="lesson-index">[{boxIndex}]</span>
            </div>
          ))}
        </div>
        <p className="lesson-arrow">Insert 15 at index 1. Move the later values right ↓</p>
        <div className="lesson-row" aria-label="Array after insertion">
          {[10, 15, 20, 30].map((value, boxIndex) => (
            <div key={boxIndex} className={`lesson-box${value === 15 ? ' is-new' : ''}`}>
              <span className="lesson-value">{value}</span>
              <span className="lesson-index">[{boxIndex}]</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <ul className="lesson-recap" aria-label="Lesson recap">
      <li className="lesson-recap-item"><span className="lesson-recap-mark">1</span><span>The first item is at index <strong>0</strong>.</span></li>
      <li className="lesson-recap-item"><span className="lesson-recap-mark">2</span><span>Use <strong>array[index]</strong> to read a value.</span></li>
      <li className="lesson-recap-item"><span className="lesson-recap-mark">3</span><span>Inserting in the middle can move later values to the right.</span></li>
    </ul>
  )
}

export function ArrayLesson() {
  const challenge = useChallengeState()
  if (challenge.activeChallenge !== 'array-lesson') return null
  return <ArrayLessonSession />
}

function ArrayLessonSession() {
  const [panelIndex, setPanelIndex] = useState(0)
  const panel = LESSON_PANELS[panelIndex]
  const isLastPanel = panelIndex === LESSON_PANELS.length - 1

  return (
    <div className="lesson-overlay" data-testid="lesson-overlay" role="dialog" aria-modal="true" aria-label="Old Man's beginner array lesson">
      <section className="lesson-panel">
        <header className="lesson-header">
          <div>
            <p className="lesson-eyebrow">Old Man's Array Lesson</p>
            <h2>{panel.title}</h2>
          </div>
          <span className="lesson-progress" aria-label={`Panel ${panelIndex + 1} of ${LESSON_PANELS.length}`}>
            {panelIndex + 1} / {LESSON_PANELS.length}
          </span>
        </header>

        <p className="lesson-body">{panel.body}</p>
        <PanelVisual visual={panel.visual} />
        <aside className="lesson-example">
          <span className="lesson-example-label">SIMPLE EXAMPLE</span>
          <p>{panel.example}</p>
        </aside>

        <footer className="lesson-footer">
          <button
            type="button"
            className="lesson-nav"
            data-testid="lesson-back"
            disabled={panelIndex === 0}
            onClick={() => setPanelIndex((current) => Math.max(0, current - 1))}
          >
            Back
          </button>
          {isLastPanel ? (
            <button
              type="button"
              className="lesson-nav is-primary"
              data-testid="lesson-complete"
              onClick={() => {
                challengeStore.completeArrayLesson()
                challengeStore.closeChallenge(true)
              }}
            >
              I understand — begin practice
            </button>
          ) : (
            <button
              type="button"
              className="lesson-nav is-primary"
              data-testid="lesson-next"
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
