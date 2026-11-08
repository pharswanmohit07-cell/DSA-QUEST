import type { DialogueTree } from '../dialogue/dialogueTypes'

import ninjaGreenPortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/NinjaGreen/Faceset.png'
import knightPortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/Knight/Faceset.png'
import ninjaRed2PortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/NinjaRed2/Faceset.png'
import samuraiBluePortraitUrl from '../../assets/tiles/ninja-village/WorldNPCs/SamuraiBlue/Faceset.png'
import type { NpcDefinition } from './villageNpcs'

/**
 * Ambient world NPCs — the small roaming population.
 *
 * The active world keeps a **small, purposeful** population: a handful of main
 * characters at fixed, findable locations, plus exactly four ambient NPCs whose
 * patrols cover meaningful distances between the map's real regions. They are
 * pure flavour: they never alter quest or campaign state and never receive
 * route/branch routing.
 *
 * The educational anchors (Elder, Village Guide, Monk, Samurai) stay in
 * `villageNpcs.ts`. Every waypoint here sits on a verified-open tile and every
 * cardinal leg between consecutive waypoints is connected open ground
 * (scripts/map-region-report.mjs), and each patrol spans two or more regions.
 */

const SAND_ROAD_TRAVELLER_TREE: DialogueTree = {
  start: {
    speaker: 'Traveller',
    text: 'I crossed the western gate at dawn and I am still walking. A road is just an array of footprints, if you ask me.',
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

const EAST_FIELD_RED_NINJA_TREE: DialogueTree = {
  start: {
    speaker: 'Field Runner',
    text: 'I run the east field every evening. Sixteen lengths, no fewer. Discipline is a habit, not a gift.',
    next: null,
  },
}

const SOUTH_EAST_SAMURAI_TREE: DialogueTree = {
  start: {
    speaker: 'Riverside Wanderer',
    text: 'A blade, like a lesson, is kept sharp by repetition. Mind the garden rows as you pass.',
    next: null,
  },
}

/**
 * The four ambient world NPCs. Sprite/portrait keys are derived from the
 * character folder names; textures are loaded in `MainScene.preload()`.
 */
export const WORLD_NPCS: readonly NpcDefinition[] = [
  {
    id: 'sand-road-traveller',
    name: 'Traveller',
    characterAsset: 'NinjaGreen',
    tileX: 4,
    tileY: 12,
    region: 'western-gate-road',
    spriteKey: 'sand-road-traveller-idle',
    idleAnimation: 'sand-road-traveller-anim-idle-down',
    walkSpriteKey: 'sand-road-traveller-walk',
    walkAnimationPrefix: 'sand-road-traveller-anim-walk',
    portraitUrl: ninjaGreenPortraitUrl,
    // West gate → sand road → torii corridor → central plaza: spans the
    // western-gate-road, western-yard-sand-road and central-plaza bands.
    // Every waypoint and cardinal leg verified against the derived collision.
    patrol: {
      speed: 30,
      route: {
        waypoints: [{ x: 1, y: 12 }, { x: 9, y: 12 }, { x: 9, y: 13 }, { x: 12, y: 13 }, { x: 12, y: 21 }],
        minDwell: 2,
        maxDwell: 5,
      },
    },
    dialogueTree: SAND_ROAD_TRAVELLER_TREE,
  },
  {
    id: 'west-gate-patrol',
    name: 'Gate Patrol',
    characterAsset: 'Knight',
    tileX: 13,
    tileY: 6,
    region: 'northern-field',
    spriteKey: 'west-gate-patrol-idle',
    idleAnimation: 'west-gate-patrol-anim-idle-down',
    walkSpriteKey: 'west-gate-patrol-walk',
    walkAnimationPrefix: 'west-gate-patrol-anim-walk',
    portraitUrl: knightPortraitUrl,
    // North field ↔ plaza: follows the verified open corridor (13,6 → row 6
    // east → 18,7-12 south → 13,12 west → 13,13 → column 12 down to the
    // plaza), tying the snowy north to the village heart.
    patrol: {
      speed: 26,
      route: {
        waypoints: [{ x: 13, y: 6 }, { x: 17, y: 6 }, { x: 17, y: 7 }, { x: 18, y: 8 }, { x: 18, y: 12 }, { x: 13, y: 12 }, { x: 13, y: 13 }, { x: 12, y: 13 }, { x: 12, y: 21 }],
        minDwell: 2.5,
        maxDwell: 6,
      },
    },
    dialogueTree: WEST_GATE_PATROL_TREE,
  },
  {
    id: 'east-field-red-ninja',
    name: 'Field Runner',
    characterAsset: 'NinjaRed2',
    tileX: 26,
    tileY: 20,
    region: 'eastern-field-pond',
    spriteKey: 'east-field-red-ninja-idle',
    idleAnimation: 'east-field-red-ninja-anim-idle-down',
    walkSpriteKey: 'east-field-red-ninja-walk',
    walkAnimationPrefix: 'east-field-red-ninja-anim-walk',
    portraitUrl: ninjaRed2PortraitUrl,
    // Central plaza → torii corridor → eastern field → pond: the long
    // east-west artery across three regions.
    patrol: {
      speed: 32,
      route: {
        waypoints: [
          { x: 12, y: 21 },
          { x: 13, y: 25 },
          { x: 26, y: 25 },
          { x: 31, y: 25 },
          { x: 31, y: 27 },
        ],
        minDwell: 2.5,
        maxDwell: 6,
      },
    },
    dialogueTree: EAST_FIELD_RED_NINJA_TREE,
  },
  {
    id: 'south-east-blue-samurai',
    name: 'Riverside Wanderer',
    characterAsset: 'SamuraiBlue',
    tileX: 25,
    tileY: 34,
    region: 'southern-residential',
    spriteKey: 'south-east-blue-samurai-idle',
    idleAnimation: 'south-east-blue-samurai-anim-idle-down',
    walkSpriteKey: 'south-east-blue-samurai-walk',
    walkAnimationPrefix: 'south-east-blue-samurai-anim-walk',
    portraitUrl: samuraiBluePortraitUrl,
    // Eastern pond → southern residential lanes → riverside: runs west along
    // the open row-27 corridor, then down column 25 to the south edge and the
    // riverside bank (26,31), all verified open.
    patrol: {
      speed: 24,
      route: {
        waypoints: [{ x: 31, y: 27 }, { x: 26, y: 27 }, { x: 25, y: 27 }, { x: 25, y: 34 }, { x: 26, y: 31 }],
        minDwell: 3,
        maxDwell: 6,
      },
    },
    dialogueTree: SOUTH_EAST_SAMURAI_TREE,
  },
]
