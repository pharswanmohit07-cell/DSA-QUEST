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
    const settin¶»§q«^