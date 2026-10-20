import { useEffect, useState, type FormEvent } from 'react'
import { MultiplayerLobby } from './MultiplayerLobby'
import {
  clearSession,
  restoreSession,
  signIn,
  signOut,
  signUp,
  type AuthSession,
} from './auth'
import { getMultiplayerConfig, savePlayerName } from './realtime'
import './auth.css'

type AuthMode = 'signup' | 'signin'

export function MultiplayerAuthGate({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
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
        if (savedName) savePlayerName(savedName)
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
        if (cleanName.length < 2 || cleanName.length > 20) throw new Error('Your display name must be 2–20 characters.')
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.')
        const created = await signUp(cleanEmail, password, cleanName)
        if (!created) {
          setNotice('Account created. Check your email for the confirmation link, then return here and sign in.')
          setMode('signin')
          setPassword('')
          return
        }
        savePlayerName(cleanName)
        setSession(created)
        setNotice('')
      } else {
        const signedIn = await signIn(cleanEmail, password)
        setSession(signedIn)
        const savedName = String(signedIn.user.user_metadata?.display_name ?? '').trim()
        if (savedName) savePlayerName(savedName)
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

  if (checking) return <main className="multi-auth-screen"><div className="multi-auth-card">Restoring your session…</div></main>

  if (session) {
    return (
      <>
        <div className="multi-auth-sessionbar">
          <span>Signed in as <strong>{String(session.user.user_metadata?.display_name ?? session.user.email ?? 'Adventurer')}</strong></span>
          <button type="button" onClick={() => void logout()} disabled={busy}>LOG OUT</button>
        </div>
        <MultiplayerLobby onBack={onBack} onPlay={onPlay} />
      </>
    )
  }

  return (
    <main className="multi-auth-screen">
      <section className="multi-auth-card">
        <button className="multi-auth-back" type="button" onClick={onBack}>← MAIN MENU</button>
        <div className="multi-auth-eyebrow">DSA QUEST · ONLINE ACCOUNT</div>
        <h1>{mode === 'signup' ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</h1>
        <p className="multi-auth-intro">Your account keeps your adventurer identity with you.</p>
        {!configured && <p className="multi-auth-error">Online accounts are not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.</p>}
        <div className="multi-auth-tabs">
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); setNotice('') }}>CREATE ACCOUNT</button>
          <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); setNotice('') }}>SIGN IN</button>
        </div>
        <form onSubmit={(event) => void submit(event)}>
          {mode === 'signup' && <>
            <label htmlFor="auth-name">DISPLAY NAME</label>
            <input id="auth-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={20} minLength={2} autoComplete="nickname" required placeholder="AlgoNinja" />
          </>}
          <label htmlFor="auth-email">EMAIL</label>
          <input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="you@example.com" />
          <label htmlFor="auth-password">PASSWORD</label>
          <input id="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required placeholder="At least 8 characters" />
          <button className="multi-auth-submit" type="submit" disabled={!configured || busy}>{busy ? 'PLEASE WAIT…' : mode === 'signup' ? 'CREATE ACCOUNT →' : 'SIGN IN →'}</button>
        </form>
        {error && <p className="multi-auth-error" role="alert">{error}</p>}
        {notice && <p className="multi-auth-notice" role="status">{notice}</p>}
        <p className="multi-auth-security">Passwords are handled by Supabase Auth and are never stored as plain text by DSA Quest.</p>
      </section>
    </main>
  )
}
