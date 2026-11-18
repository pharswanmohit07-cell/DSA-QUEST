import { describe, expect, it } from 'vitest'
import { getDialogueAnchorLayout } from './dialogueAnchorLayout'
describe('NPC dialogue anchor layout', () => {
 it('prefers above the NPC when the panel fits', () => { const p = getDialogueAnchorLayout({x:540,y:460},{width:1098,height:650},440,220); expect(p.side).toBe('above') })
 it('places the panel to the right of a low NPC', () => { const p = getDialogueAnchorLayout({x:190,y:170},{width:1098,height:550},440,240); expect(p.side).toBe('right'); expect(Number.parseFloat(p.left)).toBeGreaterThan(190) })
 it('uses the left side near the right edge', () => { const p = getDialogueAnchorLayout({x:920,y:170},{width:1098,height:550},440,240); expect(p.side).toBe('left') })
 it('uses below when neither side has horizontal room', () => { const p = getDialogueAnchorLayout({x:375,y:120},{width:750,height:700},440,240); expect(p.side).toBe('below') })
 it('docks on narrow viewports', () => { const p = getDialogueAnchorLayout({x:180,y:150},{width:390,height:844},360,280); expect(p.side).toBe('docked'); expect(p.bottom).toBe('12px') })
})
