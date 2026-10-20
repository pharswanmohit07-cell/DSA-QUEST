export type MultiplayerDirection = 'down' | 'up' | 'left' | 'right'

export type MultiplayerPlayerState = {
  id: string
  name: string
  x: number
  y: number
  direction: MultiplayerDirection
  moving: boolean
  sentAt: number
}

type WireMessage =
  | { type: 'hello'; id: string; name: string }
  | { type: 'player-state'; id: string; name: string; x: number; y: number; direction: MultiplayerDirection; moving: boolean; sentAt: number }
  | { type: 'leave'; id: string }

const PLAYER_EVENT = 'dsaq:multiplayer-player'
const LEFT_EVENT = 'dsaq:multiplayer-left'
const LOCAL_EVENT = 'dsaq:multiplayer-local-state'
const STALE_AFTER_MS = 8_000

export class MultiplayerClient {
  private socket: WebSocket | null = null
  private heartbeat: number | null = null
  private stateTimer: number | null = null
  private staleTimer: number | null = null
  private ref = 0
  private joined = false
  private lastState: Omit<MultiplayerPlayerState, 'id' | 'name' | 'sentAt'> | null = null
  private readonly peers = new Map<string, { state: MultiplayerPlayerState; seenAt: number }>()

  private readonly url: string
  private readonly anonKey: string
  private readonly room: string
  private readonly id: string
  private readonly name: string
  private readonly onStatus: (status: 'connecting' | 'connected' | 'error' | 'disconnected', message?: string) => void

  constructor(
    url: string,
    anonKey: string,
    room: string,
    id: string,
    name: string,
    onStatus: (status: 'connecting' | 'connected' | 'error' | 'disconnected', message?: string) => void,
  ) {
    this.url = url
    this.anonKey = anonKey
    this.room = room
    this.id = id
    this.name = name
    this.onStatus = onStatus
  }

  connect() {
    if (this.socket) return
    let endpoint: URL
    try {
      endpoint = new URL(this.url)
      endpoint.protocol = endpoint.protocol === 'http:' ? 'ws:' : endpoint.protocol === 'https:' ? 'wss:' : endpoint.protocol
      endpoint.pathname = endpoint.pathname.replace(/\/$/, '') + '/realtime/v1/websocket'
      endpoint.searchParams.set('apikey', this.anonKey)
      endpoint.searchParams.set('vsn', '1.0.0')
    } catch {
      this.onStatus('error', 'The Supabase URL is invalid.')
      return
    }

    this.onStatus('connecting')
    const socket = new WebSocket(endpoint.toString())
    this.socket = socket
    socket.onopen = () => {
      const joinRef = String(++this.ref)
      this.sendFrame([joinRef, joinRef, this.topic, 'phx_join', {
        config: { broadcast: { ack: false, self: false }, presence: { key: this.id }, private: false },
        access_token: this.anonKey,
      }])
      this.heartbeat = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) this.sendFrame([null, String(++this.ref), 'phoenix', 'heartbeat', {}])
      }, 25_000)
    }
    socket.onmessage = (event) => this.handleMessage(event.data)
    socket.onerror = () => this.onStatus('error', 'Could not connect to the realtime server.')
    socket.onclose = () => this.cleanup('disconnected')
    this.stateTimer = window.setInterval(() => this.publishState(), 120)
    this.staleTimer = window.setInterval(() => this.removeStalePeers(), 2_000)
    window.addEventListener(LOCAL_EVENT, this.handleLocalState)
  }

  disconnect() {
    if (this.joined) this.broadcast({ type: 'leave', id: this.id })
    this.socket?.close(1000, 'Player left the room')
    this.cleanup('disconnected')
  }

  private get topic() {
    return `realtime:room:${this.room}`
  }

  private handleLocalState = (event: Event) => {
    const detail = (event as CustomEvent<Omit<MultiplayerPlayerState, 'id' | 'name' | 'sentAt'>>).detail
    if (!detail || !Number.isFinite(detail.x) || !Number.isFinite(detail.y)) return
    this.lastState = detail
  }

  private handleMessage(raw: unknown) {
    let frame: unknown
    try { frame = JSON.parse(String(raw)) } catch { return }
    if (!Array.isArray(frame) || frame.length < 5) return
    const [, , topic, event, payload] = frame as [unknown, unknown, string, string, Record<string, unknown>]
    if (topic !== this.topic) return
    if (event === 'phx_reply' && payload?.status === 'ok' && !this.joined) {
      this.joined = true
      this.onStatus('connected')
      this.broadcast({ type: 'hello', id: this.id, name: this.name })
      this.publishState()
      return
    }
    if (event !== 'broadcast') return
    const wire = payload?.payload as WireMessage | undefined
    if (!wire || typeof wire.id !== 'string' || wire.id === this.id) return
    if (wire.type === 'hello') {
      this.publishState()
      return
    }
    if (wire.type === 'leave') {
      this.removePeer(wire.id)
      return
    }
    if (wire.type === 'player-state' && Number.isFinite(wire.x) && Number.isFinite(wire.y)) {
      const state: MultiplayerPlayerState = {
        id: wire.id,
        name: typeof wire.name === 'string' ? wire.name.slice(0, 20) : 'Player',
        x: Math.max(0, Math.min(100_000, wire.x)),
        y: Math.max(0, Math.min(100_000, wire.y)),
        direction: ['down', 'up', 'left', 'right'].includes(wire.direction) ? wire.direction : 'down',
        moving: Boolean(wire.moving),
        sentAt: Date.now(),
      }
      this.peers.set(wire.id, { state, seenAt: Date.now() })
      window.dispatchEvent(new CustomEvent(PLAYER_EVENT, { detail: state }))
    }
  }

  private publishState() {
    if (!this.joined || !this.lastState) return
    this.broadcast({
      type: 'player-state',
      id: this.id,
      name: this.name,
      ...this.lastState,
      sentAt: Date.now(),
    })
  }

  private broadcast(payload: WireMessage) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.joined && payload.type !== 'hello') return
    this.sendFrame([null, String(++this.ref), this.topic, 'broadcast', { type: 'broadcast', event: payload.type, payload }])
  }

  private sendFrame(frame: unknown[]) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(frame))
  }

  private removeStalePeers() {
    const now = Date.now()
    for (const [id, peer] of this.peers) {
      if (now - peer.seenAt > STALE_AFTER_MS) this.removePeer(id)
    }
  }

  private removePeer(id: string) {
    this.peers.delete(id)
    window.dispatchEvent(new CustomEvent(LEFT_EVENT, { detail: { id } }))
  }

  private cleanup(status: 'disconnected') {
    if (this.heartbeat !== null) window.clearInterval(this.heartbeat)
    if (this.stateTimer !== null) window.clearInterval(this.stateTimer)
    if (this.staleTimer !== null) window.clearInterval(this.staleTimer)
    this.heartbeat = this.stateTimer = this.staleTimer = null
    window.removeEventListener(LOCAL_EVENT, this.handleLocalState)
    this.joined = false
    this.socket = null
    for (const id of this.peers.keys()) window.dispatchEvent(new CustomEvent(LEFT_EVENT, { detail: { id } }))
    this.peers.clear()
    this.onStatus(status)
  }
}
