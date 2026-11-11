/**
 * Region-aware roaming tests.
 *
 * Prove that the ambient BFS respects each NPC's assigned macro region, that
 * destination picks stay spread out, that quest-NPC leash and regions are
 * honoured, and that no gate unlock can drag an NPC into the snowfield.
 *
 * Deterministic: the roamer is driven with a seeded random source.
 */
import { describe, expect, it } from 'vitest'
import { MapRoamAi, tileCenterX, tileFootY, tileInMacroRegion } from './mapRoamAi'
import {
  LOCAL_ROAMING_NPC_IDS,
  AMBIENT_ROAMING_NPC_IDS,
  NPC_MOVEMENT_PROFILES,
  NPC_MACRO_REGION_BANDS,
  macroRegionForBand,
} from './movementProfiles'
import { VILLAGE_NPCS } from './villageNpcs'
import { WORLD_NPCS } from './worldNpcs'
import {
  NPC_POPULATION_WEIGHTS,
  isNpcSafeCell,
  isSnowfieldTile,
  npcRegionForTile,
  tileIsInExactRegion,
} from '../map/npcSafeAreas'
import { createSeededRandom } from './roamAi'
import type { Npc } from './Npc'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as url from 'node:url'

const MAIN_SCENE_SRC = fs.readFileSync(
  path.resolve(url.fileURLToPath(import.meta.url), '..', '..', 'scenes', 'MainScene.ts'),
  'utf8',
)

const GRID_W = 35
const GRID_H = 35

type NpcDefLike = { id: string; region?: string; tileX: number; tileY: number }

const ALL_DEFS: NpcDefLike[] = [...VILLAGE_NPCS, ...WORLD_NPCS] as NpcDefLike[]

const MOVEMENT_IDS: readonly string[] = [...LOCAL_ROAMING_NPC_IDS, ...AMBIENT_ROAMING_NPC_IDS]

/** The profile for an id r¶»§q«^