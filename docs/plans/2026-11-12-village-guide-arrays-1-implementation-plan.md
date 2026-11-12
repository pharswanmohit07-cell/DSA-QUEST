# Village Guide Arrays 1 Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing Old Man gate prologue to the existing Village Guide's formal Arrays 1 lesson, practice, interactive workshop, campaign reward, and optional Arrays Knowledge Scroll.

**Architecture:** Keep campaign completion/XP/relic authority in `QuestManager`. Persist only the Guide's sub-stage in a separate versioned key, and surface it beside campaign progress in the existing QuestTracker. Use a pure, testable workshop operation module; React renders the Guide learning/workshop challenge UI; MainScene owns NPC routing and the challenge-to-world resume handoff.

**Tech Stack:** TypeScript, React 19, Phaser 4, Vitest, existing external-store challenge/quest state.

## Global Constraints

- Reuse existing `village-guide` NPC at tile (12, 15); do not add an NPC, sprite, portrait, map placement, or duplicate character.
- Old Man retains only opening Array prologue and Northern Scouting Trip; remove his Arrays Scroll ownership and all Scroll-dependent Elder branch routing.
- The Guide owns formal Arrays 1 and the optional Arrays Knowledge Scroll.
- Lesson â†’ exactly three practice questions â†’ workshop; only workshop success completes Arrays.
- First formal Arrays completion awards existing 50 XP and `array-relic` through `QuestManager.completeTopic('arrays', ...)`; do not crea¶»§q«^