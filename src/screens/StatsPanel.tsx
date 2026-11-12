import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { getCharacterId, isCharacterId, setCharacterId, type CharacterId } from '../game/player/characterAppearance'
import { CHARACTER_SKINS } from '../game/player/characterSkins'
import {
  getPlayerProfile,
  getStatsSnapshot,
  setPlayerName,
} from '../game/stats/playerStats'
import type { PlayerStats, TopicProgress, TopicStatus } from '../game/stats/playerStats'
import './statsPanel.css'

type StatsPanelProps = {
  isAdmin?: boolean
  guestMode?: boolean
  isAuthenticated?: boolean
  displayName?: string
  onRequestLogin?: () => void
  onClose: () => void
}

function topicLabel(status: TopicStatus): string {
  switch (status) {
    case 'done':
      return 'DONE'
    case 'in-progress':
      return 'IN PROGRESS'
    case 'not-started':
      return 'NOT STARTED'
    case 'coming-soon':
      return 'COMING SOON'
  }
}

function topicWidth(status: TopicStatus): number {
  if (status === 'done') return 100
  if (status === 'in-progress') return 50
  return 0
}

function TopicRow({ topic }: { topic: TopicProgress }) {
  const label = topicLabel(topic.status)
  return (
    <div className={`stats-topic-row ${topic.status === 'coming-soon' ? 'is-coming-soon' : ''}`}>
      <span className="stats-topic-name">{topic.name}</span>
      <div
        className="stats-topic-meter"
        role="progressbar"
        aria-label={`${top¶»§q«^