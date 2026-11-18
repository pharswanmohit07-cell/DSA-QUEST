import type { DialogueTree } from '../dialogue/dialogueTypes'
import type { CampaignTopicId } from '../quests/questTypes'
import type { NpcMovementProfile } from './movementProfiles'
import type { WanderConfig } from './WanderAi'
import type { NpcRoute } from './roamAi'
import { NPC_MOVEMENT_PROFILES } from './movementProfiles'
import elderPortraitUrl from '../../assets/tiles/ninja-village/Elder/Faceset.png'
import guidePortraitUrl from '../../assets/tiles/ninja-village/TrainingNPCs/VillageGuide/Faceset.png'
import monkPortraitUrl from '../../assets/tiles/ninja-village/TrainingNPCs/Monk/Faceset.png'
import samuraiPortraitUrl from '../../assets/tiles/ninja-village/TrainingNPCs/Samurai/Faceset.png'
import merchantPortraitUrl from '../../assets/tiles/ninja-village/VillageNPCs/Merchant/Faceset.png'
import guardPortraitUrl from '../../assets/tiles/ninja-village/VillageNPCs/Guard/Faceset.png'
import shamanPortraitUrl from '../../assets/tiles/ninja-village/VillageNPCs/Shaman/Faceset.png'
import farmerPortraitUrl from '../../assets/tiles/ninja-village/VillageNPCs/Farmer/Faceset.png'

/**
 * Village NPC dialogue.
 *
 * Spawn positions are given in tile coordinates and converted to world pixels
 * by the caller. The position was chosen from the map's own walkable data so the
 * NPC can never spawn inside a wall or seal a passage:
 *
 * - The Old Man stands at (6, 27), at the foot of the south-west staircase in
 *   front of the dojo. That tile is walkable in the map data, and he wanders
 *   only along tiles the collision layer already marks as free.
 *
 * The Village Training Route NPCs (see scripts/check-village-npc-placements.mjs,
 * which re-derives the game's own collision rules and verifies each placement):
 *
 * - Village Guide at (12, 15) and Monk at (11, 18), on separate connected
 *   western-yard routes with room for their full one-tile local patrols.
 * - Samurai at (30, 18), on open ground in the eastern compound.
 * - Queue Farmer at (15, 25), on the central-plaza grass beside the market
 *   player's current village-side approach. The tile sits ~33px from the
 *   default player spawn (17.5, 25.5), comfortably inside the shared 48px
 *   INTERACT_RADIUS with margin, so his E prompt is live from the first frame.
 *   His 1.5-tile local patrol uses the same full-footprint collision checks as
 *   the other local NPCs, and pauses as soon as the player is close enough to
 *   interact.
 * - The Merchant stays on the western plaza, away from the player spawn and
 *   Elder interaction area.
 *
 * A previous Merchant entry borrowed the Hunter spritesheet and sat near the
 * gate; it was removed because a second stationary NPC there crowded the only
 * approach to the torii gate. The three training NPCs are all placed away from
 * that approach for the same reason.
 */

export type NpcDefinition = {
  id: string
  name: string
  /** Population role used by diagnostics and regional balancing. */
  role?: 'main' | 'ambient'
  /** One-to-one DSA topic anchor for main quest-giver NPCs. */
  questTopic?: CampaignTopicId
  /**
   * The original Ninja Adventure pack character folder this NPC's art comes
   * from, e.g. `'Villager3'`. Two active NPCs must never share one value: this
   * is the source-of-truth asset identity checked by tests, distinct from the
   * derived Phaser texture keys.
   */
  characterAsset: string
  tileX: number
  tileY: number
  /**
   * The populated map band this NPC belongs to (see `npcSafeAreas.ts`). Used
   * by the placement checker for the region-distribution audit and by tests
   * to assert wander stays inside the assigned region.
   */
  region: string
  /** Phaser texture key of the NPC's idle spritesheet. */
  spriteKey: string
  /** Phaser animation key played while the NPC stands still. */
  idleAnimation: string
  /**
   * Phaser texture key of the walking spritesheet. Omit for NPCs that do not
   * wander; `WanderAi` will not move an NPC without one.
   */
  walkSpriteKey?: string
  /** Animation key prefix for the walk cycle; the facing is appended. */
  walkAnimationPrefix?: string
  /**
   * URL of the portrait shown in the dialogue box. The scene registers it with
   * Phaser and also passes the URL through to the DOM overlay, which needs a
   * real `src` rather than a texture key.
   */
  portraitUrl?: string
  /**
   * Tint applied to the sprite. Omit entirely to leave the art untinted, which
   * is what NPCs with real art of their own should do.
   */
  tint?: number
  /**
   * Hybrid roaming profile. Exactly one of `local` (small-tile-leash pacing
   * around the authored home position, driven by `WanderAi`) or `ambient`
   * (map-wide reachable-destination travel driven by `MapRoamAi`). Omit to
   * keep the NPC stationary.
   */
  movement?: NpcMovementProfile
  /** @deprecated legacy inactive-list entries; ignored for active NPCs. */
  wander?: WanderConfig
  /** @deprecated legacy inactive-list entries; ignored for active NPCs. */
  roam?: WanderConfig
  /** @deprecated legacy inactive-list entries; ignored for active NPCs. */
  patrol?: { route: NpcRoute; speed: number }
  dialogueTree: DialogueTree
}

const ELDER_TREE: DialogueTree = {
  start: {
    speaker: 'Old Man',
    text: 'The village gate has stood closed for years. I guard the trial that opens the path beyond it.',
    next: 'choices',
  },
  choices: {
    speaker: 'Old Man',
    text: 'Are you ready to face the gate trial?',
    next: null,
    choices: [
      { text: 'I am ready for the gate trial.', next: 'quest_accept' },
      { text: 'I am only passing through.', next: 'passing' },
    ],
  },
  quest_accept: {
    speaker: 'Old Man',
    text: 'The gate trial is ready. Complete the stack sequence and the village gate will open.',
    next: null,
  },
  quest_done: {
    speaker: 'Old Man',
    text: 'The gate is open. The Village Guide holds the next lesson. Seek her out if you wish to earn the Arrays Knowledge Scroll.',
    next: null,
  },
  collection_offer: {
    speaker: 'Old Man',
    text: 'Beyond the gate, seven guardians protect fragments of forgotten knowledge. Find each guardian and learn what they keep. Some rewards are not what they first appear.',
    next: null,
    choices: [
      { text: 'I will seek the hidden relics.', next: 'collection_accept_action' },
      { text: 'I will return another time.', next: 'collection_later' },
    ],
  },
  collection_accept_action: {
    speaker: 'Old Man',
    text: 'Then your search begins. Return to me when you are ready to receive the empty scrolls. No guardian can begin your knowledge trial until you carry one.',
    next: null,
  },
  collection_later: {
    speaker: 'Old Man',
    text: 'The choice is yours. The mystery will remain here when you return.',
    next: null,
  },
  collection_collect_offer: {
    speaker: 'Old Man',
    text: 'You have accepted the collection quest. Take the empty scrolls, then visit a guardian whose lesson you have mastered.',
    next: null,
    choices: [
      { text: 'Give me the empty scrolls.', next: 'collection_claim_action' },
      { text: 'Not yet.', next: 'collection_later' },
    ],
  },
  collection_claim_action: {
    speaker: 'Old Man',
    text: 'They are yours. Present one to a guardian only after proving your skill in their main trial.',
    next: null,
  },
  collection_reminder: {
    speaker: 'Old Man',
    text: 'The guardians keep their secrets. Master a guardian’s lesson, then offer an empty scroll to begin the separate knowledge trial.',
    next: null,
  },
  collection_completed: {
    speaker: 'Old Man',
    text: 'You have gathered all seven relics. Will you return them to me so I can keep their knowledge safe?',
    next: null,
    choices: [
      { text: 'I have brought all seven relics.', next: 'collection_return_action' },
      { text: 'I will return later.', next: 'collection_later' },
    ],
  },
  collection_return_action: {
    speaker: 'Old Man',
    text: 'The seven relics are home. Their knowledge is safe, and your collection journey is complete. Thank you, hunter.',
    next: null,
  },
  collection_epilogue: {
    speaker: 'Old Man',
    text: 'The seven relics are safely returned. You have completed the hidden collection journey. Keep the lessons you learned with you.',
    next: null,
  },
  passing: {
    speaker: 'Old Man',
    text: 'Then walk well. The gate behind you is open, and the snow does not wait for anyone.',
    next: null,
  },
}

/**
 * Dialogue for the three Village Training Route NPCs. Route-stage-specific
 * branches are selected by the pure router in
 * `../quests/villageTrainingRouteRouting.ts`; these trees hold the text and the
 * scene resolves the chosen effects.
 */
const GUIDE_TREE: DialogueTree = {
  start: {
    speaker: 'Village Guide',
    text: 'Welcome to our village, hunter. I keep the paths tidy and point travellers toward whatever the village can still teach them.',
    next: null,
  },
  arrays_locked: {
    speaker: 'Village Guide',
    text: 'The Old Man guards the village gate. Complete his gate trial first; then come back and I will teach you arrays.',
    next: null,
  },
  array_relic_quest_required: {
    speaker: 'Village Guide',
    text: 'You want to challenge me? First speak with the Old Man and accept his hidden relic quest.',
    next: null,
  },
  array_empty_scroll_required: {
    speaker: 'Village Guide',
    text: 'You want to challenge me? First bring me an empty scroll from the Old Man.',
    next: null,
    choices: [
      { text: 'Where can I find an empty scroll?', next: 'array_empty_scroll_direction' },
      { text: 'I will return later.', next: 'array_empty_scroll_later' },
    ],
  },
  array_empty_scroll_direction: {
    speaker: 'Village Guide',
    text: 'The Old Man near the village gate has them. Accept his hidden relic quest, collect the seven empty scrolls, then return here.',
    next: null,
  },
  array_empty_scroll_later: {
    speaker: 'Village Guide',
    text: 'The challenge will wait. Return when you have an empty scroll.',
    next: null,
  },
  array_scroll_offer: {
    speaker: 'Village Guide',
    text: 'So, the Old Man sent you to me. The Arrays Knowledge Scroll is not given freely. Face my three trials, from Easy to Hard. Each mistake will cost you a chance. Show me what you have learned.',
    next: null,
    choices: [
      { text: 'Challenge me. I am ready.', next: 'array_scroll_accept' },
      { text: 'Maybe later.', next: 'array_scroll_later' },
    ],
  },
  array_scroll_accept: {
    speaker: 'Village Guide',
    text: 'Then begin. Each round gives you fewer chances, so read carefully and think through the code.',
    next: null,
  },
  array_scroll_later: {
    speaker: 'Village Guide',
    text: 'The trials will wait. Return when you are ready.',
    next: null,
  },
  array_scroll_collected: {
    speaker: 'Village Guide',
    text: 'Well done. The Arrays Knowledge Scroll is now yours, one of the seven pieces of knowledge. Keep learning, and the remaining relics will follow.',
    next: null,
  },
  route_offer: {
    speaker: 'Village Guide',
    text: "The village has more to teach than the Old Man's first lesson. Visit the Monk for a final piece of guidance, then test what you know with the Samurai at the dojo. Return to me when your trial is complete.",
    next: null,
    choices: [
      { text: "I'll take the training route.", next: 'route_accept_action' },
      { text: 'Not now.', next: 'route_later' },
    ],
  },
  route_accept_action: {
    speaker: 'Village Guide',
    text: 'Let me mark your decision.',
    next: null,
  },
  route_later: {
    speaker: 'Village Guide',
    text: 'Of course. The offer stays open.',
    next: null,
  },
  route_offer_persistence_failed: {
    speaker: 'Village Guide',
    text: 'I could not save your acceptance. No training progress was recorded; please try again.',
    next: null,
  },
  route_offer_recovery_required: {
    speaker: 'Village Guide',
    text: 'Your save needs to be checked before I can record this route. No progress is confirmed.',
    next: null,
  },
  route_active: {
    speaker: 'Village Guide',
    text: 'The Monk waits in the west village, and the Samurai drills at the dojo. Finish your trial, then report back to me.',
    next: null,
  },
  route_report: {
    speaker: 'Village Guide',
    text: 'You have finished the Monk\'s lesson and the Samurai\'s trial. Shall I mark the route complete?',
    next: null,
    choices: [
      { text: 'The training route is complete. Here is my report.', next: 'route_report_action' },
    ],
  },
  route_report_action: {
    speaker: 'Village Guide',
    text: 'Let me verify your report.',
    next: null,
  },
  route_completed: {
    speaker: 'Village Guide',
    text: 'The route is complete and your 25 XP reward is recorded. Walk well, hunter.',
    next: null,
  },
  route_not_eligible: {
    speaker: 'Village Guide',
    text: "Before the village can offer more, finish the Elder's lessons. Come back when the Array and Stack teachings are behind you.",
    next: null,
  },
  route_completion_persistence_failed: {
    speaker: 'Village Guide',
    text: 'I could not save your report. The reward is not confirmed; please try again.',
    next: null,
  },
  route_completion_recovery_required: {
    speaker: 'Village Guide',
    text: 'Your save needs to be checked before I can confirm the report or reward.',
    next: null,
  },
}

const MONK_TREE: DialogueTree = {
  start: {
    speaker: 'Monk',
    text: 'A quiet path, is it not? Mind the stones; they are good teachers for anyone who watches how they are laid.',
    next: null,
  },
  lesson_intro: {
    speaker: 'Monk',
    text: 'So the Elder has already taught you the array. Picture it once more: boxes in a row, each numbered from zero, each reachable in a single step.',
    next: 'lesson_array_hint',
  },
  lesson_array_hint: {
    speaker: 'Monk',
    text: 'And the stack? A pile of stones. The last stone you placed is the first you take back. Push builds the pile; pop removes the top. Nothing in between can be taken first.',
    next: 'lesson_hint',
  },
  lesson_hint: {
    speaker: 'Monk',
    text: "A hint before the trial: when a question says 'the last value added is removed first,' answer with the stack's top, not the bottom. Array indices count from zero; stack removals count from the last push.",
    next: null,
    choices: [
      { text: "I understand. I'll visit the Samurai.", next: 'lesson_ack_action' },
    ],
  },
  lesson_ack_action: {
    speaker: 'Monk',
    text: 'Good. Walk east to the dojo and show the Samurai what you carry.',
    next: null,
  },
  lesson_ack_persistence_failed: {
    speaker: 'Monk',
    text: 'I could not save your progress. The route has not advanced; speak to me again after your save is checked.',
    next: null,
  },
  lesson_ack_recovery_required: {
    speaker: 'Monk',
    text: 'Your save needs to be checked before your progress can move forward. Nothing is confirmed yet.',
    next: null,
  },
  lesson_reminder: {
    speaker: 'Monk',
    text: 'The Samurai waits at the dojo, east of the plaza. Remember: arrays count from zero, and a stack removes what was pushed last.',
    next: null,
  },
  route_waiting_guide: {
    speaker: 'Monk',
    text: 'Your training route begins with the Village Guide, near the centre of the village. Speak to him first.',
    next: null,
  },
  route_waiting_samurai: {
    speaker: 'Monk',
    text: 'The lesson is remembered. Go to the Samurai when you are ready for the trial.',
    next: null,
  },
  route_waiting_return: {
    speaker: 'Monk',
    text: 'The trial is behind you. Return to the Village Guide for your report.',
    next: null,
  },
  route_done: {
    speaker: 'Monk',
    text: 'The route is finished. May the paths you study stay as orderly as an indexed array.',
    next: null,
  },
  monk_campaign_locked: {
    speaker: 'Monk',
    text: 'The chain lesson is sealed. Master the Farmer\\'s Queue before you walk my path.',
    next: null,
    
  },
  monk_campaign_offer: {
    speaker: 'Monk',
    text: 'A linked list is a living chain. I\\'ll teach you to mend its links, then test your hands. Ready?',
    next: null,
    choices: [{ text: 'Teach me the chain.', next: 'monk_mastery_accept' }, { text: 'Maybe later.', next: 'monk_campaign_later' }],
  },
  monk_mastery_accept: {
    speaker: 'Monk',
    text: 'Begin the lesson. Follow each link carefully, and never lose a node.',
    next: null,
    
  },
  monk_campaign_later: {
    speaker: 'Monk',
    text: 'The chain will wait. Return when you are ready to learn its pattern.',
    next: null,
    
  },
  monk_relic_quest_required: {
    speaker: 'Monk',
    text: 'Your lesson is mastered. For my hidden relic trial, first accept the Old Man\\'s collection quest.',
    next: null,
    
  },
  monk_empty_scroll_required: {
    speaker: 'Monk',
    text: 'The Old Man still has your blank scrolls. Claim them before I set the relic challenge.',
    next: null,
    
  },
  monk_relic_offer: {
    speaker: 'Monk',
    text: 'I have changed the links in a secret chain. Rebuild its path without losing a node; pass and I will fill your scroll.',
    next: null,
    choices: [{ text: 'Start relic trial.', next: 'monk_relic_accept' }, { text: 'I will return.', next: 'monk_relic_later' }],
  },
  monk_relic_accept: {
    speaker: 'Monk',
    text: 'Then trace every link. The head must lead to the final node without a break.',
    next: null,
    
  },
  monk_relic_later: {
    speaker: 'Monk',
    text: 'Return when your blank scroll is ready. The chain will remain here.',
    next: null,
    
  },
  monk_relic_claimed: {
    speaker: 'Monk',
    text: 'The chain\\'s secret is already yours. Return to the Old Man when all seven relics are found.',
    next: null,
    
  },

}

const SAMURAI_TREE: DialogueTree = {
  stack_gate_locked: {
    speaker: 'Samurai',
    text: 'The dojo trial is not open yet. First find the Old Man near the south-west dojo stairs and complete the village gate trial.',
    next: null,
  },
  stack_locked: {
    speaker: 'Samurai',
    text: 'The Dojo Scroll Tower is sealed for now. Complete the Village Guide’s Arrays workshop first, then return to learn the way of the stack.',
    next: null,
  },
  stack_waiting: {
    speaker: 'Samurai',
    text: 'Finish the learning trial already in progress before beginning the Dojo Scroll Tower.',
    next: null,
  },
  stack_relic_quest_required: {
    speaker: 'Samurai',
    text: 'The knowledge trial is separate from your Stack mastery. Speak with the Old Man and accept his hidden relic quest first.',
    next: null,
  },
  stack_empty_scroll_required: {
    speaker: 'Samurai',
    text: 'You want to challenge me? First bring me an empty scroll from the Old Man.',
    next: null,
    choices: [
      { text: 'Where can I find an empty scroll?', next: 'stack_empty_scroll_direction' },
      { text: 'I will return later.', next: 'stack_empty_scroll_later' },
    ],
  },
  stack_empty_scroll_direction: {
    speaker: 'Samurai',
    text: 'The Old Man near the village gate has them. Accept his hidden relic quest, collect the seven empty scrolls, then return here.',
    next: null,
  },
  stack_empty_scroll_later: {
    speaker: 'Samurai',
    text: 'The challenge will wait. Return when you have an empty scroll.',
    next: null,
  },
  stack_scroll_offer: {
    speaker: 'Samurai',
    text: 'Your Stack Operations mastery is proven. The optional Stack Knowledge Scroll is a separate rescue trial: solve three increasingly difficult tower puzzles to claim it. It does not change your campaign mastery or XP.',
    next: null,
    choices: [
      { text: 'Take the Stack Knowledge Scroll trial.', next: 'stack_scroll_accept' },
      { text: 'Continue the optional Village Training Route.', next: 'stack_scroll_training_action' },
      { text: 'Maybe later.', next: 'stack_scroll_later_action' },
    ],
  },
  stack_scroll_accept: {
    speaker: 'Samurai',
    text: 'Then face the three towers. Move only their top scrolls, and never place a larger scroll on a smaller one.',
    next: null,
  },
  stack_scroll_training_action: {
    speaker: 'Samurai',
    text: 'Let us return to your optional training route.',
    next: null,
  },
  stack_scroll_later_action: {
    speaker: 'Samurai',
    text: 'The Knowledge Scroll will wait. Your optional training route remains separate.',
    next: null,
  },
  stack_scroll_collected: {
    speaker: 'Samurai',
    text: 'The Stack Knowledge Scroll is yours. Your Stack mastery remains unchanged; the scroll is an independent collectible.',
    next: null,
  },
  start: {
    speaker: 'Samurai',
    text: 'This dojo trains the mind as much as the blade. State your business, hunter.',
    next: null,
  },
  trial_offer: {
    speaker: 'Samurai',
    text: 'Three questions on arrays and stacks. Answer two correctly and you may call the trial passed. Fail, and you may try again as often as you wish.',
    next: null,
    choices: [
      { text: 'I accept the trial.', next: 'trial_start_action' },
      { text: 'Not yet.', next: 'trial_later' },
    ],
  },
  trial_start_action: {
    speaker: 'Samurai',
    text: 'Very well. Clear your mind. The trial begins now.',
    next: null,
  },
  trial_later: {
    speaker: 'Samurai',
    text: 'The dojo does not close. Return when you are ready.',
    next: null,
  },
  trial_failed: {
    speaker: 'Samurai',
    text: 'Fewer than two correct. The trial is not passed â€” but a student who returns is twice the student who quits. Try again whenever you wish.',
    next: null,
  },
  trial_pass_persistence_failed: {
    speaker: 'Samurai',
    text: 'Your answers were strong, but I could not save the result. The pass is not recorded; speak to me again after your save is checked.',
    next: null,
  },
  trial_pass_recovery_required: {
    speaker: 'Samurai',
    text: 'Your save needs to be checked before the trial result can be recorded. Nothing is confirmed yet.',
    next: null,
  },
  trial_passed: {
    speaker: 'Samurai',
    text: 'The trial is passed and recorded. Report to the Village Guide to claim what the route owes you.',
    next: null,
  },
  trial_before_offer: {
    speaker: 'Samurai',
    text: 'The trial comes later in your training. The Village Guide will tell you when the route is open to you.',
    next: null,
  },
  trial_not_ready_monk: {
    speaker: 'Samurai',
    text: 'You carry unfinished guidance. Hear the Monk in the west village before you face my questions.',
    next: null,
  },
  trial_already_passed: {
    speaker: 'Samurai',
    text: 'You have already passed my trial. Take your report to the Village Guide.',
    next: null,
  },
  route_done: {
    speaker: 'Samurai',
    text: 'The route is complete. The dojo doors remain open to a student who passed honestly.',
    next: null,
  },
}


// --- Ambient village NPCs -----------------------------------------------
// These NPCs are pure flavour: they populate the village and give short,
// location-appropriate dialogue. They never alter quest or campaign state.

const MERCHANT_TREE: DialogueTree = {
  start: {
    speaker: 'Merchant',
    text: 'Fresh tools, rope and dried plums! A hunter with full pockets is a hunter ready for the mountains.',
    next: null,
  },
  merchant_campaign_locked: {
    speaker: 'Merchant',
    text: 'My search ledger is closed for now. Master the Monk\\'s chain lesson before seeking this parcel.',
    next: null,
    
  },
  merchant_campaign_offer: {
    speaker: 'Merchant',
    text: 'A lost parcel hides in a sorted ledger. Learn to search it, then narrow the range until the mark is found.',
    next: null,
    choices: [{ text: 'Show me the search.', next: 'merchant_mastery_accept' }, { text: 'Maybe later.', next: 'merchant_campaign_later' }],
  },
  merchant_mastery_accept: {
    speaker: 'Merchant',
    text: 'Study the manifest first. Then find the parcel with careful comparisons.',
    next: null,
    
  },
  merchant_campaign_later: {
    speaker: 'Merchant',
    text: 'The parcel is not going anywhere. Come back when your mind is ready.',
    next: null,
    
  },
  merchant_relic_quest_required: {
    speaker: 'Merchant',
    text: 'You mastered the search. The hidden relic trial begins only after you accept the Old Man\\'s collection quest.',
    next: null,
    
  },
  merchant_empty_scroll_required: {
    speaker: 'Merchant',
    text: 'Bring me one blank scroll from the Old Man. I cannot seal a discovery without it.',
    next: null,
    
  },
  merchant_relic_offer: {
    speaker: 'Merchant',
    text: 'I have hidden a parcel in a longer sorted ledger. Find it by halving the search range at every turn.',
    next: null,
    choices: [{ text: 'Start relic trial.', next: 'merchant_relic_accept' }, { text: 'I will return.', next: 'merchant_relic_later' }],
  },
  merchant_relic_accept: {
    speaker: 'Merchant',
    text: 'Read the middle mark. Keep only the half that can still contain the parcel.',
    next: null,
    
  },
  merchant_relic_later: {
    speaker: 'Merchant',
    text: 'The ledger will wait until you bring a blank scroll.',
    next: null,
    
  },
  merchant_relic_claimed: {
    speaker: 'Merchant',
    text: 'Your hidden parcel has already been claimed. Bring the collection back to the Old Man when complete.',
    next: null,
    
  },

}

const GUARD_TREE: DialogueTree = {
  start: {
    speaker: 'Village Guard',
    text: 'Stay on the marked roads, traveller. The desert archway east is safe; the deep snowfield north is not.',
    next: null,
  },
}

const SHAMAN_TREE: DialogueTree = {
  start: {
    speaker: 'Shaman',
    text: 'The shrine stones still hum. Whoever maintains them keeps the village paths quiet and kind.',
    next: null,
  },
  shaman_campaign_locked: {
    speaker: 'Shaman',
    text: 'The shrine\\'s branches remain sealed. Master the Red Ninja\\'s sorting lesson before entering.',
    next: null,
    
  },
  shaman_campaign_offer: {
    speaker: 'Shaman',
    text: 'A tree grows by rules: smaller stones branch left, larger stones right. Learn the pattern, then walk its paths.',
    next: null,
    choices: [{ text: 'Teach me the tree.', next: 'shaman_mastery_accept' }, { text: 'Maybe later.', next: 'shaman_campaign_later' }],
  },
  shaman_mastery_accept: {
    speaker: 'Shaman',
    text: 'Begin with the root. Every stone must find its proper branch.',
    next: null,
    
  },
  shaman_campaign_later: {
    speaker: 'Shaman',
    text: 'The shrine will remain quiet until you return.',
    next: null,
    
  },
  shaman_relic_quest_required: {
    speaker: 'Shaman',
    text: 'You have mastered the tree. Accept the Old Man\\'s hidden collection quest before seeking my relic.',
    next: null,
    
  },
  shaman_empty_scroll_required: {
    speaker: 'Shaman',
    text: 'A blank scroll is needed for this trial. The Old Man at the gate can provide one.',
    next: null,
    
  },
  shaman_relic_offer: {
    speaker: 'Shaman',
    text: 'The shrine tree has extra stones. Build its branches, then complete preorder, inorder and postorder without losing the path.',
    next: null,
    choices: [{ text: 'Start relic trial.', next: 'shaman_relic_accept' }, { text: 'I will return.', next: 'shaman_relic_later' }],
  },
  shaman_relic_accept: {
    speaker: 'Shaman',
    text: 'Place each stone by the smaller-left, larger-right rule. Then walk all three traversals.',
    next: null,
    
  },
  shaman_relic_later: {
    speaker: 'Shaman',
    text: 'Return with a blank scroll when the time is right.',
    next: null,
    
  },
  shaman_relic_claimed: {
    speaker: 'Shaman',
    text: 'The shrine has already entrusted its relic to you. Return all seven to the Old Man when you are done.',
    next: null,
    
  },

}

const FARMER_TREE: DialogueTree = {
  start: {
    speaker: 'Farmer',
    text: 'Thank goodness you are here. Our village supply line is backed up, and I need help getting the parcels moving again.',
    next: 'queue_offer',
  },
  queue_offer: {
    speaker: 'Farmer',
    text: 'New parcels must join the rear, and the oldest parcel must leave first. Can you restore the line?',
    next: null,
    choices: [
      { text: 'I will organize the supply queue.', next: 'queue_accept' },
      { text: 'Not right now.', next: 'queue_later' },
    ],
  },
  queue_accept: {
    speaker: 'Farmer',
    text: 'First learn the queue rules, then practise the order. After that, help me deliver five parcels across the village.',
    next: null,
  },
  queue_later: {
    speaker: 'Farmer',
    text: 'The parcels will wait. Come back when you are ready to restore the supply line.',
    next: null,
  },
  queue_locked_elder: {
    speaker: 'Farmer',
    text: 'The supply line can wait. First find the Old Man near the south-west dojo stairs and complete the village gate trial.',
    next: null,
  },
  queue_locked_arrays: {
    speaker: 'Farmer',
    text: 'The supply line is not ready yet. Visit the Village Guide in the western yard and complete the Arrays workshop first.',
    next: null,
  },
  queue_locked: {
    speaker: 'Farmer',
    text: 'The supply line can wait until you complete Stack Operations with the Samurai in the eastern dojo. Return after the Dojo Scroll Tower trial is mastered.',
    next: null,
  },
  queue_relic_quest_required: {
    speaker: 'Farmer',
    text: 'My knowledge trial is part of a separate mystery. Speak with the Old Man and accept his relic quest before challenging me.',
    next: null,
  },
  queue_empty_scroll_required: {
    speaker: 'Farmer',
    text: 'You want to challenge me? First bring me an empty scroll from the Old Man.',
    next: null,
    choices: [
      { text: 'Where can I find an empty scroll?', next: 'queue_empty_scroll_direction' },
      { text: 'I will return later.', next: 'queue_empty_scroll_later' },
    ],
  },
  queue_empty_scroll_direction: {
    speaker: 'Farmer',
    text: 'The Old Man near the village gate has them. Accept his hidden relic quest, collect the seven empty scrolls, then return here.',
    next: null,
  },
  queue_empty_scroll_later: {
    speaker: 'Farmer',
    text: 'The challenge will wait. Return when you have an empty scroll.',
    next: null,
  },
  queue_scroll_offer: {
    speaker: 'Farmer',
    text: 'Your village deliveries are restored. I have one optional challenge left: prove you understand a circular queue and claim the Queue Knowledge Scroll. It is separate from your Queue mastery, relic and XP.',
    next: null,
    choices: [
      { text: 'Take the Queue Knowledge Scroll relay.', next: 'queue_scroll_accept' },
      { text: 'Maybe later.', next: 'queue_scroll_later' },
    ],
  },
  queue_scroll_accept: {
    speaker: 'Farmer',
    text: 'The relay has five spaces and seven arrivals. Watch FRONT and REAR as the line wraps around.',
    next: null,
  },
  queue_scroll_later: {
    speaker: 'Farmer',
    text: 'No rush. The Queue Knowledge Scroll will be here when you are ready.',
    next: null,
  },
  queue_done: {
    speaker: 'Farmer',
    text: 'You did it! All five parcels reached their homes, and the village supply line is moving again. The Queue Relic is yours. Your mastery of FIFO has opened the Linked List challenge; seek the next guide when you are ready.',
    next: null,
  },
}

export const VILLAGE_NPCS: readonly NpcDefinition[] = [
  {
    id: 'elder-masanori',
    name: 'Old Man',
    role: 'main',
    characterAsset: 'OldMan',
    tileX: 6,
    tileY: 27,
    region: 'central-plaza',
    spriteKey: 'elder-idle',
    idleAnimation: 'elder-anim-idle-down',
    walkSpriteKey: 'elder-walk',
    walkAnimationPrefix: 'elder-anim-walk',
    portraitUrl: elderPortraitUrl,
    // Real Elder art, so no tint is applied.
    // Local roamer: paces in front of the dojo within a three-tile leash.
    movement: NPC_MOVEMENT_PROFILES.local['elder-masanori'],
    dialogueTree: ELDER_TREE,
  },
  {
    id: 'village-guide',
    name: 'Village Guide',
    role: 'main',
    questTopic: 'arrays',
    characterAsset: 'Villager3',
    tileX: 12,
    tileY: 15,
    region: 'western-yard-sand-road',
    spriteKey: 'village-guide-idle',
    idleAnimation: 'village-guide-anim-idle-down',
    walkSpriteKey: 'village-guide-walk',
    walkAnimationPrefix: 'village-guide-anim-walk',
    portraitUrl: guidePortraitUrl,
    // Real Villager3 art, so no tint is applied.
    // Local roamer: paces the plaza without straying toward the spawn tile.
    movement: NPC_MOVEMENT_PROFILES.local['village-guide'],
    dialogueTree: GUIDE_TREE,
  },
  {
    id: 'village-monk',
    name: 'Monk',
    role: 'main',
    questTopic: 'linked-lists',
    characterAsset: 'Monk',
    tileX: 11,
    tileY: 18,
    region: 'western-yard-sand-road',
    spriteKey: 'village-monk-idle',
    idleAnimation: 'village-monk-anim-idle-down',
    walkSpriteKey: 'village-monk-walk',
    walkAnimationPrefix: 'village-monk-anim-walk',
    portraitUrl: monkPortraitUrl,
    // Real Monk art, so no tint is applied.
    // Local roamer: stays on the west-village path.
    movement: NPC_MOVEMENT_PROFILES.local['village-monk'],
    dialogueTree: MONK_TREE,
  },
  {
    id: 'dojo-samurai',
    name: 'Samurai',
    role: 'main',
    questTopic: 'stack-operations',
    characterAsset: 'Samurai',
    tileX: 30,
    tileY: 18,
    region: 'east-compound',
    spriteKey: 'dojo-samurai-idle',
    idleAnimation: 'dojo-samurai-anim-idle-down',
    walkSpriteKey: 'dojo-samurai-walk',
    walkAnimationPrefix: 'dojo-samurai-anim-walk',
    portraitUrl: samuraiPortraitUrl,
    // Real Samurai art, so no tint is applied.
    // Local roamer: drills inside the compound walls.
    movement: NPC_MOVEMENT_PROFILES.local['dojo-samurai'],
    dialogueTree: SAMURAI_TREE,
  },
  {
    id: 'plaza-merchant',
    name: 'Merchant',
    role: 'main',
    questTopic: 'searching',
    characterAsset: 'Merchant',
    tileX: 2,
    tileY: 20,
    region: 'central-plaza',
    spriteKey: 'plaza-merchant-idle',
    idleAnimation: 'plaza-merchant-anim-idle-down',
    walkSpriteKey: 'plaza-merchant-walk',
    walkAnimationPrefix: 'plaza-merchant-anim-walk',
    portraitUrl: merchantPortraitUrl,
    dialogueTree: MERCHANT_TREE,
  },
  {
    id: 'west-gate-guard',
    name: 'Village Guard',
    role: 'ambient',
    characterAsset: 'Guard',
    tileX: 5,
    tileY: 9,
    region: 'western-gate-road',
    spriteKey: 'west-gate-guard-idle',
    idleAnimation: 'west-gate-guard-anim-idle-down',
    walkSpriteKey: 'west-gate-guard-walk',
    walkAnimationPrefix: 'west-gate-guard-anim-walk',
    // Ambient roamer under the hybrid contract: patrols the west gate road.
    portraitUrl: guardPortraitUrl,
    movement: NPC_MOVEMENT_PROFILES.ambient['west-gate-guard'],
    dialogueTree: GUARD_TREE,
  },
  {
    id: 'shrine-shaman',
    name: 'Shaman',
    role: 'main',
    questTopic: 'trees',
    characterAsset: 'Shaman',
    tileX: 21,
    tileY: 12,
    region: 'northern-field',
    spriteKey: 'shrine-shaman-idle',
    idleAnimation: 'shrine-shaman-anim-idle-down',
    walkSpriteKey: 'shrine-shaman-walk',
    walkAnimationPrefix: 'shrine-shaman-anim-walk',
    portraitUrl: shamanPortraitUrl,
    dialogueTree: SHAMAN_TREE,
  },
  {
    id: 'south-farmer',
    name: 'Farmer',
    role: 'main',
    questTopic: 'queues',
    characterAsset: 'Farmer',
    tileX: 15,
    tileY: 25,
    region: 'central-plaza',
    spriteKey: 'south-farmer-idle',
    idleAnimation: 'south-farmer-anim-idle-down',
    walkSpriteKey: 'south-farmer-walk',
    walkAnimationPrefix: 'south-farmer-anim-walk',
    portraitUrl: farmerPortraitUrl,
    movement: NPC_MOVEMENT_PROFILES.local['south-farmer'],
    dialogueTree: FARMER_TREE,
  },
]
