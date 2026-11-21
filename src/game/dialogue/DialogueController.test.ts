import { afterEach, describe, expect, it } from 'vitest'
import { DialogueController } from './DialogueController'
import { getDialogueState } from './dialogueStore'
import { VILLAGE_NPCS } from '../npc/villageNpcs'
import type { Npc } from '../npc/Npc'

const farmer = VILLAGE_NPCS.find((npc) => npc.id === 'south-farmer')!
const elder = VILLAGE_NPCS.find((npc) => npc.id === 'elder-masanori')!

function createDialogueNpc() {
  return {
    id: farmer.id,
    name: farmer.name,
    dialogueTree: farmer.dialogueTree,
    portraitUrl: farmer.portraitUrl ?? null,
    startNodeId: 'start',
  } as unknown as Npc
}

function createElderDialogueNpc() {
  return {
    id: elder.id,
    name: elder.name,
    dialogueTree: elder.dialogueTree,
    portraitUrl: elder.portraitUrl ?? null,
    startNodeId: 'start',
  } as unknown as Npc
}

afterEach(() => {
  new DialogueController().close()
})

describe('Farmer dialogue keyboard progression', () => {
  it('lets the E-key scene handler advance to the Queue choices', () => {
    const controller = new DialogueController()
    controller.start(createDialogueNpc())

    expect(getDialogueState()?.nodeId).toBe('start')
    expect(getDialogueState()?.choices).toHaveLength(0)

    expect(controller.tryAdvance(1000)).toBe(true)

    expect(getDialogueState()?.nodeId).toBe('queue_offer')
    expect(getDialogueState()?.choices).toHaveLength(2)
  })
})


describe('Old Man collection handover dialogue', () => {
  it('shows each short story panel before the empty-scroll handover can complete', () => {
    const controller = new DialogueController()
    controller.startAt(createElderDialogueNpc(), 'collection_offer')

    expect(controller.activeNodeId).toBe('collection_offer')
    expect(controller.tryAdvance(1000)).toBe(true)
    expect(controller.activeNodeId).toBe('collection_offer_2')
    expect(controller.tryAdvance(1300)).toBe(true)
    expect(controller.activeNodeId).toBe('collection_offer_3')
    expect(getDialogueState()?.choices?.map((choice) => choice.next)).toEqual([
      'collection_accept_action',
      'collection_later',
    ])

    controller.choose('collection_accept_action')
    expect(controller.activeNodeId).toBe('collection_accept_action')
    expect(controller.tryAdvance(1600)).toBe(true)
    expect(controller.activeNodeId).toBe('collection_scroll_purpose')
    expect(controller.tryAdvance(1900)).toBe(true)
    expect(controller.activeNodeId).toBe('collection_scroll_delivery')
    expect(getDialogueState()?.choices?.map((choice) => choice.next)).toEqual([
      'collection_claim_action',
      'collection_later',
    ])

    // The Old Man grants the scroll only after the player confirms the handover.
    controller.choose('collection_claim_action')
    expect(controller.activeNodeId).toBe('collection_claim_action')
    expect(controller.tryAdvance(2500)).toBe(true)
    expect(controller.isOpen).toBe(false)
  })
})
