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
 *   front of the dojo. That tile is walkable in the map data, and he wander¶»§q«^