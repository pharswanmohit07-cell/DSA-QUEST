# Village Gate and HUD Onboarding Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present the Old Man challenge as a gate-opening mission, correct the Village Guide quest title/progress, and teach first-time players where Quest and Settings live.

**Architecture:** Keep the gate challenge's stack algorithm and target sequence unchanged while updating only its player-facing copy. Update the derived Arrays quest view in QuestTracker and mount a small Quest Tracker-owned tutorial that highlights the existing Quest and Settings DOM controls, avoiding the protected GameWorld bridge.

**Tech Stack:** React 19, TypeScript 6, Vitest, CSS, localStorage.

## Global Constraints

- The Old Man remains responsible only for the village gate-opening challenge; the Village Guide remains responsible for Arrays learning and the Knowledge Scroll.
- Do not change the required stack target sequence, answer validation, gate-unlock event, or reward behavior.
- Do not edit `src/game/GameWorld.tsx`, `MAP.json`, map collision rules, NPC positions/wandering, player movement, camera, or gate geometry.
- Store HUD tutorial completion in a versioned localStorage key; do not change campaign save schema or require save migration.
- The Quest Tracker must display **Village Guide ‚Äî Arrays**, with no ‚ÄúArrays 1‚Äù label.
- Tutorial order: Quest first, Settings second, then **Got it!**;∂ªßq´^