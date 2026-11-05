# Northern Scouting Trip — Design Specification

**Status:** Approved design contract; implemented (merged to main via PR #39, 2026-11-05). End-to-end in-game playthrough still requires manual QA.<br>
**Date:** 2026-11-04<br>
**Reward:** 25 XP, once

## 1. Overview and scope

Add one optional, manga-independent side quest offered by the existing Elder
NPC, `elder-masanori`, after the existing Array/Stack gate progression is
complete. The player accepts the errand, enters the northern snowfield beyond
the torii, and returns to the Elder to report. Completion awards 25 XP once.

The quest has independent progress and reward-claim state. It is not a DSA
campaign topic and grants no relic or mastery grade. It does not affect the
seven-topic campaign, its XP or relic rewards, topic grades, or final grade.
There are no new NPCs, assets, manga content, buildings, map edits, or new
object-interaction framework in scope.

## 2. Start condition and Elder dialogue

The side quest is offered only after the current Elder routing determines that
the existing combined Array/Stack progression is complete. In the current
worktree, `getElderInteractionRoute` returns `quest-done` when the legacy
challenge is complete or Stack Operations is complete
([src/game/quests/elderCampaignRouting.ts:9](../../src/game/quests/elderCampaignRouting.ts#L9)).
`MainScene.beginDialogue` uses that route to start the Elder's `quest_done`
node ([src/game/scenes/MainScene.ts:1697](../../src/game/scenes/MainScene.ts#L1697)).

Keep that completion condition authoritative and preserve the existing
`quest_done` text and all pre-completion Elder dialogue and choices. After the
existing acknowledgement, append a separate optional dialogue branch:

1. **Not started:** offer “Take the Northern Scouting Trip” and “Not now.”
   Accept starts the quest. “Not now” leaves it not started; it can be offered
   again on a later Elder conversation.
2. **Active, snowfield not visited:** acknowledge the active errand and remind
   the player to enter the north-side area. Do not restart or reset progress.
3. **Active, snowfield visited:** offer a report choice. Completing that choice
   calls the single side-quest completion transaction.
4. **Completed:** show a concise completion/reward acknowledgement. Do not
   re-open or restart the quest.

Prefer a dedicated side-quest route/branch after the existing post-campaign
condition rather than changing the existing campaign route decisions or
reordering the original Arrays choices. Dialogue effects remain scene-owned:
the dialogue tree supplies node IDs and choices; `MainScene` dispatches the
effects through the existing `chooseDialogueNode` /
`runDialogueEffects` path
([src/game/scenes/MainScene.ts:1938](../../src/game/scenes/MainScene.ts#L1938),
[src/game/scenes/MainScene.ts:1948](../../src/game/scenes/MainScene.ts#L1948)).

## 3. Snowfield trigger and player-position convention

### Map facts

`src/assets/tiles/ninja-village/MAP.json` is a 35×35 map with 16×16 tiles.
The existing torii threshold is columns 11–13, rows 20–24
([src/game/map/gateLock.ts:21](../../src/game/map/gateLock.ts#L21)).
The locked-gate collision rectangle is centered at world `(200, 360)` with
size 48×80 ([src/game/scenes/MainScene.ts:886](../../src/game/scenes/MainScene.ts#L886)),
so its north edge is world Y=320. The allowed gate tiles and surrounding map
geometry establish the existing north/south route without a map change
([src/game/map/walkableTileIds.ts:19](../../src/game/map/walkableTileIds.ts#L19)).

The map has no interactive-object layer. The quest target is an area check in
the existing north-side walkable ground, not interaction with a newly
invented object. In the inspected map, the central cells around `(12,17)` and
`(12,18)` have ground, no obstacle tile, and no collision-object overlap.

### Player coordinates

The player uses 16×16 animation frames
([src/game/scenes/MainScene.ts:619](../../src/game/scenes/MainScene.ts#L619)).
`this.add.sprite(x, y, ...)` uses Phaser's default centered origin; the
existing save stores that sprite position `(player.x, player.y)`
([src/game/scenes/MainScene.ts:851](../../src/game/scenes/MainScene.ts#L851),
[src/game/scenes/MainScene.ts:1521](../../src/game/scenes/MainScene.ts#L1521)).
The Arcade body is 10×8 with offset `(3,7)`
([src/game/scenes/MainScene.ts:863](../../src/game/scenes/MainScene.ts#L863)).
Movement is applied through that body, and player depth uses `body.bottom`
([src/game/scenes/MainScene.ts:1867](../../src/game/scenes/MainScene.ts#L1867)).

Use the **physics body's world-space position**, not exact equality against a
tile or the sprite's center alone. Candidate bounded region:

- `body.center.x` in **[184, 216]** world pixels.
- `body.bottom` in **[272, 304]** world pixels.
- Equivalent tile-space region: center X in **[11.5, 13.5]**, body-foot Y
  in **[17, 19]**.

The region is entirely north of the gate's Y=320 boundary, leaving 16 pixels
of clearance at its southern edge. It is inside the central corridor and
requires actually crossing the opened threshold; standing or approaching from
the southern side cannot satisfy it. This multi-tile rectangle avoids a
fragile exact-tile equality check.

The opened gate and north-side path were traversed during the prior in-browser
staircase verification. That visual check demonstrated the route is reachable;
it did not test a quest trigger. Implementation must still verify that the
specified body-coordinate region is reached in gameplay, with both keyboard
and touch movement, before shipping. If the measured body coordinates do not
match this candidate, adjust only the trigger bounds based on observed
coordinates—never alter the map, movement, collision, camera, or gate.

Evaluate the region while the side quest is active and only while
`snowfieldVisited` is false. On the first match, persist the visit and stop
checking for this quest. Movement already funnels both keyboard and touch
input through the same scene update and physics body
([src/game/scenes/MainScene.ts:1807](../../src/game/scenes/MainScene.ts#L1807),
[src/game/GameWorld.tsx:219](../../src/game/GameWorld.tsx#L219)).

## 4. Progress state machine

Persist one independent record:

```ts
interface NorthernSnowfieldScoutingProgress {
  id: 'northern-snowfield-scouting'
  status: 'not-started' | 'active' | 'completed'
  snowfieldVisited: boolean
  rewardClaimed: boolean
}
```

Allowed states and transitions:

| State | `snowfieldVisited` | `rewardClaimed` | Transition |
|---|---:|---:|---|
| Not started | false | false | Elder acceptance → active |
| Active, not visited | false | false | Enter bounded north-side region → active, visited |
| Active, visited | true | false | Report to Elder → completed, reward claimed, +25 XP |
| Completed | true | true | Terminal; repeat interaction is acknowledgement only |

Reject impossible combinations: not-started with either flag true; active with
`rewardClaimed=true`; completed without both flags true. There is no failure,
reset, replay, or abandonment transition.

## 5. V3 save compatibility and normalization

The current serialized save is version 3 (`CampaignSave`), containing campaign
progress, legacy quest statuses, XP, optional player position, and
`legacyCompletionXpCompensated`
([src/game/quests/questTypes.ts:80](../../src/game/quests/questTypes.ts#L80)).
The manager serializes one JSON object under `dsa-quest-save-v3`, verifies the
read-back, and restores validated V3 state
([src/game/quests/QuestManager.ts:229](../../src/game/quests/QuestManager.ts#L229),
[src/game/quests/QuestManager.ts:325](../../src/game/quests/QuestManager.ts#L325)).
V3 validation currently checks the V2-compatible campaign shape plus the
compensation marker and final grade
([src/game/quests/saveMigration.ts:207](../../src/game/quests/saveMigration.ts#L207)).

Keep the overall save version at **V3**. Add the side-quest state as a
top-level field, not under `CampaignProgress.topics`, and do not add its
claim to `firstCompletionRewardClaims`.

Compatibility and validation rules:

- V1 and V2 migrations initialize the side quest to
  `{ id: 'northern-snowfield-scouting', status: 'not-started',
  snowfieldVisited: false, rewardClaimed: false }`.
- A V3 save from before this feature, with no side-quest field, remains valid.
  Normalize it in memory to the same not-started state. Preserve its XP,
  position, quest statuses, campaign progress, relic entitlements, campaign
  reward claims, opening-story fields, and legacy compensation marker.
  Do not rewrite storage just because it was read; the next ordinary save
  serializes the normalized field.
- Perform this compatibility normalization once, consistently at the
  QuestManager save-loading boundary, before exposing runtime state. Every
  consumer—including the scene, profile, home screen, and quest tracker—must
  receive the same normalized runtime state; consumers must not independently
  interpret a missing field or expose an unnormalized save.
- New V3 writes always include the field.
- If the field is present, validate the ID, enum status, boolean flags, and
  allowed state combinations. A present but malformed value invalidates that
  V3 save.
- Preserve the current recovery policy: an invalid V3 save is reported and
  preserved; do not silently fall back to V1/V2
  ([src/game/quests/QuestManager.ts:280](../../src/game/quests/QuestManager.ts#L280)).
- Migration/read-back verification must include the normalized side-quest
  field so the newly added state cannot be silently dropped.

The V3 validator currently treats extra properties permissively through its
V2-shape validation. Tighten this only for the new field: absence is the
explicit legacy-compatible case; presence requires full validation. Do not
weaken validation of existing campaign or legacy fields. Keep
`isCampaignSaveV3` and restore typing honest by distinguishing the
legacy-compatible input shape from the normalized runtime/save shape, or by
making the normalization boundary explicit.

## 6. Idempotent completion and XP transaction

Add a dedicated QuestManager completion operation; do not compose
`awardXp(25)` with a separate quest-state save. The existing `awardXp` is an
independent persistence operation
([src/game/quests/QuestManager.ts:557](../../src/game/quests/QuestManager.ts#L557))
and must not be used for this transaction.

Use an explicit typed result, for example:

```ts
type SideQuestCompletionResult =
  | 'completed'
  | 'already-completed'
  | 'not-eligible'
  | 'persistence-failed'
  | 'recovery-required'
```

The completion operation must:

1. Require `status === 'active'`, `snowfieldVisited === true`, and
   `rewardClaimed === false`.
2. Construct the complete candidate record with `status='completed'`,
   `rewardClaimed=true`, and player XP increased by exactly 25.
3. Serialize and persist that candidate as one V3 save value, using the
   existing V3 key and validation/read-back flow. Verify the persisted
   side-quest state and XP.
4. Publish the new in-memory state and notify subscribers only after the
   complete candidate has been persisted and verified. Return `completed`
   only after that confirmation. Elder dialogue and tracker completion/reward
   feedback must be driven by this confirmed result, never merely by a report
   choice or an attempted write.
5. Return `not-eligible` when the canonical valid state is not eligible.
   Return `already-completed` if the canonical valid state is already
   completed with `rewardClaimed === true`; reconcile the manager to that
   stored state without changing XP.
6. If a write is known to have failed before persistence, return
   `persistence-failed` and do not publish completion or a claimed reward.
   Before any retry after a persistence failure, reload and validate the
   canonical V3 state; never retry based only on possibly stale in-memory
   state.
7. Treat a successful write followed by failed, unreadable, invalid, or
   unexpected read-back as an uncertain outcome. Do not publish success.
   Mark reward mutations as blocked and return `recovery-required` until the
   canonical save can be re-read and validated or the manager is reloaded.
8. Before retrying after an uncertain outcome, re-read and validate the
   canonical V3 save. If it is completed and claimed, reconcile the manager
   and return `already-completed` without adding XP. If it is still active,
   visited, and unclaimed, reconcile the manager and permit a fresh atomic
   attempt. If it cannot be read or validated, keep reward mutations blocked
   and return `recovery-required`.

The retry/recovery path must never award a second 25 XP, including when a
write reached storage but its verification failed. Completion status, claim,
and XP remain together in one serialized V3 value, so a valid stored save
cannot contain only part of this transaction. Reload restores the claim
before any interaction can complete the quest again. Do not change the
existing 50-XP campaign topic award path, relic claims, grades, or final-grade
calculation. This synchronous persistence design does not promise
multiple-tab concurrency support.

## 7. Quest tracker presentation

Add a visually distinct **Optional Side Quest** section to the existing quest
tracker, separate from the current main quest card
([src/game/quests/QuestTracker.tsx:50](../../src/game/quests/QuestTracker.tsx#L50),
[src/game/quests/QuestTracker.tsx:133](../../src/game/quests/QuestTracker.tsx#L133)).
Show it after acceptance and retain it after completion. Do not add it to the
main quest count, progress fraction, topic list, relic display, or campaign
grade.

Display:

- Title: **Northern Scouting Trip**.
- Before visiting: **Visit the northern snowfield beyond the torii.**
- After visiting: mark the visit complete and show **Return to the Elder and
  report.**
- After completion: show the completed state, visit/report steps complete, and
  **25 XP claimed**.

The tracker subscribes to `QuestManager` through `useQuestState`; include a
separate side-quest field in that view snapshot so React updates immediately.
Use existing tracker styling patterns without redesigning the HUD.
Show completion and reward-claimed feedback only after the completion operation
returns `completed` or reconciliation confirms `already-completed`.

## 8. Expected source files

- `src/game/quests/questTypes.ts` — define the side-quest record and extend
  V3/runtime view types without placing it in campaign progress.
- `src/game/quests/QuestManager.ts` — own default state, quest transitions,
  snapshot publication, persistence, restore/normalization, and the single
  idempotent completion-and-reward operation.
- `src/game/quests/saveMigration.ts` — validate present side-quest data,
  accept absent data on legacy V3, and initialize defaults for V1/V2 migration.
- `src/game/quests/elderCampaignRouting.ts` — preserve the existing campaign
  route as the gate to any side-quest-specific route; do not change its
  Array/Stack decisions.
- `src/game/npc/villageNpcs.ts` — add the separate post-campaign offer, accept,
  not-now, active, report, and completed dialogue nodes. Preserve existing
  dialogue text and choices.
- `src/game/scenes/MainScene.ts` — dispatch new dialogue effects, perform the
  bounded physics-body region check, record first visit, and request the
  manager's completion transaction. No map, camera, movement, collision, or
  gate changes.
- `src/game/quests/QuestTracker.tsx` and
  `src/game/quests/questTracker.css` — render and style the independent optional
  quest section.
- Focused new QuestManager/state-machine tests, migration tests, and tracker
  tests; update existing migration tests only for compatibility assertions.

Do not modify `src/assets/tiles/ninja-village/MAP.json` or
`src/game/GameWorld.tsx`. Keyboard and touch already reach the same
`MainScene` interaction and movement code; no input-control changes are
expected.

## 9. Automated tests

1. Initial/reset state is not-started, unvisited, and unclaimed.
2. Start is rejected before the existing post-Array/Stack condition and
   succeeds only on explicit Elder acceptance afterward.
3. “Not now” makes no state transition; the offer remains available later.
4. The trigger does not count points south of the gate or points outside its
   X bounds; it counts representative body coordinates inside the bounded
   northern region.
5. Visit is recorded once only while active; later frames/calls do not create
   additional transitions or rewards.
6. Report cannot complete before a visit. Valid report atomically persists
   completed status, reward claim, and exactly +25 XP.
7. Repeated report calls, duplicate completion events, and reload after
   completion do not award more XP.
8. V1/V2 migration initializes default side-quest state while preserving all
   existing save fields and the established +50 XP legacy migration rule.
9. A valid pre-feature V3 save without the field is normalized at the manager
   loading boundary; scene, profile, home-screen, and tracker consumers receive
   the same default state, all campaign/save data is preserved, and reading
   alone does not rewrite storage.
10. A new V3 save round-trips active, visited, and completed state.
11. A present malformed field or impossible status/flag combination rejects
    the V3 save and does not fall back to an older save.
12. A write that succeeds and whose verification succeeds returns
    `completed`, publishes the normalized saved state, and awards exactly 25 XP.
13. A write that fails before persistence returns `persistence-failed` and
    does not publish completion or a claimed reward.
14. A write that succeeds but whose verification fails returns
    `recovery-required`, does not show success, and blocks further reward
    mutations until canonical-state recovery or reload.
15. Reconciliation after an uncertain write detects a valid stored
    completed-and-claimed quest, updates the manager, returns
    `already-completed`, and does not add XP again.
16. Reconciliation after an uncertain write detects an unchanged valid active,
    visited, unclaimed quest, updates the manager and permits a retry that
    completes with exactly one 25 XP award.
17. If recovery cannot read or validate the canonical V3 save, reward
    mutations remain blocked and return `recovery-required`.
18. Recovery and retry never add a second 25 XP, including duplicate report
    calls, duplicate completion events, and reload after completion.
19. Completing the side quest changes neither campaign topic progress,
    first-completion claims, relic entitlements, mastery grades, nor final
    grade.
20. Tracker tests verify the distinct section and objective text at each
    state, without changing campaign counts, and verify that completion/reward
    feedback appears only after persisted completion is confirmed.
21. Dialogue-routing tests cover first offer, active reminder, report, and
    completed acknowledgement while preserving original Arrays/Stack routes
    and withholding success feedback for unconfirmed persistence.

## 10. Manual gameplay verification

- Complete the existing Array/Stack progression and verify the gate still
  opens as before.
- Talk to the Elder; verify the existing acknowledgement remains and the
  optional offer follows it.
- Choose “Not now”; re-interact and verify no quest was started and the offer
  is available again.
- Accept using keyboard; repeat using touch on a fresh test save.
- Approach the trigger from the south and stop before crossing the torii;
  verify the tracker still asks for the visit.
- Pass through the opened gate and enter the bounded region. Verify the visit
  changes once and the objective becomes “Return to the Elder and report.”
- Return to the Elder and report. Verify one +25 XP change, completion
  feedback, and no campaign grade/relic changes.
- Reload after acceptance, after visit, and after completion in separate test
  cases; confirm the correct state resumes and XP is never duplicated.
- Re-interact and retry duplicate report events; verify completed state and XP
  remain unchanged.
- Confirm ordinary keyboard/touch movement, camera, map, collision, gate
  behavior, and original campaign interactions are unchanged.

## 11. Non-goals and protected systems

- No manga panels, artwork, characters, plot, continuity, or canonical dialogue.
- No new NPCs, sprites, portraits, assets, map objects, buildings, or map edits.
- No changes to `MAP.json`, `GameWorld.tsx`, player movement, collision,
  camera, gate behavior, HUD layout beyond the specified tracker section,
  settings, audio, skins, or touch controls.
- No side-quest insertion into the seven-topic campaign, campaign quest
  counts, topic grades, relics, first-completion reward claims, or final-grade
  calculation.
- No broad quest framework, cross-map objectives, repeatable rewards, or
  unrelated refactoring.
- No commit, push, merge, or deployment.

## 12. Risks and unresolved technical questions

- The existing browser verification demonstrated travel through the opened
  gate to the north side, but did not exercise this quest's trigger. The exact
  proposed body bounds must be measured/verified during implementation. If
  actual body coordinates differ, adjust only the bounded trigger and add
  boundary tests before accepting it.
- Current save reads may occur before the scene restores manager state
  ([src/game/quests/QuestManager.ts:280](../../src/game/quests/QuestManager.ts#L280)).
  Normalize pre-feature V3 saves consistently at the manager's save-loading
  boundary so the scene, profile, home-screen, and quest-tracker consumers all
  receive one normalized runtime state. A read alone does not rewrite storage.
- `localStorage` is the current persistence mechanism and does not provide a
  cross-tab compare-and-swap transaction. Multiple-tab concurrency is outside
  scope and is not supported or promised by this design.
- The typed `SideQuestCompletionResult` is authoritative: return
  `persistence-failed` or `recovery-required` to the caller, which must use
  that result to choose an error or recovery message. A save-status event may
  additionally notify the UI. No dialogue, tracker, notification, or reward
  animation may indicate successful completion unless persisted completion is
  confirmed.
- The 25 XP amount is approved for this quest only. It must not be interpreted
  as a change to any campaign reward or XP economy rule.
