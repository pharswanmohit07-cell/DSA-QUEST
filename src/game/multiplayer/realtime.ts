export type MultiplayerPlayer = {
  id: string
  name: string
  joinedAt: number
}

export type MultiplayerGameState = {
  playerId: string
  name: string
  x: number
  y: number
  direction: 'down' | 'up' | 'left' | 'right'
  moving: boolean
  sentAt: number
}

export type MultiplayerChatMessage = {
  id: string
  playerId: string
  name: string
  text: string
  sentAt: number
}

type RealtimeCallbacks = {
  onPlayers: (players: MultiplayerPlayer[]) => void
  onMessage: (message: MultiplayerChatMessage) => void
  onStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'error', detail?: string) => void
}

type PresenceMeta = { id?: string; name?: string; joinedAt?: number }

const PLAYER_ID_KEY = 'dsa-quest-multiplayer-player-id'
const PLAYER_NAME_KEY = 'dsa-quest-multiplayer-player-name'
const MAX_CHAT_LENGTH = 240
const MAX_PLAYER_NAME_LENGTH = 20
const MAX_COORDINATE = 100_000
const MAX_PACKET_AGE_MS = 5 * 60 * 1000

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength
}

function isSafeTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) &&
    value > 0 && Math.abs(Date.now() - value) <= MAX_PACKET_AGE_MS
}

function cleanPlayerName(value: unknown): string {
  if (typeof value !== 'string') return 'Adventurer'
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_PLAYER_NAME_LENGTH)
  return clean || 'Adventurer'
}

function getPlayerId(): string {
  try {
    const existing = localStorage.getItem(PLAYER_ID_KEY)
    if (existing && existing.length <= 100) return existing
    const id = globalThis.crypto?.randomUUID?.() ?? `player-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem(PLAYER_ID_KEY, id)
    return id
  } catch {
    return `player-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }
}

export function getSavedPlayerName(): string {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function savePlayerName(name: string): void {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, cleanPlayerName(name))
  } catch {
    // The current session still works when storage is unavailable.
  }
}

export function getMultiplayerConfig() {
  const env = import.meta.env as ImportMetaEnv & {
    VITE_SUPABASE_URL?: string
    VITE_SUPABASE_ANON_KEY?: string
  }
  return {
    url: env.VITE_SUPABASE_URL?.trim() ?? '',
    key: env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
  }
}

let activeMultiplayerRoom: MultiplayerRoom | null = null

export function setActiveMultiplayerRoom(room: MultiplayerRoom | null): void {
  activeMultiplayerRoom = room
}

export function getActiveMultiplayerRoom(): MultiplayerRoom | null {
  return activeMultiplayerRoom
}

export class MultiplayerRoom {
  private socket: WebSocket | null = null
  private heartbeat: number | null = null
  private ref = 2
  private joined = false
  private closedByUser = false
  private readonly playerId = getPlayerId()
  private readonly presence = new Map<string, MultiplayerPlayer>()
  private readonly gameStateListeners = new Set<(state: MultiplayerGameState) => void>()
  private readonly latestGameStates = new Map<string, MultiplayerGameState>()

  private readonly roomCode: string
  private readonly playerName: string
  private readonly callbacks: RealtimeCallbacks

  constructor(roomCode: string, playerName: string, callbacks: RealtimeCallbacks) {
    this.roomCode = roomCode
    this.playerName = cleanPlayerName(playerName)
    this.callbacks = callbacks
  }

  connect(): void {
    const { url, key } = getMultiplayerConfig()
    if (!url || !key) {
      this.callbacks.onStatus('error', 'Online multiplayer is not configured in this environment. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the project environment, then restart the dev server or redeploy.')
      return
    }

    let socketUrl: URL
    try {
      socketUrl = new URL('/realtime/v1/websocket', url)
      if (socketUrl.protocol !== 'https:' && socketUrl.protocol !== 'http:') throw new Error('Unsupported protocol')
      socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:'
      socketUrl.searchParams.set('apikey', key)
      socketUrl.searchParams.set('vsn', '1.0.0')
    } catch {
      this.callbacks.onStatus('error', 'The Supabase project URL is invalid.')
      return
    }

    this.closedByUser = false
    this.callbacks.onStatus('connecting')
    try {
      this.socket = new WebSocket(socketUrl.toString())
    } catch {
      this.callbacks.onStatus('error', 'Could not open a realtime connection.')
      return
    }

    this.socket.addEventListener('open', () => {
      this.send('phx_join', {
        config: { broadcast: { ack: false, self: false }, presence: { enabled: true, key: this.playerId }, postgres_changes: [] },
        access_token: key,
      }, '1')
    })

    this.socket.addEventListener('message', (event: MessageEvent<string>) => {
      try {
        if (typeof event.data !== 'string' || event.data.length > 64_000) return
        this.handlePacket(JSON.parse(event.data) as Record<string, unknown>)
      } catch {
        // Ignore malformed frames from the realtime gateway.
      }
    })

    this.socket.addEventListener('close', () => {
      this.stopHeartbeat()
      this.joined = false
      if (!this.closedByUser) this.callbacks.onStatus('disconnected', 'Connection closed. Reconnect to rejoin the room.')
    })

    this.socket.addEventListener('error', () => {
      this.callbacks.onStatus('error', 'Realtime connection failed. Check your Supabase URL, key, and Realtime settings.')
    })
  }

  onGameState(listener: (state: MultiplayerGameState) => void): () => void {
    this.gameStateListeners.add(listener)
    for (const state of this.latestGameStates.values()) listener(state)
    return () => this.gameStateListeners.delete(listener)
  }

  sendGameState(state: Omit<MultiplayerGameState, 'playerId' | 'name' | 'sentAt'>): void {
    if (!this.joined || !Number.isFinite(state.x) || !Number.isFinite(state.y) ||
        Math.abs(state.x) > MAX_COORDINATE || Math.abs(state.y) > MAX_COORDINATE ||
        !['down', 'up', 'left', 'right'].includes(state.direction) || typeof state.moving !== 'boolean') return
    const message: MultiplayerGameState = {
      ...state,
      playerId: this.playerId,
      name: this.playerName,
      sentAt: Date.now(),
    }
    this.send('broadcast', { type: 'broadcast', event: 'player_state', payload: message })
  }

  sendChat(text: string): void {
    const clean = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, MAX_CHAT_LENGTH)
    if (!clean || !this.joined) return
    const message: MultiplayerChatMessage = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      playerId: this.playerId,
      name: this.playerName,
      text: clean,
      sentAt: Date.now(),
    }
    this.send('broadcast', { type: 'broadcast', event: 'chat', payload: message })
  }

  disconnect(): void {
    this.closedByUser = true
    this.stopHeartbeat()
    if (this.joined) {
      this.send('presence', { type: 'presence', event: 'untrack' })
    }
    this.joined = false
    this.socket?.close(1000, 'Leaving room')
    this.socket = null
    this.presence.clear()
    this.latestGameStates.clear()
    this.gameStateListeners.clear()
    this.callbacks.onPlayers([])
  }

  private send(event: string, payload: Record<string, unknown>, ref = String(this.ref++)): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    const joinRef = '1'
    this.socket.send(JSON.stringify({
      topic: `realtime:room:${this.roomCode}`,
      event,
      payload,
      ref,
      join_ref: joinRef,
    }))
  }

  private handlePacket(packet: Record<string, unknown>): void {
    const event = typeof packet.event === 'string' ? packet.event : ''
    const payload = packet.payload && typeof packet.payload === 'object'
      ? packet.payload as Record<string, unknown>
      : {}

    if (event === 'phx_reply') {
      const response = payload.response as Record<string, unknown> | undefined
      if (payload.status === 'ok' && response && !this.joined) {
        this.joined = true
        this.callbacks.onStatus('connected')
        this.send('presence', {
          type: 'presence',
          event: 'track',
          payload: { id: this.playerId, name: this.playerName, joinedAt: Date.now() },
        })
        this.heartbeat = window.setInterval(() => {
          if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(this.ref++) }))
          }
        }, 25_000)
      } else if (payload.status === 'error') {
        this.callbacks.onStatus('error', 'Supabase rejected the room connection. Check Realtime is enabled for public channels.')
      }
      return
    }

    if (event === 'presence_state') {
      this.presence.clear()
      this.readPresence(payload)
      this.emitPlayers()
      return
    }

    if (event === 'presence_diff') {
      const joins = payload.joins as Record<string, unknown> | undefined
      const leaves = payload.leaves as Record<string, unknown> | undefined
      if (joins) this.readPresence(joins)
      if (leaves) {
        for (const id of Object.keys(leaves)) this.presence.delete(id)
      }
      this.emitPlayers()
      return
    }

    if (event === 'broadcast') {
      const envelope = payload.payload && typeof payload.payload === 'object'
        ? payload.payload as Record<string, unknown>
        : null
      if (!envelope) return
      if (payload.event === 'chat') {
        const message = envelope
        if (!isNonEmptyString(message.id, 100) ||
            !isNonEmptyString(message.playerId, 100) ||
            !isNonEmptyString(message.text, MAX_CHAT_LENGTH) ||
            typeof message.name !== 'string' || message.name.length > MAX_PLAYER_NAME_LENGTH ||
            !isSafeTimestamp(message.sentAt)) return
        this.callbacks.onMessage({
          id: message.id,
          playerId: message.playerId,
          name: cleanPlayerName(message.name),
          text: message.text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ''),
          sentAt: message.sentAt,
        })
        return
      }
      if (payload.event === 'player_state') {
        const state = envelope
        if (!isNonEmptyString(state.playerId, 100) || state.playerId === this.playerId ||
            !Number.isFinite(state.x) || !Number.isFinite(state.y) ||
            Math.abs(state.x as number) > MAX_COORDINATE || Math.abs(state.y as number) > MAX_COORDINATE ||
            !['down', 'up', 'left', 'right'].includes(String(state.direction)) ||
            typeof state.moving !== 'boolean' || !isSafeTimestamp(state.sentAt) ||
            typeof state.name !== 'string' || state.name.length > MAX_PLAYER_NAME_LENGTH) return
        const safeState: MultiplayerGameState = {
          playerId: state.playerId,
          name: cleanPlayerName(state.name),
          x: state.x as number,
          y: state.y as number,
          direction: state.direction as MultiplayerGameState['direction'],
          moving: state.moving,
          sentAt: state.sentAt,
        }
        this.latestGameStates.set(safeState.playerId, safeState)
        for (const listener of this.gameStateListeners) listener(safeState)
      }
    }
  }

  private readPresence(state: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(state)) {
      const entry = value as { metas?: PresenceMeta[] }
      const meta = entry?.metas?.[0]
      if (!meta) continue
      const id = typeof meta.id === 'string' && meta.id.length <= 100 ? meta.id : key.slice(0, 100)
      if (!id || id.length > 100) continue
      this.presence.set(id, {
        id,
        name: cleanPlayerName(meta.name),
        joinedAt: typeof meta.joinedAt === 'number' && Number.isFinite(meta.joinedAt) ? meta.joinedAt : Date.now(),
      })
    }
  }

  private emitPlayers(): void {
    this.callbacks.onPlayers([...this.presence.values()].sort((a, b) => a.joinedAt - b.joinedAt))
  }

  private stopHeartbeat(): void {
    if (this.heartbeat !== null) window.clearInterval(this.heartbeat)
    this.heartbeat = null
  }
}
