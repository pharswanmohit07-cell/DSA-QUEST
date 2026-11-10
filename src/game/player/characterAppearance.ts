/**
 * Playable characters from the supplied Ninja Adventure Asset Pack.
 * Hunter is the same hero shown on the Home Screen and is the stable default.
 */
export const CHARACTER_IDS = [
  'Hunter',
  'Boy',
  'CamouflageGreen',
  'CamouflageRed',
  'CaveLion',
  'CaveLion2',
  'Cavegirl',
  'Cavegirl2',
  'Caveman',
  'Caveman2',
  'DemonGreen',
  'DemonRed',
  'EggBoy',
  'EggGirl',
  'Eskimo',
  'FighterRed',
  'FighterWhite',
  'Flam',
  'GladiatorBlue',
  'GoldStatue',
  'GreenPig',
  'Inspector',
  'Knight',
  'KnightGold',
  'Lion',
  'LionBoy',
  'LionOrange',
  'LionYellow',
  'ManGreen',
  'MaskFrog',
  'MaskGoldRacoon',
  'MaskRacoon',
  'Master',
  'Monk',
  'Monk2',
  'Monkey',
  'MonkeyBoxerBlue',
  'MonkeyBoxerRed',
  'NinjaBlue',
  'NinjaBlue2',
  'NinjaBomb',
  'NinjaDark',
  'NinjaEskimo',
  'NinjaFire',
  'NinjaGray',
  'NinjaGreen',
  'NinjaLeaf',
  'NinjaMageBlack',
  'NinjaMageOrange',
  'NinjaMasked',
  'NinjaRed',
  'NinjaRed2',
  'NinjaThunder',
  'NinjaWater',
  'NinjaYellow',
  'Noble',
  'OldMan',
  'OldMan2',
  'OldMan3',
  'Pig',
  'Princess',
  'RedGladiator',
  'RedNinja3',
  'RobotCamouflage',
  'RobotGreen',
  'RobotGrey',
  'Samurai',
  'SamuraiBlue',
  'SamuraiRed',
  'Shaman',
  'ShamanLion',
  'Skeleton',
  'SkeletonDemon',
  'SorcererBlack',
  'SorcererOrange',
  'Spirit',
  'Statue',
  'Sultan',
  'Sultan2',
  'Tengu',
  'Tengu2',
  'Vampire',
  'Village6',
  'Villager',
  'Villager2',
  'Villager3',
  'Villager4',
  'Villager5',
  'Villager6',
  'Woman',
] as const

export type CharacterId = (typeof CHARACTER_IDS)[number]

const CHARACTER_ID_SET: ReadonlySet<string> = new Set(CHARACTER_IDS)
export const CHARACTER_SELECTION_KEY = 'dsaq-character-id'

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && CHARACTER_ID_SET.has(value)
}

export function getCharacterId(_name: string, useSavedSelection = true): CharacterId {
  if (useSavedSelection && typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(CHARACTER_SELECTION_KEY)
      if (isCharacterId(saved)) return saved
      // Retire the old Ember/Moss/Azure SVG skins, as well as unknown values.
      if (saved !== null) window.localStorage.setItem(CHARACTER_SELECTION_KEY, 'Hunter')
    } catch {
      // Storage may be unavailable; use the stable pack default below.
    }
  }
  return 'Hunter'
}

export function setCharacterId(characterId: CharacterId): void {
  if (typeof window === 'undefined' || !isCharacterId(characterId)) return
  try {
    window.localStorage.setItem(CHARACTER_SELECTION_KEY, characterId)
  } catch {
    // The selection remains active for the current scene if storage is unavailable.
  }
}

export function getCharacterTint(_name: string, _useSavedSelection = true): number {
  return 0xffffff
}
