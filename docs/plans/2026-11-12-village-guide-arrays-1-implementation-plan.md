# Village Guide Arrays 1 Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing Old Man gate prologue to the existing Village Guide's formal Arrays 1 lesson, practice, interactive workshop, campaign reward, and optional Arrays Knowledge Scroll.

**Architecture:** Keep campaign completion/XP/relic authority in `QuestManager`. Persist only the Guide's sub-stage in a separate versioned key, and surface it beside campaign progress in the existing QuestTracker. Use a pure, testable workshop operation module; React renders the Guide learning/workshop challenge UI; MainScene owns NPC routing and the challenge-to-world resume handoff.

**Tech Stack:** TypeScript, React 19, Phaser 4, Vitest, existing external-store challenge/quest state.

## Global Constraints

- Reuse existing `village-guide` NPC at tile (12, 15); do not add an NPC, sprite, portrait, map placement, or duplicate character.
- Old Man retains only opening Array prologue and Northern Scouting Trip; remove his Arrays Scroll ownership and all Scroll-dependent Elder branch routing.
- The Guide owns formal Arrays 1 and the optional Arrays Knowledge Scroll.
- Lesson → exactly three practice questions → workshop; only workshop success completes Arrays.
- First formal Arrays completion awards existing 50 XP and `array-relic` through `QuestManager.completeTopic('arrays', ...)`; do not create another reward authority.
- Scroll is optional, is offered on a subsequent Guide interaction after workshop success, and remains separate from campaign mastery/rewards.
- Keep existing Scroll question bank, 3/2/1 hearts, code runner, one-time collect behavior, and Northern Scouting Trip side quest.
- Preserve existing Guide Village Training Route eligibility and dialogue.
- Do not change `MAP.json`, `GameWorld.tsx`, camera, movement/collision, gate behavior, HUD controls/layout, mobile/touch code, audio, skins, settings, or manga/story content.
- Focused tests and final repository checks are in scope; comprehensive game-wide QA/polish remains deferred.
- No commits, pushes, merges, or deployments without separate user authorization.

---

### Task 1: Persist the Guide's Arrays stage and expose campaign progress to the quest tracker

**Files:**
- Create: `src/game/quests/arraysCampaignStages.ts`
- Create: `src/game/quests/arraysCampaignStages.test.ts`
- Modify: `src/game/quests/questTypes.ts`
- Modify: `src/game/quests/QuestManager.ts`
- Modify: `src/game/quests/QuestTracker.tsx`
- Modify: `src/game/quests/QuestTracker.test.tsx`

**Interfaces:**
- `ArraysCampaignStage = 'learn' | 'practice' | 'implement' | 'complete'`
- `getArraysCampaignStage(): ArraysCampaignStage`
- `setArraysCampaignStage(stage: ArraysCampaignStage): void`
- `clearArraysCampaignStage(): void`
- `QuestViewState.campaign: CampaignProgress`

- [x] **Step 1: Add focused failing tests**
  - Stage store starts at `learn`, persists each accepted stage, survives a read after module reload, resets to `learn` on clear, and dispatches `dsaq:arrays-campaign-stage-changed` on change.
  - QuestTracker shows the existing Old Man quest until `array-sorting-challenge` is complete.
  - After the Old Man gate quest is complete and Arrays is available/in-progress, QuestTracker shows **Arrays 1 — The Village Guide** and stage-specific objectives for Learn, Practice, and Workshop.
  - After Arrays completes, QuestTracker shows it as completed and says the player can speak to the Guide again for the optional Scroll.
- [x] **Step 2: Verify the relevant failure**
  - Run: `npx vitest run src/game/quests/arraysCampaignStages.test.ts src/game/quests/QuestTracker.test.tsx`
  - Expected: missing stage module/contract and missing campaign tracker view fail the new assertions.
- [x] **Step 3: Implement the minimum behavior**
  - Store the Guide stage under a distinct `dsaq-arrays-campaign-stage-v1` localStorage key, with safe fallback to `learn` and the specified custom event.
  - Add campaign progress to the existing QuestManager snapshot; do not add a duplicate completed quest record for Arrays.
  - Clear the stage when QuestManager clears/reset saves.
  - QuestTracker chooses the Guide campaign row only after the Old Man gate quest is complete and the formal Arrays topic is not locked. Campaign status remains authoritative for Active/Done.
- [x] **Step 4: Verify the focused pass**
  - Run: `npx vitest run src/game/quests/arraysCampaignStages.test.ts src/game/quests/QuestTracker.test.tsx`
  - Expected: all focused stage and tracker tests pass.
- [x] **Step 5: Run affected integration check**
  - Run: `npx vitest run src/game/quests/campaignRules.test.ts src/game/quests/campaignV3Migration.test.ts`
  - Expected: legacy V3 saves, Arrays first-completion rewards, and existing sequential campaign unlocks remain unchanged.

### Task 2: Implement the pure Array Manipulation Workshop rules

**Files:**
- Create: `src/game/challenge/arrayManipulationWorkshop.ts`
- Create: `src/game/challenge/arrayManipulationWorkshop.test.ts`

**Interfaces:**
- `ArrayWorkshopOperation` discriminated union for `access`, `update`, `insert`, `delete`, and `append`.
- `ARRAY_WORKSHOP_STEPS` contains the five approved goals from the design.
- `applyArrayWorkshopOperation(values, stepIndex, operation)` returns either a successful new state/result or a rejected result with feedback; it never mutates its input array.

- [x] **Step 1: Add focused failing tests**
  - Assert the exact successful sequence and final array: `[10, 15, 30, 40]`.
  - Access returns value 20 and leaves the array unchanged.
  - Update/insert/delete/append produce exactly the design's intermediate arrays.
  - Wrong operation, wrong index, negative/out-of-range index, missing/non-finite numeric value, invalid step, delete from an empty array, and extra operations after the fifth step are rejected without mutation/advancement.
- [x] **Step 2: Verify the relevant failure**
  - Run: `npx vitest run src/game/challenge/arrayManipulationWorkshop.test.ts`
  - Expected: the module/API is missing and test imports fail.
- [x] **Step 3: Implement the pure operation engine**
  - Use immutable array copies.
  - Enforce the current guided step so a wrong action cannot advance or mutate.
  - Return precise learner-facing feedback with valid index bounds.
- [x] **Step 4: Verify the focused pass**
  - Run the same focused Vitest command.
  - Expected: every operation, sequence, and invalid-input test passes.

### Task 3: Build the Village Guide lesson and three-question practice

**Files:**
- Create: `src/game/challenge/VillageGuideArraysLesson.tsx`
- Create: `src/game/challenge/VillageGuideArraysLesson.test.tsx`
- Create: `src/game/challenge/villageGuideArraysLesson.css`
- Modify: `src/game/challenge/challengeTypes.ts`
- Modify: `src/game/challenge/challengeStore.ts`
- Modify: `src/game/challenge/QuizChallenge.tsx` and its existing test.

**Interfaces:**
- Add challenge ID `village-guide-arrays`.
- Add challenge-store methods to transition the active Guide lesson from `learn` to `practice`, validate the current practice answer, and transition to `implement` after exactly three correct answers.
- Practice content and correct answers are the three approved examples in the design; each wrong answer gives a short explanation and can be retried.

- [x] **Step 1: Add focused failing tests**
  - Lesson panel explains arrays, zero-based indexes, access, update, insert/delete shifting, append, and O(1) versus O(n) in simple language.
  - A player can finish the lesson and enter practice.
  - The three question prompts and expected answers match the design.
  - An incorrect response leaves the current question unchanged and provides explanatory feedback.
  - The lesson/practice challenge cannot mark Arrays complete or award XP/relics.
  - All three correct answers move the persisted stage to `implement`.
- [x] **Step 2: Verify the relevant failure**
  - Run: `npx vitest run src/game/challenge/VillageGuideArraysLesson.test.tsx src/game/challenge/challengeStore.test.ts`
  - Expected: new challenge/render/store contract assertions fail before implementation.
- [x] **Step 3: Implement the lesson/practice screen and store transitions**
  - Render a three-step illustrated array explanation and a three-question guided practice, with answer feedback and retry.
  - On open, use the existing `QuestManager.startTopic('arrays')` idempotently, but do not complete the topic.
  - Resume `learn` or `practice` from the stage store; practice may restart from question one after interruption.
- [x] **Step 4: Verify the focused pass**
  - Run: `npx vitest run src/game/challenge/VillageGuideArraysLesson.test.tsx src/game/challenge/challengeStore.test.ts`
  - Expected: lesson/practice behaviors pass; no campaign reward is granted.
- [x] **Step 5: Run affected integration check**
  - Run: `npx vitest run src/game/challenge/QuizChallenge.test.tsx src/game/challenge/ArrayLesson.test.tsx`
  - Expected: Elder's existing lesson and quiz screens remain unchanged.

### Task 4: Build the interactive workshop UI and award formal Arrays mastery

**Files:**
- Create: `src/game/challenge/ArrayManipulationWorkshop.tsx`
- Create: `src/game/challenge/ArrayManipulationWorkshop.test.tsx`
- Create: `src/game/challenge/arrayManipulationWorkshop.css`
- Modify: `src/game/challenge/challengeTypes.ts`
- Modify: `src/game/challenge/challengeStore.ts`
- Modify: `src/game/challenge/QuizChallenge.tsx`
- Modify: `src/game/quests/QuestManager.ts` only if the existing snapshot/reset seam requires it.

**Interfaces:**
- Add challenge ID `array-manipulation-workshop`.
- Add state and operations for the five-step interactive workshop, with invalid action and hint counters.
- Workshop success calls `QuestManager.completeTopic('arrays', { passed: true, masteryGrade: gradeInteractiveChallenge({ invalidActions, hintsUsed }), hintsUsed })`.
- Workshop abandonment never completes the topic.

- [x] **Step 1: Add focused failing tests**
  - UI exposes indexed boxes, the current target operation, operation input controls, feedback, and a Hint action.
  - The five successful operations visually update values and indices, ending at `[10, 15, 30, 40]`.
  - Invalid operations increment the penalty count but preserve values and current step.
  - Workshop interruption/close grants no topic reward; reopening begins from `[10, 20, 30]` while stage remains `implement`.
  - Completing the fifth step displays an achievement-style success panel, records topic mastery, awards exactly 50 XP and `array-relic` once, and unlocks Stack Operations.
- [x] **Step 2: Verify the relevant failure**
  - Run: `npx vitest run src/game/challenge/ArrayManipulationWorkshop.test.tsx src/game/challenge/arrayManipulationWorkshop.test.ts src/game/challenge/challengeStore.test.ts`
  - Expected: workshop UI/store integration assertions fail before implementation.
- [x] **Step 3: Implement the component and reward path**
  - Use the pure operation engine from Task 2.
  - Provide input controls for operation, index, and value; reject invalid values or indexes before changing array state.
  - Record hint/invalid action metrics and derive mastery from the existing `gradeInteractiveChallenge`.
  - Complete the formal topic only after the full five-step sequence; set the Guide stage to `complete`.
  - Show the one-time first-completion reward based on QuestManager's result; replay or interrupted attempts cannot duplicate XP/relics.
- [x] **Step 4: Verify the focused pass**
  - Run the same focused Vitest command.
  - Expected: all workshop, reward, and interruption tests pass.
- [x] **Step 5: Run affected integration check**
  - Run: `npx vitest run src/game/quests/campaignRules.test.ts src/game/challenge/challengeStore.test.ts`
  - Expected: existing queue campaign flow and sequential topic unlocks remain unchanged.

### Task 5: Connect the Guide quest, transfer Scroll ownership, and preserve Elder/Guide side quests

**Files:**
- Modify: `src/game/npc/villageNpcs.ts`
- Modify: `src/game/scenes/MainScene.ts`
- Create: `src/game/quests/villageGuideArraysRouting.ts` and its tests
- Modify: `src/game/challenge/ArrayKnowledgeScrollChallenge.tsx`
- Modify: `src/game/challenge/ArrayKnowledgeScrollChallenge.test.tsx`
- Modify: `src/game/quests/elderCampaignRouting.ts` and tests only if the current route helper explicitly depends on Scroll availability.
- Create or extend a focused Guide routing test module for the stage/eligibility decisions.

**Interfaces:**
- Guide routing selects locked invitation before the Old Man gate completion; lesson/practice before Arrays completion; workshop while stage is `implement`; optional Scroll offer after topic completion and before Scroll collection; collected acknowledgement after the Scroll claim.
- Scroll accept opens existing `array-knowledge-scroll`; its scene resume claims `arrays` only on successful completion.
- Elder routing is independent of `hasKnowledgeScroll('arrays')`.

- [x] **Step 1: Add focused failing tests**
  - Existing Guide NPC ID and authored location are the only Arrays teacher; no new NPC is present.
  - Guide cannot start Arrays before the Old Man's gate quest is complete.
  - Guide opens/resumes lesson/practice/workshop for the formal topic stage.
  - After workshop success, the first subsequent Guide interaction offers the Scroll; no Scroll challenge is auto-opened at workshop completion.
  - Scroll already claimed yields an acknowledgement, not a repeat offer.
  - Old Man's dialogue no longer contains or routes Scroll invitation/accept/collected nodes.
  - Northern Scouting Trip offer/reminder/report/completed branches remain reachable, and Village Training Route remains reachable under its existing eligibility rules.
  - Scroll challenge title and instructions identify the Village Guide rather than the Old Man; its question tiers/lives remain intact.
- [x] **Step 2: Verify the relevant failure**
  - Run: `npx vitest run src/game/npc/villageNpcs.test.ts src/game/quests/elderCampaignRouting.test.ts src/game/challenge/ArrayKnowledgeScrollChallenge.test.tsx`
  - Expected: route ownership and copy assertions expose the current Elder-owned Scroll behavior.
- [x] **Step 3: Implement MainScene/Dialogue routing**
  - Existing Guide route has precedence only after the Old Man prerequisite; retain current Guide training-route options when they remain eligible.
  - Remove Scroll nodes and Scroll-dependent branch substitutions from the Elder tree/scene route. Preserve all Northern Scouting Trip nodes and behavior.
  - Add Scroll offer/accept/later/collected nodes to the Guide and route Scroll accept to the existing challenge.
  - Route lesson/practice and workshop to their challenge components; preserve the guide sprite, location, animations, and interaction untouched.
  - Update Scroll UI wording and return CTA to Village Guide.
- [x] **Step 4: Verify the focused pass**
  - Run: `npx vitest run src/game/npc/villageNpcs.test.ts src/game/quests/elderCampaignRouting.test.ts src/game/challenge/ArrayKnowledgeScrollChallenge.test.tsx`
  - Expected: the new ownership tests and pre-existing NPC/Elder/Scroll tests pass.
- [x] **Step 5: Final repository verification**
  - Run: `npm test`
  - Run: `npm run lint`
  - Run: `npm run check:village`
  - Expected: build and full suite pass; linter and village rules check exit zero. Record any pre-existing warnings separately.
  - Inspect `git diff --check`, `git status --short`, and the complete diff. Confirm no protected path is changed.
- [x] **Step 6: Commit and push after explicit approval**
  - User approved publishing the feature branch. Do not merge or deploy without separate authorization.

## Unresolved product decisions

None. The design's observable flows, question examples, reward, Scroll ownership, interruption behavior, and scope are approved.
