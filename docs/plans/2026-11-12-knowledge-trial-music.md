# Knowledge Trial Music Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch from ordinary Adventure music to a distinct Knowledge Trial cue only while the Village Guide's Knowledge Scroll challenge is active, then restore Adventure music.

**Architecture:** Extend the existing audio module with a separately controlled trial track and transition functions. Start the trial track from the mounted `ArrayKnowledgeScrollChallenge` lifecycle and restore Adventure music on unmount, so NPC dialogue and other gameplay remain untouched. Reuse the Home intro asset only as a candidate for review; its mood is not verified by file metadata.

**Tech Stack:** TypeScript, browser HTMLAudioElement, React effects, Vitest.

## Global Constraints

- Preserve normal Adventure music during movement and all NPC conversations.
- Opening the Guide's Scroll dialogue does not switch music.
- Switch music only when `array-knowledge-scroll` challenge component becomes active.
- Restore Adventure music after completion, failure, close, or leaving the challenge.
- Respect master/music volume, mute, autoplay retry, and no-overlapping-track behavior.
- Do not add unlicensed external music or assert that an un-auditioned file is a confirmed energetic/fire track.
- The checked-in inventory has only `public/audio/38-Intro.ogg` and `src/assets/audio/dsa-quest-adventure.ogg`. `38-Intro.ogg` is the sole alternate candidate; the developer cannot audition it from code metadata. Use it as a review candidate and explicitly ask the player to judge its sound in the preview; if unsuitable, keep music work pending a separately approved original/licensed asset.
- Do not edit GameWorld, map, movement, or production settings; do not deploy to production.

---

### Task 1: Add a safe Knowledge Trial track transition to the audio module

**Files:**
- Modify: `src/audio/music.ts`
- Create: `src/audio/music.test.ts`

**Interfaces:**
- Consumes: existing `startAdventureMusic()`, `stopAllMusic()`, volume/mute settings and localStorage `SETTINGS_KEY`.
- Produces: `startKnowledgeTrialMusic(): void`; updated active-track tracking and retry logic.

- [ ] **Step 1: Add focused failing tests**

Mock HTMLAudioElement before dynamically importing `music.ts`. Assert three audio instances are created (Home, Adventure, Knowledge Trial); starting Adventure then trial pauses/fades Adventure and starts trial; starting Adventure while trial is active restores Adventure and stops trial; repeated calls do not start overlapping duplicate loops; stopAllMusic pauses/resets all; mute prevents starts; volume setters update all active/available tracks.

- [ ] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/audio/music.test.ts`

Expected: the new export and third track behavior do not exist; tests fail.

- [ ] **Step 3: Implement the minimum behavior**

Create a separate `Audio('/audio/38-Intro.ogg')` instance named for the Knowledge Trial candidate. Extend activeTrack union with `knowledge-trial`; update `retryActiveMusic`, `setMusicVolume`, Home transition, Adventure transition, mute, and stop functions to account for all three instances. Add an idempotent crossfade transition from the current track to the trial candidate and back to Adventure, ensuring the old track is paused/reset after fade. Keep existing autoplay-retry pointer/keyboard listeners and audio failure nonfatal. Do not edit or replace the Adventure source.

- [ ] **Step 4: Verify the focused pass**

Run: `npx vitest run src/audio/music.test.ts`

Expected: all track state/volume/mute/transition cases pass with no simultaneous playback after transition completion.

- [ ] **Step 5: Run the affected integration check**

Run: `npx vitest run src/audio/music.test.ts src/audio/settingsDefaults.test.tsx`

Expected: existing settings defaults and volume tests remain passing.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/audio/music.ts src/audio/music.test.ts
git commit -m "feat: add dedicated Knowledge Trial music state"
```

### Task 2: Tie trial music to the Knowledge Scroll challenge lifecycle

**Files:**
- Modify: `src/game/challenge/ArrayKnowledgeScrollChallenge.tsx`
- Test: `src/game/challenge/ArrayKnowledgeScrollChallenge.test.tsx`

**Interfaces:**
- Consumes: `startKnowledgeTrialMusic()`, `startAdventureMusic()`, `useChallengeState()`.
- Produces: mount/unmount lifecycle integration for the actual Knowledge Scroll challenge.

- [ ] **Step 1: Add focused failing test**

Mock audio transition functions and render the actual Knowledge Scroll challenge. Assert trial music begins when `activeChallenge === 'array-knowledge-scroll'` and Adventure restoration runs when the challenge closes/unmounts. Assert ordinary dialogue/other challenge IDs do not render this component or start trial music.

- [ ] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/challenge/ArrayKnowledgeScrollChallenge.test.tsx`

Expected: the current challenge component makes no music calls; lifecycle assertions fail.

- [ ] **Step 3: Implement the minimum behavior**

Add a mount effect that calls `startKnowledgeTrialMusic()` and returns a cleanup that calls `startAdventureMusic()`. Keep the effect idempotent; do not add audio changes to dialogue nodes or the general NPC interaction loop.

- [ ] **Step 4: Verify the focused pass**

Run: `npx vitest run src/game/challenge/ArrayKnowledgeScrollChallenge.test.tsx`

Expected: entering/leaving the challenge starts/restores the intended music calls.

- [ ] **Step 5: Run the affected integration check**

Run: `npx vitest run src/game/challenge/ArrayKnowledgeScrollChallenge.test.tsx src/game/challenge/QuizChallenge.test.tsx src/audio/music.test.ts`

Expected: Knowledge Scroll round/attempt behavior remains unchanged and track lifecycle is attached only to the trial.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/game/challenge/ArrayKnowledgeScrollChallenge.tsx src/game/challenge/ArrayKnowledgeScrollChallenge.test.tsx
git commit -m "feat: scope trial music to Knowledge Scroll challenge"
```

## Verification

Run: `npm test`, `npm run lint`, and `npm run check:village`.

Expected: production build and all tests pass; lint reports no errors; village audit reports all required checks passed, retaining only its documented alternate-route warning. Manually audition the candidate in the preview; report honestly that a separate approved track is required if `38-Intro.ogg` is not suitable.
