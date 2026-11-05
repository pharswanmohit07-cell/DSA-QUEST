# Northern Scouting Trip — Implementation Plan

**Status:** Proposed; implementation not started<br>
**Product contract:** [Northern Scouting Trip design specification](../specs/2026-11-04-northern-snowfield-side-quest-design.md)<br>
**Scope:** Implement the approved optional side quest without changing the map,
campaign rules, movement, camera, collision, gate, HUD beyond the specified
tracker section, touch controls, or manga.

## Current repository findings

- The V3 save model is `CampaignSave` in `src/game/quests/questTypes.ts`.
  `QuestManager.getSave()` reads V3 first, migrates V2/V1 when V3 is absent,
  and `restore()` publishes the loaded state. `QuestViewState` is the
  React-facing external-store snapshot.
- `saveMigration.ts` validates V1/V2/V3 and migrates legacy campaign data.
  V3 currently requires the campaign save shape and does not have side-quest
  normalization.
- `QuestManager` owns campaign progression, XP, persistence, and
  `useQuestState()`. Its general `awardXp()` is a separate save operation and
  is not suitable for the side-quest transaction.
- `elderCampaignRouting.ts` is a pure routing helper. The scene currently
  routes the existing `quest_done` acknowledgement through
  `MainScene.beginDialogue`; `villageNpcs.ts` contains the Elder's
  `DialogueTree`; scene-owned node effects are dispatched by
  `chooseDialogueNode()` and `runDialogueEffects()`.
- `MainScene.update()` calls `updatePlayerMovement()` once for both keyboard
  and touch directions. The player's Arcade body is available there, and the
  existing depth uses `body.bottom`. There is no existing northern-snowfield
  quest trigger.
- `QuestTracker.tsx` subscribes to `useQuestState()` and currently displays
  the legacy quest records and campaign-independent XP footer. It is mounted
  by `GameWorld.tsx`; that integration file is protected and should not need
  changes.
- Migration/routing/campaign tests use Vitest. There is no existing
  QuestManager side-quest test or QuestTracker test.
- `package.json` provides `npm test`, `npm run build`, `npm run lint`, and
  `npm run check:village`. There is no `npm run check` script.

## Task 1 — Side-quest types and save compatibility

### Files

Modify:

- `src/game/quests/questTypes.ts`
- `src/game/quests/saveMigration.ts`
- `src/game/quests/QuestManager.ts` — only the save-loading/restore boundary
  and save serialization needed to expose normalized runtime state.
- `src/game/quests/saveMigration.test.ts`
- `src/game/quests/campaignV3Migration.test.ts`

### Interfaces

Consume the existing `CampaignSave`, `CampaignSaveV2`, V1 save type,
`isCampaignSaveV3()`, `migrateCampaignSave()`, `QuestManager.getSave()`,
`restore()`, and save key behavior.

Add a distinct `NorthernSnowfieldScoutingProgress` record to the V3/runtime
save and quest view types. Keep it outside `CampaignProgress.topics` and
`firstCompletionRewardClaims`. Define the legacy-compatible V3 input shape
separately from, or explicitly normalize it into, the runtime shape. V1/V2
migrations and new V3 writes produce the default or persisted side-quest
record.

### Test-first sequence

1. Extend migration tests for V1/V2 defaults and preservation of existing save
   values and the established V2 +50 XP migration behavior.
2. Add V3 compatibility cases: absent field is accepted and normalized;
   reading does not rewrite the V3 storage string; the next normal save writes
   the default field; present malformed or impossible state is rejected.
3. Verify invalid V3 still does not fall back to V2 and remains unmodified.
4. Implement the types, strict-present-field validation, migration defaults,
   and one manager-owned normalization boundary. Ensure all consumers of
   manager save/runtime state receive the normalized record.
5. Verify save migration read-back compares the normalized side-quest field.

### Focused tests

```powershell
npm test -- src/game/quests/saveMigration.test.ts src/game/quests/campaignV3Migration.test.ts
```

Expected: all legacy migration, reward compensation, V3 validation, and new
normalization cases pass; pre-feature V3 reads preserve their original storage
until an ordinary successful save.

### Failure and recovery

Malformed present V3 side-quest data is invalid V3: preserve it, report the
existing recovery condition, and do not fall back to V1/V2. Failure to migrate
or verify a legacy save must preserve the source backup and expose no
success-shaped normalized save. Do not write storage merely to normalize a
read.

## Task 2 — QuestManager transitions and reward transaction

### Files

Modify:

- `src/game/quests/questTypes.ts`
- `src/game/quests/QuestManager.ts`
- `src/game/quests/saveMigration.ts` — only as needed for full transaction
  save validation.

Create:

- `src/game/quests/sideQuestQuestManager.test.ts`

### Interfaces

Consume the normalized side-quest record and existing Manager snapshot,
subscription, save, and persistence APIs.

Add explicit manager transitions for not-started → active and active,
unvisited → active, visited. Add the typed completion result from the approved
specification (`completed`, `already-completed`, `not-eligible`,
`persistence-failed`, `recovery-required`) and one operation that persists
completed status, `rewardClaimed=true`, and exactly +25 XP in a single V3
value. Include the separate side-quest state in the external-store snapshot.

### Test-first sequence

1. Add tests for default state, acceptance-only start, one-time visit, and
   rejection of ineligible reports. Verify accepted and visited progress
   persists across reload; failed or unverified writes do not publish
   successful transitions.
2. Add transaction tests for successful atomic write/read-back, exactly +25 XP,
   no campaign/relic/grade changes, and duplicate completion.
3. Add storage fault tests distinguishing failure before persistence from
   successful write with failed/unexpected verification.
4. Test recovery by re-reading and validating canonical V3: reconcile an
   already-completed/claimed state without XP changes; reconcile unchanged
   active/visited/unclaimed state before permitting retry; retain the
   recovery lock when canonical storage cannot be read or validated.
5. Implement transitions, transaction, explicit results, reconciliation, and
   subscriptions. Start and visit operations must return explicit persistence
   outcomes (for example `started`/`visited`, `not-eligible`,
   `persistence-failed`, and `recovery-required`). Publish the successful
   transition only after its V3 write and read-back verification succeed.
   Before retrying after any failed or uncertain write, re-read and validate
   canonical V3 storage, reconcile the manager, and retry only if the stored
   quest is still eligible. Do not retry from stale in-memory state. Do not
   call `awardXp(25)` as part of completion.

### Focused tests

```powershell
npm test -- src/game/quests/sideQuestQuestManager.test.ts src/game/quests/saveMigration.test.ts src/game/quests/campaignV3Migration.test.ts
```

Expected: one confirmed completion adds exactly 25 XP; no failure, uncertain
write, retry, duplicate event, or reload can award it twice. The manager only
publishes confirmed persisted completion; other campaign progression results
remain unchanged.

The start and visit tests additionally require explicit success/failure
results, no success publication before verification, canonical-state
reconciliation before retries, and no retry when storage cannot be read or
validated.

### Failure and recovery

Return `persistence-failed` for a known pre-persistence write failure.
Return `recovery-required` and block reward mutations for an uncertain write
until a valid canonical V3 read or reload. Before retry, reconcile storage;
never trust stale in-memory eligibility. The caller must receive the typed
result. Do not imply support for concurrent tabs.

## Task 3 — Elder dialogue and world trigger

### Files

Modify:

- `src/game/quests/elderCampaignRouting.ts`
- `src/game/quests/elderCampaignRouting.test.ts`
- `src/game/npc/villageNpcs.ts`
- `src/game/scenes/MainScene.ts`

Create:

- `src/game/quests/northernSnowfieldTrigger.ts` — small pure bounded-region
  predicate to keep coordinate checks independently testable.
- `src/game/quests/northernSnowfieldTrigger.test.ts`
- `src/game/npc/villageNpcs.test.ts` — dialogue branch coverage against the
  exported Elder dialogue tree.

### Interfaces

Consume `getElderInteractionRoute()`, `DialogueTree` /
`DialogueController.startAt()`, scene dialogue-choice/effect dispatch,
`QuestManager` side-quest transitions, the player's Arcade body, and the
existing update/input path.

The trigger predicate should accept measured body coordinates and use the
approved candidate bounds (`body.center.x` 184–216 and `body.bottom` 272–304)
only after gameplay confirms those bounds are reachable. It produces only a
boolean; `MainScene` records the first visit through the manager.

Add the post-campaign offer, accept, “Not now”, active reminder, report, and
completed dialogue states. Keep the existing Array/Stack routes and
`quest_done` acknowledgement. Completion/reward success dialogue is shown
only after the manager returns `completed` or confirms
`already-completed`.

### Test-first sequence

1. Extend routing tests to prove all existing pre-completion Array/Stack
   decisions are unchanged and side-quest branches are gated behind the
   existing post-campaign route.
2. Add dialogue data tests for each optional branch, choices, and preserved
   campaign acknowledgement.
3. Test trigger boundaries: a point south of the torii/gate, either X edge
   outside the region, each inclusive bound, and representative interior
   points.
4. Implement dialogue nodes and scene effects; start only on explicit
   acceptance and make “Not now” state-neutral.
5. Integrate the trigger into the scene update using the physics body and
   stop evaluating after a persisted first visit. Do not alter movement,
   collision, camera, gate, map, or input controls.

### Focused tests

```powershell
npm test -- src/game/quests/elderCampaignRouting.test.ts src/game/quests/northernSnowfieldTrigger.test.ts src/game/npc/villageNpcs.test.ts
```

Expected: existing routing tests continue passing; the new dialogue and
coordinate tests cover all approved states and reject southern approach.

### Failure and recovery

If acceptance or visit persistence fails, do not publish the started/visited
state or corresponding success dialogue/tracker feedback. Return explicit
`persistence-failed` or `recovery-required` outcomes to the caller. Before any
retry, re-read and validate canonical V3 storage and reconcile the manager;
retry only if the stored state still permits that transition. If storage
cannot be read or validated, block the retry until recovery or reload. A
report choice never itself proves completion. On non-success completion
results, show an appropriate error/recovery response and do not show
completion/reward effects.

### Manual verification

With the Array/Stack gate opened, check approach from the south does not count
as a visit. Confirm the bounded region can be reached beyond the torii and the
visit records once using both keyboard and touch movement. If actual body
coordinates differ, adjust only the bounds based on observed reachable
coordinates, update the boundary tests, and preserve the map and movement
systems.

## Task 4 — Optional quest tracker and integration verification

### Files

Modify:

- `src/game/quests/QuestTracker.tsx`
- `src/game/quests/questTracker.css`

Create:

- `src/game/quests/QuestTracker.test.tsx`

Do not modify `src/game/GameWorld.tsx`; it already mounts `QuestTracker`.

### Interfaces

Consume `useQuestState()` and the distinct side-quest state in its snapshot.
Render a separate Optional Side Quest section without adding it to the main
quest list, progress fraction, campaign topic counts, relic display, or grade.

### Test-first sequence

1. Add tests for hidden/not-started, active/unvisited, active/visited, and
   completed UI states, including the exact objective and 25 XP claimed text.
2. Test that the main campaign count/progress remains based only on existing
   quest records.
3. Test that unsuccessful or uncertain transaction results do not produce
   completion/reward feedback; confirmed `completed` and reconciled
   `already-completed` do.
4. Implement the independent tracker section using current visual patterns.
5. Run focused quest tests, then the full suite, production build, lint, and
   village rules check. Complete the manual gameplay checklist in the
   specification, including reload and duplicate-report cases.

### Focused tests

```powershell
npm test -- src/game/quests/QuestTracker.test.tsx
```

Expected: tracker states update from the manager snapshot; side-quest UI
remains separate from all campaign calculations and only confirms persisted
completion.

### Integration commands

```powershell
npm test
npm run build
npm run lint
npm run check:village
```

Expected: all Vitest tests pass, TypeScript/Vite production build succeeds,
Oxlint reports no issues, and existing village rules pass without changes to
map or GameWorld. Perform the keyboard/touch and reload checks in the approved
specification; automated tests cannot establish actual Phaser reachability.

### Failure and recovery

Keep the side quest hidden until accepted and retain its completed state after
reload. Surface persistence/recovery outcomes from the typed manager result;
no tracker state or visual reward may claim success before persisted
completion is confirmed. Any failure in the integration suite blocks shipping
until fixed without weakening the existing campaign tests or protected-system
constraints.

## Worktree safety and existing local work

The inspected checkout is `main` at
`C:/Users/ROHIT/setu-frontend/dsa-quest-game`. `git worktree list --porcelain`
shows only this worktree, so it is not currently an isolated linked worktree.
A new worktree created from current `HEAD` would contain commit
`53f41f50af181da644f7504f7de6c54fd5616bd9` only; it would omit every uncommitted
change below.

### Modified tracked files

- `src/game/challenge/challengeStore.ts`
- `src/game/challenge/challengeTypes.ts`
- `src/game/quests/QuestManager.ts`
- `src/game/quests/campaignDefinitions.ts`
- `src/game/quests/campaignRules.test.ts`
- `src/game/quests/questTypes.ts`
- `src/game/quests/saveMigration.test.ts`
- `src/game/quests/saveMigration.ts`
- `src/game/scenes/MainScene.ts`
- `src/game/stats/playerStats.ts`
- `src/screens/StatsPanel.tsx`

### Untracked files

- `docs/asset-library/ninja-adventure/Ninja-Adventure-Asset-Pack-File-Index.csv`
- `docs/asset-library/ninja-adventure/Ninja-Adventure-Asset-Pack-Inventory.md`
- `docs/asset-library/ninja-adventure/README.md`
- `docs/specs/2026-11-04-northern-snowfield-side-quest-design.md`
- `scripts/check-upper-village-roofs.mjs`
- `scripts/extract-tile.mjs`
- `scripts/find-overlay-cells.mjs`
- `scripts/remove-rect-528-240.cjs`
- `scripts/verify-upper-roofs.mjs`
- `src/game/challenge/challengeStore.test.ts`
- `src/game/quests/campaignV3Migration.test.ts`
- `src/game/quests/elderCampaignRouting.test.ts`
- `src/game/quests/elderCampaignRouting.ts`
- `src/game/quests/masteryGrading.test.ts`
- `src/game/quests/masteryGrading.ts`
- `src/game/stats/playerStats.test.ts`

The current working diff and those untracked files remain only in the original
worktree. This inventory was captured before adding this plan; the plan itself
is one additional untracked file. No worktree has been created. If isolation is
approved, a safe transfer is to add a sibling worktree from the same current
HEAD, create a binary patch from the original tracked working diff, and apply
that patch only in the new worktree. Copy only these approved untracked files:

- `src/game/challenge/challengeStore.test.ts`
- `src/game/quests/campaignV3Migration.test.ts`
- `src/game/quests/elderCampaignRouting.test.ts`
- `src/game/quests/elderCampaignRouting.ts`
- `src/game/quests/masteryGrading.test.ts`
- `src/game/quests/masteryGrading.ts`
- `src/game/stats/playerStats.test.ts`
- `docs/specs/2026-11-04-northern-snowfield-side-quest-design.md`
- `docs/plans/2026-11-04-northern-snowfield-side-quest.md`

Keep the original files untouched, verify the transferred diff and
untracked-file inventory against the original, and do not stage or commit
either copy. Leave `docs/asset-library/` and the roof-inspection scripts in the
original worktree. Do not create the workspace until the user authorizes its
creation.

## Risks and decisions before implementation

- The proposed snowfield bounds are candidates, not gameplay-verified facts.
  Reachability and body-coordinate measurements remain a manual gate for Task
  3.
- The completion transaction has a defined typed result and recovery path.
  Implementation must ensure every caller uses failure results and no UI
  reports success early.
- The single-tab localStorage design does not support cross-tab concurrency.
- The existing campaign/source work is uncommitted. Implementation must begin
  only after approval of the isolated-worktree location and an explicit
  transfer allowlist; a HEAD-only worktree would silently omit the campaign
  work.
- No source implementation, worktree creation, staging, or commit is authorized
  by this plan.
