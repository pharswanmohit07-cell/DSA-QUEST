import { useCallback, useEffect, useState } from 'react'
import './questHudTutorial.css'

export const QUEST_HUD_TUTORIAL_KEY = 'dsa-quest-hud-tutorial-v1'

type TutorialStep = 'quest' | 'settings'

type TargetRect = {
  top: number
  left: number
  width: number
  height: number
}

const TARGET_SELECTORS: Record<TutorialStep, string> = {
  quest: '.quest-tracker-toggle',
  settings: '.game-settings-button',
}

const CALLOUT_WIDTH = 340
const VIEWPORT_MARGIN = 12

function readTutorialDismissed(): boolean {
  try {
    return window.localStorage.getItem(QUEST_HUD_TUTORIAL_KEY) === 'true'
  } catch {
    return false
  }
}

function persistTutorialDismissed(): void {
  try {
    window.localStorage.setItem(QUEST_HUD_TUTORIAL_KEY, 'true')
  } catch {
    // The tutorial stays dismissed in this component session when storage is unavailable.
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/** A short first-entry explanation of the Quest and Settings HUD controls. */
export function QuestHudTutorial() {
  const [step, setStep] = useState<TutorialStep | null>(null)
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)

  const dismiss = useCallback(() => {
    persistTutorialDismissed()
    setStep(null)
    setTargetRect(null)
  }, [])

  useEffect(() => {
    if (readTutorialDismissed()) return

    const quest = document.querySelector(TARGET_SELECTORS.quest)
    const settings = document.querySelector(TARGET_SELECTORS.settings)
    if (quest && settings) setStep('quest')
  }, [])

  useEffect(() => {
    if (!step) return

    const updateTarget = () => {
      const target = document.querySelector<HTMLElement>(TARGET_SELECTORS[step])
      if (!target) {
        setTargetRect(null)
        return
      }
      const rect = target.getBoundingClientRect()
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })
    }

    updateTarget()
    window.addEventListener('resize', updateTarget)
    window.addEventListener('scroll', updateTarget, true)
    return () => {
      window.removeEventListener('resize', updateTarget)
      window.removeEventListener('scroll', updateTarget, true)
    }
  }, [step])

  useEffect(() => {
    if (!step) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        dismiss()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dismiss, step])

  if (!step || !targetRect) return null

  const calloutLeft = clamp(
    step === 'quest' ? targetRect.left : targetRect.left + targetRect.width - CALLOUT_WIDTH,
    VIEWPORT_MARGIN,
    window.innerWidth - CALLOUT_WIDTH - VIEWPORT_MARGIN,
  )
  const calloutTop = clamp(
    targetRect.top + targetRect.height + 18,
    VIEWPORT_MARGIN,
    window.innerHeight - 190,
  )
  const arrowLeft = clamp(
    targetRect.left + targetRect.width / 2 - calloutLeft - 8,
    18,
    Math.min(CALLOUT_WIDTH - 32, window.innerWidth - 2 * VIEWPORT_MARGIN - 32),
  )
  const calloutStyle = {
    left: `${calloutLeft}px`,
    top: `${calloutTop}px`,
    '--tutorial-arrow-left': `${arrowLeft}px`,
  } as React.CSSProperties

  return (
    <div className="hud-tutorial-layer" data-testid="hud-tutorial">
      <div className="hud-tutorial-backdrop" aria-hidden="true" />
      <div
        className="hud-tutorial-spotlight"
        data-testid="hud-tutorial-spotlight"
        data-target={step}
        aria-hidden="true"
        style={{
          top: `${targetRect.top}px`,
          left: `${targetRect.left}px`,
          width: `${targetRect.width}px`,
          height: `${targetRect.height}px`,
        }}
      />
      <section
        className="hud-tutorial-callout"
        data-testid="hud-tutorial-callout"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hud-tutorial-title"
        style={calloutStyle}
      >
        <span className="hud-tutorial-pointer" aria-hidden="true">▲</span>
        <p className="hud-tutorial-eyebrow">FIRST STEPS · {step === 'quest' ? '1 / 2' : '2 / 2'}</p>
        <h2 id="hud-tutorial-title">
          {step === 'quest' ? 'Keep track of your quest' : 'Adjust your game settings'}
        </h2>
        <p>
          {step === 'quest'
            ? 'Open the Quest button to see your current objective, progress, and optional side quests.'
            : 'Open Settings to adjust music, sound effects, player controls, and other game preferences.'}
        </p>
        <div className="hud-tutorial-actions">
          <button type="button" className="hud-tutorial-skip" data-testid="hud-tutorial-skip" onClick={dismiss}>
            Skip
          </button>
          {step === 'quest' ? (
            <button
              type="button"
              className="hud-tutorial-primary"
              data-testid="hud-tutorial-next"
              onClick={() => setStep('settings')}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="hud-tutorial-primary"
              data-testid="hud-tutorial-done"
              onClick={dismiss}
            >
              Got it!
            </button>
          )}
        </div>
        <p className="hud-tutorial-dismiss-hint">Press Esc to close</p>
      </section>
    </div>
  )
}
