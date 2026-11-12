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
- The Quest Tracker must display **Village Guide — Arrays**, with no “Arrays 1” label.
- Tutorial order: Quest first, Settings second, then **Got it!**; Skip and Escape remain available.
- Support mobile layout, keyboard access, and reduced-motion preferences.
- Keep `main` and Vercel production unchanged; preview only on the feature branch.

---

### Task 1: Reframe the Old Man challenge as opening the village gate

**Files:**
- Modify: `src/game/challenge/ArrayChallenge.tsx`
- Test: `src/game/challenge/ArrayChallenge.test.tsx`

**Interfaces:**
- Consumes: existing `challengeStore` methods `executeOp`, `setFeedback`, `closeChallenge`; current `useChallengeState()` result.
- Produces: unchanged challenge mechanics with player-facing heading **Open the Village Gate** and story-first description.

- [ ] **Step 1: Add the focused failing test**

Assert that the rendered challenge heading is `Open the Village Gate`, description includes the sealed village gate/path objective, and the technical phrase `Practise with an array-backed stack` is absent. Retain existing assertions for target sequence, Push/Pop buttons, close behavior, and gate success.

- [ ] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/challenge/ArrayChallenge.test.tsx`

Expected: the new title/copy assertion fails against the current technical heading; the existing mechanics assertions remain passing.

- [ ] **Step 3: Implement the minimum behavior**

Update the eyebrow to `Old Man's Gate Puzzle` (retain it if already present), set the heading to `Open the Village Gate`, and use: `The village gate is sealed. Complete the sequence of actions to unlock the path ahead. Each move changes what the gate mechanism holds.` Keep Push/Pop control labels, validation, challenge sequence, success, close, and store calls unchanged.

- [ ] **Step 4: Verify the focused pass**

Run: `npx vitest run src/game/challenge/ArrayChallenge.test.tsx`

Expected: all ArrayChallenge tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `npx vitest run src/game/challenge/challengeStore.test.ts src/game/quests/elderLearningStages.test.ts`

Expected: gate target completion and campaign unlock tests pass without changing their existing target operations.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/game/challenge/ArrayChallenge.tsx src/game/challenge/ArrayChallenge.test.tsx
git commit -m "feat: present stack challenge as village gate mission"
```

### Task 2: Correct Village Guide quest title and stage progress

**Files:**
- Modify: `src/game/quests/QuestTracker.tsx`
- Test: `src/game/quests/QuestTracker.test.tsx`

**Interfaces:**
- Consumes: `useQuestState()`, `getArraysCampaignStage()`, `hasKnowledgeScroll('arrays')`.
- Produces: derived quest title `Village Guide — Arrays`, stage objective, and 0/3–3/3 progress.

- [ ] **Step 1: Add the focused failing test**

Update the Village Guide handoff tests to assert the title `Village Guide — Arrays` and absence of `Arrays 1`. Assert progress mapping: Learn = 0/3, Practice = 1/3, Workshop/implement = 2/3, completed = 3/3. Preserve the optional Scroll wording after Arrays completion.

- [ ] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/quests/QuestTracker.test.tsx`

Expected: old title and fixed 2/3 progress fail the new assertions.

- [ ] **Step 3: Implement the minimum behavior**

Keep the stable internal/test id `arrays-1-village-guide` to avoid breaking saved references and existing test selectors; change only the visible title. Derive progress index from Arrays campaign status/stage: Learn 0, Practice 1, implement 2, completed 3. Compute displayed progress and percentage from that index. Use stage-specific objective copy; keep optional Scroll separate from the three required stages.

- [ ] **Step 4: Verify the focused pass**

Run: `npx vitest run src/game/quests/QuestTracker.test.tsx`

Expected: all QuestTracker tests pass and the visible title contains no “Arrays 1”.

- [ ] **Step 5: Run the affected integration check**

Run: `npx vitest run src/game/quests/arraysCampaignStages.test.ts src/game/quests/villageGuideArraysRouting.test.ts src/game/quests/QuestTracker.test.tsx`

Expected: stage changes update both objective and progress without save migration.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/game/quests/QuestTracker.tsx src/game/quests/QuestTracker.test.tsx
git commit -m "fix: clarify Village Guide quest progress"
```

### Task 3: Add first-time Quest and Settings HUD tutorial

**Files:**
- Create: `src/game/quests/QuestHudTutorial.tsx`
- Create: `src/game/quests/questHudTutorial.css`
- Create: `src/game/quests/QuestHudTutorial.test.tsx`
- Modify: `src/game/quests/QuestTracker.tsx`

**Interfaces:**
- Consumes: DOM targets `.quest-tracker-toggle` and `.game-settings-button`; browser localStorage; window resize/scroll events.
- Produces: `QuestHudTutorial` component mounted by QuestTracker; versioned key `dsa-quest-hud-tutorial-v1`.

- [ ] **Step 1: Add the focused failing test**

In a jsdom test fixture, render actual Quest and Settings target buttons. Mock `getBoundingClientRect()` with distinct coordinates. Assert Quest is highlighted first; Next moves to Settings; Got it writes `true` and removes the overlay; Skip and Escape both dismiss and persist; a set key suppresses rendering; absent targets do not render a detached overlay.

- [ ] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/quests/QuestHudTutorial.test.tsx`

Expected: the new component import/behavior is missing and focused tests fail.

- [ ] **Step 3: Implement the minimum behavior**

Create a component with a two-step state machine. On mount, read the versioned key safely; when unset, locate the actual Quest/Settings button DOM nodes and measure their bounds. Recalculate on resize and scroll. Render a fixed dim layer, a spotlight rectangle, a pointer/arrow, concise explanatory copy, and Next/Got it/Skip controls. Clamp the callout to viewport bounds. Persist completion on any dismissal; handle Escape; clean up listeners. Respect `prefers-reduced-motion`. Render this component inside QuestTracker without editing GameWorld.

- [ ] **Step 4: Verify the focused pass**

Run: `npx vitest run src/game/quests/QuestHudTutorial.test.tsx`

Expected: tutorial order, anchor positioning, keyboard dismissal, persistence, missing-anchor handling, and repeat suppression pass.

- [ ] **Step 5: Run the affected integration check**

Run: `npx vitest run src/game/quests/QuestTracker.test.tsx src/game/quests/QuestHudTutorial.test.tsx`

Expected: the Quest Tracker and tutorial mount together, while Quest UI tests without a Settings anchor remain stable.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/game/quests/QuestHudTutorial.tsx src/game/quests/questHudTutorial.css src/game/quests/QuestHudTutorial.test.tsx src/game/quests/QuestTracker.tsx
git commit -m "feat: add first-time quest and settings tutorial"
```

## Verification

Run: `npm test`, `npm run lint`, and `npm run check:village`.

Expected: production build and all tests pass; lint reports no errors; village rules audit reports all required checks passed, retaining only its already documented alternate-route warning. Confirm no diff in GameWorld, map, collision, movement, or camera files.
