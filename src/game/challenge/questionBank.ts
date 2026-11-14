import type { QuizQuestion } from './challengeTypes'

export type DsaQuestionTopic = 'arrays' | 'stack-operations' | 'queues'

export type TaggedQuizQuestion = QuizQuestion & {
  id: string
  topicId: DsaQuestionTopic
  difficulty: 'easy' | 'medium' | 'hard'
}

type BankQuestionInput = Omit<TaggedQuizQuestion, 'topicId'>

function createBank(topicId: DsaQuestionTopic, questions: readonly BankQuestionInput[]): readonly TaggedQuizQuestion[] {
  return questions.map((question) => ({ ...question, topicId }))
}

export const ARRAY_QUESTION_BANK: readonly TaggedQuizQuestion[] = createBank('arrays', [
  {
    id: 'starting-index', difficulty: 'easy',
    prompt: 'What index does an array start counting from?',
    options: ['0', '1', '-1'], correctAnswerIndex: 0,
    explanation: 'Array indexing starts at 0, so the first element is at index 0.',
  },
  {
    id: 'first-value', difficulty: 'easy',
    prompt: 'In array [5, 15, 25, 35], what is the value at index 0?',
    options: ['5', '15', '35'], correctAnswerIndex: 0,
    explanation: 'Index 0 is the first position, which holds the value 5.',
  },
  {
    id: 'last-value', difficulty: 'easy',
    prompt: 'In array [5, 15, 25, 35], what is the value at index 3?',
    options: ['25', '35', '5'], correctAnswerIndex: 1,
    explanation: 'Counting from 0 gives 5 at index 0, 15 at 1, 25 at 2, and 35 at 3.',
  },
  {
    id: 'count-elements', difficulty: 'easy',
    prompt: 'How many elements are in the array [7, 14, 21]?',
    options: ['2', '3', '4'], correctAnswerIndex: 1,
    explanation: 'The array contains three values, so it has 3 elements.',
  },
  {
    id: 'position-name', difficulty: 'easy',
    prompt: 'What do we call the position number of an element in an array?',
    options: ['A pointer', 'An index', 'A loop'], correctAnswerIndex: 1,
    explanation: 'The position number used to locate an array element is its index.',
  },
  {
    id: 'array-first-last-index', difficulty: 'easy',
    prompt: 'An array contains 8 values. What is the index of its final value?',
    options: ['8', '7', '6'], correctAnswerIndex: 1,
    explanation: 'For n elements, the final valid index is n - 1. With 8 values, that index is 7.',
  },
  {
    id: 'indexed-access-cost', difficulty: 'medium',
    prompt: 'What is the time complexity of accessing an element by index?',
    options: ['O(1)', 'O(n)', 'O(log n)'], correctAnswerIndex: 0,
    explanation: 'An array can jump straight to a known index, so indexed access is O(1).',
  },
  {
    id: 'middle-insert-shift', difficulty: 'medium',
    prompt: 'When you insert a value in the middle of an array, what happens to the later elements?',
    options: ['They shift right to make room', 'They are deleted', 'They stay in the same positions'], correctAnswerIndex: 0,
    explanation: 'Later values shift one position right so the new value can fit.',
  },
  {
    id: 'index-of-eight', difficulty: 'medium',
    prompt: 'In array [2, 4, 6, 8, 10], what index holds the value 8?',
    options: ['2', '3', '4'], correctAnswerIndex: 1,
    explanation: 'The first value is at index 0, so 8 is at index 3.',
  },
  {
    id: 'middle-insert-cost', difficulty: 'medium',
    prompt: 'Why is inserting in the middle of an array considered O(n)?',
    options: ['Some later elements may all need to shift', 'The array checks every possible value', 'The array always sorts itself'], correctAnswerIndex: 0,
    explanation: 'In the worst case, many later values shift, and the work grows with n.',
  },
  {
    id: 'array-update-complexity', difficulty: 'medium',
    prompt: 'What is the usual time complexity of replacing a value at a known array index?',
    options: ['O(n)', 'O(1)', 'O(log n)'], correctAnswerIndex: 1,
    explanation: 'A known index points directly to one slot, so updating that value takes O(1) time.',
  },
  {
    id: 'array-delete-shift-count', difficulty: 'medium',
    prompt: 'You delete the first value from an array of 5 elements. How many existing values must shift left?',
    options: ['0', '4', '5'], correctAnswerIndex: 1,
    explanation: 'The four values after index 0 shift left to fill the removed slot.',
  },
  {
    id: 'array-out-of-bounds', difficulty: 'hard',
    prompt: 'An array has 6 elements. Which index is invalid?',
    options: ['5', '0', '6'], correctAnswerIndex: 2,
    explanation: 'A six-element array uses indices 0 through 5. Index 6 is outside the array.',
  },
  {
    id: 'array-update-vs-insert', difficulty: 'hard',
    prompt: 'You replace the value at index 3 without changing the array length. What is the usual time complexity?',
    options: ['O(1)', 'O(n)', 'O(log n)'], correctAnswerIndex: 0,
    explanation: 'Updating a known index changes one slot directly, so it takes constant time.',
  },
  {
    id: 'array-shift-worst-case', difficulty: 'hard',
    prompt: 'For an array of n elements, where can insertion require the most shifting?',
    options: ['At the first index', 'At the final index', 'At no index'], correctAnswerIndex: 0,
    explanation: 'Inserting at index 0 may shift all n existing elements one position right.',
  },
  {
    id: 'array-delete-shift', difficulty: 'hard',
    prompt: 'After deleting the element at index 1, what must happen to keep the array contiguous?',
    options: ['Later values shift left', 'Earlier values shift right', 'The array becomes a linked list'], correctAnswerIndex: 0,
    explanation: 'Elements after the removed slot shift left to fill the gap.',
  },
  {
    id: 'array-linear-search-checks', difficulty: 'hard',
    prompt: 'In the worst case, how many comparisons can a linear search make in an array of n values?',
    options: ['1', 'log₂ n', 'n'], correctAnswerIndex: 2,
    explanation: 'If the value is last or absent, linear search may inspect every one of the n elements.',
  },
  {
    id: 'array-empty-last-index', difficulty: 'hard',
    prompt: 'An array is empty. Which statement about its final valid index is correct?',
    options: ['It is 0', 'It is -1, so no valid index exists', 'It is 1'], correctAnswerIndex: 1,
    explanation: 'An empty array has length 0, so length - 1 is -1 and no index can be accessed.',
  },
])

export const STACK_QUESTION_BANK: readonly TaggedQuizQuestion[] = createBank('stack-operations', [
  { id: 'stack-lifo', difficulty: 'easy', prompt: 'Which rule describes a stack?', options: ['FIFO — First In, First Out', 'LIFO — Last In, First Out', 'Random access'], correctAnswerIndex: 1, explanation: 'A stack removes the most recently added item first, which is LIFO.' },
  { id: 'stack-push-name', difficulty: 'easy', prompt: 'Which operation adds an item to the top of a stack?', options: ['Push', 'Pop', 'Dequeue'], correctAnswerIndex: 0, explanation: 'Push places a new item on the top of a stack.' },
  { id: 'stack-pop-name', difficulty: 'easy', prompt: 'Which operation removes the top item from a stack?', options: ['Peek', 'Pop', 'Enqueue'], correctAnswerIndex: 1, explanation: 'Pop removes and returns the current top item.' },
  { id: 'stack-top-name', difficulty: 'easy', prompt: 'What does the TOP marker identify?', options: ['The oldest item', 'The number of stacks', 'The item that would be removed next'], correctAnswerIndex: 2, explanation: 'TOP points to the most recently pushed item, which a pop would remove.' },
  { id: 'stack-peek-purpose', difficulty: 'easy', prompt: 'What does peek() do to a non-empty stack?', options: ['Reads the top item without removing it', 'Removes the bottom item', 'Adds a new item'], correctAnswerIndex: 0, explanation: 'Peek inspects the top value and leaves the stack unchanged.' },
  { id: 'stack-only-top', difficulty: 'easy', prompt: 'A stack contains [red, blue, green] from bottom to top. Which item is directly accessible?', options: ['Red', 'Blue', 'Green'], correctAnswerIndex: 2, explanation: 'Only the top item, green, can be popped or peeked at directly.' },
  { id: 'stack-push-pop-sequence', difficulty: 'medium', prompt: 'Start with an empty stack. Perform push(4), push(9), pop(). What remains at the top?', options: ['4', '9', 'The stack is empty'], correctAnswerIndex: 0, explanation: 'Pop removes 9, the last value pushed. The earlier value 4 becomes the top.' },
  { id: 'stack-peek-no-change', difficulty: 'medium', prompt: 'A stack is [2, 5, 8] from bottom to top. After peek(), what is the stack?', options: ['[2, 5]', '[2, 5, 8]', '[5, 8]'], correctAnswerIndex: 1, explanation: 'Peek only reads 8. It does not remove or add any item.' },
  { id: 'stack-push-count', difficulty: 'medium', prompt: 'How many values are in a stack after push(3), push(6), push(9), pop()?', options: ['1', '2', '3'], correctAnswerIndex: 1, explanation: 'Three pushes add three values and one pop removes one, leaving two.' },
  { id: 'stack-push-complexity', difficulty: 'medium', prompt: 'What is the usual time complexity of push on a stack?', options: ['O(1)', 'O(n)', 'O(log n)'], correctAnswerIndex: 0, explanation: 'A push updates the top of the stack, so the operation is O(1) in the usual stack model.' },
  { id: 'stack-underflow-meaning', difficulty: 'medium', prompt: 'What is stack underflow?', options: ['Pushing onto a full stack', 'Trying to pop from an empty stack', 'Reading the top of a non-empty stack'], correctAnswerIndex: 1, explanation: 'Underflow occurs when a removal is attempted while the stack has no items.' },
  { id: 'stack-final-top', difficulty: 'medium', prompt: 'Start with [10] and run push(20), push(30), pop(). Which value is on top?', options: ['10', '20', '30'], correctAnswerIndex: 1, explanation: 'Pop removes 30, leaving 20 at the top above 10.' },
  { id: 'stack-two-pops-order', difficulty: 'hard', prompt: 'Run push(1), push(2), push(3), pop(), pop(). Which value is returned by the second pop?', options: ['1', '2', '3'], correctAnswerIndex: 1, explanation: 'The first pop returns 3. The next pop returns 2 because it is now on top.' },
  { id: 'stack-balanced-brackets', difficulty: 'hard', prompt: 'Why is a stack useful for checking matching parentheses?', options: ['The most recent opening bracket must match first', 'It sorts brackets alphabetically', 'It stores only one bracket'], correctAnswerIndex: 0, explanation: 'Nested brackets close in reverse order of opening, which matches the LIFO rule.' },
  { id: 'stack-multiple-peeks', difficulty: 'hard', prompt: 'A stack is [4, 7, 11] from bottom to top. You call peek() twice, then pop(). What is returned?', options: ['4', '7', '11'], correctAnswerIndex: 2, explanation: 'Both peeks leave the stack unchanged, so 11 is still on top when pop runs.' },
  { id: 'stack-recursion-frame', difficulty: 'hard', prompt: 'How are active function calls commonly managed while a program runs recursively?', options: ['With a stack of call frames', 'With a FIFO queue only', 'By sorting function names'], correctAnswerIndex: 0, explanation: 'Each call adds a frame; returning removes the most recent frame first.' },
  { id: 'stack-pop-order', difficulty: 'hard', prompt: 'Push A, then B, then C. If all three are popped, what is the removal order?', options: ['A, B, C', 'C, B, A', 'B, A, C'], correctAnswerIndex: 1, explanation: 'A stack is LIFO, so the reverse of the push order is the pop order.' },
  { id: 'stack-pop-complexity', difficulty: 'hard', prompt: 'For a stack implemented with a linked list that keeps a head pointer at TOP, what is pop() complexity?', options: ['O(1)', 'O(n)', 'O(n log n)'], correctAnswerIndex: 0, explanation: 'Removing the head node and advancing TOP takes constant time.' },
])

export const QUEUE_QUESTION_BANK: readonly TaggedQuizQuestion[] = createBank('queues', [
  { id: 'queue-fifo', difficulty: 'easy', prompt: 'Which rule describes a standard queue?', options: ['LIFO — Last In, First Out', 'FIFO — First In, First Out', 'Highest number first'], correctAnswerIndex: 1, explanation: 'A queue serves the earliest item first, following FIFO order.' },
  { id: 'queue-enqueue-name', difficulty: 'easy', prompt: 'Which operation adds a new item to the back of a queue?', options: ['Enqueue', 'Dequeue', 'Pop'], correctAnswerIndex: 0, explanation: 'Enqueue inserts a new item at the rear of the queue.' },
  { id: 'queue-dequeue-name', difficulty: 'easy', prompt: 'Which operation removes an item from a standard queue?', options: ['Push', 'Peek', 'Dequeue'], correctAnswerIndex: 2, explanation: 'Dequeue removes the item at the front of the queue.' },
  { id: 'queue-front-meaning', difficulty: 'easy', prompt: 'What does FRONT point to in a queue?', options: ['The next item to be served', 'The newest item added', 'The queue capacity'], correctAnswerIndex: 0, explanation: 'FRONT identifies the oldest waiting item, which is removed next.' },
  { id: 'queue-rear-meaning', difficulty: 'easy', prompt: 'Where is a newly enqueued item placed?', options: ['At the front', 'At the rear', 'In the middle'], correctAnswerIndex: 1, explanation: 'New arrivals join at the rear so earlier arrivals remain ahead of them.' },
  { id: 'queue-empty', difficulty: 'easy', prompt: 'What is the length of an empty queue?', options: ['0', '1', '-1'], correctAnswerIndex: 0, explanation: 'An empty queue contains no items, so its length is zero.' },
  { id: 'queue-fifo-sequence', difficulty: 'medium', prompt: 'Start empty. Enqueue 5, enqueue 8, dequeue(). Which value is removed?', options: ['5', '8', 'Neither'], correctAnswerIndex: 0, explanation: 'The first value enqueued, 5, is at the front and leaves first.' },
  { id: 'queue-front-peek', difficulty: 'medium', prompt: 'A queue is [12, 24, 36] from front to rear. What does reading FRONT return?', options: ['36', '24', '12'], correctAnswerIndex: 2, explanation: 'FRONT identifies the oldest waiting value, 12.' },
  { id: 'queue-length-operations', difficulty: 'medium', prompt: 'An empty queue receives three enqueues and one dequeue. How many values remain?', options: ['1', '2', '3'], correctAnswerIndex: 1, explanation: 'Three arrivals add three values; one removal leaves two.' },
  { id: 'queue-enqueue-complexity', difficulty: 'medium', prompt: 'What is enqueue() time complexity when a queue maintains a rear pointer?', options: ['O(1)', 'O(n)', 'O(log n)'], correctAnswerIndex: 0, explanation: 'A rear pointer lets the queue append a new item directly in O(1) time.' },
  { id: 'queue-underflow', difficulty: 'medium', prompt: 'What happens if dequeue() is called while a queue is empty?', options: ['Overflow', 'Underflow', 'The queue sorts itself'], correctAnswerIndex: 1, explanation: 'Removing from an empty queue is an underflow condition.' },
  { id: 'queue-order-with-arrival', difficulty: 'medium', prompt: 'People arrive in order Ana, Bo, Chen. Who is served second?', options: ['Ana', 'Bo', 'Chen'], correctAnswerIndex: 1, explanation: 'FIFO serves Ana first, then Bo, then Chen.' },
  { id: 'queue-two-dequeues', difficulty: 'hard', prompt: 'Enqueue 2, 4, 6, 8, then dequeue twice. What is FRONT now?', options: ['2', '4', '6'], correctAnswerIndex: 2, explanation: 'The two dequeues remove 2 and 4, leaving 6 at the front.' },
  { id: 'queue-rear-after-dequeue', difficulty: 'hard', prompt: 'A queue contains [3, 6, 9]. Dequeue once, then enqueue 12. What is the rear value?', options: ['6', '9', '12'], correctAnswerIndex: 2, explanation: 'Dequeue removes 3 from the front; enqueue adds 12 at the rear.' },
  { id: 'queue-capacity-overflow', difficulty: 'hard', prompt: 'A queue has capacity 4 and already contains four items. What should happen to a fifth enqueue?', options: ['It is rejected as overflow', 'It removes the front automatically', 'It replaces the rear silently'], correctAnswerIndex: 0, explanation: 'A bounded queue cannot accept more than its capacity; the extra enqueue is overflow.' },
  { id: 'queue-circular-purpose', difficulty: 'hard', prompt: 'What problem does a circular array queue help avoid?', options: ['Unused spaces at the beginning of a fixed array after dequeues', 'The FIFO rule', 'Storing more than one item'], correctAnswerIndex: 0, explanation: 'A circular queue reuses freed positions by wrapping the rear index to the start.' },
  { id: 'queue-dequeue-complexity', difficulty: 'hard', prompt: 'For a linked-list queue with a front pointer, what is dequeue() complexity?', options: ['O(1)', 'O(n)', 'O(n²)'], correctAnswerIndex: 0, explanation: 'Removing the front node and moving the front pointer takes constant time.' },
  { id: 'queue-fifo-simulation', difficulty: 'hard', prompt: 'Run enqueue(A), enqueue(B), dequeue(), enqueue(C), dequeue(). Which value remains?', options: ['A', 'B', 'C'], correctAnswerIndex: 2, explanation: 'The first dequeue removes A; the second removes B, leaving C in the queue.' },
])

export const TOPIC_QUESTION_BANKS = {
  arrays: ARRAY_QUESTION_BANK,
  'stack-operations': STACK_QUESTION_BANK,
  queues: QUEUE_QUESTION_BANK,
} as const satisfies Record<DsaQuestionTopic, readonly TaggedQuizQuestion[]>

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

/** Select one Easy, one Medium and one Hard question for a topic attempt. */
export function selectTopicQuizQuestions(
  topicId: DsaQuestionTopic,
  previousQuestionIds: readonly string[] = [],
  random: () => number = Math.random,
): TaggedQuizQuestion[] {
  const bank = TOPIC_QUESTION_BANKS[topicId]
  const previous = new Set(previousQuestionIds)
  const pickFromTier = (difficulty: TaggedQuizQuestion['difficulty']) => {
    const tier = bank.filter((question) => question.difficulty === difficulty)
    if (tier.length === 0) throw new Error(`Question bank has no ${difficulty} questions for ${topicId}.`)
    const unused = tier.filter((question) => !previous.has(question.id))
    return shuffle(unused.length > 0 ? unused : tier, random)[0]
  }
  return [pickFromTier('easy'), pickFromTier('medium'), pickFromTier('hard')]
}

/** Backwards-compatible selector for the existing Arrays quiz route. */
export function selectArrayQuizQuestions(
  previousQuestionIds: readonly string[] = [],
  random: () => number = Math.random,
): TaggedQuizQuestion[] {
  return selectTopicQuizQuestions('arrays', previousQuestionIds, random)
}

export function selectStackQuizQuestions(
  previousQuestionIds: readonly string[] = [],
  random: () => number = Math.random,
): TaggedQuizQuestion[] {
  return selectTopicQuizQuestions('stack-operations', previousQuestionIds, random)
}

export function selectQueueQuizQuestions(
  previousQuestionIds: readonly string[] = [],
  random: () => number = Math.random,
): TaggedQuizQuestion[] {
  return selectTopicQuizQuestions('queues', previousQuestionIds, random)
}
