import type { DialogueTree } from '../dialogue/dialogueTypes'

/** Shared optional relic handoff used by the four later campaign guardians. */
export function withRelicTrialDialogue(tree: DialogueTree, speaker: string, topicLabel: string): DialogueTree {
  return {
    ...tree,
    campaign_locked: {
      speaker,
      text: 'Your lesson is not available yet. Follow the village quest guidance and complete the previous guardian first.',
      next: null,
    },
    relic_quest_required: {
      speaker,
      text: 'This knowledge trial belongs to the village relic collection. Speak with the Old Man near the gate and accept his quest first.',
      next: null,
    },
    empty_scroll_required: {
      speaker,
      text: 'I can inscribe this knowledge only after you present an empty scroll. The Old Man near the village gate can entrust one to you.',
      next: null,
    },
    relic_trial_offer: {
      speaker,
      text: 'You have mastered ' + topicLabel + '. Present an empty scroll and prove what you have learned; I will inscribe the relic I protect.',
      next: null,
      choices: [
        { text: 'I present an empty scroll.', next: 'relic_trial_accept_action' },
        { text: 'I will return later.', next: 'relic_trial_later' },
      ],
    },
    relic_trial_accept_action: {
      speaker,
      text: 'Then let us begin the knowledge trial.',
      next: null,
    },
    relic_trial_later: {
      speaker,
      text: 'The trial will wait. Return when you are ready.',
      next: null,
    },
    relic_already_claimed: {
      speaker,
      text: 'The relic I guarded has already been entrusted to you. Its place in the collection is secure.',
      next: null,
    },
    relic_trial_waiting: {
      speaker,
      text: 'Finish the knowledge trial already in progress before offering another scroll.',
      next: null,
    },
  }
}
