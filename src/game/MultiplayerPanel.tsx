import { useEffect, useRef, useState } from 'react'
import { getPlayerProfile } from './stats/playerStats'
import { MultiplayerClient } from './MultiplayerClient'
import './multiplayer.css'

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'

function createPlayerId() {
  try {
    const key = 'dsa-quest-multiplayer-player-id'
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(key, id)
    return id
  } catch {
    return `player-${Math.random().toString(36).slice(2)}`
  }
}

function createRoomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
}

export function MultiplayerPanel() {
  const [expanded, setExpanded] = useState(false)
  const [room, setRoom] = useState(() => new URLSearchParams(window.location.search).get('room')?.toUpperCase().slice(0, 12) || '')
  const [name, setName] = useState(() => getPlayerProfile().name.slice(0, 20))
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [message, setMessage] = useState('')
  const [activeRoom, setActiveRoom] = useState('')
  const clientRef = useRef<MultiplayerClient | null>(null)

  useEffect(() => () => clientRef.current?.disconnect(), [])

  const joinRoom = () => {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
    if (!url || !key) {
      setStatus('error')
      setMessage('Multiplayer backend is not configured yet. Add the two Vercel environment variables listed in MULTIPLAYER_SETUP.md.')
      return
    }
    const cleanRoom = room.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12)
    const cleanName = name.trim().replace(/[<>]/g, '').slice(0, 20)
    if (!cleanRoom) {
      setMessage('Enter a room code or create a room.')
      return
    }
    if (!cleanName) {
      setMessage('Choose a player name first.')
      return
    }
    clientRef.current?.disconnect()
    setMessage('')
    setActiveRoom(cleanRoom)
    const client = new MultiplayerClient(url, key, cleanRoom, createPlayerId(), cleanName, (next, detail) => {
      setStatus(next)
      setMessage(detail || '')
    })
    clientRef.current = client
    client.connect()
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set('room', cleanRoom)
    window.history.replaceState({}, '', nextUrl)
  }

  const leaveRoom = () => {
    clientRef.current?.disconnect()
    clientRef.current = null
    setStatus('idle')
    setActiveRoom('')
    setMessage('You left the room.')
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.delete('room')
    window.history.replaceState({}, '', nextUrl)
  }

  const createRoom = () => {
    const code = createRoomCode()
    setRoom(code)
    window.setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('.multiplayer-room-input')
      input?.focus()
    }, 0)
  }

  return (
    <section className={`multiplayer-panel ${expanded ? 'is-expanded' : ''}`} aria-label="Multiplayer">
      <button type="button" className="multiplayer-toggle" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <span className={`multiplayer-status-dot status-${status}`} />
        <span>WORLD MULTIPLAYER</span>
        <b>{expanded ? '−' : '+'}</b>
      </button>
      {expanded && (
        <div className="multiplayer-content">
          <p className="multiplayer-subtitle">Meet your friends in the village.</p>
          <label>PLAYER NAME
            <input value={name} maxLength={20} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
          </label>
          <label>ROOM CODE
            <input className="multiplayer-room-input" value={room} maxLength={12} onChange={(event) => setRoom(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} placeholder="e.g. NINJA-42" />
          </label>
          {status === 'connected' ? (
            <>
              <div className="multiplayer-connected"><span>●</span> CONNECTED · {activeRoom}</div>
              <button type="button" className="multiplayer-action secondary" onClick={() => { navigator.clipboard?.writeText(new URL(window.location.href).toString()); setMessage('Room link copied if clipboard access is available.') }}>COPY INVITE LINK</button>
              <button type="button" className="multiplayer-action" onClick={leaveRoom}>LEAVE ROOM</button>
            </>
          ) : (
            <div className="multiplayer-actions">
              <button type="button" className="multiplayer-action secondary" onClick={createRoom}>CREATE ROOM</button>
              <button type="button" className="multiplayer-action" onClick={joinRoom} disabled={status === 'connecting'}>{status === 'connecting' ? 'CONNECTING…' : 'JOIN ROOM'}</button>
            </div>
          )}
          {message && <p className={`multiplayer-message ${status === 'error' ? 'is-error' : ''}`} role="status">{message}</p>}
          <p className="multiplayer-footnote">Share the same room code with friends. Everyone needs the multiplayer backend configured.</p>
        </div>
      )}
    </section>
  )
}
