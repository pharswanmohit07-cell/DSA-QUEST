# DSA Quest Main Campaign and Knowledge Scrolls Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver a connected Old Man → Village Guide → Samurai → Farmer main campaign with one consistent challenge UI, accurate Quest Tracker progression, and optional but independently collectible topic Knowledge Scroll tests.

**Architecture:** Keep `QuestManager` authoritative for main-topic status, prerequisites, mastery, XP, and relic entitlements. Keep `knowledgeScrolls.ts` authoritative for the seven independent collectibles. Add a small persisted NPC campaign-stage store for Stack and Queue stage reporting, shared route decisions for the earliest unmet prerequisite, and a reusable visual frame built on the working Village Guide design.

**Tech Stack:** React 19, TypeScript, Phaser 4, Vitest, CSS, existing external-store challenge and quest state, localStorage.

## Global Constraints

- Keep the Old Man gate prologue separate from the formal Arrays topic.
- Preserve the working Village Guide Arrays Learn → 3-question Practice → Array Manipulation Workshop flow and its existing optional Arrays Knowledge Scroll test.
- Main campaign order is Old Man gate → Village Guide Arrays → Samurai Stack Operations → Farmer Queues.
- The next NPC unlocks only after the previous topic's implementation activity completes. Passing an MCQ quiz alone never completes a topic.
- Knowledge Scroll tests are independent from main campaign topic status. They are optional for NPC progression and required only for full seven-scroll completion.
- Preserve the existing seven Knowledge Scroll IDs and the existing collectible storage authority.
- Keep the Farmer's original guided 15-step Queue sequence and separate independent five-parcel delivery round.
- Preserve the existing optional Village Training Route and Northern Scouting Trip without letting them reorder or block the main campaign.
- All four NPCs must use the Village Guide's established visual language. Topic content and implementation mechanics remain unique.
- Never show a stale dialogue over an active challenge. Only one modal interaction may be active at a time.
- Explain the objective, controls, rules, and success condition before interactive play; explanations teach the rules and do not reveal answers.
- Do not change the V3 campaign save shape unless proven necessary; if it changes, extend migration and migration tests.
- Do not edit protected systems: `src/game/GameWorld.tsx`, `MAP.json`, story artwork/content, camera, player movement/collision, gate geometry/behavior, existing HUD controls/layout, audio/music, settings, or mobile/touch code.
- Keep all work on preview branches. Do not merge into `main` or deploy production.

---

### Task 1: Guard active challenges and centralize earliest-prerequisite NPC routing

**Files:**
- Create: `src/game/quests/mainCampaignRouting.ts`
- Test: `src/game/quests/mainCampaignRouting.test.ts`
- Modify: `src/game/scenes/MainScene.ts`
- Modify: `src/game/npc/villageNpcs.ts`
- Modify: `src/game/quests/farmerQueueRouting.ts` and its test, or replace its logic with the new pure router.

**Interfaces:**
- Consumes: `CampaignSnapshot.topics`, Elder gate quest completion, NPC IDs `village-guide`, `dojo-samurai`, and `south-farmer`.
- Produces: a pure route decision describing the earliest unmet required NPC and a safe opening state for the requested NPC.
- Produces: `challengeStore.hasActiveChallenge(): boolean` for scene-level interaction guards.

- [x] **Step 1: Add focused failing route tests**

Assert:
1. Before the Elder gate completes, the Guide, Samurai, and Farmer all direct the player to the Old Man.
2. After the gate but before Arrays completion, Samurai and Farmer both direct the player to the Village Guide.
3. After Arrays completion but before Stack completion, the Farmer directs the player to the Samurai.
4. After Stack completion, the Farmer may open the Queue campaign.
5. After an NPC's main topic completes, its Scroll offer is available only when its own Scroll is unclaimed; postponing the offer leaves the next main objective unchanged.
6. An active challenge prevents any new NPC dialogue/second challenge from opening.

- [x] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/quests/mainCampaignRouting.test.ts src/game/quests/farmerQueueRouting.test.ts`

Expected: failures for missing earliest-prerequisite route decisions and active-challenge guard.

- [x] **Step 3: Implement the minimum routing and modal guard**

Use a pure route resolver that evaluates prerequisites in order: gate, Arrays, Stack, Queues. All NPCs check the same earliest-unmet prerequisite. In `MainScene.beginDialogue()`, return without opening dialogue when `challengeStore.hasActiveChallenge()` is true. Ensure successful lesson/scroll opening closes any prior dialogue and does not fall through to a “trial in progress” dialogue. Add explicit optional Scroll/later dialogue choices for completed Samurai and Farmer topics.

- [x] **Step 4: Verify the focused pass**

Run the same focused Vitest command.

Expected: every route case passes, and dialogue routing remains deterministic.

- [x] **Step 5: Run affected integration checks**

Run: `npx vitest run src/game/npc/villageNpcs.test.ts src/game/quests/villageGuideArraysRouting.test.ts src/game/quests/elderCampaignRouting.test.ts`

Expected: existing NPC identity, Elder gate, Guide routing, and optional side-quest dialogue remain green.

---

### Task 2: Persist Stack/Queue lesson stages and make Quest Tracker reflect the main campaign

**Files:**
- Create: `src/game/quests/npcCampaignStages.ts`
- Test: `src/game/quests/npcCampaignStages.test.ts`
- Modify: `src/game/challenge/challengeStore.ts`
- Modify: `src/game/quests/QuestManager.ts` only to clear the new stage keys during the existing new-campaign clear path.
- Modify: `src/game/quests/QuestTracker.tsx`
- Test: `src/game/quests/QuestTracker.test.tsx`

**Interfaces:**
- `NpcCampaignStage = 'learn' | 'practice' | 'implement' | 'complete'`.
- `getNpcCampaignStage(topic: 'stack-operations' | 'queues'): NpcCampaignStage`.
- `setNpcCampaignStage(topic, stage): void`, `clearNpcCampaignStages(): void`, and `NPC_CAMPAIGN_STAGE_EVENT`.
- Quest Tracker consumes `useQuestState()`, the existing Arrays stage store, and the new Stack/Queue stage store. Topic mastery remains sourced only from `campaign.topics[topic].status`.

- [x] **Step 1: Add focused failing stage-store and tracker tests**

Assert:
1. Stage defaults to Learn, persists after reload, dispatches the stage event, and clears for a new campaign.
2. Gate incomplete displays the Old Man as the current objective.
3. Gate complete / Arrays incomplete displays Village Guide — Arrays.
4. Arrays complete / Stack incomplete displays Samurai — Stack Operations.
5. Stack complete / Queue incomplete displays Farmer — Queues.
6. Stage progress moves Learn 0/3 → Practice 1/3 → Implement 2/3 → Complete 3/3.
7. Quest Tracker advances automatically on QuestManager and stage events without remount/manual refresh.
8. Scroll collection state never changes the current main-campaign objective.

- [x] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/quests/npcCampaignStages.test.ts src/game/quests/QuestTracker.test.tsx`

Expected: tests fail because Stack/Queue stage storage and derived current objectives do not exist.

- [x] **Step 3: Implement stage persistence and tracker derivation**

Persist Stack and Queue stages under separate versioned keys without changing the V3 save type. Update stage transitions at the real lesson, quiz, and implementation boundaries. Clear these stage keys in the same new-campaign reset path that clears Arrays stage. Derive the current Quest Tracker primary objective from the Old Man gate completion and the first not-yet-completed topic in Arrays → Stack → Queues. Preserve optional side-quest rendering below the primary objective. Derive progress from the correct topic stage; a quiz pass only moves the stage to Implement.

- [x] **Step 4: Verify the focused pass**

Run the same focused Vitest command.

Expected: all stage persistence, automatic update, ordering, and scroll-independence assertions pass.

- [x] **Step 5: Run affected integration checks**

Run: `npx vitest run src/game/quests/QuestManager.test.ts src/game/quests/saveMigration.test.ts src/game/quests/QuestTracker.test.tsx`

Expected: topic prerequisites, save migration, clear-save behavior, and existing side quests remain green.

---

### Task 3: Unify Samurai and Farmer campaign screens and explain implementation games

**Files:**
- Create: `src/game/challenge/CampaignChallengeFrame.tsx`
- Create: `src/game/challenge/campaignChallengeFrame.css`
- Test: `src/game/challenge/CampaignChallengeFrame.test.tsx`
- Modify: `src/game/challenge/SamuraiStackLesson.tsx`
- Modify: `src/game/challenge/SamuraiStackQuiz.tsx`
- Modify: `src/game/challenge/SamuraiStackDojoChallenge.tsx`
- Modify: `src/game/challenge/FarmerQueueLesson.tsx`
- Modify: `src/game/challenge/FarmerQueueQuiz.tsx`
- Modify: `src/game/challenge/FarmerQueueDeliveryChallenge.tsx`
- Modify: `src/game/challenge/QueueChallenge.tsx`
- Modify: `src/game/challenge/queueChallenge.css` and `src/game/challenge/samuraiStackChallenge.css` only for shared tokens/frame compatibility.

**Interfaces:**
- `CampaignChallengeFrame` accepts NPC/topic label, title, stage label, optional step/progress label, content children, optional close action, and action/footer children.
- Existing challenge-store methods remain the source of game state and challenge completion.

- [x] **Step 1: Add failing frame and instruction assertions**

Assert:
1. Samurai and Farmer screens render the same frame landmarks and title/stage placement.
2. Each MCQ screen shows 3-question progress, hearts, selected-answer feedback, and the explanation supplied by the question bank before advancing.
3. The Samurai Dojo explains Push, Peek, Pop, top-only access, and the exact completion goal before the first action.
4. The Farmer guided Queue activity and independent delivery round explain enqueue/rear, front/dequeue, inspection, capacity, overflow/underflow, and success before interaction.
5. The Guide screen is unchanged and remains the visual reference.

- [x] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/challenge/CampaignChallengeFrame.test.tsx src/game/challenge/SamuraiStackExperience.test.tsx src/game/challenge/QueueDeliveryExperience.test.tsx`

Expected: frame-sharing and pre-game instruction assertions fail against the current separately composed screens.

- [x] **Step 3: Implement shared shell and concise instructions**

Create a reusable frame using the established warm-orange/navy challenge styling and apply it to Samurai/Farmer lesson, quiz, and implementation screens. Keep the Village Guide's current rendered layout intact. Add a compact, always-visible instruction panel to the Samurai Scroll Tower and ensure Farmer's 15-step queue and five-parcel delivery screens explain the operation controls and their result before the first move. Keep exits and feedback consistent; do not reveal solutions.

- [x] **Step 4: Verify the focused pass**

Run the same focused Vitest command.

Expected: Samurai/Farmer screens share frame landmarks and all instruction/feedback assertions pass, with existing challenge actions unchanged.

- [x] **Step 5: Run affected integration checks**

Run: `npx vitest run src/game/challenge/SamuraiStackExperience.test.tsx src/game/challenge/FarmerQueueCampaign.test.tsx src/game/challenge/QueueDeliveryExperience.test.tsx src/game/challenge/QuizChallenge.test.tsx`

Expected: the complete main topic flows still pass.

---

### Task 4: Add independent Stack and Queue Knowledge Scroll trials

**Files:**
- Create: `src/game/challenge/stackScrollRescue.ts`
- Test: `src/game/challenge/stackScrollRescue.test.ts`
- Create: `src/game/challenge/StackKnowledgeScrollChallenge.tsx`
- Create: `src/game/challenge/queueScrollRelay.ts`
- Test: `src/game/challenge/queueScrollRelay.test.ts`
- Create: `src/game/challenge/QueueKnowledgeScrollChallenge.tsx`
- Modify: `src/game/challenge/challengeTypes.ts`
- Modify: `src/game/challenge/challengeStore.ts`
- Modify: `src/game/challenge/QuizChallenge.tsx`
- Modify: `src/game/npc/villageNpcs.ts`
- Modify: `src/game/scenes/MainScene.ts`
- Modify: `src/game/quests/knowledgeScrolls.test.ts` or add focused Scroll-flow tests.

**Interfaces:**
- New challenge IDs: `stack-knowledge-scroll` and `queue-knowledge-scroll`.
- Stack reducer: three towers, legal top-only move, smaller-on-larger prohibition, escalating rounds with 3, 4, then 5 scrolls and respective move budgets of 9, 19, and 39. Pass only after all three rounds.
- Queue reducer: fixed-capacity 5-slot circular queue. Seven parcels (12, 24, 36, 48, 60, 72, 84) arrive in that order. The player controls Enqueue-next, Dequeue-FRONT, Inspect-FRONT, Inspect-REAR, an overflow probe (extra 96), and an underflow probe after emptying. A successful route must load all seven in arrival order, dispatch the first two before the last three arrivals so the rear wraps around the ring, inspect both ends without mutation, demonstrate rejected overflow while full, dispatch all seven in FIFO order, and demonstrate rejected underflow while empty. Pass only after all required proofs are recorded; invalid attempts do not corrupt the queue.
- `challengeStore` opens, validates, closes and claims the matching Scroll only after the component marks a valid completion. It never calls `QuestManager.completeTopic()` for a Scroll test.

- [x] **Step 1: Add failing pure-mechanics and independent-reward tests**

Stack tests assert legal/illegal moves, only exposed scrolls move, smaller-on-larger is rejected, move-budget exhaustion fails the round, rounds increase in difficulty, and all completed rounds are required to pass.
Queue tests assert rear/front wrap-around, full/empty rejection, inspections do not mutate state, and FIFO order is preserved.
Store/route tests assert:
- A Scroll test cannot start before its main topic is completed.
- Passing claims only the matching collectible once.
- Closing/failing/postponing claims nothing and leaves main topic status, XP, relics, and next NPC unchanged.
- Completing the main topic never auto-claims a Scroll.
- Re-entering a completed NPC offers the separate unclaimed Scroll with an explicit Later/Continue option.

- [x] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/challenge/stackScrollRescue.test.ts src/game/challenge/queueScrollRelay.test.ts src/game/challenge/farmerQueueDelivery.test.ts`

Expected: pure mechanics and Stack/Queue Scroll flow tests fail because the mechanics and challenge IDs are not yet implemented.

- [x] **Step 3: Implement pure game engines and challenge screens**

Implement deterministic stack and circular-queue reducers first. Render them inside the shared frame with objective/controls/rules/success instructions before the first move. Provide visible move count/budget for Stack and visible front/rear/capacity/slot state for Queue. Mark completion only when every round/objective succeeds. Add separate dialogue offers after main-topic completion; Later returns to normal village play. Use the existing `claimKnowledgeScroll()` store only from the validated success path.

- [x] **Step 4: Verify the focused pass**

Run: `npx vitest run src/game/challenge/stackScrollRescue.test.ts src/game/challenge/queueScrollRelay.test.ts src/game/challenge/StackKnowledgeScrollChallenge.test.tsx src/game/challenge/QueueKnowledgeScrollChallenge.test.tsx`

Expected: all mechanics, UI instructions, pass/fail, and one-time-claim tests pass.

- [x] **Step 5: Run affected integration checks**

Run: `npx vitest run src/game/quests/knowledgeScrolls.test.ts src/game/quests/mainCampaignRouting.test.ts src/game/challenge/QuizChallenge.test.tsx`

Expected: Scroll collection stays independent and the existing Arrays Scroll flow remains green.

---

### Task 5: Verify the complete four-NPC path and preview readiness

**Files:**
- Test: `src/game/challenge/FourNpcMainCampaign.test.tsx`
- Test: update `src/game/quests/QuestTracker.test.tsx`, `src/game/challenge/FarmerQueueCampaign.test.tsx`, and `src/game/challenge/SamuraiStackExperience.test.tsx`.
- Modify: any focused regressions discovered in Tasks 1–4 only.

**Interfaces:**
- End-to-end test drives the real public store/router APIs through Old Man gate state, Arrays, Stack, Queue, and optional scroll claims.

- [x] **Step 1: Add the end-to-end campaign test**

Assert the full ordered path; attempts to skip to Samurai/Farmer direct to the earliest unmet NPC; Arrays/Stack/Queue implementation completion advances the tracker; optional Scroll tests can be deferred; all three available Scrolls can be claimed independently; and an incomplete Scroll does not prevent the main campaign from reaching the next NPC.

- [x] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/challenge/FourNpcMainCampaign.test.tsx`

Expected: failures reveal any remaining inconsistency between real campaign state, router outcomes, and Quest Tracker rendering.

- [x] **Step 3: Fix only evidenced integration defects**

Keep changes scoped to the route, stage store, shared frame, or challenge mechanics defined above. Do not refactor unrelated campaign topics or the protected world systems.

- [x] **Step 4: Verify focused and full pass**

Run:
```bash
npx vitest run src/game/challenge/FourNpcMainCampaign.test.tsx src/game/quests/QuestTracker.test.tsx
npm test
npm run lint
npm run check:village
git diff --check
```

Expected: production build and full tests pass; lint has zero errors; village placement audit passes with only documented baseline route warnings; diff check is clean.

- [ ] **Step 5: Publish a preview only after explicit authorization**

The implementation is ready on local branch `preview/campaign-alignment`. No push, merge, or deployment has been performed. Publish to a Vercel Preview deployment only after the user explicitly authorizes publishing; verify READY status and HTTP 200 then. Never merge or deploy production without separate explicit authorization.

## Review gates and implementation order

Work in order: Task 1 modal/routing safety → Task 2 stages and Quest Tracker → Task 3 consistent main-campaign UI → Task 4 independent Stack/Queue Scrolls → Task 5 end-to-end verification and preview.

After each task, run its focused tests before continuing. Keep the local workspace and the remote preview branch aligned; never discard pre-existing branch history or uncommitted work.
