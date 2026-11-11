import { useCallback, useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import {
  getStoredPlayerSpeed,
  playerPercentToSpeed,
  playerSpeedToPercent,
  MainScene,
} from './scenes/MainScene'
import type { TouchDirection } from './scenes/MainScene'
import { DialogueBox } from './dialogue/DialogueBox'
import { ChallengeModal } from './quests/ChallengeModal'
import { ArrayChallenge } from './challenge/ArrayChallenge'
import { QueueChallenge } from './challenge/QueueChallenge.tsx'
import { ArrayLesson } from './challenge/ArrayLesson'
import { QuizChallenge } from './challenge/QuizChallenge'
import { QuestTracker } from './quests/QuestTracker'
import { TouchControls } from './TouchControls'
import { SettingsModal } from './SettingsModal'
import { preloadGameAssets } from './preloadGameAssets'
import { getActiveMultiplayerRoom } from './multiplayer/realtime'
import { getMasterVolume, setMasterVolume, startAdventureMusic, stopAllMusic } from '../audio/music'
import './gameWorld.css'

// Warm the browser cache immediately when the game bundle is evaluated. The HomeScreen
// performs the same call, and preloadGameAssets() de-duplicates it with one shared promise.
void preloadGameAssets()

export function GameWorld({ isAdmin = false, isAuthenticated = false, onRequestLogin, playerName = 'Hero', onExitHome }: { isAdmin?: boolean; isAuthenticated?: boolean; onRequestLogin?: () => void; playerName?: string; onExitHome: () => void }) {
  const gameContainerRef = use¶»§q«^