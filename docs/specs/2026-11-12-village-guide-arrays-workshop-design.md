# Village Guide Arrays 1 — Design Specification

**Status:** Approved and implemented on feat/village-guide-arrays-1.
**Date:** 2026-11-12
**Repository baseline:** `main` at `4da8a97e9e0c0c106253a4bad87ef65a6d9e0f0e`
**Scope:** Complete the existing Village Guide's formal Arrays campaign and relocate the Arrays Knowledge Scroll offer from the Old Man to the Guide.

## Goal and confirmed decisions

Use the existing `village-guide` NPC at tile (12, 15), with its existing sprite, portrait, animation, position, and interaction. No NPCs, duplicate characters, sprites, map assets, placements, or authored map changes.

The Old Man keeps his opening Array lesson, three-question practice, array-backed stack gate puzzle, gate opening, and Northern Scouting Trip. He no longer offers or routes the Arrays Knowledge Scroll.

The existing Village Guide owns the formal Arrays 1 campaign. After the Old Man gate quest is complete, the quest tracker directs the player to the Guide. The Guide provides a beginner-friendly lesson, three guided practice questions, and an interactive Array Manipulation Workshop with Access, Update, Insert, Delete, and Append operations.

Only Workshop success completes the formal Arrays topic through `QuestManager.completeTopic('arrays', ...)`. The existing campaign system awards the first-completion 50 XP and `array-relic` exactly once and unlocks Stack Operations. Lesson/practice completion alone awards no campaign reward.

After Workshop completion, the player must speak to the Guide again to receive the optional Knowledge Scroll offer. Reuse the current randomized Easy/Medium/Hard Arrays Scroll challenge, with its 3/2/1 hearts, retry behavior, code runner, one-time claim, and separate collectible state. The Scroll does not gate the next topic and does not affect Arrays campaign mastery.

The Guide's existing Village Training Route remains reachable when eligible. The Old Man's Northern Scouting Trip stays intact. Do not change MAP.json, GameWorld.tsx, movement/collision, camera, gate behavior, HUD controls/layout, touch/mobile code, audio, skins, settings, or manga/story content.

## Player journey

1. Old Man opening quest: Learn → three practice questions → stack gate puzzle → gate opens.
2. Quest tracker hands off to **Arrays 1 — The Village Guide**, objective to speak with the existing Guide.
3. Guide starts/resumes formal Arrays topic; explains arrays, zero-based indexing, access/update/insert/delete/append, and O(1) access versus O(n) shifting.
4. Three guided practice questions:
   - `[10, 20, 30]`, index 1 → `20`.
   - Update index 2 to 35 → `[10, 20, 35]`.
   - Insert 15 at index 1 → `[10, 15, 20, 30]`.
   Incorrect answers explain and allow retry; no hearts.
5. Workshop sequence begins from `[10, 20, 30]`:
   - Access index 1 → `20`, array unchanged.
   - Update index 1 to 25 → `[10, 25, 30]`.
   - Insert 15 at index 1 → `[10, 15, 25, 30]`.
   - Delete index 2 → `[10, 15, 30]`.
   - Append 40 → `[10, 15, 30, 40]`.
   Invalid actions cannot mutate or advance. Hints and invalid actions feed `gradeInteractiveChallenge`.
6. Workshop success awards campaign XP/relic via QuestManager and marks Arrays 1 completed. Replays must not duplicate first-completion rewards.
7. On the player's next Guide interaction, offer the optional Arrays Knowledge Scroll. On success the existing Scroll store grants it once; on failure/abandonment the player returns to the Guide and can retry.
8. The Old Man retains all Northern Scouting Trip offer/reminder/report/completed dialogue and reward transitions.

## Persistence and integration

Use the V3 campaign topic state as authority for availability, in-progress status, attempts, grade, XP, and relic. Persist the Guide's lesson/practice/implementation stage separately so V3 save migrations are not needed. Re-entering an in-progress topic must use idempotent `QuestManager.startTopic('arrays')`. A resumed workshop may restart its short guided sequence from the initial array but keeps the topic at IMPLEMENT. Reset the stage with the existing new-game/save reset flow.

Extend the quest view snapshot and QuestTracker so the same progression authority drives the Old Man → Guide handoff and Arrays stage text. Do not create a conflicting topic-completion flag. Scroll ownership/eligibility uses `knowledgeScrolls.ts`; campaign mastery and Scroll ownership remain independent.

## Focused acceptance checks

- Guide cannot start Arrays before the Old Man gate quest is completed.
- Same Guide NPC is reused; no added NPC or map edit.
- Guide starts/resumes Arrays once; lesson/practice state persists.
- Practice must be answered correctly before workshop.
- Workshop operations produce the specified arrays; invalid values/indexes, incorrect operations, and empty input do not mutate or advance.
- Abandon/reopen does not reward; workshop success awards exactly 50 XP and array-relic and unlocks Stack Operations.
- Scroll offer only appears on the Guide's subsequent interaction; existing randomized 3/2/1 flow remains unchanged and Scroll claims only on success.
- Old Man Scroll routing is removed but Northern Scouting Trip continues.
- QuestTracker accurately displays the gate→Guide handoff and lesson/practice/workshop/completed status.
- Existing Guide side-quest routes remain eligible/reachable.

## Out of scope

No new NPCs, map edits, protected-system changes, manga/story changes, unrelated UI redesign, generic campaign rewrite, full mobile pass, or game-wide QA/polish until campaign content is complete. No commit, push, merge, or deployment without explicit user authorization.
