import Phaser from 'phaser'
import { GameAutoTester } from '../GameAutoTester'
import { getCharacterId, isCharacterId, setCharacterId, type CharacterId } from '../player/characterAppearance'
import { CHARACTER_SKINS } from '../player/characterSkins'
import {
  getStoredPlayerSpeed,
  PLAYER_SPEED_KEY,
  PLAYER_SPEED_MAX,
  PLAYER_SPEED_MIN,
} from '../player/playerSpeedSettings'
import { DialogueController, isNpcNearby } from '../dialogue/DialogueController'
import { InteractionPrompt } from '../npc/InteractionPrompt'
import { Npc } from '../npc/Npc'
import { footprintsOverlap } from '../npc/footprintCollision'
import { WanderAi } from '../npc/WanderAi'
import { QuestManager } from '../quests/QuestManager'
import { getElderInteractionRoute } from '../quests/elderCampaignRouting'
import { claimKnowledgeScroll, hasKnowledgeScroll } from '../quests/knowledgeScrolls'
import { acknowledgeArraysScroll, getArraysCampaignStage, hasAcknowledgedArraysScroll } from '../quests/arraysCampaignStages'
import { isVillageTrainingRouteEligible } from '../quests/villageTrainingRouteRouting'
import { getVillageGuideOpeningRoute } from '../quests/villageGuideArraysRouting'
import {
  advanceElderPrologueStageForChallenge,
  readElderPrologueStage,
  type ElderLearningStage,
} from '../quests/elderLearningStages'
import { getPlayerProfile } from '../stats/playerStats'
import { NameTag, NAME_TAG_STYLE, NPC_TAG_SHOW_DISTANCE, NPC_TAG_HIDE_DISTANCE, NPC_TAG_FADE_MS } from '../playerNameTag'
import { ¶»§q«^