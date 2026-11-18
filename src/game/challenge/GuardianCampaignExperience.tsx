import { useState } from 'react'
import type { GuardianCampaignTopicId } from './challengeTypes'
import { CampaignChallengeFrame } from './CampaignChallengeFrame'
import { challengeStore, useChallengeState } from './challengeStore'
import { createLinkedList, relinkLinkedList, traverseLinkedList } from './linkedListCampaign'
import { applyBinarySearchStep, getBinarySearchStep, inspectLinearCandidate } from './searchingCampaign'
import { compareAdjacentAndSwap, isSortedAscending } from './sortingCampaign'
import { getTreeTraversal, insertBstNode, type BinarySearchTreeNode, type TreeTraversalOrder } from './treeCampaign'
import './guardianCampaignExperience.css'

type Question = {
  difficulty: 'easy' | 'medium'
  prompt: string
  answers: string[]
  correct: number
  explanation: string
}

const TOPICS: Record<GuardianCampaignTopicId, {
  npc: string
  title: string
  lesson: [string, string]
  questions: Question[]
}> = {
  'linked-lists': {
    npc: 'Monk',
    title: 'The Living Chain',
    lesson: [
      'A linked list is a chain of nodes. Each node stores a value and a link to the next node. The first node is the head; the final node points to null.',
      'Unlike an array, nodes do not need to sit next to each other in memory. To insert or remove a node, change the links carefully and keep every node reachable from the head.',
    ],
    questions: [
      { difficulty: 'easy', prompt: 'What does the head of a linked list identify?', answers: ['The first node', 'The last node', 'The middle node', 'The list length'], correct: 0, explanation: 'Head is the reference to the first node in the chain.' },
      { difficulty: 'easy', prompt: 'What should the next link of the final node contain?', answers: ['The head', 'Null', 'Zero', 'Its own value'], correct: 1, explanation: 'A null next pointer marks the end of a singly linked list.' },
      { difficulty: 'medium', prompt: 'After inserting a node between A and B, which links are required?', answers: ['A → new and new → B', 'B → A only', 'new → A and B → new', 'No link changes'], correct: 0, explanation: 'The predecessor must point to the new node, and the new node must point to the original successor.' },
    ],
  },
  searching: {
    npc: 'Merchant',
    title: 'The Merchant’s Lost Parcel',
    lesson: [
      'Linear search checks values one by one until it finds the target or reaches the end. It works on both sorted and unsorted collections.',
      'Binary search only works when values are sorted. Each comparison checks the middle value, then discards the half that cannot contain the target.',
    ],
    questions: [
      { difficulty: 'easy', prompt: 'Which search can work on an unsorted list?', answers: ['Binary search', 'Linear search', 'Neither', 'Only tree search'], correct: 1, explanation: 'Linear search does not rely on ordering.' },
      { difficulty: 'easy', prompt: 'What must be true before binary search begins?', answers: ['The list is sorted', 'The list has even length', 'The target is first', 'The values are unique'], correct: 0, explanation: 'Binary search relies on sorted order to discard half the remaining range.' },
      { difficulty: 'medium', prompt: 'If the target is larger than the midpoint value, what happens next?', answers: ['Search the lower half', 'Search the upper half', 'Restart at index zero', 'Sort the list again'], correct: 1, explanation: 'The lower half can be discarded because the data is sorted.' },
    ],
  },
  sorting: {
    npc: 'Red Ninja',
    title: 'The Order Keeper',
    lesson: [
      'Bubble Sort repeatedly compares neighbouring values. When a pair is out of order, swap those two neighbours. Larger values gradually move towards the end.',
      'You may only compare and swap adjacent items. You cannot move one item directly to any position or swap distant elements.',
    ],
    questions: [
      { difficulty: 'easy', prompt: 'Which pair may Bubble Sort compare in one step?', answers: ['Index 0 and index 3', 'Two adjacent values', 'The first and last values', 'Any two selected values'], correct: 1, explanation: 'Bubble Sort compares adjacent values only.' },
      { difficulty: 'easy', prompt: 'When should an ascending pair be swapped?', answers: ['Always', 'When left is smaller', 'When left is greater than right', 'Never compare it'], correct: 2, explanation: 'Swap only when the left value is greater than the right value.' },
      { difficulty: 'medium', prompt: 'What does a complete left-to-right pass guarantee?', answers: ['The smallest value reaches the start', 'The largest unsorted value reaches the end', 'All values become equal', 'The array is reversed'], correct: 1, explanation: 'The largest value in the unsorted portion bubbles to its final position.' },
    ],
  },
  trees: {
    npc: 'Shaman',
    title: 'The Shrine of Branches',
    lesson: [
      'A tree is made of nodes connected by parent and child relationships. A binary search tree places smaller values to the left and larger values to the right.',
      'Traversal order changes when a node is visited: preorder is root-left-right, inorder is left-root-right, and postorder is left-right-root.',
    ],
    questions: [
      { difficulty: 'easy', prompt: 'What is the root of a tree?', answers: ['A node with no parent', 'A node with no children', 'The smallest leaf', 'The last inserted node'], correct: 0, explanation: 'The root is the topmost node and has no parent.' },
      { difficulty: 'easy', prompt: 'In a binary search tree, where are smaller values placed?', answers: ['Right subtree', 'Left subtree', 'Only at leaves', 'Outside the tree'], correct: 1, explanation: 'Smaller values are placed in the left subtree.' },
      { difficulty: 'medium', prompt: 'Which order describes inorder traversal?', answers: ['Root, left, right', 'Right, left, root', 'Left, root, right', 'Left, right, root'], correct: 2, explanation: 'Inorder visits the left subtree, then root, then right subtree.' },
    ],
  },
}

const LINKED_NODES = createLinkedList([12, 7, 21])
const LINKED_TARGETS = [['node-1', 'node-0', 'node-2'], ['node-2', 'node-0', 'node-1']]
const SEARCH_LINEAR_VALUES = [4, 11, 17, 23, 31]
const SEARCH_BINARY_VALUES = [3, 8, 12, 19, 27, 34, 41]
const SORT_STARTS = [[7, 3, 5, 1], [6, 2, 5, 1, 4]]
const TREE_INSERT_VALUES = [8, 4, 12, 2, 6]
const TREE_ORDERS: TreeTraversalOrder[] = ['preorder', 'inorder', 'postorder']

export function GuardianCampaignExperience() {
  const challenge = useChallengeState()
  const topicId = challenge.guardianCampaignTopicId
  const mode = challenge.guardianCampaignMode ?? 'mastery'
  const topic = topicId ? TOPICS[topicId] : null

  const [stage, setStage] = useState<'lesson' | 'quiz' | 'quiz-result' | 'challenge' | 'success'>(mode === 'relic' ? 'quiz' : 'lesson')
  const [lessonPage, setLessonPage] = useState(0)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizCorrect, setQuizCorrect] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answerShown, setAnswerShown] = useState(false)
  const [quizPassed, setQuizPassed] = useState(false)
  const [invalidActions, setInvalidActions] = useState(0)
  const [round, setRound] = useState(0)
  const [linkedOrder, setLinkedOrder] = useState(['node-0', 'node-1', 'node-2'])
  const [searchIndex, setSearchIndex] = useState(0)
  const [binaryLow, setBinaryLow] = useState(0)
  const [binaryHigh, setBinaryHigh] = useState(SEARCH_BINARY_VALUES.length - 1)
  const [sortValues, setSortValues] = useState<number[]>([...SORT_STARTS[0]])
  const [sortIndex, setSortIndex] = useState(0)
  const [treeRoot, setTreeRoot] = useState<BinarySearchTreeNode | null>(null)
  const [treeInsertIndex, setTreeInsertIndex] = useState(0)
  const [treeOrderIndex, setTreeOrderIndex] = useState(0)
  const [treeTraversalIndex, setTreeTraversalIndex] = useState(0)
  const [feedback, setFeedback] = useState('')

  if (!topicId || !topic) return null

  const currentQuestion = topic.questions[quizIndex]
  const close = () => challengeStore.finishGuardianCampaignExperience(topicId, false, 0, invalidActions)
  const retryQuiz = () => {
    setQuizIndex(0)
    setQuizCorrect(0)
    setSelectedAnswer(null)
    setAnswerShown(false)
    setQuizPassed(false)
    setStage('quiz')
  }
  const answer = () => {
    if (selectedAnswer === null || answerShown || !currentQuestion) return
    const correct = selectedAnswer === currentQuestion.correct
    setQuizCorrect((count) => count + (correct ? 1 : 0))
    setAnswerShown(true)
    if (!correct) setInvalidActions((count) => count + 1)
    setFeedback(correct ? 'Correct.' : 'Not quite. Review the explanation, then continue.')
  }
  const nextQuestion = () => {
    if (!answerShown || !currentQuestion) return
    if (quizIndex < topic.questions.length - 1) {
      setQuizIndex((index) => index + 1)
      setSelectedAnswer(null)
      setAnswerShown(false)
      setFeedback('')
      return
    }
    const passed = quizCorrect >= 2
    setQuizPassed(passed)
    setAnswerShown(false)
    setFeedback(passed
      ? 'Practice complete. You are ready for the next stage.'
      : 'You need at least two correct answers. Review the feedback and retry the practice.')
    setStage('quiz-result')
  }

  const showSuccess = () => setStage('success')
  const finish = () => challengeStore.finishGuardianCampaignExperience(topicId, true, 0, invalidActions)

  const moveLinked = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= linkedOrder.length) return
    setLinkedOrder((order) => {
      const next = [...order]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }
  const checkLinked = () => {
    const order = LINKED_TARGETS[round]
    const relinked = relinkLinkedList(LINKED_NODES, linkedOrder)
    const values = relinked ? traverseLinkedList(relinked, order[0]) : []
    const expected = order.map((id) => LINKED_NODES.find((node) => node.id === id)?.value)
    if (values.length === expected.length && values.every((value, index) => value === expected[index])) {
      setFeedback('The head and next links now form the required chain.')
      if (round === 0) {
        setRound(1)
        setLinkedOrder(['node-0', 'node-1', 'node-2'])
      } else showSuccess()
    } else {
      setInvalidActions((count) => count + 1)
      setFeedback('Follow the required node order and keep every node linked from Head.')
    }
  }

  const inspectLinear = () => {
    const step = inspectLinearCandidate(SEARCH_LINEAR_VALUES, 23, searchIndex)
    if (!step) return
    setFeedback('Inspected index ' + step.index + ': ' + step.value + '.')
    if (step.found) {
      setRound(1)
      setBinaryLow(0)
      setBinaryHigh(SEARCH_BINARY_VALUES.length - 1)
      setFeedback('Linear Search found the parcel. Now use Binary Search on the sorted manifest.')
    } else setSearchIndex((index) => index + 1)
  }
  const inspectBinary = () => {
    const step = getBinarySearchStep(SEARCH_BINARY_VALUES, binaryLow, binaryHigh, 27)
    if (!step) {
      setFeedback('The remaining search range is empty. Restart the search trial.')
      setInvalidActions((count) => count + 1)
      setBinaryLow(0)
      setBinaryHigh(SEARCH_BINARY_VALUES.length - 1)
      return
    }
    setFeedback('Middle index ' + step.midpoint + ' contains ' + step.midpointValue + '.')
    const next = applyBinarySearchStep(binaryLow, binaryHigh, step)
    if (next.found) showSuccess()
    else {
      setBinaryLow(next.low)
      setBinaryHigh(next.high)
    }
  }

  const sortNextPair = () => {
    const result = compareAdjacentAndSwap(sortValues, sortIndex)
    if (!result) return
    setSortValues(result.values)
    setFeedback('Compared ' + result.leftValue + ' and ' + result.rightValue + (result.swapped ? '. Swapped adjacent values.' : '. They are already in ascending order.'))
    if (isSortedAscending(result.values)) {
      if (round === 0) {
        setRound(1)
        setSortValues([...SORT_STARTS[1]])
        setSortIndex(0)
        setFeedback('Guided pass complete. Begin the independent sort.')
      } else showSuccess()
    } else setSortIndex((index) => index + 1 >= sortValues.length - 1 ? 0 : index + 1)
  }

  const insertTreeValue = () => {
    const value = TREE_INSERT_VALUES[treeInsertIndex]
    if (value === undefined) return
    setTreeRoot((root) => insertBstNode(root, value))
    setTreeInsertIndex((index) => index + 1)
    setFeedback('Inserted ' + value + ' by following the smaller-left, larger-right rule.')
  }
  const selectTreeVisit = (value: number) => {
    if (!treeRoot) return
    const order = TREE_ORDERS[treeOrderIndex]
    const traversal = getTreeTraversal(treeRoot, order)
    const expected = traversal[treeTraversalIndex]
    if (value !== expected) {
      setInvalidActions((count) => count + 1)
      setFeedback('That is not the next node in ' + order + ' traversal. Follow the traversal rule.')
      return
    }
    const nextIndex = treeTraversalIndex + 1
    if (nextIndex >= traversal.length) {
      if (treeOrderIndex === TREE_ORDERS.length - 1) showSuccess()
      else {
        setTreeOrderIndex((index) => index + 1)
        setTreeTraversalIndex(0)
        setFeedback('Traversal complete. Continue with ' + TREE_ORDERS[treeOrderIndex + 1] + '.')
      }
    } else {
      setTreeTraversalIndex(nextIndex)
      setFeedback('Correct node. Continue the traversal.')
    }
  }

  const renderQuiz = () => (
    <div className="guardian-exp-section">
      <p className="guardian-exp-kicker">Knowledge check · Question {quizIndex + 1} of {topic.questions.length}</p>
      <h3>{currentQuestion?.prompt}</h3>
      <div className="guardian-exp-options">
        {currentQuestion?.answers.map((item, index) => (
          <button key={item} type="button" className={selectedAnswer === index ? 'is-selected' : ''} disabled={answerShown} onClick={() => setSelectedAnswer(index)}>
            {item}
          </button>
        ))}
      </div>
      {!answerShown && (
        <div className="guardian-exp-feedback">
          <button
            type="button"
            className="guardian-exp-primary"
            disabled={selectedAnswer === null}
            onClick={answer}
          >
            Check answer
          </button>
        </div>
      )}
      {answerShown && currentQuestion && (
        <div className="guardian-exp-feedback" aria-live="polite">
          <strong>{feedback}</strong>
          <p>{currentQuestion.explanation}</p>
          <button type="button" className="guardian-exp-primary" onClick={nextQuestion}>
            {quizIndex === topic.questions.length - 1 ? 'See practice result' : 'Next question'}
          </button>
        </div>
      )}
    </div>
  )

  const renderQuizResult = () => (
    <div className="guardian-exp-section" data-testid="guardian-exp-quiz-result">
      <p className="guardian-exp-kicker">Practice result</p>
      <h3>{quizPassed ? 'Knowledge check passed' : 'One more practice round'}</h3>
      <p>
        You answered {quizCorrect} of {topic.questions.length} questions correctly.
        {quizPassed
          ? ' You can continue to the next stage.'
          : ' Review the explanations, then try the three questions again.'}
      </p>
      {quizPassed ? (
        <button
          type="button"
          className="guardian-exp-primary"
          onClick={() => setStage(mode === 'relic' ? 'success' : 'challenge')}
        >
          {mode === 'relic' ? 'Continue to knowledge reward' : 'Start implementation challenge'}
        </button>
      ) : (
        <button type="button" className="guardian-exp-primary" onClick={retryQuiz}>
          Retry practice questions
        </button>
      )}
    </div>
  )

  const renderImplementation = () => {
    if (topicId === 'linked-lists') {
      const target = LINKED_TARGETS[round]
      return (
        <div className="guardian-exp-section">
          <p className="guardian-exp-kicker">Monk · Linked List {round === 0 ? 'Guided Practice' : 'Independent Trial'}</p>
          <h3>Reconnect the nodes in this order: {target.map((id) => LINKED_NODES.find((node) => node.id === id)?.value).join(' → ')}</h3>
          <p>Move nodes using the arrows. Then confirm the head and next pointers.</p>
          <ol className="guardian-exp-node-list">
            {linkedOrder.map((id, index) => {
              const node = LINKED_NODES.find((item) => item.id === id)!
              return <li key={id}><strong>{node.value}</strong><span>Node {index + 1}</span><button type="button" disabled={index === 0} onClick={() => moveLinked(index, -1)}>Move up</button><button type="button" disabled={index === linkedOrder.length - 1} onClick={() => moveLinked(index, 1)}>Move down</button></li>
            })}
          </ol>
          <button className="guardian-exp-primary" type="button" onClick={checkLinked}>Confirm links</button>
          <p className="guardian-exp-feedback">{feedback}</p>
        </div>
      )
    }
    if (topicId === 'searching') {
      return (
        <div className="guardian-exp-section">
          <p className="guardian-exp-kicker">Merchant · {round === 0 ? 'Linear Search' : 'Binary Search'}</p>
          <h3>Find the parcel labelled {round === 0 ? '23' : '27'}.</h3>
          <p>{round === 0 ? 'Inspect each manifest value from left to right.' : 'The manifest is sorted. Compare the middle value and narrow the remaining range.'}</p>
          <div className="guardian-exp-values">{(round === 0 ? SEARCH_LINEAR_VALUES : SEARCH_BINARY_VALUES).map((value, index) => <span key={value} className={(round === 0 && index === searchIndex) || (round === 1 && index >= binaryLow && index <= binaryHigh) ? 'is-active' : ''}>{value}</span>)}</div>
          <p className="guardian-exp-feedback">{feedback}</p>
          <button className="guardian-exp-primary" type="button" onClick={round === 0 ? inspectLinear : inspectBinary}>{round === 0 ? 'Inspect next value' : 'Compare middle value'}</button>
        </div>
      )
    }
    if (topicId === 'sorting') {
      return (
        <div className="guardian-exp-section">
          <p className="guardian-exp-kicker">Red Ninja · Bubble Sort {round === 0 ? 'Guided Practice' : 'Independent Trial'}</p>
          <h3>Sort these values using neighbouring comparisons only.</h3>
          <div className="guardian-exp-values">{sortValues.map((value, index) => <span key={index} className={index === sortIndex || index === sortIndex + 1 ? 'is-active' : ''}>{value}</span>)}</div>
          <p>Next pair: indices {sortIndex} and {sortIndex + 1}. Do not compare distant values.</p>
          <button className="guardian-exp-primary" type="button" onClick={sortNextPair}>Compare adjacent pair</button>
          <p className="guardian-exp-feedback">{feedback}</p>
        </div>
      )
    }
    const order = TREE_ORDERS[treeOrderIndex]
    const choices = [2, 4, 6, 8, 12]
    return (
      <div className="guardian-exp-section">
        <p className="guardian-exp-kicker">Shaman · Binary Search Tree</p>
        {treeInsertIndex < TREE_INSERT_VALUES.length ? (
          <>
            <h3>Build the shrine tree. Insert {TREE_INSERT_VALUES[treeInsertIndex]} next.</h3>
            <p>Smaller values go left; larger values go right. Add each stone to its correct branch.</p>
            <div className="guardian-exp-tree-values">{TREE_INSERT_VALUES.slice(0, treeInsertIndex).map((value) => <span key={value}>{value}</span>)}</div>
            <button className="guardian-exp-primary" type="button" onClick={insertTreeValue}>Insert {TREE_INSERT_VALUES[treeInsertIndex]}</button>
          </>
        ) : (
          <>
            <h3>Complete {order} traversal. Choose the next node.</h3>
            <p>Root: {treeRoot?.value ?? '—'} · Visit position {treeTraversalIndex + 1} of {treeRoot ? getTreeTraversal(treeRoot, order).length : 0}</p>
            <div className="guardian-exp-values">{choices.map((value) => <button type="button" key={value} onClick={() => selectTreeVisit(value)}>{value}</button>)}</div>
          </>
        )}
        <p className="guardian-exp-feedback">{feedback}</p>
      </div>
    )
  }

  const stageLabel = stage === 'lesson' ? 'Learn' : stage === 'quiz' ? 'Practice' : stage === 'challenge' ? 'Implement' : 'Result'
  const progressLabel = mode === 'relic' ? 'Optional knowledge scroll' : stage === 'lesson' ? 'Lesson ' + (lessonPage + 1) + ' of 2' : stage === 'quiz' ? '3-question check' : 'Guardian trial'

  return (
    <CampaignChallengeFrame
      npcLabel={topic.npc}
      title={mode === 'relic' ? topic.title + ' · Knowledge Scroll' : topic.title}
      ariaLabel={topic.title + ' guardian challenge'}
      stageLabel={stageLabel}
      progressLabel={progressLabel}
      onClose={close}
      closeLabel="Leave guardian challenge"
      closeTestId="guardian-exp-close"
      panelClassName="guardian-exp-panel"
    >
      {stage === 'lesson' && (
        <div className="guardian-exp-section">
          <p className="guardian-exp-kicker">Learn · {topic.title}</p>
          <h3>{lessonPage === 0 ? 'Understand the structure' : 'Apply the rule'}</h3>
          <p>{topic.lesson[lessonPage]}</p>
          <div className="guardian-exp-progress"><span style={{ width: lessonPage === 0 ? '50%' : '100%' }} /></div>
          <button className="guardian-exp-primary" type="button" onClick={() => {
            if (lessonPage === 0) setLessonPage(1)
            else { setStage('quiz'); setQuizIndex(0); setQuizCorrect(0); setSelectedAnswer(null); setAnswerShown(false) }
          }}>{lessonPage === 0 ? 'Next lesson' : 'Start practice questions'}</button>
        </div>
      )}
      {stage === 'quiz' && renderQuiz()}
      {stage === 'quiz-result' && renderQuizResult()}
      {stage === 'challenge' && renderImplementation()}
      {stage === 'success' && (
        <div className="guardian-exp-success" data-testid="guardian-exp-success">
          <p className="guardian-exp-kicker">{mode === 'relic' ? 'Knowledge preserved' : 'Guardian trial complete'}</p>
          <h3>{mode === 'relic' ? 'The blank scroll is filled.' : 'You have mastered ' + topic.title + '.'}</h3>
          <p>{mode === 'relic'
            ? 'Your successful knowledge trial will be recorded in the relic journal.'
            : 'The next guardian is now available. Your XP and campaign relic are recorded by the campaign manager.'}</p>
          <button className="guardian-exp-primary" type="button" onClick={finish}>{mode === 'relic' ? 'Claim guardian reward' : 'Complete guardian trial'}</button>
        </div>
      )}
    </CampaignChallengeFrame>
  )
}
