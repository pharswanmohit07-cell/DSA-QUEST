# Village Guide Arrays 1 â€” Design Specification

**Status:** Approved and implemented on feat/village-guide-arrays-1.
**Date:** 2026-11-12
**Repository baseline:** `main` at `4da8a97e9e0c0c106253a4bad87ef65a6d9e0f0e`
**Scope:** Complete the existing Village Guide's formal Arrays campaign and relocate the Arrays Knowledge Scroll offer from the Old Man to the Guide.

## Goal and confirmed decisions

Use the existing `village-guide` NPC at tile (12, 15), with its existing sprite, portrait, animation, position, and interaction. No NPCs, duplicate characters, sprites, map assets, placements, or authored map changes.

The Old Man keeps his opening Array lesson, three-question practice, array-backed stack gate puzzle, gate opening, and Northern Scouting Trip. He no longer offers or routes the Arrays Knowledge Scroll.

The existing Village Guide owns the formal Arrays 1 campaign. After the Old Man gate quest is complete, the quest tracker directs the player to the Guide. The Guide provides a beginner-friendly lesson, three guided practice questions, and an interactive Array Manipulation Workshop with Access, Update, Insert, Delete, and Append operations.

Only Workshop success completes the formal Arrays topic through `QuestManager.completeTopic('arrays', ...)`. The existing campaign system awards the first-completion 50 XP and `array-relic` exactly once and unlocks Stack Operations. Lesson/practice completion alone awards no campaign reward.

After Workshop completion, the player ¶»§q«^