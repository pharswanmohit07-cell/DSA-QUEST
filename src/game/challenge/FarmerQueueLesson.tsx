import { useState } from 'react'
import { CampaignChallengeFrame } from './CampaignChallengeFrame'
import { challengeStore, useChallengeState } from './challengeStore'
import './samuraiStackChallenge.css'
import './farmerQueueChallenge.css'

const LESSON_PAGES = [
  {
    eyebrow: 'FARMER • QUEUE OPERATIONS',
    title: 'A Line of Village Supplies',
    body: 'A queue is a line where the first parcel that arrives is the first parcel delivered. Imagine villagers waiting at a market counter: nobody who arrives later should jump ahead.',
    rule: 'FIFO — First In, First Out',
    detail: 'The oldest item waits at the FRONT and leaves before newer items.',
  },
  {
    eyebrow: 'LOAD THE SUPPLY CART',
    title: 'Enqueue at the REAR',
    body: 'When a new parcel arrives, add it to the REAR of the line. Existing parcels keep their order. The line grows from the back, never by pushing an older parcel aside.',
    rule: 'Enqueue adds at the REAR',
    detail: 'The newest arrival becomes the last parcel waiting in the queue.',
  },
  {
    eyebrow: 'DISPATCH THE OLDEST PARCEL',
    title: 'Dequeue from the FRONT',
    body: 'The FRONT parcel is the next one to deliver. Dequeue removes that parcel. FRONT and REAR only inspect the ends; they do not remove anything. A bounded queue that is already full rejects another enqueue as overflow.',
    rule: 'Dequeue removes from the FRONT',
    detail: 'Study the order, practise two arrivals and one delivery, then restore the Farmer’s five-stop supply route.',
  },
] as const

const PRACTICE_PARCELS = [
  { value: 12, cargo: 'Rice sack' },
  { value: 24, cargo: 'Medicine kit' },
] as const

export function FarmerQueueLesson() {
  const challenge = useChallengeState()
  const [practiceQueue, setPracticeQueue] = useState<number[]>([])
  const [practiceStep, setPracticeStep] = useState(0)
  const [practiceFeedback, setPracticeFeedback] = useState('Start by loading the first parcel at the rear.')

  if (challenge.activeChallenge !== 'farmer-queue-lesson') return null

  const inPractice = challenge.queueLessonPageIndex >= LESSON_PAGES.length
  const page = LESSON_PAGES[challenge.queueLessonPageIndex] ?? LESSON_PAGES[0]

  const performPracticeAction = () => {
    if (practiceStep === 0) {
      setPracticeQueue([12])
      setPracticeFeedback('Rice sack 12 joined the REAR. It is also the FRONT because it is the only parcel.')
    } else if (practiceStep === 1) {
      setPracticeQueue([12, 24])
      setPracticeFeedback('Medicine kit 24 joined behind 12. Parcel 12 must still be delivered first.')
    } else if (practiceStep === 2) {
      const [delivered, ...waiting] = practiceQueue
      if (delivered !== 12 || waiting[0] !== 24) {
        setPracticeFeedback('Follow FIFO: the oldest parcel, 12, must leave before 24.')
        return
      }
      setPracticeQueue(waiting)
      setPracticeFeedback('Correct! Parcel 12 left from the FRONT. Parcel 24 is now next.')
    }
    setPracticeStep((step) => Math.min(3, step + 1))
  }

  return (
    <CampaignChallengeFrame
      npcLabel={inPractice ? 'FARMER • GUIDED PRACTICE' : page.eyebrow}
      title={inPractice ? 'Load the Supply Cart' : page.title}
      ariaLabel="Farmer Queue Operations lesson"
      stageLabel={inPractice ? 'PRACTICE' : 'LEARN'}
      progressLabel={inPractice
        ? 'PRACTICE ' + Math.min(practiceStep + 1, 3) + ' OF 3'
        : 'LESSON ' + (challenge.queueLessonPageIndex + 1) + ' OF ' + LESSON_PAGES.length}
      onClose={() => challengeStore.closeChallenge(false)}
      closeLabel="Leave Queue lesson"
      closeTestId="farmer-queue-lesson-close"
      overlayClassName="samurai-stack-overlay farmer-queue-overlay"
      panelClassName="samurai-stack-panel farmer-queue-panel"
    >
        {inPractice ? (
          <>
            <section className="farmer-queue-practice-copy">
              <p>Perform the queue operations yourself. Load parcel 12, load parcel 24 behind it, then deliver the FRONT parcel.</p>
              <div className="farmer-queue-practice-board" aria-label="Practice queue">
                {practiceQueue.length === 0 ? (
                  <span className="farmer-queue-practice-empty">The queue is empty</span>
                ) : practiceQueue.map((value, index) => {
                  const parcel = PRACTICE_PARCELS.find((item) => item.value === value)
                  return (
                    <div className="farmer-queue-practice-parcel" key={value}>
                      <small>{index === 0 ? 'FRONT' : 'REAR'}</small>
                      <strong>{parcel?.cargo}</strong>
                      <span>ID {value}</span>
                    </div>
                  )
                })}
              </div>
              <p className="farmer-queue-practice-feedback" role="status" data-testid="farmer-queue-practice-feedback">{practiceFeedback}</p>
            </section>
            {practiceStep < 3 ? (
              <button
                type="button"
                className="array-challenge-primary"
                data-testid="farmer-queue-practice-action"
                onClick={performPracticeAction}
              >
                {['Enqueue parcel 12', 'Enqueue parcel 24', 'Dequeue the FRONT'][practiceStep]}
              </button>
            ) : (
              <div className="farmer-queue-practice-complete" data-testid="farmer-queue-practice-complete">
                <strong>FIFO understood!</strong>
                <span>You loaded two parcels and delivered the oldest one first.</span>
                <button
                  type="button"
                  className="array-challenge-primary"
                  data-testid="farmer-queue-start-delivery"
                  onClick={() => challengeStore.beginFarmerQueueDelivery()}
                >
                  Start the five village deliveries
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <section className="samurai-stack-lesson-copy">
              <p>{page.body}</p>
              <div className="samurai-stack-rule-card">
                <strong>{page.rule}</strong>
                <span>{page.detail}</span>
              </div>
            </section>
            <div className="samurai-stack-lesson-footer">
              <div
                className="samurai-stack-page-dots"
                aria-label={'Lesson page ' + (challenge.queueLessonPageIndex + 1) + ' of ' + LESSON_PAGES.length}
              >
                {LESSON_PAGES.map((lessonPage, index) => (
                  <span key={lessonPage.title} className={index <= challenge.queueLessonPageIndex ? 'is-active' : ''} />
                ))}
              </div>
              <button
                type="button"
                className="array-challenge-primary"
                data-testid="farmer-queue-lesson-next"
                onClick={() => challengeStore.advanceFarmerQueueLesson()}
              >
                {challenge.queueLessonPageIndex + 1 === LESSON_PAGES.length ? 'Start guided practice' : 'Next lesson'}
              </button>
            </div>
          </>
        )}
    </CampaignChallengeFrame>
  )
}
