# Campaign Transition Audit — Phase 0

**Baseline:** `main` at `ce4ca29f92079d78140212015e6ef6d949a4ba9f`
**Feature branch:** `feat/seven-topic-campaign-minigames`
**Branch starting SHA:** `ce4ca29f92079d78140212015e6ef6d949a4ba9f` (created directly from verified `main`)

**Audit date:** 2026-11-10

## Observed transition matrix

| Entry point | Current source path | Current mutations | Phase 0 handling |
|---|---|---|---|
| First Elder conversation | `MainScene.beginDialogue()` | Completes `speak-with-elder`; opening the accepted prologue starts `array-sorting-challenge`. | Keep as the separate gate prologue. |
| Elder Array quiz opens | `MainScene.openChallenge()` → `challengeStore.openChallenge('array-quiz')` | Starts the formal `arrays` topic and selects an Array quiz set. It currently writes selected question IDs to localStorage immediately. | Do not start Arrays. Keep the quiz as a prologue step. Defer history writes until a terminal quiz result. |
| Elder Array quiz ends | `challengeStore.advanceQuiz()` | Calls `QuestManager.completeTopic('arrays', ...)`, potentially awards 50 XP and `array-relic`, and unlocks Stack Operations. | Remove this completion path. A quiz pass advances only to the existing prologue Stack practice. |
| Elder Stack practice begins | `challengeStore.beginStackPractice()` | Starts `stack-operations`. | Do not start the formal Stack topic. |
| Elder Stack practice completes | `challengeStore.closeChallenge()` then `MainScene.resumePlayerAfterChallenge()` | Store completes `stack-operations`; scene completes `array-sorting-challenge` and calls `unlockGate()`. | Remove the store's Stack topic completion. Keep legacy prologue quest completion and gate unlock. |
| Farmer Supply Crisis opens | `MainScene.openQueueChallenge()` → `challengeStore.openChallenge('queue-village-supply')` | Starts `queues`. | Preserve as the formal Queue topic entry. |
| Farmer Supply Crisis completes | `challengeStore.executeQueueOp()` and `closeChallenge()` | Requires the full 15-step sequence and empty final queue, then completes `queues`. | Preserve its existing FIFO/capacity/overflow behavior and validated completion path. |
| Samurai optional training trial | `challengeStore.openChallenge('village-training-trial')`; scene handles its resume result. | Three fixed questions; successful completion records the optional Village Training Route stage. It does not complete a campaign topic. | Keep isolated from campaign topic rewards. |
| Other guardian NPCs | `VILLAGE_NPCS` / `WORLD_NPCS` definitions | Topic anchors exist for Guide, Monk, Samurai, Merchant, Red Ninja and Shaman; full formal topic challenge flows are not yet connected. | Do not add their new minigames in Phase 0. |
| Relic ceremony and epilogue | `QuestManager.completeRelicReturn()`, `completeCampaign()` | Require all seven campaign topics/relics and the ceremony state. | Preserve current all-seven gate conditions. |

## Current campaign authority

- `QuestManager.startTopic()` checks prerequisites and sets `activeTopicId`, but currently increments `attemptCount` on every call even if the same topic is already active.
- `QuestManager.completeTopic()` is the authoritative campaign completion method. It stores topic status/mastery and awards first-completion XP/relic claims.
- The current Array quiz calls `completeTopic` directly from the quiz terminal transition. This is the key boundary defect: quiz completion is not proof that the topic's interactive minigame passed.
- The current Stack challenge store also calls `completeTopic('stack-operations')`, while the scene callback uses the same successful Stack challenge to open the Elder's gate. The Elder prologue must not own the Samurai's formal campaign reward.
- Queue completion remains challenge-specific and checks the complete operation sequence before calling `completeTopic('queues')`.

## Phaser / React lifecycle

- `MainScene` registers a `ChallengeSceneBridge` with `pausePlayer` and `resumePlayer` callbacks.
- Opening a challenge pauses player input and releases the dialogue surface before presenting the blocking challenge overlay.
- Closing a challenge resets the external store and calls the registered scene bridge with the challenge ID and a success value derived from challenge state.
- `resolveChallengeResumeOutcome` sends a successful Elder Stack practice to the existing gate path and the optional Samurai trial to its separate side-quest outcomes.
- The Phase 0 change keeps the gate path but removes formal Stack topic completion from that legacy prologue. The formal Samurai topic will receive its own new campaign flow in a later phase.

## Save migration observations

- V1/V2 legacy completion of `array-sorting-challenge` represents the old combined Array/Stack gate challenge. The existing migration marks Arrays and Stack completed, grants/preserves their relic/reward records, makes Queues available, and compensates +50 XP once.
- V1/V2 legacy active state currently maps to an Arrays in-progress attempt. Under the new ownership model, that active state is an interrupted Elder prologue, so formal Arrays must remain available for the Village Guide.
- The current V2 validator requires exact alignment between completed topic states and reward claims/relics, which rejects orphan relic/reward markers. Phase 0 adds safe pairing/reconciliation without changing topic completion or prerequisite state.
- The V3 validator currently assumes a completed legacy gate quest also has both Arrays and Stack campaign reward claims. The new prologue-only gate state must be accepted without inferring those topic completions.
- Invalid saves must remain untouched in storage; no fallback or repair may silently discard the stored bytes.

## Phase 0 boundaries

This audit does not implement the seven-topic stage controller, the 18-question topic banks, Arrays Workshop, Dojo Scroll Tower, new Queue delivery round, Linked List bridge, Merchant search, Sorting Factory, Spirit Tree, relic ceremony UI, or Algorithm Vault. Those remain later phases after the legacy state/reward foundation is safe.
