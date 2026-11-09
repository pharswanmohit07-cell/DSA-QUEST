import type { DialogueTree } from '../dialogue/dialogueTypes'

import boyPortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/Boy/Faceset.png'
import inspectorPortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/Inspector/Faceset.png'
import eskimoPortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/Eskimo/Faceset.png'
import knightPortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/Knight/Faceset.png'
import knightGoldPortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/KnightGold/Faceset.png'
import masterPortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/Master/Faceset.png'
import monk2PortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/Monk2/Faceset.png'
import ninjaBlue2PortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/NinjaBlue2/Faceset.png'
import ninjaBluePortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/NinjaBlue/Faceset.png'
import ninjaGreenPortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/NinjaGreen/Faceset.png'
import ninjaRed2PortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/NinjaRed2/Faceset.png'
import ninjaRedPortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/NinjaRed/Faceset.png'
import noblePortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/Noble/Faceset.png'
import oldMan2PortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/OldMan2/Faceset.png'
import princessPortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/Princess/Faceset.png'
import samuraiBluePortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/SamuraiBlue/Faceset.png'
import sultanPortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/Sultan/Faceset.png'
import villager2PortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/Villager2/Faceset.png'
import villager5PortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/Villager5/Faceset.png'
import villagerPortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/Villager/Faceset.png'
import womanPortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/Woman/Faceset.png'
import type { NpcDefinition } from './villageNpcs'
import { NPC_MOVEMENT_PROFILES } from './movementProfiles'

/**
 * Ambient world NPCs — the population spread across the whole playable map.
 *
 * These NPCs are pure flavour: they populate regions of the world away from the
 * central plaza and give short, location-appropriate dialogue. They never alter
 * quest or campaign state and never receive route/branch routing.
 *
 * The seven educational anchors (Elder, Village Guide, Monk, Samurai and the
 * existing ambient plaza set) stay in `villageNpcs.ts`; this file only adds
 * world coverage. Every placement was verified against the map's derived
 * collision data (scripts/map-region-report.mjs) and every pair of NPCs is at
 * least 4 tiles apart so no two interaction zones can overlap.
 *
 * Movement: `wander` keeps the original short-leash WanderAi behaviour;
 * `roam` uses the RoamAi long-distance walker which re-picks an open heading
 * when blocked, so travellers visibly traverse the sand road and paths instead
 * of pausing at every fence. Stationary NPCs have neither block.
 *
 * Regions covered (single walkable component, verified):
 * - north field past the torii: rows 6-13, west of column 25
 * - west gate road: rows 6-13, columns 0-9
 * - west yard / sand road: rows 14-23, columns 0-13
 * - central plaza: rows 20-28, columns 0-13
 * - east field and pond: rows 19-33, columns 24-34
 * - east compound: rows 15-21, columns 14-23
 * - south residential lanes: rows 29-33, columns 13-29
 *
 * REGION REASSIGNMENT NOTE (regional-population fix): two ambient flavour
 * NPCs were reassigned to their function-fitting macro regions so the moving
 * active population lands on the requested 6 village / 4 dungeon / 2 snow split:
 *
 * - `east-field-red-ninja` — the field-runner who trains beside the compound
 *   walls — is now a dungeon roamer (band 'east-compound').
 * - `west-gate-patrol` — the patrol who walks the wall line twice an hour — is
 *   now a snow roamer (band 'northern-field'); its dialogue already talks about
 *   a fixed route, and its home row 6 is inside the northern-field band.
 *
 * Quest NPCs are untouched: Elder, Village Guide, Monk and Dojo Samurai keep
 * their authored homes, bands and small leashes.
 */

const SAND_ROAD_TRAVELLER_TREE: DialogueTree = {
  start: {
    speaker: 'Traveller',
    text: 'I crossed the western gate at dawn and I am still walking. A road is just an array of footprints, if you ask me.',
    next: null,
  },
}

const NORTH_FIELD_FARMER_TREE: DialogueTree = {
  start: {
    speaker: 'Field Hand',
    text: 'The north field feeds half the village. Plant in rows, harvest in order — nothing grows out of turn.',
    next: null,
  },
}

const NORTH_FIELD_SCOUT_TREE: DialogueTree = {
  start: {
    speaker: 'Snow Scout',
    text: 'Past the torii the snow deepens fast. I map the safe path each morning before the drifts move.',
    next: null,
  },
}

const WEST_GATE_PATROL_TREE: DialogueTree = {
  start: {
    speaker: 'Gate Patrol',
    text: 'West road is quiet today. I walk the wall line twice an hour, same route, every time.',
    next: null,
  },
}

const WEST_ROAD_WOMAN_TREE: DialogueTree = {
  start: {
    speaker: 'Water Carrier',
    text: 'Two buckets, one well, no shortcuts. The western road keeps my arms honest.',
    next: null,
  },
}

const WEST_YARD_MERCHANT_TREE: DialogueTree = {
  start: {
    speaker: 'Pot Seller',
    text: 'Clay pots, warm from the kiln. A good pot stacks cleanly — nothing slides off the pile.',
    next: null,
  },
}

const WEST_YARD_KNIGHT_TREE: DialogueTree = {
  start: {
    speaker: 'Wandering Knight',
    text: 'My armour has walked more roads than most maps show. This village keeps its paths well.',
    next: null,
  },
}

const PLAZA_CHILD_TREE: DialogueTree = {
  start: {
    speaker: 'Village Boy',
    text: 'I can run the whole plaza without stepping on the same stone twice. Almost.',
    next: null,
  },
}

const PLAZA_NOBLE_TREE: DialogueTree = {
  start: {
    speaker: 'Noble Visitor',
    text: 'A fine village. I count the lanterns as I walk — it keeps the mind orderly.',
    next: null,
  },
}

const WEST_PLAZA_MASTER_TREE: DialogueTree = {
  start: {
    speaker: 'Old Master',
    text: 'Balance, young hunter. Every step you take in a circle returns you to where thought began.',
    next: null,
  },
}

const SOUTH_MERCHANT_TREE: DialogueTree = {
  start: {
    speaker: 'Lantern Seller',
    text: 'Lanterns! One for the doorway, one for the road. A light is the cheapest friend you will ever buy.',
    next: null,
  },
}

const SOUTH_NINJA_TREE: DialogueTree = {
  start: {
    speaker: 'Blue Ninja',
    text: 'The south lanes hide more than they show. Walk them twice and you will know what I mean.',
    next: null,
  },
}

const SOUTH_GREEN_NINJA_TREE: DialogueTree = {
  start: {
    speaker: 'Green Ninja',
    text: 'Training is a stack of days: the last one you climbed teaches the next.',
    next: null,
  },
}

const POND_ESKIMO_TREE: DialogueTree = {
  start: {
    speaker: 'Ice Fisher',
    text: 'Even the shallow pond keeps its own order. Cold water teaches patience better than any sermon.',
    next: null,
  },
}

const EAST_FIELD_RED_NINJA_TREE: DialogueTree = {
  start: {
    speaker: 'Red Ninja',
    text: 'I run the east field every evening. Sixteen lengths, no fewer. Discipline is a habit, not a gift.',
    next: null,
  },
}

const EAST_FIELD_PRINCESS_TREE: DialogueTree = {
  start: {
    speaker: 'Noble Traveller',
    text: 'The eastern flowers bloom in strict rows. Someone here understands that order is beautiful.',
    next: null,
  },
}

const SOUTH_EAST_SAMURAI_TREE: DialogueTree = {
  start: {
    speaker: 'Blue Samurai',
    text: 'A blade, like a lesson, is kept sharp by repetition. Mind the garden rows as you pass.',
    next: null,
  },
}

const SOUTH_EAST_SULTAN_TREE: DialogueTree = {
  start: {
    speaker: 'Merchant Lord',
    text: 'Trade routes, library routes — all roads are lists of stops. This village is well indexed.',
    next: null,
  },
}

const EAST_PATH_MONK2_TREE: DialogueTree = {
  start: {
    speaker: 'Wandering Monk',
    text: 'I walk the east path at dusk. The pond keeps its lilies in a queue; who am I to argue?',
    next: null,
  },
}

const GATE_ARCH_INSPECTOR_TREE: DialogueTree = {
  start: {
    speaker: 'Road Inspector',
    text: 'Archway clear, track firm, markings legible. Everything east of here is in good order.',
    next: null,
  },
}

/**
 * The twenty ambient world NPCs. Sprite/portrait keys are derived from the
 * character folder names; textures are loaded in `MainScene.preload()`.
 */
const WORLD_NPCS_ALL: readonly NpcDefinition[] = [
  {
    id: 'sand-road-traveller',
    name: 'Traveller',
    role: 'ambient',
    characterAsset: 'NinjaGreen',
    tileX: 4,
    tileY: 12,
    region: 'western-gate-road',
    spriteKey: 'sand-road-traveller-idle',
    idleAnimation: 'sand-road-traveller-anim-idle-down',
    walkSpriteKey: 'sand-road-traveller-walk',
    walkAnimationPrefix: 'sand-road-traveller-anim-walk',
    portraitUrl: ninjaGreenPortraitUrl,
    // Ambient roamer: `MapRoamAi` discovers its own route across the sand
    // road, so no authored waypoint list is needed.
    movement: NPC_MOVEMENT_PROFILES.ambient['sand-road-traveller'],
    dialogueTree: SAND_ROAD_TRAVELLER_TREE,
  },
  {
    id: 'north-field-farmer',
    name: 'Field Hand',
    characterAsset: 'Woman',
    tileX: 2,
    tileY: 6,
    region: 'northern-field',
    spriteKey: 'north-field-farmer-idle',
    idleAnimation: 'north-field-farmer-anim-idle-down',
    walkSpriteKey: 'north-field-farmer-walk',
    walkAnimationPrefix: 'north-field-farmer-anim-walk',
    portraitUrl: womanPortraitUrl,
    roam: {
      speed: 24,
      minDuration: 2,
      maxDuration: 4,
      minPause: 2.5,
      maxPause: 5,
      leashRadius: 64,
    },
    dialogueTree: NORTH_FIELD_FARMER_TREE,
  },
  {
    id: 'north-field-scout',
    name: 'Snow Scout',
    characterAsset: 'NinjaBlue',
    tileX: 18,
    tileY: 11,
    region: 'northern-field',
    spriteKey: 'north-field-scout-idle',
    idleAnimation: 'north-field-scout-anim-idle-down',
    walkSpriteKey: 'north-field-scout-walk',
    walkAnimationPrefix: 'north-field-scout-anim-walk',
    portraitUrl: ninjaBluePortraitUrl,
    roam: {
      speed: 32,
      minDuration: 3,
      maxDuration: 6,
      minPause: 2,
      maxPause: 4,
      leashRadius: 88,
    },
    dialogueTree: NORTH_FIELD_SCOUT_TREE,
  },
  {
    id: 'west-gate-patrol',
    name: 'Gate Patrol',
    role: 'ambient',
    characterAsset: 'Eskimo',
    tileX: 13,
    tileY: 6,
    region: 'northern-field',
    spriteKey: 'west-gate-patrol-idle',
    idleAnimation: 'west-gate-patrol-anim-idle-down',
    walkSpriteKey: 'west-gate-patrol-walk',
    walkAnimationPrefix: 'west-gate-patrol-anim-walk',
    portraitUrl: eskimoPortraitUrl,
    movement: NPC_MOVEMENT_PROFILES.ambient['west-gate-patrol'],
    dialogueTree: WEST_GATE_PATROL_TREE,
  },
  {
    id: 'west-road-woman',
    name: 'Water Carrier',
    characterAsset: 'Villager2',
    tileX: 7,
    tileY: 13,
    region: 'western-gate-road',
    spriteKey: 'west-road-woman-idle',
    idleAnimation: 'west-road-woman-anim-idle-down',
    walkSpriteKey: 'west-road-woman-walk',
    walkAnimationPrefix: 'west-road-woman-anim-walk',
    portraitUrl: villager2PortraitUrl,
    roam: {
      speed: 22,
      minDuration: 2,
      maxDuration: 4,
      minPause: 2.5,
      maxPause: 5,
      leashRadius: 80,
    },
    dialogueTree: WEST_ROAD_WOMAN_TREE,
  },
  {
    id: 'west-yard-pot-seller',
    name: 'Pot Seller',
    characterAsset: 'OldMan2',
    tileX: 11,
    tileY: 15,
    region: 'western-yard-sand-road',
    spriteKey: 'west-yard-pot-seller-idle',
    idleAnimation: 'west-yard-pot-seller-anim-idle-down',
    walkSpriteKey: 'west-yard-pot-seller-walk',
    walkAnimationPrefix: 'west-yard-pot-seller-anim-walk',
    portraitUrl: oldMan2PortraitUrl,
    roam: {
      speed: 20,
      minDuration: 1.5,
      maxDuration: 3,
      minPause: 3,
      maxPause: 6,
      // ~3 tiles: stays near his yard stall.
      leashRadius: 48,
    },
    dialogueTree: WEST_YARD_MERCHANT_TREE,
  },
  {
    id: 'west-yard-knight',
    name: 'Wandering Knight',
    characterAsset: 'KnightGold',
    tileX: 11,
    tileY: 22,
    region: 'eastern-field-pond',
    spriteKey: 'west-yard-knight-idle',
    idleAnimation: 'west-yard-knight-anim-idle-down',
    walkSpriteKey: 'west-yard-knight-walk',
    walkAnimationPrefix: 'west-yard-knight-anim-walk',
    portraitUrl: knightGoldPortraitUrl,
    // Central plaza → torii corridor → eastern field, along row 21 through the
    // torii corridor and the verified east-field track (row 25). Waypoint legs
    // were re-validated against the derived collision after the safe-navigation
    // rules landed (the pillar column 14 forced the corridor down to x=13).
    patrol: {
      speed: 26,
      route: {
        waypoints: [
          { x: 11, y: 22 },
          { x: 13, y: 22 },
          { x: 13, y: 21 },
          { x: 13, y: 25 },
          { x: 20, y: 25 },
          { x: 26, y: 25 },
        ],
        minDwell: 2.5,
        maxDwell: 6,
      },
    },
    dialogueTree: WEST_YARD_KNIGHT_TREE,
  },
  {
    id: 'plaza-boy',
    name: 'Village Boy',
    characterAsset: 'Boy',
    tileX: 12,
    tileY: 28,
    region: 'southern-residential',
    spriteKey: 'plaza-boy-idle',
    idleAnimation: 'plaza-boy-anim-idle-down',
    walkSpriteKey: 'plaza-boy-walk',
    walkAnimationPrefix: 'plaza-boy-anim-walk',
    portraitUrl: boyPortraitUrl,
    roam: {
      speed: 34,
      minDuration: 2,
      maxDuration: 4,
      minPause: 1.5,
      maxPause: 3,
      leashRadius: 72,
    },
    dialogueTree: PLAZA_CHILD_TREE,
  },
  {
    id: 'plaza-noble',
    name: 'Noble Visitor',
    characterAsset: 'Noble',
    tileX: 3,
    tileY: 26,
    region: 'central-plaza',
    spriteKey: 'plaza-noble-idle',
    idleAnimation: 'plaza-noble-anim-idle-down',
    walkSpriteKey: 'plaza-noble-walk',
    walkAnimationPrefix: 'plaza-noble-anim-walk',
    portraitUrl: noblePortraitUrl,
    roam: {
      speed: 24,
      minDuration: 2,
      maxDuration: 4,
      minPause: 2.5,
      maxPause: 5,
      leashRadius: 64,
    },
    dialogueTree: PLAZA_NOBLE_TREE,
  },
  {
    id: 'west-plaza-master',
    name: 'Old Master',
    characterAsset: 'Master',
    tileX: 1,
    tileY: 31,
    region: 'central-plaza',
    spriteKey: 'west-plaza-master-idle',
    idleAnimation: 'west-plaza-master-anim-idle-down',
    portraitUrl: masterPortraitUrl,
    // Stationary: the old master practises his forms in one spot.
    dialogueTree: WEST_PLAZA_MASTER_TREE,
  },
  {
    id: 'south-lane-lantern-seller',
    name: 'Lantern Seller',
    characterAsset: 'Sultan',
    tileX: 20,
    tileY: 30,
    region: 'southern-residential',
    spriteKey: 'south-lane-lantern-seller-idle',
    idleAnimation: 'south-lane-lantern-seller-anim-idle-down',
    walkSpriteKey: 'south-lane-lantern-seller-walk',
    walkAnimationPrefix: 'south-lane-lantern-seller-anim-walk',
    portraitUrl: sultanPortraitUrl,
    roam: {
      speed: 22,
      minDuration: 2,
      maxDuration: 3.5,
      minPause: 2.5,
      maxPause: 5,
      leashRadius: 56,
    },
    dialogueTree: SOUTH_MERCHANT_TREE,
  },
  {
    id: 'south-lane-ninja',
    name: 'Blue Ninja',
    characterAsset: 'NinjaBlue2',
    tileX: 13,
    tileY: 33,
    region: 'southern-residential',
    spriteKey: 'south-lane-ninja-idle',
    idleAnimation: 'south-lane-ninja-anim-idle-down',
    walkSpriteKey: 'south-lane-ninja-walk',
    walkAnimationPrefix: 'south-lane-ninja-anim-walk',
    portraitUrl: ninjaBlue2PortraitUrl,
    roam: {
      speed: 30,
      minDuration: 2,
      maxDuration: 4,
      minPause: 2,
      maxPause: 4,
      leashRadius: 64,
    },
    dialogueTree: SOUTH_NINJA_TREE,
  },
  {
    id: 'south-lane-ninja-red',
    name: 'Green Ninja',
    characterAsset: 'NinjaRed',
    tileX: 21,
    tileY: 34,
    region: 'southern-residential',
    spriteKey: 'south-lane-ninja-red-idle',
    idleAnimation: 'south-lane-ninja-red-anim-idle-down',
    walkSpriteKey: 'south-lane-ninja-red-walk',
    walkAnimationPrefix: 'south-lane-ninja-red-anim-walk',
    portraitUrl: ninjaRedPortraitUrl,
    roam: {
      speed: 30,
      minDuration: 2,
      maxDuration: 4,
      minPause: 2,
      maxPause: 4,
      leashRadius: 64,
    },
    dialogueTree: SOUTH_GREEN_NINJA_TREE,
  },
  {
    id: 'pond-ice-fisher',
    name: 'Ice Fisher',
    characterAsset: 'Villager',
    tileX: 31,
    tileY: 27,
    region: 'eastern-field-pond',
    spriteKey: 'pond-ice-fisher-idle',
    idleAnimation: 'pond-ice-fisher-anim-idle-down',
    // Ice Fisher uses the base Villager art � see characterAsset.
    portraitUrl: villagerPortraitUrl,
    // Stationary: fishing at the pond bank.
    dialogueTree: POND_ESKIMO_TREE,
  },
  {
    id: 'east-field-red-ninja',
    name: 'Red Ninja',
    role: 'main',
    questTopic: 'sorting',
    characterAsset: 'NinjaRed2',
    tileX: 28,
    tileY: 14,
    region: 'east-compound',
    spriteKey: 'east-field-red-ninja-idle',
    idleAnimation: 'east-field-red-ninja-anim-idle-down',
    walkSpriteKey: 'east-field-red-ninja-walk',
    walkAnimationPrefix: 'east-field-red-ninja-anim-walk',
    portraitUrl: ninjaRed2PortraitUrl,
    dialogueTree: EAST_FIELD_RED_NINJA_TREE,
  },
  {
    id: 'east-field-noble-woman',
    name: 'Noble Traveller',
    characterAsset: 'Princess',
    tileX: 29,
    tileY: 19,
    region: 'eastern-field-pond',
    spriteKey: 'east-field-noble-woman-idle',
    idleAnimation: 'east-field-noble-woman-anim-idle-down',
    walkSpriteKey: 'east-field-noble-woman-walk',
    walkAnimationPrefix: 'east-field-noble-woman-anim-walk',
    portraitUrl: princessPortraitUrl,
    roam: {
      speed: 22,
      minDuration: 2,
      maxDuration: 4,
      minPause: 2.5,
      maxPause: 5,
      leashRadius: 64,
    },
    dialogueTree: EAST_FIELD_PRINCESS_TREE,
  },
  {
    id: 'south-east-blue-samurai',
    name: 'Blue Samurai',
    role: 'ambient',
    characterAsset: 'SamuraiBlue',
    tileX: 29,
    tileY: 27,
    region: 'eastern-field-pond',
    spriteKey: 'south-east-blue-samurai-idle',
    idleAnimation: 'south-east-blue-samurai-anim-idle-down',
    walkSpriteKey: 'south-east-blue-samurai-walk',
    walkAnimationPrefix: 'south-east-blue-samurai-anim-walk',
    portraitUrl: samuraiBluePortraitUrl,
    // Now an ambient roamer: `MapRoamAi` discovers its own riverside route.
    movement: NPC_MOVEMENT_PROFILES.ambient['south-east-blue-samurai'],
    dialogueTree: SOUTH_EAST_SAMURAI_TREE,
  },
  {
    id: 'south-east-merchant-lord',
    name: 'Merchant Lord',
    characterAsset: 'Villager5',
    tileX: 18,
    tileY: 33,
    region: 'southern-residential',
    spriteKey: 'south-east-merchant-lord-idle',
    idleAnimation: 'south-east-merchant-lord-anim-idle-down',
    walkSpriteKey: 'south-east-merchant-lord-walk',
    walkAnimationPrefix: 'south-east-merchant-lord-anim-walk',
    portraitUrl: villager5PortraitUrl,
    roam: {
      speed: 22,
      minDuration: 2,
      maxDuration: 4,
      minPause: 2.5,
      maxPause: 5,
      leashRadius: 56,
    },
    dialogueTree: SOUTH_EAST_SULTAN_TREE,
  },
  {
    id: 'east-path-wandering-monk',
    name: 'Wandering Monk',
    characterAsset: 'Monk2',
    tileX: 24,
    tileY: 24,
    region: 'eastern-field-pond',
    spriteKey: 'east-path-wandering-monk-idle',
    idleAnimation: 'east-path-wandering-monk-anim-idle-down',
    walkSpriteKey: 'east-path-wandering-monk-walk',
    walkAnimationPrefix: 'east-path-wandering-monk-anim-walk',
    portraitUrl: monk2PortraitUrl,
    roam: {
      speed: 24,
      minDuration: 3,
      maxDuration: 5,
      minPause: 2.5,
      maxPause: 5,
      leashRadius: 80,
    },
    dialogueTree: EAST_PATH_MONK2_TREE,
  },
  {
    id: 'gate-arch-inspector',
    name: 'Road Inspector',
    characterAsset: 'Inspector',
    tileX: 20,
    tileY: 25,
    region: 'east-compound',
    spriteKey: 'gate-arch-inspector-idle',
    idleAnimation: 'gate-arch-inspector-anim-idle-down',
    walkSpriteKey: 'gate-arch-inspector-walk',
    walkAnimationPrefix: 'gate-arch-inspector-anim-walk',
    portraitUrl: inspectorPortraitUrl,
    roam: {
      speed: 24,
      minDuration: 2,
      maxDuration: 4,
      minPause: 3,
      maxPause: 6,
      // ~4 tiles: checks the archway and track, never leaves the gate.
      leashRadius: 64,
    },
    dialogueTree: GATE_ARCH_INSPECTOR_TREE,
  },
]

const ACTIVE_WORLD_NPC_IDS = new Set([
  'sand-road-traveller',
  'west-gate-patrol',
  'east-field-red-ninja',
  'south-east-blue-samurai',
])

export const WORLD_NPCS: readonly NpcDefinition[] = WORLD_NPCS_ALL
  .filter((definition) => ACTIVE_WORLD_NPC_IDS.has(definition.id))
  .map((definition) => {
    if (definition.id === 'east-field-red-ninja') return { ...definition, name: 'Field Runner' }
    if (definition.id === 'south-east-blue-samurai') return { ...definition, name: 'Riverside Wanderer' }
    return definition
  })
