import { useCallback, useState } from 'react'
import { QuestManager, useQuestState } from './QuestManager'
import { getChallenge } from './challenges/arraySorting'
import { runSolution } from './challenges/runSolution'
import type { ChallengeCaseResult } from './questTypes'
import './challengeModal.css'

type ChallengeModalProps = {
  /** Called after a passing submission so the scene can advance the lesson. */
  onSolved: () => void
  /** Called when the modal is dismissed, so the scene can resume. */
  onClose: () => void
}

export function ChallengeModal({ onSolved, onClose }: ChallengeModalProps) {
  const questState = useQuestState()
  const challengeId = questState.challenge
  const [code, setCode] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [cases, setCases] = useState<ChallengeCaseResult[] | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)

  const close = useCallback(() => {
    setCode('')
    setCases(null)
    setCompileError(null)
    setSelectedOption(null)
    setSolved(false)
    onClose()
  }, [onClose])

  const runTests = useCallback(() => {
    if (!challengeId || solved) {
      return
    }
    const challenge = getChallenge(challengeId)

    if (challenge.options.length > 0) {
      // Multiple-choice challenges still run the code, but only a correct
      // algorithm counts as a pass.
      if (selectedOption !== chal¶»§q«^