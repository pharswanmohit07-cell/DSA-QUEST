import { getMultiplayerConfig } from './realtime'

export type AuthSession = {
  access_token: string
  refresh_token: string
  expires_at?: number
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
}

const SESSION_KEY = 'dsa-quest-auth-session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

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
  const { url, key } = getMultiplayerConfig()
  if (!url || !key) {
    throw new Error('Online access is not configured. Set the Supabase URL and anon key in Vercel.')
  }

  let response: Response
  try {
    response = await fetch(authUrl(path), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error('The authentication service took too long to respond. Please try again.')
    }
    throw new Error('Could not reach the authentication service. Check your connection and retry.')
  }

  let result: (AuthSession & { msg?: string; message?: string; error_description?: string; error?: string }) | null = null
  try {
    result = await response.json() as AuthSession & {
      msg?: string
      message?: string
      error_description?: string
      error?: string
    }
  } catch {
    // Proxies and transient service errors sometimes return an empty or non-JSON body.
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Too many sign-in attempts. Wait a moment before trying again.')
    }
    throw new Error(result?.msg ?? result?.message ?? result?.error_description ?? result?.error ??
      `Authentication failed (HTTP ${response.status}). Please try again.`)
  }
  if (!result) throw new Error('The authentication service returned an unreadable response. Please try again.')
  return result
}

function cookieOptions(maxAge: number): string {
  return `Path=/; Max-Age=${maxAge}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
}

export function readStoredSession(): AuthSession | null {
  try {
    const cookie = document.cookie.split('; ').find((part) => part.startsWith(`${SESSION_KEY}=`))
    if (cookie) {
      const session = JSON.parse(decodeURIComponent(cookie.slice(SESSION_KEY.length + 1))) as AuthSession
      if (!session?.access_token || !session?.refresh_token || !session?.user?.id) {
        clearSession()
        return null
      }
      return session
    }

    // Migrate an existing browser session from the old localStorage-based build.
    const legacy = localStorage.getItem(SESSION_KEY)
    if (!legacy) return null
    const session = JSON.parse(legacy) as AuthSession
    if (!session?.access_token || !session?.refresh_token || !session?.user?.id) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    saveSession(session)
    localStorage.removeItem(SESSION_KEY)
    return session
  } catch {
    return null
  }
}

export function saveSession(session: AuthSession): void {
  try {
    document.cookie = `${SESSION_KEY}=${encodeURIComponent(JSON.stringify(session))}; ${cookieOptions(SESSION_MAX_AGE)}`
    try { localStorage.removeItem(SESSION_KEY) } catch { /* Ignore legacy storage restrictions. */ }
  } catch {
    // Browser cookie restrictions may prevent persistence; the current page can still finish auth.
  }
}

export function clearSession(): void {
  try {
    document.cookie = `${SESSION_KEY}=; ${cookieOptions(0)}`
    try { localStorage.removeItem(SESSION_KEY) } catch { /* Ignore storage restrictions. */ }
  } catch {
    // Ignore browser storage restrictions.
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
    if (!user?.id) {
      clearSession()
      return null
    }
    const restored = { ...session, user }
    saveSession(restored)
    return restored
  } catch {
    // Do not silently convert a failed refresh/network check into an authenticated UI state.
    return null
  }
}

export async function signInWithOAuth(provider: 'google' | 'discord'): Promise<void> {
  const { url, key } = getMultiplayerConfig()
  if (!url || !key) throw new Error('Online access is not configured. Set the Supabase URL and anon key in Vercel.')
  const redirectTo = window.location.origin + window.location.pathname
  const baseUrl = url.replace(/\/+$/, '')
  const authorizeUrl = new URL(`${baseUrl}/auth/v1/authorize`)
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
  // OAuth tokens arrive in the fragment. Remove them from browser history immediately,
  // before any network request can fail or another script can inspect the current URL.
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
  if (!accessToken || !refreshToken) return null

  const expiresIn = Number(params.get('expires_in') ?? '3600')
  const response = await fetch(authUrl('user'), { headers: headers(accessToken) })
  if (!response.ok) throw new Error('Social sign-in succeeded, but the user session could not be loaded.')
  const user = await response.json() as AuthSession['user']
  if (!user?.id) throw new Error('Social sign-in returned an invalid user session.')
  const session: AuthSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600),
    user,
  }
  saveSession(session)
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
