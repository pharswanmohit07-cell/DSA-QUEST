import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { MultiplayerLobby } from './MultiplayerLobby'
import {
  clearSession,
  restoreSession,
  signIn,
  signOut,
  signUp,
  type AuthSession,
} from './auth'
import { getActiveMultiplayerRoom, getMultiplayerConfig, savePlayerName, setActiveMultiplayerRoom } from './realtime'
import { AccountActionsProvider } from './AccountActionsContext'
import { setPlayerName, validatePlayerName } from '../stats/playerStats'
import './auth.css'

type AuthMode = 'signup' | 'signin'

/**
 * Keep the authenticated account identity and the game's local hero profile in
 * sync. MainScene reads playerStats for the sprite label, while realtime chat
 * and the party roster read the saved multiplayer name.
 */
function syncAuthenticatedPlayerName(displayName: string, email?: string): string {
  const cleanDisplayName = displayName.trim().replace(/\s+/g, ' ')
  const emailName = (email ?? '').split('@')[0] ?? ''
  const candidates = [
    cleanDisplayName,
    cleanDisplayName.replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 16).trim(),
    emailName.replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 16).trim(),
    'Adventurer',
  ]

  for (const candidate of candidates) {
    const normalized = candidate.replace(/\s+/g, ' ').slice(0, 16).trim()
    if (normalized.length < 2) continue
    const result = setPlayerName(normalized)
    if (result.ok) {
      savePlayerName(result.profile.name)
      return result.profile.name
    }
  }

  // The fixed fallback passes the same validator; this branch is defensive.
  savePlayerName('Adventurer')
  return 'Adventurer'
}

type MultiplayerAuthGateProps = {
  onBack: () => void
  onPlay: () => void
  children?: ReactNode
}

function AuthShowcase() {
  return (
    <aside className="multi-auth-showcase" aria-label="DSA Quest adventure">
      <div className="multi-auth-brand">
        <span className="multi-auth-brand-mark" aria-hidden="true">✦</span>
        <span>DSA QUEST</span>
        <span className="multi-auth-brand-tag">ADVENTURE / LEARNING</span>
      </div>

      <div className="multi-auth-showcase-copy">
        <p className="multi-auth-kicker">YOUR JOURNEY STARTS HERE</p>
        <h2>THINK SHARP.<br /><em>PLAY SMART.</em></h2>
        <p>Explore a living village, solve algorithm challenges, and grow into the adventurer you were meant to be.</p>
      </div>

      <div className="multi-auth-pixel-scene" aria-hidden="true">
        <span className="auth-scene-sun" />
        <span className="auth-scene-mountain auth-scene-mountain-back" />
        <span className="auth-scene-mountain auth-scene-mountain-front" />
        <span className="auth-scene-tower" />
        <span className="auth-scene-roof" />
        <span className="auth-scene-ground" />
        <span className="auth-scene-path" />
        <span className="auth-scene-spark auth-scene-spark-one">✦</span>
        <span className="auth-scene-spark auth-scene-spark-two">✧</span>
      </div>

      <div className="multi-auth-showcase-footer">
        <span>01 / EXPLORE</span><i />
        <span>02 / SOLVE</span><i />
        <span>03 / EVOLVE</span>
      </div>
    </aside>
  )
}

export function MultiplayerAuthGate({ onBack, onPlay, children }: MultiplayerAuthGateProps) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [checking, setChecking] = useState(true)
  const [mode, setMode] = useState<AuthMode>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const configured = Boolean(getMultiplayerConfig().url && getMultiplayerConfig().key)

  useEffect(() => {
    let active = true
    void restoreSession().then((restored) => {
      if (!active) return
      setSession(restored)
      if (restored) {
        const savedName = String(restored.user.user_metadata?.display_name ?? '').trim()
        syncAuthenticatedPlayerName(savedName, restored.user.email)
      }
    }).finally(() => {
      if (active) setChecking(false)
    })
    return () => { active = false }
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const cleanEmail = email.trim().toLowerCase()
      if (mode === 'signup') {
        const cleanName = name.trim().replace(/\s+/g, ' ')
        if (cleanName.length < 2) throw new Error('Your adventurer name must be at least 2 characters.')
        const nameValidation = validatePlayerName(cleanName)
        if (!nameValidation.valid) throw new Error(nameValidation.error)
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.')
        const created = await signUp(cleanEmail, password, cleanName)
        if (!created) {
          setNotice('Account created. Check your email for the confirmation link, then return here and sign in.')
          setMode('signin')
          setPassword('')
          return
        }
        syncAuthenticatedPlayerName(cleanName, created.user.email ?? cleanEmail)
        setSession(created)
        setNotice('')
      } else {
        const signedIn = await signIn(cleanEmail, password)
        setSession(signedIn)
        const savedName = String(signedIn.user.user_metadata?.display_name ?? '').trim()
        syncAuthenticatedPlayerName(savedName, signedIn.user.email ?? cleanEmail)
      }
      setPassword('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not authenticate. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    setBusy(true)
    try {
      const activeRoom = getActiveMultiplayerRoom()
      setActiveMultiplayerRoom(null)
      activeRoom?.disconnect()
      await signOut(session)
    } finally {
      clearSession()
      setSession(null)
      setPassword('')
      setNotice('You have been logged out. Sign in again to continue.')
      setMode('signin')
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <main className="multi-auth-screen">
        <div className="multi-auth-shell">
          <AuthShowcase />
          <section className="multi-auth-card multi-auth-card-loading" aria-live="polite">
            <span className="multi-auth-loader" aria-hidden="true" />
            <p className="multi-auth-eyebrow">ADVENTURER ACCESS</p>
            <h1>RESTORING YOUR SESSION</h1>
            <p className="multi-auth-intro">Checking your account so you can pick up where you left off.</p>
          </section>
        </div>
      </main>
    )
  }

  if (session) {
    const displayName = String(session.user.user_metadata?.display_name ?? session.user.email ?? 'Adventurer')
    return (
      <AccountActionsProvider value={{ displayName, isAdmin: String(session.user.email ?? '').toLowerCase() === 'admin@dsaquest.com', isLoggingOut: busy, logout }}>
        <div className="multi-authenticated-app">
          <div className="multi-authenticated-content">
            {children ?? <MultiplayerLobby onBack={onBack} onPlay={onPlay} />}
          </div>
        </div>
      </AccountActionsProvider>
    )
  }

  return (
    <main className="multi-auth-screen">
      <div className="multi-auth-shell">
        <AuthShowcase />
        <section className="multi-auth-card">
          <div className="multi-auth-form-top">
            <p className="multi-auth-eyebrow">ADVENTURER ACCESS</p>
            <span className="multi-auth-step">01 / ACCOUNT</span>
          </div>
          <h1>{mode === 'signup' ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</h1>
          <p className="multi-auth-intro">
            {mode === 'signup'
              ? 'Build your identity. Begin your quest.'
              : 'Your next adventure is right where you left it.'}
          </p>

          {!configured && (
            <div className="multi-auth-config-warning" role="alert">
              <strong>ONLINE ACCESS IS NOT CONFIGURED</strong>
              <span>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Vercel project to enable sign-in and registration.</span>
            </div>
          )}

          <div className="multi-auth-tabs" role="tablist" aria-label="Account access">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => { setMode('signup'); setError(''); setNotice('') }}
            >
              CREATE ACCOUNT
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              className={mode === 'signin' ? 'active' : ''}
              onClick={() => { setMode('signin'); setError(''); setNotice('') }}
            >
              SIGN IN
            </button>
          </div>

          <form onSubmit={(event) => void submit(event)}>
            {mode === 'signup' && (
              <>
                <label htmlFor="auth-name">ADVENTURER NAME</label>
                <input
                  id="auth-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={16}
                  minLength={2}
                  pattern="[A-Za-z0-9 _-]+"
                  autoComplete="nickname"
                  required
                  placeholder="e.g. AlgoNinja"
                />
              </>
            )}
            <label htmlFor="auth-email">EMAIL ADDRESS</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
            <label htmlFor="auth-password">PASSWORD</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={8}
              required
              placeholder="At least 8 characters"
            />
            <button className="multi-auth-submit" type="submit" disabled={!configured || busy}>
              <span>{busy ? 'PLEASE WAIT…' : mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>

          {error && <p className="multi-auth-error" role="alert">{error}</p>}
          {notice && <p className="multi-auth-notice" role="status">{notice}</p>}
          <div className="multi-auth-divider"><span>YOUR JOURNEY, YOUR PROGRESS</span></div>
          <p className="multi-auth-security">Your password is managed securely by Supabase Auth. DSA Quest never stores it as plain text.</p>
        </section>
        <footer className="multi-auth-page-footer">
          <span>DSA QUEST / A PIXEL ADVENTURE IN ALGORITHMS</span>
          <span>BUILT FOR THE CURIOUS <b>✦</b></span>
        </footer>
      </div>
    </main>
  )
}
