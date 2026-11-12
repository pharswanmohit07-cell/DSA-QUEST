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
- The checked-in inventory has only `public/audio/38-Intro.ogg` and `src/assets/audio/dsa-quest-adventure.ogg`. `38-Intro.ogg`¶»§q«^