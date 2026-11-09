import { afterEach, describe, expect, it } from 'vitest'
import { DialogueController } from './DialogueController'
import { getDialogueState } from './dialogueStore'
import { VILLAGE_NPCS } from '../npc/villageNpcs'
import type { Npc } from '../npc/Npc'

const farmer = VILLAGE_NPCS.find((npc) => npc.id === 'south-farmer')!

function createDialogueNpc() {
  return {
    id: farmer.id,
    name: farmer.name,
    dialogueTree: farmer.dialogueTree,
    portraitUrl: farmer.portraitUrl ?? null,
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
