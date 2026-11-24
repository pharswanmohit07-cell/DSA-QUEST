# Old Man Scroll-First Relic Journey Implementation Plan

> **For agentic workers:** Use the native execution approach in this session. Steps use checkbox syntax.

**Goal:** Require the Old Man's empty-scroll handover before the Village Guide's Arrays lesson, while preserving the separate post-mastery Knowledge Trial flow.

**Architecture:** Extend the pure Village Guide opening router with relic-quest and empty-scroll prerequisites, and supply those fields from MainScene's persisted relic collection snapshot. Update RelicJournal guidance to explain the actual handover sequence.

**Tech Stack:** React, TypeScript, Vitest, Vite, GitHub Actions, Render static-site preview.

**Spec:** `docs/superpowers/specs/2026-11-24-old-man-scroll-first-design.md`

## Global Constraints
- Keep the empty-scroll reward at seven items total and one scroll consumed per successful guardian reward.
- Do not alter the normal challenge completion, reward animation, reward audio, or account/login paths.
- Keep the test-only quiz helper preview-gated.
- Do not modify main or the production deployment from this fix branch.

## Review Focus
- Player has not accepted the Old Man's relic quest: Village Guide must direct them back to the Old Man.
- Player accepted the quest but did not choose “Receive the empty scroll”: Village Guide must not start the Arrays lesson.
- Empty scroll is claimed but no relics found yet: Arrays lesson must be available.
- Arrays lesson is completed: the Guide must offer the separate Knowledge Trial, not replay the main lesson.
- Player's last available scroll: successful trial consumes it once and awards exactly one relic; a failed trial preserves it.

---

### Task 1: Enforce Old Man handover before the Village Guide

**Files:**
- Modify: `src/game/quests/villageGuideArraysRouting.ts`
- Test: `src/game/quests/villageGuideArraysRouting.test.ts`
- Modify: `src/game/scenes/MainScene.ts`

**Interfaces:**
- Extend `VillageGuideOpeningInput` with `relicQuestAccepted: boolean` and `emptyScrollAvailable: boolean`.
- Extend `VillageGuideOpeningRoute` with `array_relic_quest_required` and `array_empty_scroll_required`.

- [ ] Add failing tests for both pre-handover states and update existing lesson-route fixtures to represent a claimed scroll.
- [ ] Run the focused route test and record the expected failure.
- [ ] Implement the ordered checks after the gate prerequisite and before Arrays lesson routing.
- [ ] Pass `relicCollection.questAccepted` and `relicCollection.emptyScrollsClaimed && relicCollection.emptyScrollsRemaining > 0` from MainScene.
- [ ] Run focused route tests and the MainScene-adjacent tests.

### Task 2: Correct Relic Journey guidance

**Files:**
- Modify: `src/game/quests/RelicJournal.tsx`
- Test: `src/game/quests/RelicJournal.test.tsx` (create if the existing test harness permits a real render cleanly)

- [ ] Add a regression assertion that the master-lesson guidance says the empty scroll was received from the Old Man and is offered to the guardian after passing.
- [ ] Run the focused test and record the expected failure.
- [ ] Update the text for master-lesson, guardian revisit, and missing-scroll states.
- [ ] Run the focused component test.

### Task 3: Validate and publish a preview

- [ ] Run full `npm run test`, `npm run build`, `npm run lint`, `npm run check:village`, and `npm run test:prod-bundle` through GitHub Actions on the PR.
- [ ] Inspect the diff and PR checks.
- [ ] Deploy the fix branch to a separate Render preview only after checks pass; leave main/production untouched.
