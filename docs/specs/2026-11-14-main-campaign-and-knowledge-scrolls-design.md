# DSA Quest — Main Campaign and Independent Knowledge Scrolls

**Status:** Approved by user
**Date:** 2026-11-14
**Working branch:** preview/farmer-q1
**Scope:** Align the first four NPCs, standardize their main-campaign challenge UI, correct ordered progression and Quest Tracker updates, and keep Knowledge Scroll tests as a separate optional-for-progression but required-for-full-completion track.

## 1. Product model and confirmed decisions

DSA Quest has two independent progression tracks.

### Main campaign — learn and master DSA

This track teaches each topic and unlocks the next NPC. Its repeated learning structure is:

1. **Learn:** a short, illustrated explanation with examples and the key rule.
2. **Practice:** three multiple-choice questions with immediate feedback and a short explanation of why the selected answer is right or wrong. A quiz pass alone does not complete the topic.
3. **Implement / Play:** one topic-specific interactive activity in which the player applies the concept.
4. **Master:** only successful completion of the implementation activity completes the formal campaign topic, awards its existing campaign reward, and unlocks the next topic/NPC.

The required first-four-NPC sequence is:

| Order | NPC | Main campaign responsibility | Unlock condition |
|---|---|---|---|
| 1 | Old Man / Elder | Opening village gate prologue and existing gate trial | Existing gate trial completes |
| 2 | Village Guide | Arrays: Learn → 3-question Practice → Array Manipulation Workshop | Arrays Workshop completes |
| 3 | Samurai | Stack Operations: Learn → 3-question Practice → Dojo Scroll Tower implementation | Stack implementation completes |
| 4 | Farmer | Queues: Learn → 3-question Practice → guided FIFO practice and independent five-parcel delivery implementation | Queue delivery implementation completes |

The Old Man's gate prologue remains distinct from the formal Arrays topic taught by the Village Guide and the formal Stack Operations topic taught by the Samurai. The Old Man's existing gate behavior and the Village Guide's already-working Arrays flow are preserved.

A player can complete the main campaign stage for an NPC and continue to the next NPC without taking or passing that NPC's Knowledge Scroll test.

### Knowledge Scroll collection — independent full-completion objective

The seven Knowledge Scrolls are the game's overarching collection objective. All seven are required for full game completion, but an uncollected Scroll never blocks main-campaign progress or the next NPC.

The existing seven IDs remain the source of truth:

- Arrays
- Stack Operations
- Queues
- Linked Lists
- Searching
- Sorting
- Trees

The collectible store remains separate from campaign-topic status and campaign rewards. Passing a main implementation game must not silently grant a Knowledge Scroll. Failing, leaving, or postponing a Scroll test must not undo topic mastery, XP, relic rewards, or NPC unlocks.

The existing Arrays Knowledge Scroll challenge remains its own challenge: three escalating Easy / Medium / Hard rounds, heart limits of 3 / 2 / 1, and its existing coding/test-case evaluation. It must not be folded into the Arrays Workshop.

For the first implementation scope, add distinct optional Stack and Queue Scroll trials:
- **Stack Scroll — Three-Tower Scroll Rescue:** a visual stack puzzle using source, buffer, and destination towers. The player moves only the exposed/top scroll, follows the tower's placement rule, and solves increasingly challenging layouts with a visible move budget. This must be a separate challenge from the main Dojo Scroll Tower tutorial/implementation.
- **Queue Scroll — Circular Supply Relay:** a visual circular-queue puzzle with a fixed number of slots. The player handles arrivals and dispatches, observes front/rear positions wrap around the ring, and avoids invalid full/empty operations. This must be separate from the main Farmer's linear FIFO village-delivery activity.

These two challenge concepts are the proposed unique implementations for this scope. Their rules, goal, available actions, and success condition must be explained before the first move; explanations must teach the task, not reveal the solution.

The future dedicated Knowledge Scrolls Quest tab is explicitly deferred. Until that tab is built, completed NPCs may offer their separate Scroll trial through an optional follow-up dialogue choice. The choice must include a clear "later / continue the journey" path. An NPC's Scroll trial must never auto-start immediately after its main implementation challenge.

## 2. Shared UI and interaction contract

All four NPCs use one consistent visual system for dialogue and main-campaign challenge screens. Preserve the working Village Guide as the visual reference.

The challenge shell should consistently place:
- NPC/topic eyebrow and challenge title
- lesson/practice/implementation stage label and progress
- a readable central content area using the established navy-and-warm-orange game palette
- a consistent primary/secondary action area
- the same close/exit affordance and feedback treatment
- a completion state with the next main-campaign direction

The lesson, quiz and implementation content remains unique to each topic. The shell is shared; the mechanics are not flattened into identical quizzes.

There must be only one active modal interaction at a time. A challenge must never appear with a stale NPC dialogue box on top of it, and an NPC interaction must not replace or open a second dialogue while a challenge is active. Starting a topic challenge closes/clears any prior dialogue through the existing scene/dialogue lifecycle. An already-active challenge should be resumed or left alone, not reported as a "learning trial already in progress" dialogue over the challenge.

Before every interactive game begins, show a short instruction block explaining:
- the objective,
- the available actions and what each one changes,
- any capacity / move / ordering rule,
- what counts as success,
- how to leave without claiming completion.

Do not show the correct solution or reveal the answers. For MCQs, explain the concept after the player's selection before advancing.

The existing desktop-first controls, dialogue component, HUD controls, and visual assets are retained. Do not introduce a new mobile layout or alter touch/mobile code in this pass.

## 3. Ordered NPC progression and gating

Progression is controlled by the existing campaign topic prerequisites and the Old Man gate prologue, not by Scroll ownership.

- Every NPC checks the same ordered prerequisite chain and directs the player to the earliest unmet step, not merely the NPC immediately before itself. The order is Old Man gate → Village Guide Arrays → Samurai Stack Operations → Farmer Queues.
- Before the Old Man gate trial completes, the Guide, Samurai, and Farmer direct the player to the Old Man. They do not start their challenges.
- After the gate opens but before Arrays implementation completes, the Samurai and Farmer direct the player to the Village Guide. They do not start Stack or Queue challenges.
- After Arrays implementation completes but before Stack implementation completes, the Farmer directs the player to the Samurai. No Queue lesson, quiz, or delivery round may start.
- After the gate opens, the Village Guide owns the Arrays campaign. Arrays Scroll availability is separate from Arrays mastery.
- After Arrays implementation completes, Stack Operations becomes available. The Samurai opens the formal Stack lesson and then the Stack quiz and Dojo implementation in sequence.
- After Stack implementation completes, Queues becomes available. The Farmer opens its Learn → Practice → Implement flow.
- If the player revisits an NPC whose main topic is already complete, that NPC can offer its separate unclaimed Scroll challenge and a clear later/continue choice. This never changes the next required NPC or the Quest Tracker's main-campaign objective.
- Completing the Farmer's five-parcel delivery completes Queues and its main-campaign reward. A Queue Scroll test may be taken later and is not required for that completion.
- The optional Village Training Route remains a side quest. It must not reorder or block the main Guide → Samurai → Farmer progression, and its dialogue must not replace the next main-campaign direction or an available Scroll choice.
- Only the intended topic's implementation success may call that topic's completion path. A quiz pass, modal dismissal, or forged success close must not complete the topic.

## 4. Quest Tracker contract

The existing Quest Tracker is the main-campaign tracker in this scope. It should derive the current step from the Old Man gate quest and the formal campaign topic states, rather than hard-coding only the Guide's Arrays topic.

It must show the ordered main objective for:
1. Old Man gate prologue
2. Village Guide — Arrays
3. Samurai — Stack Operations
4. Farmer — Queues

For the active objective, show the correct NPC, topic, next action/stage (Learn, Practice, Implement, or Complete), and progress. On completion, the tracker changes automatically to the next main objective and marks the previous one completed. The next NPC unlocks in the same state transition as topic completion.

Tracker updates must be driven by the existing QuestManager external-store updates plus a small, explicit stage-change notification for stages that are not currently represented in the persisted campaign snapshot. Do not rely on remounting or manual refresh. The stage display must recover to a truthful state after reload and must not claim work is complete when only a quiz was passed.

The Quest Tracker must not treat Knowledge Scroll collection as main-campaign completion. The future Scrolls tab will own the seven-Scroll count and Scroll-specific objectives; this pass only keeps the existing Scroll collectible data separate and exposes optional Stack/Queue Scroll entry points.

## 5. State ownership and persistence

- QuestManager remains the authority for formal topic prerequisites, topic status, mastery, XP, and relic rewards.
- The existing knowledgeScrolls.ts store remains the authority for the independent seven-scroll collection. Its IDs and separate storage key must be preserved.
- The existing Arrays stage store remains intact. Stack and Queue stage/progress display may use a small versioned topic-stage store or an equivalent existing mechanism, provided it does not duplicate campaign completion authority.
- Main stage state and Scroll collection state must never write into each other's keys or mutate each other's completion status.
- Reset/clear-save behavior must clear any newly introduced main-stage state consistently with existing stage cleanup. Do not clear earned Scrolls except where the existing new-campaign reset already clears them.
- Do not change the V3 campaign save shape unless code inspection proves it is necessary. If it is changed, extend migration and migration tests rather than relying on old saves being discarded.

## 6. Existing implementation findings to address

- QuestTracker.tsx currently has special derived rendering for the Old Man quest and Village Guide Arrays, but no equivalent active-objective rendering for Stack Operations or Queues. This is why the display can remain at "Village Guide — Arrays: DONE" while the player is in Stack or Queue content.
- Samurai lesson / quiz / dojo and Farmer lesson / quiz / delivery are separate React components. They need the same shared frame and instructions contract as the working Guide rather than separate visual rules.
- MainScene.beginDialogue() can fall through to a Samurai "learning trial already in progress" dialogue when openSamuraiStackLesson() refuses to start because a challenge is already active. The interaction lifecycle must enforce a single active modal and avoid displaying that dialogue over the active lesson.
- Farmer Queue currently gates on the Queue topic status, whose prerequisite is Stack Operations. Keep that prerequisite; fix the user-facing direction and ensure the tracker reflects it.
- The existing Arrays Scroll test and seven-scroll storage are already separate from formal Arrays topic mastery. Preserve that separation.

## 7. Scope boundaries

### In scope
- Consistent shared UI contract for the Old Man, Village Guide, Samurai, and Farmer challenge/dialogue experiences (no redesign of the shared DialogueBox itself).
- Fix Samurai's overlapping dialogue/challenge state.
- Bring Samurai and Farmer main-campaign activities to a consistent Learn → 3-question Practice → Implement flow, with explanations and clear instruction before interactive actions.
- Preserve Farmer's existing guided 15-step FIFO sequence and independent five-parcel delivery round; do not merge them or replace them with the Scroll test.
- Correct ordered gating and player-facing NPC direction for the four NPCs.
- Make Quest Tracker accurately and automatically show main-campaign progression and active stage.
- Keep Arrays Scroll independent and add separate optional Stack and Queue Scroll challenge entry points and mechanics.
- Add focused routing, stage, challenge, persistence, UI, and end-to-end campaign tests.

### Deferred
- The separate Knowledge Scrolls Quest tab and its full collection screen.
- New NPCs / campaign content for Linked Lists, Searching, Sorting, and Trees.
- Scroll trials for those remaining four topics; their IDs remain reserved in the existing collectible model.
- Changes to maps, sprites, NPC placements, camera, movement, collisions, gate geometry, audio, touch/mobile support, settings, or the React↔Phaser bridge.

### Protected paths and systems
- Do not edit src/game/GameWorld.tsx, src/assets/tiles/ninja-village/MAP.json, story artwork/content, camera, player movement/collision, gate geometry/behavior, existing HUD controls/layout, audio/music, settings, or mobile/touch code.
- Reuse current NPC sprites, portraits, animation, dialogue component, and map positions.

## 8. Acceptance criteria

1. The Old Man gate trial remains the first main objective and is unchanged in its gate result.
2. After the gate opens, the Guide is the next required NPC; the Guide's existing lesson, 3-question practice, workshop, 50 XP / Array Relic completion, and optional Arrays Scroll remain correct.
3. After the Arrays Workshop succeeds, the Samurai is the next required NPC. The Samurai's lesson, three-question quiz, and Dojo implementation render inside the shared visual system. The dialogue never overlays the challenge.
4. A quiz pass alone does not complete Stack Operations. Only a successful Dojo implementation completes Stack and unlocks the Farmer.
5. Before Stack completion, the Farmer directs the player to the Samurai and cannot start Queue content. After Stack completion, the Farmer's Learn → 3-question Practice → existing 15-step Queue practice → independent five-parcel delivery sequence is accessible.
6. Only successful delivery completion completes Queues and its main campaign reward. Queue Scroll ownership is not needed to progress.
7. Arrays, Stack, and Queue Scroll tests are separate from their main implementations. A player can skip any Scroll test, continue the main campaign, and return to that Scroll test later.
8. Arrays Scroll retains its current 3/2/1-heart escalating rounds. Stack and Queue Scrolls use their own distinct mechanics, include pre-game instructions, and can be claimed only after passing their own trial.
9. The Quest Tracker moves through Old Man → Guide → Samurai → Farmer without a manual refresh, shows accurate current objectives/stages, and does not show the Arrays quest as the active quest after Stack or Queue becomes active.
10. Failing, closing, or postponing a Scroll test does not change main-topic status, rewards, or NPC unlocks. Completing a main topic does not automatically grant its Scroll.
11. All four NPCs share the same overall dialogue and challenge visual language, with topic-specific content and gameplay preserved.
12. No protected map, world bridge, gate, camera, movement, collision, HUD controls, audio, settings, or mobile/touch systems are changed.

## 9. Verification

Run:
- Focused Vitest tests for campaign ordering, QuestTracker, Samurai/Queue UI and the Scroll trials.
- npm test (production build plus full Vitest suite).
- npm run lint.
- npm run check:village.
- git diff --check.

The branch remains preview-only. No merge to main and no production deployment is part of this work.
