import type { WanderConfig } from './WanderAi'

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
  'plaza-merchant',
  'west-gate-guard',
  'shrine-shaman',
  'south-farmer',
  'sand-road-traveller',
  'west-gate-patrol',
  'east-field-red-ninja',
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
    'plaza-merchant': {
      kind: 'ambient',
      speed: 22,
      minPauseDuration: 2.5,
      maxPauseDuration: 5,
      minDestinationTiles: 3,
    },
    'west-gate-guard': {
      kind: 'ambient',
      speed: 20,
      minPauseDuration: 3,
      maxPauseDuration: 6,
      minDestinationTiles: 3,
    },
    'shrine-shaman': {
      kind: 'ambient',
      speed: 18,
      minPauseDuration: 3,
      maxPauseDuration: 6,
      minDestinationTiles: 3,
    },
    'south-farmer': {
      kind: 'ambient',
      speed: 20,
      minPauseDuration: 2.5,
      maxPauseDuration: 5,
      minDestinationTiles: 3,
    },
    'sand-road-traveller': {
      kind: 'ambient',
      speed: 30,
      minPauseDuration: 2,
      maxPauseDuration: 5,
      // A long-haul walker: visibly crosses the sand road between stops.
      minDestinationTiles: 6,
    },
    'west-gate-patrol': {
      kind: 'ambient',
      speed: 26,
      minPauseDuration: 2,
      maxPauseDuration: 4,
      minDestinationTiles: 4,
    },
    'east-field-red-ninja': {
      kind: 'ambient',
      speed: 32,
      minPauseDuration: 1.5,
      maxPauseDuration: 3,
      minDestinationTiles: 5,
    },
    'south-east-blue-samurai': {
      kind: 'ambient',
      speed: 24,
      minPauseDuration: 3,
      maxPauseDuration: 6,
      minDestinationTiles: 4,
    },
  },
}
