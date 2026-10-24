import { getMultiplayerConfig } from './realtime'

export type AuthSession = {
  access_token: string
  refresh_token: string
  expires_at?: number
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
}

const SESSION_KEY = 'dsa-quest-auth-session'

function authUrl(path: string): string {
  const { url } = getMultiplayerConfig()
  return `${url.replace(/\/+$/, '')}/auth/v1/${path}`
}

function headers(accessToken?: string): Record<string, string> {
  const { key } = getMultiplayerConfig()
  return {
    apikey: key,
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }
}

async function requestSession(path: string, body: Record<string, unknown>): Promise<AuthSession> {
  const response = await fetch(authUrl(path), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  const result = await response.json() as AuthSession & { msg?: string; message?: string; error_description?: string }
  if (!response.ok) {
    throw new Error(result.msg ?? result.message ?? result.error_description ?? 'Authentication failed. Please try again.')
  }
  return result
}

export function readStoredSession(): AuthSession | null {
  try {
    const value = localStorage.getItem(SESSION_KEY)
    return value ? JSON.parse(value) as AuthSession : null
  } catch {
    return null
  }
}

export function saveSession(session: AuthSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Session remains available in memory for this page load.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore storage restrictions.
  }
}

export async function signUp(email: string, password: string, displayName: string): Promise<AuthSession | null> {
  const result = await requestSession('signup', {
    email,
    password,
    data: { display_name: displayName },
  })
  if (!result.access_token || !result.refresh_token || !result.user?.id) return null
  const session = withExpiry(result)
  saveSession(session)
  await saveProfile(session, displayName)
  return session
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const result = await requestSession('token?grant_type=password', { email, password })
  if (!result.access_token || !result.refresh_token || !result.user?.id) {
    throw new Error('The authentication service did not return a valid session.')
  }
  const session = withExpiry(result)
  saveSession(session)
  const name = String(session.user.user_metadata?.display_name ?? '').trim()
  if (name) await saveProfile(session, name)
  return session
}

export async function restoreSession(): Promise<AuthSession | null> {
  const stored = readStoredSession()
  if (!stored?.refresh_token) return null
  try {
    let session = stored
    if (stored.expires_at && stored.expires_at < Math.floor(Date.now() / 1000) + 30) {
      const refreshed = await requestSession('token?grant_type=refresh_token', { refresh_token: stored.refresh_token })
      if (!refreshed.access_token || !refreshed.refresh_token || !refreshed.user?.id) {
        clearSession()
        return null
      }
      session = withExpiry(refreshed)
      saveSession(session)
    }
    const response = await fetch(authUrl('user'), { headers: headers(session.access_token) })
    if (!response.ok) {
      clearSession()
      return null
    }
    const user = await response.json() as AuthSession['user']
    return { ...session, user }
  } catch {
    // Keep a still-valid stored session if the network is temporarily unavailable.
    return stored.expires_at && stored.expires_at > Math.floor(Date.now() / 1000) ? stored : null
  }
}

export async function signInWithOAuth(provider: 'google' | 'discord'): Promise<void> {
  const { url, key } = getMultiplayerConfig()
  if (!url || !key) throw new Error('Online access is not configured. Set the Supabase URL and anon key in Vercel.')
  const redirectTo = window.location.origin + window.location.pathname
  const authorizeUrl = new URL(`${url.replace(/\\/+$/, '')}/auth/v1/authorize`)
  authorizeUrl.searchParams.set('provider', provider)
  authorizeUrl.searchParams.set('redirect_to', redirectTo)
  authorizeUrl.searchParams.set('apikey', key)
  window.location.assign(authorizeUrl.toString())
}

export async function restoreOAuthSessionFromUrl(): Promise<AuthSession | null> {
  const hash = window.location.hash
  if (!hash || !hash.includes('access_token=')) return null
  const params = new URLSearchParams(hash.slice(1))
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (!accessToken || !refreshToken) return null
  const expiresIn = Number(params.get('expires_in') ?? '3600')
  const { url } = getMultiplayerConfig()
  const response = await fetch(authUrl('user'), { headers: headers(accessToken) })
  if (!response.ok) throw new Error('Social sign-in succeeded, but the user session could not be loaded.')
  const user = await response.json() as AuthSession['user']
  const session: AuthSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + (Number.isFinite(expiresIn) ? expiresIn : 3600),
    user,
  }
  saveSession(session)
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
  const displayName = String(user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Adventurer').trim().slice(0, 16)
  if (displayName.length >= 2) {
    try { await saveProfile(session, displayName) } catch { /* Auth session remains usable if profile sync is temporarily unavailable. */ }
  }
  return session
}

export async function signOut(session: AuthSession | null): Promise<void> {
  try {
    if (session?.access_token) {
      await fetch(authUrl('logout'), { method: 'POST', headers: headers(session.access_token) })
    }
  } finally {
    clearSession()
  }
}

async function saveProfile(session: AuthSession, displayName: string): Promise<void> {
  const { url } = getMultiplayerConfig()
  const response = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/player_profiles?on_conflict=id`, {
    method: 'POST',
    headers: {
      ...headers(session.access_token),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      id: session.user.id,
      display_name: displayName.trim().replace(/\s+/g, ' ').slice(0, 20),
      updated_at: new Date().toISOString(),
    }),
  })
  if (!response.ok) {
    throw new Error('Your account is signed in, but the player profile could not be saved. Please try again.')
  }
}

function withExpiry(session: AuthSession & { expires_in?: number }): AuthSession {
  return {
    ...session,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
  }
}
