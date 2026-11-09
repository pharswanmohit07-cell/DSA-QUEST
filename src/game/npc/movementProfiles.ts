import type { WanderConfig } from './WanderAi'
import type { NpcRegionId } from '../map/npcSafeAreas'

/**
 * The macro region identity every moving NPC carries.
 *
 * - `village` — the southern village: central plaza, western gate road, sand
 *   road, southern residential lanes and the eastern compound.
 * - `dungeon` — the eastern compound district: the dojo compound itself plus
 *   the eastern field/pond approach that leads to it (rows 24-28, columns
 *   17-34). That band is the compound's own southern approach — it borders
 *   the compound wall and hosts the dungeon-assigned South Farmer — so it
 *   belongs exclusively to the dungeon region, never to the village.
 */
export type NpcHomeRegion = 'village' | 'dungeon' | 'snow'

/**
 * The map bands that make up each macro region, in preference order. An NPC
 * may roam inside any band of its macro region; the roamer masks BFS against
 * this list so paths can never leave the region even when gates unlock.
 */
export const NPC_MACRO_REGION_BANDS: Record<NpcHomeRegion, readonly NpcRegionId[]> = {
  village: [
    'central-plaza',
    'western-gate-road',
    'western-yard-sand-road',
    'southern-residential',
  ],
  dungeon: ['east-compound', 'eastern-field-pond'],
  snow: ['northern-field'],
}

/** The macro region a map band belongs to. */
export function macroRegionForBand(band: NpcRegionId): NpcHomeRegion | null {
  for (const [region, bands] of Object.entries(NPC_MACRO_REGION_BANDS) as Array<[NpcHomeRegion, readonly NpcRegionId[]]>) {
    if (bands.includes(band)) return region
  }
  return null
}

/**
 * The hybrid NPC roaming contract.
 *
 * Every active NPC carries exactly one movement profile describing *how* it
 * moves. Profiles come in two kinds:
 *
 * - `local`  — quest NPCs who pace around their authored home position within
 *              a small tile leash, so they are always easy to find again.
 * - `ambient`— flavour NPCs who travel between *reachable* locations across
 *              the live walkable map via `MapRoamAi` pathfinding.
 */

export type LocalMovementProfile = {
  kind: 'local'
  /**
   * The macro region this NPC belongs to. Even though a local roamer's leash
   * is small, the leash must never be able to carry it outside this region.
   */
  region: NpcHomeRegion
  /** Walking speed in pixels per second. */
  speed: number
  /** Seconds to keep walking before pausing. */
  minMoveDuration: number
  maxMoveDuration: number
  /** Seconds to stand still before picking a new heading. */
  minPauseDuration: number
  maxPauseDuration: number
  /**
   * How far (in tiles) the NPC may stray from its authored home position.
   * Converted to pixels at use time with the map's tile size (16 px).
   */
  leashRadiusTiles: number
}

export type AmbientMovementProfile = {
  kind: 'ambient'
  /**
   * The macro region this roamer is confined to. `MapRoamAi` masks its BFS
   * and destination picks to the bands listed for this region, so a gate
   * unlocking can never drag an NPC into another region.
   */
  region: NpcHomeRegion
  /** Walking speed in pixels per second. */
  speed: number
  /** Seconds to stand still before choosing the next destination. */
  minPauseDuration: number
  maxPauseDuration: number
  /**
   * Minimum straight-line distance (in tiles) between the NPC's current tile
   * and a candidate destination, so an ambient NPC visibly *travels* instead
   * of shuffling in place.
   */
  minDestinationTiles: number
}

export type NpcMovementProfile = LocalMovementProfile | AmbientMovementProfile

/** NPCs driven by the small-radius `WanderAi` local roamer. */
export const LOCAL_ROAMING_NPC_IDS = [
  'elder-masanori',
  'village-guide',
  'village-monk',
  'dojo-samurai',
] as const

/** NPCs driven by the map-wide `MapRoamAi` ambient roamer. */
export const AMBIENT_ROAMING_NPC_IDS = [
  'west-gate-guard',
  'sand-road-traveller',
  'west-gate-patrol',
  'south-east-blue-samurai',
] as const

export type MovementContract = {
  local: Record<(typeof LOCAL_ROAMING_NPC_IDS)[number], LocalMovementProfile>
  ambient: Record<(typeof AMBIENT_ROAMING_NPC_IDS)[number], AmbientMovementProfile>
}

/** Tile size the village NPCs are authored at; profiles use tile units. */
export const PROFILE_TILE_SIZE = 16

/** Widen an ambient/local profile into a legacy `WanderConfig` shape. */
export function profileToWanderConfig(profile: NpcMovementProfile): WanderConfig {
  if (profile.kind === 'local') {
    return {
      speed: profile.speed,
      minDuration: profile.minMoveDuration,
      maxDuration: profile.maxMoveDuration,
      minPause: profile.minPauseDuration,
      maxPause: profile.maxPauseDuration,
      leashRadius: profile.leashRadiusTiles * PROFILE_TILE_SIZE,
    }
  }
  return {
    speed: profile.speed,
    minDuration: 2,
    maxDuration: 4,
    minPause: profile.minPauseDuration,
    maxPause: profile.maxPauseDuration,
    leashRadius: Number.POSITIVE_INFINITY,
  }
}

/** Structural validation used by tests and the audit scripts. */
export function isValidLocalProfile(profile: LocalMovementProfile): boolean {
  return (
    profile.kind === 'local' &&
    (profile.region === 'village' || profile.region === 'dungeon' || profile.region === 'snow') &&
    profile.speed > 0 &&
    profile.minMoveDuration > 0 &&
    profile.maxMoveDuration >= profile.minMoveDuration &&
    profile.minPauseDuration >= 0 &&
    profile.maxPauseDuration >= profile.minPauseDuration &&
    profile.leashRadiusTiles > 0
  )
}

export function isValidAmbientProfile(profile: AmbientMovementProfile): boolean {
  return (
    profile.kind === 'ambient' &&
    (profile.region === 'village' || profile.region === 'dungeon' || profile.region === 'snow') &&
    profile.speed > 0 &&
    profile.minPauseDuration >= 0 &&
    profile.maxPauseDuration >= profile.minPauseDuration &&
    profile.minDestinationTiles > 0
  )
}

/**
 * The concrete profile for every NPC that moves under the hybrid system.
 *
 * Speeds are modest (18–34 px/s) so nobody outruns the player. Local NPCs get
 * tight leashes (≤ 3.5 tiles) so they never strand a quest interaction; ambient
 * NPCs have no leash at all — `MapRoamAi` keeps them on walkable ground and
 * away from each other instead.
 */
export const NPC_MOVEMENT_PROFILES: MovementContract = {
  local: {
    'elder-masanori': {
      kind: 'local',
      region: 'village',
      speed: 30,
      minMoveDuration: 3,
      maxMoveDuration: 5,
      minPauseDuration: 1.2,
      maxPauseDuration: 3,
      // Paces in front of the dojo; stays within three tiles of his post.
      leashRadiusTiles: 3,
    },
    'village-guide': {
      kind: 'local',
      region: 'village',
      speed: 24,
      minMoveDuration: 2,
      maxMoveDuration: 4,
      minPauseDuration: 2,
      maxPauseDuration: 4,
      // Two tiles: keeps clear of the spawn tile and the torii approach.
      leashRadiusTiles: 2,
    },
    'village-monk': {
      kind: 'local',
      region: 'village',
      speed: 20,
      minMoveDuration: 2,
      maxMoveDuration: 4,
      minPauseDuration: 2.5,
      maxPauseDuration: 5,
      // Two tiles: never crosses the Elder's interaction zone five tiles away.
      leashRadiusTiles: 2,
    },
    'dojo-samurai': {
      kind: 'local',
      region: 'dungeon',
      speed: 22,
      minMoveDuration: 1.5,
      maxMoveDuration: 3,
      minPauseDuration: 2.5,
      maxPauseDuration: 5,
      // Drills inside the compound; the walls themselves bound him anyway.
      leashRadiusTiles: 2.5,
    },
  },
  ambient: {
    'west-gate-guard': {
      kind: 'ambient',
      region: 'village',
      speed: 20,
      minPauseDuration: 3,
      maxPauseDuration: 6,
      minDestinationTiles: 3,
    },
    'sand-road-traveller': {
      kind: 'ambient',
      region: 'village',
      speed: 30,
      minPauseDuration: 2,
      maxPauseDuration: 5,
      // A long-haul walker: visibly crosses the sand road between stops.
      minDestinationTiles: 6,
    },
    'west-gate-patrol': {
      kind: 'ambient',
      region: 'snow',
      speed: 26,
      minPauseDuration: 2,
      maxPauseDuration: 4,
      minDestinationTiles: 4,
    },
    'south-east-blue-samurai': {
      kind: 'ambient',
      region: 'dungeon',
      speed: 24,
      minPauseDuration: 3,
      maxPauseDuration: 6,
      minDestinationTiles: 4,
    },
  },
}
