import { useState } from 'react'
import { challengeStore, useChallengeState } from './challengeStore'
import { getArraysCampaignStage, setArraysCampaignStage } from '../quests/arraysCampaignStages'
import './villageGuideArraysLesson.css'

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

export function VillageGuideArraysLesson() {
  const challenge = useChallengeState()
  const [stage, setStage] = useState<'learn' | 'practice'>(() =>
    getArraysCampaignStage() === 'practice' ? 'practice' : 'learn',
  )
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null)

  if (challenge.activeChallenge !== 'village-guide-arrays') return null

  const question = PRACTICE_QUESTIONS[questionIndex]
  const startPractice = () => {
    setArraysCampaignStage('practice')
    setStage('practice')
    setQuestionIndex(0)
    setSelectedAnswer(null)
    setFeedback(null)
  }
  const answerQuestion = (answerIndex: number) => {
    if (feedback?.correct) return
    setSelectedAnswer(answerIndex)
    const correct = answerIndex === question.answer
    setFeedback({
      correct,
      text: correct
        ? `Correct! ${question.explanation}`
        : `Not quite. ${question.explanation} Try again.`,
    })
  }
  const continuePractice = () => {
    if (!feedback?.correct) return
    if (questionIndex === PRACTICE_QUESTIONS.length - 1) {
      setArraysCampaignStage('implement')
      challengeStore.closeChallenge(false)
      return
    }
    setQuestionIndex((index) => index + 1)
    setSelectedAnswer(null)
    setFeedback(null)
  }

  return (
    <div className="array-challenge-overlay" data-testid="guide-arrays-overlay" role="dialog" aria-modal="true" aria-label="Village Guide Arrays lesson">
      <section className="array-challenge-panel guide-arrays-panel">
        <header className="array-challenge-header">
          <div>
            <p className="array-challenge-eyebrow">Village Guide · Arrays 1</p>
            <h2>{stage === 'learn' ? 'Learn how arrays work' : 'Three practice questions'}</h2>
          </div>
          <button type="button" className="array-challenge-close" aria-label="Leave lesson" data-testid="guide-arrays-close" onClick={() => challengeStore.closeChallenge(false)}>×</button>
        </header>

        {stage === 'learn' ? (
          <div className="guide-arrays-learning">
            <p className="guide-arrays-intro">An array is a row of boxes. Each box stores one value, and each box has a numbered position called an index.</p>
            <div className="guide-arrays-cells" aria-label="Array values and indexes">
              {[10, 20, 30].map((value, index) => (
                <div className="guide-arrays-cell" key={index}>
                  <strong>{value}</strong>
                  <span>Index {index}</span>
                </div>
              ))}
            </div>
            <div className="guide-arrays-explanations">
              <article>
                <h3>Start counting at zero</h3>
                <p>The first box is index 0, the next is index 1, then index 2. To access a value, use its index.</p>
              </article>
              <article>
                <h3>Change the boxes</h3>
                <p><strong>Update</strong> replaces a value. <strong>Insert</strong> adds a box at a position. <strong>Delete</strong> removes a box. <strong>Append</strong> adds a value at the end.</p>
              </article>
              <article>
                <h3>How much work does it take?</h3>
                <p>Accessing by index is usually <strong>O(1)</strong>: jump directly to the box. Inserting or deleting in the middle is usually <strong>O(n)</strong>, because later values may need to shift.</p>
              </article>
            </div>
            <button type="button" className="guide-arrays-primary" data-testid="guide-start-practice" onClick={startPractice}>I understand — start practice</button>
          </div>
        ) : question ? (
          <div className="guide-arrays-practice">
            <p className="guide-arrays-progress">Question {questionIndex + 1} of {PRACTICE_QUESTIONS.length}</p>
            <h3>{question.prompt}</h3>
            <div className="guide-arrays-options">
              {question.options.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  data-testid={`guide-practice-answer-${index}`}
                  disabled={Boolean(feedback?.correct)}
                  className={selectedAnswer === index ? 'is-selected' : ''}
                  onClick={() => answerQuestion(index)}
                >
                  {option}
                </button>
              ))}
            </div>
            {feedback && (
              <div className={`guide-arrays-feedback ${feedback.correct ? 'is-correct' : 'is-incorrect'}`} role="status" data-testid="guide-practice-feedback">
                {feedback.correct ? feedback.text : `Not quite. ${question.explanation} Try again.`}
              </div>
            )}
            {feedback?.correct && (
              <button type="button" className="guide-arrays-primary" data-testid="guide-practice-next" onClick={continuePractice}>
                {questionIndex === PRACTICE_QUESTIONS.length - 1 ? 'Finish practice' : 'Next question'}
              </button>
            )}
          </div>
        ) : null}
      </section>
    </div>
  )
}
