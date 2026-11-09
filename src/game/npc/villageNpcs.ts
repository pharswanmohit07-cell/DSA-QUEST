import type { DialogueTree } from '../dialogue/dialogueTypes'
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
 * - Elder Hiro stands at (6, 27), at the foot of the south-west staircase in
 *   front of the dojo. That tile is walkable in the map data, and he wanders
 *   only along tiles the collision layer already marks as free.
 *
 * The Village Training Route NPCs (see scripts/check-village-npc-placements.mjs,
 * which re-derives the game's own collision rules and verifies each placement):
 *
 * - Village Guide at (13, 25), central plaza just west of the spawn. Four open
 *   neighbours and far from the spawn tile itself, so he never blocks the
 *   player's arrival point or the torii approach.
 * - Monk at (9, 26), west village within sight of the Elder's dojo staircase.
 *   Roomy tile, three-plus open neighbours, and five tiles from the Elder so
 *   their interaction zones never overlap.
 * - Samurai at (22, 21), inside the eastern compound beside the dojo gate.
 *   Verified walkable interior tile with two-plus open neighbours; he stays
 *   stationary so he cannot wander into the compound walls.
 *
 * A previous Merchant entry borrowed the Hunter spritesheet and sat near the
 * gate; it was removed because a second stationary NPC there crowded the only
 * approach to the torii gate. The three training NPCs are all placed away from
 * that approach for the same reason.
 */

export type NpcDefinition = {
  id: string
  name: string
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
    text: 'Another seeker? Good. The dojo has been quiet since the last trial, and quiet is when the real lessons begin.',
    next: 'choices',
  },
  choices: {
    speaker: 'Old Man',
    text: 'So. What brings a hunter to the village?',
    next: null,
    choices: [
      { text: 'Teach me about the arrays.', next: 'arrays' },
      { text: 'I am only passing through.', next: 'passing' },
    ],
  },
  arrays: {
    speaker: 'Old Man',
    text: 'An array is a row of boxes, lined up side by side, each holding one value.',
    lessonMode: true,
    lessonVisual: { kind: 'array', values: [10, 20, 30, 40, 50] },
    next: 'array_index',
  },
  array_index: {
    speaker: 'Old Man',
    text: 'Each box has a position number called an index. Counting starts at 0, not 1. So the box at index 0 holds 10, and the box at index 2 holds 30.',
    lessonMode: true,
    lessonVisual: { kind: 'array', values: [10, 20, 30, 40, 50], showIndices: true },
    next: 'array_access',
  },
  array_access: {
    speaker: 'Old Man',
    text: "Here's the powerful part: if you know the index, you can jump straight to that box instantly â€” you don't need to check the others first. We call this O(1) time, meaning constant time, no matter how big the array is.",
    lessonMode: true,
    lessonVisual: {
      kind: 'array',
      values: [10, 20, 30, 40, 50],
      showIndices: true,
      highlightIndex: 2,
      annotation: 'array[2] â†’ 30',
    },
    next: 'array_insert',
  },
  array_insert: {
    speaker: 'Old Man',
    text: 'But inserting a new value at index 1 is slower. Every box from that point onward must shift one space right to make room. This takes O(n) time â€” the more boxes there are, the more shifting is needed.',
    lessonMode: true,
    lessonVisual: {
      kind: 'insertion',
      before: [10, 20, 30, 40, 50],
      after: [10, 'NEW', 20, 30, 40, 50],
      insertIndex: 1,
    },
    next: 'array_recap',
  },
  array_recap: {
    speaker: 'Old Man',
    text: "Let's recap: an array's index starts at 0. Reading a value by index is instant: O(1). Inserting in the middle is slower: O(n), because later values must shift. Ready? I'll ask you a few questions to check your understanding.",
    lessonMode: true,
    lessonVisual: { kind: 'recap' },
    next: 'quest_offer',
  },
  /**
   * Hands out the challenge. The branch is taken only while the quest is still
   * active, so the Elder does not repeat himself once it is done; the `done`
   * node covers that case.
   */
  quest_offer: {
    speaker: 'Old Man',
    text: "Let's see if you've got it. I'll ask you three questions â€” answer wrong three times and you'll need to come back and try again.",
    next: null,
    choices: [
      { text: 'I am ready for the quiz', next: 'quest_accept' },
      { text: 'Not yet.', next: 'quest_later' },
    ],
  },
  quest_later: {
    speaker: 'Old Man',
    text: 'The gate will keep. Come back when you are ready to think.',
    next: null,
  },
  quest_done: {
    speaker: 'Old Man',
    text: 'The ward is down and the snowfield is open. Walk north, hunter, and do not waste the lesson.',
    next: 'northern_snowfield_offer',
  },
  northern_snowfield_offer: {
    speaker: 'Old Man',
    text: 'There is one more task, if you are willing. Scout the northern snowfield and return with what you learn.',
    next: null,
    choices: [
      { text: 'I will scout the northern snowfield.', next: 'northern_snowfield_accept' },
      { text: 'Not now.', next: 'northern_snowfield_later' },
    ],
  },
  northern_snowfield_accept: {
    speaker: 'Old Man',
    text: 'Let me record your decision.',
    next: null,
  },
  northern_snowfield_later: {
    speaker: 'Old Man',
    text: 'Very well. The offer will remain open when you are ready.',
    next: null,
  },
  northern_snowfield_accepted: {
    speaker: 'Old Man',
    text: 'Good. Visit the northern snowfield, then return to give me your report.',
    next: null,
  },
  northern_snowfield_reminder: {
    speaker: 'Old Man',
    text: 'The northern snowfield still awaits your scouting trip. Return after you have visited it.',
    next: null,
  },
  northern_snowfield_report: {
    speaker: 'Old Man',
    text: 'You have seen the northern snowfield. Tell me what you found.',
    next: null,
    choices: [
      {
        text: 'I have scouted the snowfield. Here is my report.',
        next: 'northern_snowfield_report_action',
      },
    ],
  },
  northern_snowfield_report_action: {
    speaker: 'Old Man',
    text: 'Let me verify your report.',
    next: null,
  },
  northern_snowfield_completed: {
    speaker: 'Old Man',
    text: 'Your scouting is complete. Your 25 XP reward is secured.',
    next: null,
  },
  northern_snowfield_not_eligible: {
    speaker: 'Old Man',
    text: 'The scouting trip is not available yet. Complete the village challenge first.',
    next: null,
  },
  northern_snowfield_persistence_failed: {
    speaker: 'Old Man',
    text: 'I could not save your acceptance. No scouting progress was recorded; please try again.',
    next: null,
  },
  northern_snowfield_recovery_required: {
    speaker: 'Old Man',
    text: 'Your save needs to be checked before I can record this trip. No progress is confirmed.',
    next: null,
  },
  northern_snowfield_completion_not_eligible: {
    speaker: 'Old Man',
    text: 'I cannot accept this report yet. Visit the northern snowfield before reporting.',
    next: null,
  },
  northern_snowfield_completion_persistence_failed: {
    speaker: 'Old Man',
    text: 'I could not save your report. The reward is not confirmed; please try again.',
    next: null,
  },
  northern_snowfield_completion_recovery_required: {
    speaker: 'Old Man',
    text: 'Your save needs to be checked before I can confirm the report or reward.',
    next: null,
  },
  quest_accept: {
    speaker: 'Old Man',
    text: 'First, show me what you learned. Then we will put it into practice with a stack.',
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
  route_offer: {
    speaker: 'Village Guide',
    text: "The village has more to teach than the Elder's first lessons. Visit the Monk for a final piece of guidance, then test what you know with the Samurai at the dojo. Return to me when your trial is complete.",
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
}

const SAMURAI_TREE: DialogueTree = {
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
}

const FARMER_TREE: DialogueTree = {
  start: {
    speaker: 'Farmer',
    text: 'Long beans, short beans, a queue of buckets at dawn. Even a farm is a data structure, if you think about it.',
    next: null,
  },
}

export const VILLAGE_NPCS: readonly NpcDefinition[] = [
  {
    id: 'elder-masanori',
    name: 'Old Man',
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
    characterAsset: 'Villager3',
    tileX: 13,
    tileY: 25,
    region: 'central-plaza',
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
    characterAsset: 'Monk',
    tileX: 9,
    tileY: 26,
    region: 'central-plaza',
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
    characterAsset: 'Samurai',
    tileX: 22,
    tileY: 21,
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
    characterAsset: 'Merchant',
    tileX: 20,
    tileY: 29,
    region: 'central-plaza',
    spriteKey: 'plaza-merchant-idle',
    idleAnimation: 'plaza-merchant-anim-idle-down',
    walkSpriteKey: 'plaza-merchant-walk',
    walkAnimationPrefix: 'plaza-merchant-anim-walk',
    portraitUrl: merchantPortraitUrl,
    // Ambient roamer: crosses the plaza between reachable stops.
    movement: NPC_MOVEMENT_PROFILES.ambient['plaza-merchant'],
    dialogueTree: MERCHANT_TREE,
  },
  {
    id: 'west-gate-guard',
    name: 'Village Guard',
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
    characterAsset: 'Shaman',
    tileX: 12,
    tileY: 10,
    region: 'northern-field',
    spriteKey: 'shrine-shaman-idle',
    idleAnimation: 'shrine-shaman-anim-idle-down',
    walkSpriteKey: 'shrine-shaman-walk',
    walkAnimationPrefix: 'shrine-shaman-anim-walk',
    portraitUrl: shamanPortraitUrl,
    // Ambient roamer: roams the shrine field between stops.
    movement: NPC_MOVEMENT_PROFILES.ambient['shrine-shaman'],
    dialogueTree: SHAMAN_TREE,
  },
  {
    id: 'south-farmer',
    name: 'Farmer',
    characterAsset: 'Farmer',
    tileX: 22,
    tileY: 27,
    region: 'southern-residential',
    spriteKey: 'south-farmer-idle',
    idleAnimation: 'south-farmer-anim-idle-down',
    walkSpriteKey: 'south-farmer-walk',
    walkAnimationPrefix: 'south-farmer-anim-walk',
    portraitUrl: farmerPortraitUrl,
    // Ambient roamer: walks the southern residential lanes.
    movement: NPC_MOVEMENT_PROFILES.ambient['south-farmer'],
    dialogueTree: FARMER_TREE,
  },
]
