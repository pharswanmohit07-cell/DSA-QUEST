# Old Man Empty-Scroll Handover Before Guardian Lessons

## Intent
The Relic Journey must follow the latest player-approved sequence from the prior review chat: the Old Man gives the player an empty scroll after the gate opens; only after that handover may the player begin the Village Guide's (and later guardians') main lesson. Once a guardian lesson is mastered, the player returns to that guardian to accept a separate Knowledge Trial. Passing the trial consumes one empty scroll and awards that guardian's assigned relic.

## Source of truth
This updated sequence supersedes the older November 14 main-campaign design where the Guide lesson began immediately after the gate. The current branch already contains the Old Man's offer → acceptance → scroll-delivery dialogue and the seven-item relic inventory; the defect is that Guide routing does not enforce the completed handover before opening the first Arrays lesson.

## Goals
- Direct a player who has not accepted the relic journey to the Old Man.
- Direct a player who accepted but has not completed the scroll handover back to the Old Man.
- Block the Village Guide's Arrays lesson/workshop until the empty scroll has actually been claimed and is available.
- Keep the existing lesson → revisit guardian → separate Knowledge Trial → pass → consume one blank scroll → receive assigned relic flow.
- Correct Relic Journey text so it never says the scroll is first offered after passing; the Old Man hands it over before guardian lessons.
- Preserve existing save progress, account/login behavior, map/gameplay systems, and production deployment.

## Non-goals
- Do not change the seven guardian reward assignments or their five-scroll/two-key balance.
- Do not change the normal quiz scoring, reward animations/audio, or test-only quiz helper.
- Do not merge directly to production from this fix branch.

## Behavior
1. After the gate opens, Relic Journey first says to speak with the Old Man.
2. Accepting his offer leads through the existing short handover dialogue. Choosing “Receive the empty scroll” persists the seven-scroll supply and triggers the existing pickup reveal/audio.
3. Until the handover is complete, interacting with the Village Guide shows the appropriate Old Man prerequisite dialogue instead of starting Arrays.
4. After handover, the Village Guide's normal Arrays lesson and workshop can proceed.
5. After Arrays mastery, speaking to the Guide offers the separate Knowledge Trial. Only a successful trial consumes one scroll and awards the assigned relic.

## Implementation decisions
- Put the prerequisite ordering in the pure Village Guide routing function so it is directly testable.
- Pass relic-quest acceptance and empty-scroll availability from MainScene into that router.
- Keep the existing Old Man dialogue and reward effect as the grant path; do not introduce a second grant mechanism.
- Fix RelicJournal's master-lesson and guardian-revisit copy to reference the scroll already received from the Old Man.
