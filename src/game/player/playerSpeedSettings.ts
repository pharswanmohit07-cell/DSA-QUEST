export const PLAYER_SPEED_KEY = 'dsa-quest-player-speed-v5'
export const PLAYER_SPEED_MIN = 50
export const PLAYER_SPEED_MAX = 270

function clampPlayerSpeed(speed: number): number {
  return Math.max(PLAYER_SPEED_MIN, Math.min(PLAYER_SPEED_MAX, speed))
}

function clampPlayerSpeedPercent(percent: number): number {
  return Math.max(0, Math.min(100, percent))
}

export function playerPercentToSpeed(percent: number): number {
  const clampedPercent = clampPlayerSpeedPercent(percent)
  return Math.round(PLAYER_SPEED_MIN + ((PLAYER_SPEED_MAX - PLAYER_SPEED_MIN) * clampedPercent) / 100)
}

export const DEFAULT_PLAYER_SPEED = playerPercentToSpeed(40)

export function getStoredPlayerSpeed(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_PLAYER_SPEED
  }
  try {
    const storedValue = localStorage.getItem(PLAYER_SPEED_KEY)
    if (storedValue === null || storedValue.trim() === '') {
      return DEFAULT_PLAYER_SPEED
    }
    const stored = Number(storedValue)
    if (Number.isFinite(stored)) {
      return clampPlayerSpeed(stored)
    }
  } catch {
    // Fall back to the default when localStorage is unavailable.
  }
  return DEFAULT_PLAYER_SPEED
}

export function playerSpeedToPercent(speed: number): number {
  return Math.round(((clampPlayerSpeed(speed) - PLAYER_SPEED_MIN) / (PLAYER_SPEED_MAX - PLAYER_SPEED_MIN)) * 100)
}
