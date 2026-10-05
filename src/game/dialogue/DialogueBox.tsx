import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useDialogueState } from './dialogueStore'
import type { ArrayLessonVisual, DialogueViewState } from './dialogueTypes'
import './dialogueBox.css'

/** Milliseconds between typewriter character reveals. */
const TYPING_INTERVAL_MS = 6

type DialogueBoxProps = {
  /** Returns an NPC head position relative to the game-world overlay. */
  getAnchorPosition: (npcId: string) => { x: number; y: number } | null
  /**
   * Invoked when the player picks a branch. The scene owns the dialogue tree, so
   * it decides what comes next rather than the UI.
   */
  onChoose: (nextNodeId: string) => void
  /** Invoked when the player advances past a node with no choices. */
  onAdvance: () => void
  /** Invoked when the conversation ends or the player dismisses it. */
  onClose: () => void
}

export function DialogueBox({ getAnchorPosition, onChoose, onAdvance, onClose }: DialogueBoxProps) {
  const state = useDialogueState()
  const overlayRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const npcId = state?.npcId
  const isLesson = state?.lessonMode

  useEffect(() => {
    if (!npcId || isLesson) {
      return
    }

    let animationFrame = 0
    const updateAnchor = () => {
      const position = getAnchorPosition(npcId)
      const overlay = overlayRef.current
      const box = boxRef.current
      if (position && overlay && box) {
        const halfWidth = box.offsetWidth / 2
        const left = Math.min(
          Math.max(position.x, halfWidth + 8),
          overlay.clientWidth - halfWidth - 8,
        )
        const top = Math.min(
          Math.max(position.y, box.offsetHeight + 12),
          overlay.clientHeight - 12,
        )
        box.style.left = `${left}px`
        box.style.top = `${top}px`
        box.dataset.anchorReady = 'true'
      } else if (box) {
        box.dataset.anchorReady = 'false'
      }
      animationFrame = window.requestAnimationFrame(updateAnchor)
    }

    animationFrame = window.requestAnimationFrame(updateAnchor)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [isLesson, npcId, getAnchorPosition])

  if (!state) {
    return null
  }

  // The typewriter state lives in `DialogueNodeView`, which is keyed by
  // node id. React discards that subtree and mounts a fresh one on every node
  // change, so the reveal restarts from zero without a reset effect (which
  // would cost an extra render pass and trip the set-state-in-effect rule).
  return (
    <div
      ref={overlayRef}
      className={`dialogue-overlay${state.lessonMode ? ' is-lesson' : ' is-floating'}`}
      data-testid="dialogue-overlay"
      role="dialog"
      aria-label={`Conversation with ${state.npcName}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <DialogueNodeView
        key={`${state.npcId}:${state.nodeId}`}
        state={state}
        boxRef={boxRef}
        onChoose={onChoose}
        onAdvance={onAdvance}
        onClose={onClose}
      />
    </div>
  )
}

type DialogueNodeViewProps = {
  state: DialogueViewState
  boxRef: RefObject<HTMLDivElement | null>
  onChoose: (nextNodeId: string) => void
  onAdvance: () => void
  onClose: () => void
}

/** Renders one node. Remounted per node, so it owns the typewriter from zero. */
function DialogueNodeView({ state, boxRef, onChoose, onAdvance, onClose }: DialogueNodeViewProps) {
  // Characters revealed so far. Held locally so the typewriter can animate at
  // its own pace without a store write per character.
  const [revealedCount, setRevealedCount] = useState(0)

  const text = state.text
  const finished = revealedCount >= text.length

  useEffect(() => {
    if (finished) {
      return
    }
    const timer = window.setTimeout(() => {
      setRevealedCount((count) => count + 1)
    }, TYPING_INTERVAL_MS)
    return () => window.clearTimeout(timer)
  }, [finished, revealedCount, text])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Enter' && event.key !== ' ') {
        return
      }
      event.preventDefault()
      // A node with choices waits for a button press, so the keys only skip
      // ahead typing or advance a linear node.
      if (state.choices.length > 0) {
        return
      }
      if (!finished) {
        // Finish the line immediately instead of making the player wait.
        setRevealedCount(text.length)
        return
      }
      onAdvance()
    },
    [state.choices.length, finished, onAdvance, onClose, text],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const shown = text.slice(0, revealedCount)

  return (
    <div
      ref={boxRef}
      className={`dialogue-box${state.lessonMode ? ' is-lesson' : ' is-floating'}`}
      data-testid="dialogue-box"
      data-anchor-ready={state.lessonMode ? 'true' : 'false'}
    >
      {state.lessonMode && state.portraitUrl && (
        <div className="dialogue-portrait-frame">
          <img
            className="dialogue-portrait"
            data-testid="dialogue-portrait"
            src={state.portraitUrl}
            alt={`${state.npcName} portrait`}
            width={38}
            height={38}
          />
        </div>
      )}
      <div className="dialogue-body">
        <div
          className="dialogue-name-tag dialogue-speaker-badge"
          data-testid="dialogue-speaker"
        >
          {state.speaker}
          {state.lessonMode && <span className="dialogue-lesson-badge">ARRAY LESSON</span>}
        </div>
        <div className={state.lessonMode ? 'dialogue-lesson-content' : undefined}>
          <p className="dialogue-text" data-testid="dialogue-text">
            {state.lessonMode ? renderLessonText(shown) : shown}
            {!finished && <span className="dialogue-caret">▌</span>}
          </p>

          {state.lessonVisual && <ArrayLessonDiagram visual={state.lessonVisual} />}
        </div>

        {state.choices.length > 0 ? (
          <div className="dialogue-choices" data-testid="dialogue-choices">
            {state.choices.map((choice) => (
              <button
                key={choice.text}
                type="button"
                className="dialogue-choice"
                data-testid={`dialogue-choice-${choice.next}`}
                onClick={() => onChoose(choice.next)}
              >
                {choice.text}
              </button>
            ))}
          </div>
        ) : (
          <div className="dialogue-hint" data-testid="dialogue-hint">
            {finished ? 'Enter / Space to continue' : 'Enter / Space to skip'}
          </div>
        )}
      </div>
    </div>
  )
}

function renderLessonText(text: string) {
  const parts = text.split(/(\bindex\b|O\(1\)|O\(n\))/gi)
  return parts.map((part, index) =>
    /^(index|O\(1\)|O\(n\))$/i.test(part) ? (
      <strong className="dialogue-key-term" key={`${part}-${index}`}>
        {part}
      </strong>
    ) : (
      part
    ),
  )
}

function ArrayLessonDiagram({ visual }: { visual: ArrayLessonVisual }) {
  if (visual.kind === 'recap') {
    return (
      <ul className="dialogue-lesson-recap" aria-label="Array lesson recap">
        <li>Index starts at <strong>0</strong></li>
        <li>Read by index: instant, <strong>O(1)</strong></li>
        <li>Insert in the middle: shifting, <strong>O(n)</strong></li>
      </ul>
    )
  }

  if (visual.kind === 'insertion') {
    return (
      <div className="dialogue-insertion-diagram" aria-label="Before and after inserting at index 1">
        <ArrayDiagramRow label="Before" values={visual.before} />
        <span className="dialogue-insertion-arrow" aria-hidden="true">→</span>
        <ArrayDiagramRow
          label="After insert"
          values={visual.after}
          showIndices
          highlightFrom={visual.insertIndex}
        />
        <p className="dialogue-shift-caption">Later values shift right to make room</p>
      </div>
    )
  }

  return (
    <div className="dialogue-array-diagram" aria-label="Example array diagram">
      <ArrayDiagramRow
        values={visual.values}
        showIndices={visual.showIndices}
        highlightIndex={visual.highlightIndex}
      />
      {visual.annotation && (
        <p className="dialogue-array-annotation">
          {visual.annotation.split(/(array\[2\]|30)/g).map((part, index) =>
            /^(array\[2\]|30)$/.test(part) ? <strong key={`${part}-${index}`}>{part}</strong> : part,
          )}
        </p>
      )}
    </div>
  )
}

function ArrayDiagramRow({
  label,
  values,
  showIndices = false,
  highlightIndex,
  highlightFrom,
}: {
  label?: string
  values: Array<number | string>
  showIndices?: boolean
  highlightIndex?: number
  highlightFrom?: number
}) {
  return (
    <div className="dialogue-array-row-wrap">
      {label && <span className="dialogue-array-row-label">{label}</span>}
      <div className="dialogue-array-row">
        {values.map((value, index) => (
          <div
            className={[
              'dialogue-array-cell',
              index === highlightIndex ? 'is-highlighted' : '',
              highlightFrom !== undefined && index >= highlightFrom ? 'is-shifted' : '',
              value === 'NEW' ? 'is-inserted' : '',
            ].filter(Boolean).join(' ')}
            key={`${index}-${value}`}
          >
            <span className="dialogue-array-value">{value}</span>
            {showIndices && <span className="dialogue-array-index">{index}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
