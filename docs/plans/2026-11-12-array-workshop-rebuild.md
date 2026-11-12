# Interactive Array Manipulation Workshop Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the five fixed Workshop form answers with a guided, genuinely interactive array mini-game ending in a multi-operation Master Challenge.

**Architecture:** Keep all operation rules pure in `arrayManipulationWorkshop.ts` and use the existing challenge store as the single source of truth for current stage, current sub-operation, and array values. The React Workshop view will ask players to select cells/gaps, choose an operation, and enter values; the existing QuestManager completion/reward flow remains the only completion authority.

**Tech Stack:** React 19, TypeScript 6, Vitest, CSS, existing challenge store and QuestManager.

## Global Constraints

- Preserve the five-step order: Find → Update → Insert → Delete → multi-operation Master Challenge.
- Do not preselect an operation, index, or value as the answer; operation/index/value inputs start blank.
- Stage operations are selected by the player. Wrong operations, indices, and values do not mutate the array or advance progress.
- Show array changes after accepted operations, including insert shifting right and delete shifting left.
- Provide optional hints and retry without a heart penalty.
- Keep the final stage multi-operation and make its target array explicit.
- Preserve existing QuestManager campaign completion and first-completion reward handling.
- Do not alter save schema, GameWorld, maps, movement, or camera.
- Keep mobile touch targets and accessible keyboard labels.
- Do not merge to main or deploy production.

---

### Task 1: Replace the fixed five-step model with scenario-driven operations

**Files:**
- Modify: `src/game/challenge/arrayManipulationWorkshop.ts`
- Modify: `src/game/challenge/arrayManipulationWorkshop.test.ts`

**Interfaces:**
- Consumes: existing `ArrayWorkshopOperation` union (`access`, `update`, `insert`, `delete`, `append`).
- Produces: `ARRAY_WORKSHOP_STEPS` with stage metadata and one-or-more expected player operations; `applyArrayWorkshopOperation(values, stepIndex, operationIndex, operation)` pure validator/result.

- [ ] **Step 1: Add focused failing tests**

Define the intended cumulative sequence using initial values `[10, 20, 30]`:
  1. Find: Access index 1; array unchanged.
  2. Update: replace index 1 with 25; array becomes `[10, 25, 30]`.
  3. Insert: insert 15 at index 1; array becomes `[10, 15, 25, 30]`.
  4. Delete: delete index 2; array becomes `[10, 15, 30]`.
  5. Master: update index 0 to 5; append 35; insert 12 at index 1; target is `[5, 12, 15, 30, 35]`.

Add tests for every exact operation, multi-operation sub-index progression, wrong operation/index/value without mutation, invalid index bounds, inserting at array end, deleting an element, accessed value result, stage out of range, and no mutation of the input array.

- [ ] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/challenge/arrayManipulationWorkshop.test.ts`

Expected: current one-operation-per-stage function signature cannot address Master sub-operations and tests fail.

- [ ] **Step 3: Implement the minimum behavior**

Keep `ArrayWorkshopOperation` unchanged. Extend `ArrayWorkshopStep` with `operations: readonly ArrayWorkshopOperation[]`, narrative title/instruction, optional hint, and stage completion copy. Keep `ARRAY_WORKSHOP_INITIAL_VALUES = [10, 20, 30]`. Add pure `applyArrayOperation(values, operation)` for correct array semantics and revise `applyArrayWorkshopOperation(values, stepIndex, operationIndex, operation)` to validate exact current operation before applying. Return `ok`, resulting `values`, optional accessed value, `stageComplete`, `workshopComplete`, and message. Do not mutate inputs. Insert allows index from 0 through length; access/update/delete require index inside current array; append has no index.

- [ ] **Step 4: Verify the focused pass**

Run: `npx vitest run src/game/challenge/arrayManipulationWorkshop.test.ts`

Expected: all pure model tests pass, including final target array and invalid operations remaining unchanged.

- [ ] **Step 5: Run the affected integration check**

Run: `npx vitest run src/game/challenge/challengeStore.test.ts`

Expected: existing store behaviors unaffected before store wiring changes.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/game/challenge/arrayManipulationWorkshop.ts src/game/challenge/arrayManipulationWorkshop.test.ts
git commit -m "feat: model scenario-based array workshop operations"
```

### Task 2: Wire stage/sub-operation progress into the challenge store

**Files:**
- Modify: `src/game/challenge/challengeTypes.ts`
- Modify: `src/game/challenge/challengeStore.ts`
- Modify: `src/game/challenge/challengeStore.test.ts`

**Interfaces:**
- Consumes: `applyArrayWorkshopOperation(values, stepIndex, operationIndex, operation)`.
- Produces: `arrayWorkshopOperationIndex` in challenge state and revised `executeArrayWorkshopOperation(operation)` store transition.

- [ ] **Step 1: Add focused failing tests**

Assert opening the Workshop resets stage index to 0, operation index to 0, values to initial array, and hints to 0. Assert an accepted non-final Master operation updates values and sub-operation index without completing the stage; the final sub-operation completes the Master stage. Assert rejected operation preserves values, stage, and sub-operation index while setting error feedback/incrementing invalid-action count. Assert close/reopen resets an unfinished attempt.

- [ ] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/challenge/challengeStore.test.ts`

Expected: current state lacks operation index and existing store advances one stage for each operation; new expectations fail.

- [ ] **Step 3: Implement the minimum behavior**

Add `arrayWorkshopOperationIndex: number` to ChallengeState and its initial state. On `openChallenge('array-manipulation-workshop')`, reset workshop values/index/hints and completion. Revise `executeArrayWorkshopOperation` to call the pure model with stage and operation indices; on invalid return, preserve array/progress and set error feedback; on valid update values and feedback. If current stage operation sequence is unfinished, increment operation index; otherwise increment stage index and reset operation index; set isComplete only when the stage index reaches `ARRAY_WORKSHOP_STEPS.length`. Preserve `completeArraysWorkshop()` checks and `QuestManager.completeTopic('arrays', ...)` behavior.

- [ ] **Step 4: Verify the focused pass**

Run: `npx vitest run src/game/challenge/challengeStore.test.ts`

Expected: sub-operation and stage progression behave independently and final completion occurs only after the last Master operation.

- [ ] **Step 5: Run the affected integration check**

Run: `npx vitest run src/game/challenge/arrayManipulationWorkshop.test.ts src/game/quests/arraysCampaignStages.test.ts src/game/quests/QuestTracker.test.tsx`

Expected: model, quest stage changes, and completion reward path remain consistent.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/game/challenge/challengeTypes.ts src/game/challenge/challengeStore.ts src/game/challenge/challengeStore.test.ts
git commit -m "feat: track multi-operation workshop progress"
```

### Task 3: Rebuild the Workshop UI around player choices and feedback

**Files:**
- Modify: `src/game/challenge/ArrayManipulationWorkshop.tsx`
- Modify: `src/game/challenge/arrayManipulationWorkshop.css`
- Modify: `src/game/challenge/ArrayManipulationWorkshop.test.tsx`

**Interfaces:**
- Consumes: `useChallengeState()`, `challengeStore.executeArrayWorkshopOperation(operation)`, `ARRAY_WORKSHOP_STEPS`, `ArrayWorkshopOperation`.
- Produces: interactive cell/gap selection, blank operation/index/value controls, stage feedback, and Master Challenge UI.

- [ ] **Step 1: Add focused failing tests**

Assert blank initial operation/index/value; no default correct operation; cell click selects its index; insert-gap click selects the insertion index; selecting Access/Update/Insert/Delete/Append requires the relevant fields; correct accepted operations show green feedback and array result; incorrect ones show red feedback without value/progress change; optional Hint reveals hint and increments hint count; Master requires three operations and final target array; completion still invokes existing first-completion reward flow.

- [ ] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/challenge/ArrayManipulationWorkshop.test.tsx`

Expected: existing UI initializes operation to Access and index to 1, and has no Master sub-operation interactions; tests fail.

- [ ] **Step 3: Implement the minimum behavior**

Initialize operation, selected index, and value to empty. Render array items as buttons labeled by value and Index N; render insertion gaps as separate buttons, including end position. Operation dropdown begins at an empty placeholder. Determine required cell/gap/value according to the selected operation. Build the correct union operation only after required input exists. On success, display green feedback and current array; clear inputs/selection; maintain visible progress and show next sub-operation prompt. On error, show red feedback and keep the current array and progress. Display stage-specific instruction, hint, optional complexity explanation, operation index in the Master stage, and final target. Keep reset/retry accessible and touch-friendly. Call `completeArraysWorkshop()` only when store says all five stages are complete; retain success panel and QuestManager reward text.

- [ ] **Step 4: Verify the focused pass**

Run: `npx vitest run src/game/challenge/ArrayManipulationWorkshop.test.tsx`

Expected: selection, blank inputs, feedback, Master multi-operation, and completion tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `npx vitest run src/game/challenge/ArrayManipulationWorkshop.test.tsx src/game/challenge/challengeStore.test.ts src/game/quests/QuestTracker.test.tsx`

Expected: full Workshop interaction completes the existing Arrays quest stage and reward path.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/game/challenge/ArrayManipulationWorkshop.tsx src/game/challenge/arrayManipulationWorkshop.css src/game/challenge/ArrayManipulationWorkshop.test.tsx
git commit -m "feat: make array workshop an interactive mini-game"
```

## Verification

Run: `npm test`, `npm run lint`, and `npm run check:village`.

Expected: production build and all tests pass; lint reports no errors; village audit reports all required checks passed, retaining only its known alternate-route warning.
