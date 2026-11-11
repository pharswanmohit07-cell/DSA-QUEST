import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QuizChallenge } from './QuizChallenge'
import { challengeStore, registerChallengeSceneBridge } from './challengeStore'
import { QuestManager } from '../quests/QuestManager'
import { resetArrayScrollQuestionHistory } from './arrayScrollQuestionBank'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement | undefined
let root: Root | undefined
let unregisterBridge: (() => void) | undefined

function mount(node: ReactNode): HTMLDivElement {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root?.render(node))
  return host
}

function click(container: HTMLElement, selector: string): void {
  const button = container.querySelector<HTMLButtonElement>(selector)
  if (!button) throw new Error(`Button not found: ${selector}`)
  act(() => button.click())
}

function setValue<T extends HTMLInputElement | HTMLTextAreaElement>(
  container: HTMLElement,
  selector: string,
  value: string,
): void {
  const field = container.querySelector<T>(selector)
  if (!field) throw new Error(`Field not found: ${selector}`)
  const prototype = field instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  act(() => ¶»§q«^