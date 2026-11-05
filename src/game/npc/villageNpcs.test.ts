import { describe, expect, it } from 'vitest'
import { VILLAGE_NPCS } from './villageNpcs'

const elderTree = VILLAGE_NPCS.find((npc) => npc.id === 'elder-masanori')!.dialogueTree

describe('Elder Northern Scouting Trip dialogue', () => {
  it('keeps the existing post-campaign acknowledgement before the new offer', () => {
    expect(elderTree.quest_done).toMatchObject({
      speaker: 'Old Man',
      text: 'The ward is down and the snowfield is open. Walk north, hunter, and do not waste the lesson.',
      next: 'northern_snowfield_offer',
    })
  })

  it('offers acceptance or Not now after the post-campaign acknowledgement', () => {
    expect(elderTree['northern_snowfield_offer']?.choices).toEqual([
      { text: 'I will scout the northern snowfield.', next: 'northern_snowfield_accept' },
      { text: 'Not now.', next: 'northern_snowfield_later' },
    ])
    expect(elderTree['northern_snowfield_later']?.next).toBeNull()
  })

  it('provides separate reminder, report, and completed dialogue states', () => {
    expect(elderTree['northern_snowfield_reminder']?.text)
      .toEqual(expect.stringMatching(/north.*snowfield/i))
    expect(elderTree['northern_snowfield_report']?.choices).toEqual([
      { text: 'I have scouted the snowfield. Here is my report.', next: 'northern_snowfield_report_action' },
    ])
    expect(elderTree['northern_snowfield_completed']?.next).toBeNull()
  })

  it('defines non-success feedback for ineligible, failed, and uncertain writes', () => {
    for (const nodeId of [
      'northern_snowfield_not_eligible',
      'northern_snowfield_persistence_failed',
      'northern_snowfield_recovery_required',
      'northern_snowfield_completion_not_eligible',
      'northern_snowfield_completion_persistence_failed',
      'northern_snowfield_completion_recovery_required',
    ]) {
      expect(elderTree[nodeId], `${nodeId} should be available`).toBeDefined()
    }
  })
})
