import { challengeStore, useChallengeState } from './challengeStore'
import './samuraiStackChallenge.css'

const LESSON_PAGES = [
  {
    eyebrow: 'SAMURAI • STACK OPERATIONS',
    title: "The Dojo's Lost Scrolls",
    body: 'The dojo keeps its most important scrolls in a single tower. A scroll can only be handled from the top. The newest scroll always rests above the ones placed before it.',
    rule: 'LIFO — Last In, First Out',
    detail: 'The last scroll pushed onto the tower is the first scroll that can be removed.',
  },
  {
    eyebrow: 'THE THREE MOVES',
    title: 'Push, Peek and Pop',
    body: 'Push places a scroll on TOP. Peek reads the scroll at TOP without changing the tower. Pop removes the scroll at TOP and reveals the one below it.',
    rule: 'Peek does not remove anything',
    detail: 'Only Pop changes the tower when you are inspecting its top scroll.',
  },
  {
    eyebrow: 'A RULE OF THE DOJO',
    title: 'The Top-Only Rule',
    body: 'You cannot reach through the tower to grab a lower scroll. Remove the scrolls above it one at a time. Trying to Pop an empty tower is called stack underflow.',
    rule: 'One top. One move at a time.',
    detail: 'Study the order, then prove you understand it in the three-question quiz and the Scroll Tower trial.',
  },
] as const

export function SamuraiStackLesson() {
  const challenge = useChallengeState()
  if (challenge.activeChallenge !== 'samurai-stack-lesson') return null

  const page = LESSON_PAGES[challenge.stackLessonPageIndex] ?? LESSON_PAGES[0]
  const isLastPage = challenge.stackLessonPageIndex === LESSON_PAGES.length - 1

  return (
    <div className="array-challenge-overlay samurai-stack-overlay" role="dialog" aria-modal="true" aria-label="Samurai Stack Operations lesson">
      <section className="array-challenge-panel samurai-stack-panel samurai-stack-lesson-panel">
        <header className="array-challenge-header">
          <div>
            <p className="array-challenge-eyebrow">{page.eyebrow}</p>
            <h2>{page.title}</h2>
          </div>
          <button
            type="button"
            className="array-challenge-close"
            aria-label="Close Samurai lesson"
            onClick={() => challengeStore.closeChallenge(false)}
          >
            ×
          </button>
        </header>

        <p className="samurai-stack-page-count">LESSON {challenge.stackLessonPageIndex + 1} OF {LESSON_PAGES.length}</p>
        <section className="samurai-stack-lesson-copy">
          <p>{page.body}</p>
          <div className="samurai-stack-rule-card">
            <strong>{page.rule}</strong>
            <span>{page.detail}</span>
          </div>
        </section>

        <div className="samurai-stack-lesson-footer">
          <div className="samurai-stack-page-dots" aria-label={"Lesson page " + (challenge.stackLessonPageIndex + 1) + " of " + LESSON_PAGES.length}>
            {LESSON_PAGES.map((lessonPage, index) => (
              <span key={lessonPage.title} className={index <= challenge.stackLessonPageIndex ? 'is-active' : ''} />
            ))}
          </div>
          <button type="button" className="array-challenge-primary" data-testid="samurai-stack-lesson-next" onClick={() => challengeStore.advanceSamuraiStackLesson()}>
            {isLastPage ? 'Begin the stack quiz' : 'Next lesson'}
          </button>
        </div>
      </section>
    </div>
  )
}
