import { useState, type FormEvent } from 'react'
import { signIn, signUp, signInWithOAuth } from './auth'
import './AuthModal.css'

type AuthModalProps = { onClose: () => void }
type AuthMode = 'login' | 'signup'

export function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (mode === 'signup') {
        const cleanName = name.trim().replace(/\s+/g, ' ')
        if (cleanName.length < 2) throw new Error('Choose a name with at least 2 characters.')
        if (cleanName.length > 16) throw new Error('Name must be 16 characters or fewer.')
        if (!/^[A-Za-z0-9 _-]+$/.test(cleanName)) throw new Error('Use letters, numbers, spaces, underscores, or hyphens only.')
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.')
        const session = await signUp(email.trim().toLowerCase(), password, cleanName)
        if (!session) {
          setPassword('')
          setNotice('Account created. Check your email for the confirmation link, then sign in.')
          setMode('login')
          return
        }
      } else {
        await signIn(email.trim().toLowerCase(), password)
      }
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not authenticate. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const socialSignIn = async (provider: 'google' | 'discord') => {
    setError('')
    setNotice('')
    try {
      await signInWithOAuth(provider)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start social sign-in.')
    }
  }

  return (
    <div className="dq-auth-backdrop" role="presentation">
      <section className="dq-auth-modal" role="dialog" aria-modal="true" aria-labelledby="dq-auth-title">
        <div className="dq-auth-brand">
          <span className="dq-auth-mark" aria-hidden="true">⟠</span>
          <div><strong>DSA <span>QUEST</span></strong><small>PRACTICE · IMPROVE · ACHIEVE</small></div>
        </div>
        <h1 id="dq-auth-title">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="dq-auth-subtitle">{mode === 'login' ? 'Log in to begin your adventure.' : 'Create an account to begin your journey.'}</p>
        <div className="dq-auth-tabs" role="tablist" aria-label="Authentication mode">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => { setMode('login'); setError(''); setNotice('') }}>Log in</button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'is-active' : ''} onClick={() => { setMode('signup'); setError(''); setNotice('') }}>Sign up</button>
        </div>
        <form className="dq-auth-form" onSubmit={(event) => void submit(event)}>
          {mode === 'signup' && (
            <label>
              <span>Adventurer name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="nickname" minLength={2} maxLength={16} required placeholder="e.g. AlgoNinja" />
            </label>
          )}
          <label>
            <span>Email address</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="you@example.com" />
          </label>
          <label>
            <span>Password</span>
            <span className="dq-auth-password">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} required placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
            </span>
          </label>
          {error && <p className="dq-auth-message is-error" role="alert">{error}</p>}
          {notice && <p className="dq-auth-message is-notice" role="status">{notice}</p>}
          <button className="dq-auth-primary" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'} <span aria-hidden="true">→</span></button>
        </form>
        <div className="dq-auth-or"><span>or continue with</span></div>
        <div className="dq-auth-socials">
          <button type="button" onClick={() => void socialSignIn('google')}><span className="dq-google-g" aria-hidden="true">G</span> Google</button>
          <button type="button" onClick={() => void socialSignIn('discord')}><span className="dq-discord-icon" aria-hidden="true">◈</span> Discord</button>
        </div>
        <p className="dq-auth-privacy">Sign in to access DSA Quest. Your session stays on this browser.</p>
      </section>
    </div>
  )
}
