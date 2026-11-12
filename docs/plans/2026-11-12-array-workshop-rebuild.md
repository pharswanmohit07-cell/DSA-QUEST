# Interactive Array Manipulation Workshop Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the five fixed Workshop form answers with a guided, genuinely interactive array mini-game ending in a multi-operation Master Challenge.

**Architecture:** Keep all operation rules pure in `arrayManipulationWorkshop.ts` and use the existing challenge store as the single source of truth for current stage, current sub-operation, and array values. The React Workshop view will ask players to select cells/gaps, choose an operation, and enter values; the existing QuestManager completion/reward flow remains the only completion authority.

**Tech Stack:** React 19, TypeScript 6, Vitest, CSS, existing challenge store and QuestManager.

## Global Constraints

- Preserve the five-step order: Find â†’ Update â†’ Insert â†’ Delete â†’ multi-operation Master Challenge.
- Do not preselect an operation, index, or value as the answer; operation/index/value inputs start blank.
- Stage operations are selected by the player. Wrong operations, indices, and values do not mutate the array or advance progress.
- Show array changes after accepted operations, including insert shifting right and delete shifting left.
- Provide optional hints and retry without a heart penalty.
- Keep the final stage multi-operation and make its target array explicit.
- Preserve existing QuestManager cam¶»§q«^