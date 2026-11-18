export type DialogueAnchorSide = 'above' | 'below' | 'left' | 'right' | 'docked'
export type DialogueAnchorLayout = { left: string; top: string; bottom: string; transform: string; side: DialogueAnchorSide }
export function getDialogueAnchorLayout(position: { x: number; y: number }, viewport: { width: number; height: number }, panelWidth: number, panelHeight: number): DialogueAnchorLayout {
  const margin = 12
  const gap = 15
  const leftLimit = Math.max(margin, viewport.width - panelWidth - margin)
  const topLimit = Math.max(margin, viewport.height - panelHeight - margin)
  const centeredLeft = Math.min(Math.max(position.x - panelWidth / 2, margin), leftLimit)
  const centeredTop = Math.min(Math.max(position.y - panelHeight / 2, margin), topLimit)
  if (viewport.width <= 600 || panelWidth > viewport.width - margin * 2) return { left: '50%', top: 'auto', bottom: '12px', transform: 'translateX(-50%)', side: 'docked' }
  if (position.y - panelHeight - gap >= margin) return { left: `${centeredLeft}px`, top: `${Math.max(margin, position.y - panelHeight - gap)}px`, bottom: 'auto', transform: 'none', side: 'above' }
  if (position.x + panelWidth + gap <= viewport.width - margin) return { left: `${position.x + gap}px`, top: `${centeredTop}px`, bottom: 'auto', transform: 'none', side: 'right' }
  if (position.x - panelWidth - gap >= margin) return { left: `${position.x - panelWidth - gap}px`, top: `${centeredTop}px`, bottom: 'auto', transform: 'none', side: 'left' }
  if (position.y + panelHeight + gap <= viewport.height - margin) return { left: `${centeredLeft}px`, top: `${position.y + gap}px`, bottom: 'auto', transform: 'none', side: 'below' }
  return { left: '50%', top: 'auto', bottom: '12px', transform: 'translateX(-50%)', side: 'docked' }
}
