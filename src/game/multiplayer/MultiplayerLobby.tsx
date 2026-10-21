import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  getMultiplayerConfig,
  getSavedPlayerName,
  MultiplayerRoom,
  getActiveMultiplayerRoom,
  setActiveMultiplayerRoom,
  savePlayerName,
  type MultiplayerChatMessage,
  type MultiplayerPlayer,
} from './realtime'
import './multiplayer.css'

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

function makeRoomCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

export function MultiplayerLobby({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  const [name, setName] = useState(() => getSavedPlayerName())
  const [roomInput, setRoomInput] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [statusDetail, setStatusDetail] = useState('')
  const [players, setPlayers] = useState<MultiplayerPlayer[]>([])
  const [messages, setMessages] = useState<MultiplayerChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [copied, setCopied] = useState(false)
  const roomRef = useRef<MultiplayerRoom | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const configured = Boolean(getMultiplayerConfig().url && getMultiplayerConfig().key)

  useEffect(() => () => {
    const room = roomRef.current
    if (room && getActiveMultiplayerRoom() !== room) room.disconnect()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const joinRoom = (code: string) => {
    const safeName = name.trim().replace(/\s+/g, ' ').slice(0, 20)
    const safeCode = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12)
    if (!safeName || safeName.length < 2 || !safeCode) {
      setStatusDetail('Enter a name (at least 2 characters) and a valid room code.')
      return
    }
    roomRef.current?.disconnect()
    savePlayerName(safeName)
    setName(safeName)
    setMessages([])
    setPlayers([])
    setRoomCode(safeCode)
    setStatus('connecting')
    setStatusDetail('')
    const room = new MultiplayerRoom(safeCode, safeName, {
      onPlayers: setPlayers,
      onMessage: (message) => setMessages((current) => [...current, message].slice(-100)),
      onStatus: (next, detail) => {
        setStatus(next)
        setStatusDetail(detail ?? '')
      },
    })
    roomRef.current = room
    room.connect()
  }

  const handleCreate = () => joinRoom(makeRoomCode())

  const handleJoin = (event: FormEvent) => {
    event.preventDefault()
    joinRoom(roomInput)
  }

  const sendMessage = (event: FormEvent) => {
    event.preventDefault()
    const text = chatInput.trim()
    if (!text || status !== 'connected') return
    roomRef.current?.sendChat(text)
    setMessages((current) => [...current, {
      id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
      playerId: 'self-pending',
      name: name.trim(),
      text: text.slice(0, 240),
      sentAt: Date.now(),
    }].slice(-100))
    setChatInput('')
  }

  const copyInvite = async () => {
    const invite = `${window.location.origin}?room=${roomCode}`
    try {
      await navigator.clipboard.writeText(invite)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setStatusDetail(`Share this room code with your friend: ${roomCode}`)
    }
  }

  const leaveRoom = () => {
    setActiveMultiplayerRoom(null)
    roomRef.current?.disconnect()
    roomRef.current = null
    setStatus('idle')
    setRoomCode('')
    setPlayers([])
    setMessages([])
  }

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('room')
    if (code) {
      setRoomInput(code.toUpperCase())
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  return (
    <main className="multiplayer-screen">
      <div className="multiplayer-stars" aria-hidden="true" />
      <header className="multiplayer-header">
        <button className="multi-back" onClick={onBack} type="button">← MAIN MENU</button>
        <div className="multi-brand"><span className="multi-brand-icon">✦</span><span>DSA QUEST <b>ONLINE</b></span></div>
        <div className={`multi-status status-${status}`}><i />{status === 'connected' ? 'ONLINE' : status.toUpperCase()}</div>
      </header>

      <section className="multi-hero">
        <div className="multi-eyebrow">✧ YOUR NEXT ADVENTURE IS BETTER TOGETHER ✧</div>
        <h1>FIND YOUR <em>PARTY.</em></h1>
        <p>Meet fellow adventurers, share strategies, and explore the path to becoming a DSA master.</p>
      </section>

      <div className="multi-layout">
        <section className="multi-card multi-room-card">
          <div className="multi-card-heading"><span>01 / PARTY SETUP</span><span className="multi-heading-mark">✦</span></div>
          <label className="multi-label" htmlFor="multi-name">YOUR ADVENTURER NAME</label>
          <input id="multi-name" className="multi-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={20} placeholder="e.g. AlgoNinja" autoComplete="nickname" />
          {!roomCode ? (
            <>
              <button className="multi-primary" type="button" onClick={handleCreate} disabled={!configured}>✦ CREATE A PARTY <span>↗</span></button>
              <div className="multi-divider"><span>OR JOIN FRIENDS</span></div>
              <form className="multi-join-form" onSubmit={handleJoin}>
                <label className="multi-label" htmlFor="multi-room">PARTY CODE</label>
                <div className="multi-join-row">
                  <input id="multi-room" className="multi-input" value={roomInput} onChange={(event) => setRoomInput(event.target.value.toUpperCase())} maxLength={12} placeholder="ABCDE" autoComplete="off" />
                  <button className="multi-join-button" type="submit" disabled={!configured}>JOIN →</button>
                </div>
              </form>
              {!configured && <p className="multi-config-note">Multiplayer is nearly ready. Add your Supabase project URL and anon key to Vercel to enable online rooms.</p>}
            </>
          ) : (
            <div className="multi-room-active">
              <span className="multi-label">YOUR PARTY CODE</span>
              <div className="multi-room-code">{roomCode}</div>
              <button className="multi-secondary" type="button" onClick={() => void copyInvite()}>{copied ? '✓ INVITE LINK COPIED' : '↗ COPY INVITE LINK'}</button>
              <button className="multi-text-button" type="button" onClick={leaveRoom}>LEAVE PARTY</button>
              <button className="multi-primary" type="button" onClick={() => { setActiveMultiplayerRoom(roomRef.current); onPlay() }}>ENTER THE VILLAGE <span>→</span></button>
            </div>
          )}
          {statusDetail && <p className={`multi-status-detail ${status === 'error' ? 'is-error' : ''}`} role="status">{statusDetail}</p>}
        </section>

        <section className="multi-card multi-party-card">
          <div className="multi-card-heading"><span>02 / PARTY MEMBERS</span><span className="multi-count">{players.length} ONLINE</span></div>
          {status === 'connected' ? (
            <div className="multi-player-list">
              {players.map((player, index) => (
                <div className="multi-player" key={player.id}>
                  <div className={`multi-avatar avatar-${index % 5}`}>{player.name.slice(0, 1).toUpperCase()}</div>
                  <div className="multi-player-copy"><strong>{player.name}{player.name === name ? ' (YOU)' : ''}</strong><span>Village adventurer</span></div>
                  <span className="multi-online-dot" />
                </div>
              ))}
              {players.length === 0 && <div className="multi-empty">Waiting for adventurers to join…</div>}
            </div>
          ) : (
            <div className="multi-empty multi-empty-tall"><div className="multi-empty-icon">♙</div><strong>Your party awaits</strong><span>Create a party or enter a friend's code to see who's online.</span></div>
          )}
          <div className="multi-chat-heading"><span>03 / PARTY CHAT</span><span>LIVE</span></div>
          <div className="multi-chat-log" aria-live="polite">
            {messages.length === 0 && <div className="multi-chat-empty">Say hello when your party connects.</div>}
            {messages.map((message) => (
              <div className={`multi-chat-message ${message.playerId === 'self-pending' ? 'is-self' : ''}`} key={message.id}>
                <div><strong>{message.name}</strong><time>{new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>
                <p>{message.text}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form className="multi-chat-form" onSubmit={sendMessage}>
            <input className="multi-input" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={status === 'connected' ? 'Message your party…' : 'Join a party to chat'} maxLength={240} disabled={status !== 'connected'} aria-label="Party chat message" />
            <button type="submit" disabled={status !== 'connected' || !chatInput.trim()} aria-label="Send message">↑</button>
          </form>
        </section>
      </div>
      <footer className="multi-footer"><span>DSA QUEST / MULTIPLAYER PROTOTYPE</span><span>BUILT FOR THE CURIOUS ✦</span></footer>
    </main>
  )
}
