import { useState } from 'react'
import { challengeStore, useChallengeState } from './challengeStore'
import { ARRAY_WORKSHOP_STEPS, type ArrayWorkshopOperation } from './arrayManipulationWorkshop'
import './arrayManipulationWorkshop.css'

type OperationChoice = ArrayWorkshopOperation['type'] | ''

const OPERATION_LABELS: Record<ArrayWorkshopOperation['type'], string> = {
  access: 'Access',
  update: 'Update',
  insert: 'Insert',
  delete: 'Delete',
  append: 'Append',
}

function isValueOperation(operation: OperationChoice): boolean {
  return operation === 'update' || operation === 'insert' || operation === 'append'
}

function isIndexedOperation(operation: OperationChoice): boolean {
  return operation !== '' && operation !== 'append'
}

export function ArrayManipulationWorkshop() {
  const challenge = useChallengeState()
  const [operation, setOperation] = useState<OperationChoice>('')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [valueInput, setValueInput] = useState('')
  const [hintVisible, setHintVisible] = useState(false)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [completion, setCompletion] = useState<{ firstCompletion: boolean } | null>(null)

  if (challenge.activeChallenge !== 'array-manipulation-workshop') return null

  const step = ARRAY_WORKSHOP_STEPS[challenge.arrayWorkshopStepIndex]
  const isMaster = step?.allowAnyOrder === true
  const operationChoices = isMaster
    ? (['update'¶»§q«^