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
    throw new Error('Online sign-in is not configured in this environment. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the project environment, then restart the dev server or redeploy.')
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
    throw new Error('The authentication service returned an incomplete session. Please try again.')
  }
  const session = withExpiry(result)
  saveSession(session)
  await saveProfile(session, String(session.user.user_metadata?.display_name ?? email.split('@')[0]))
  return session
}

function withExpiry(session: AuthSession): AuthSession {
  return {
    ...session,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
  }
}

async function saveProfile(session: AuthSession, displayName: string): Promise<void> {
  const { url, key } = getMultiplayerConfig()
  if (!url || !key) return
  try {
    await fetch(`${url.replace(/\/+$/, '')}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ id: session.user.id, display_name: displayName }),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    // Profile persistence is best-effort; successful authentication should not be blocked by it.
  }
}

export async function restoreSession(): Promise<AuthSession | null> {
  const stored = readStoredSession()
  if (!stored) return null
  if (stored.expires_at && stored.expires_at * 1000 > Date.now() + 60_000) return stored
  const { url, key } = getMultiplayerConfig()
  if (!url || !key) {
    clearSession()
    return null
  }
  try {
    const response = await fetch(`${url.replace(/\/+$/, '')}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: stored.refresh_token }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) {
      clearSession()
      return null
    }
    const refreshed = await response.json() as AuthSession
    if (!refreshed.access_token || !refreshed.refresh_token || !refreshed.user?.id) {
      clearSession()
      return null
    }
    const session = withExpiry(refreshed)
    saveSession(session)
    return session
  } catch {
    return stored
  }
}

export async function signOut(session: AuthSession | null): Promise<void> {
  const { url, key } = getMultiplayerConfig()
  try {
    if (session?.access_token && url && key) {
      await fetch(`${url.replace(/\/+$/, '')}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${session.access_token}` },
        signal: AbortSignal.timeout(8000),
      })
    }
  } finally {
    clearSession()
  }
}

export async function signInWithOAuth(provider: 'google' | 'discord'): Promise<void> {
  const { url, key } = getMultiplayerConfig()
  if (!url || !key) {
    throw new Error('Online sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.')
  }

  const redirectTo = window.location.origin + window.location.pathname
  const authorizeUrl = new URL(`${url.replace(/\/+$/, '')}/auth/v1/authorize`)
  authorizeUrl.searchParams.set('provider', provider)
  authorizeUrl.searchParams.set('redirect_to', redirectTo)
  authorizeUrl.searchParams.set('apikey', key)
  window.location.assign(authorizeUrl.toString())
}

export async function restoreOAuthSessionFromUrl(): Promise<AuthSession | null> {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (!accessToken || !refreshToken) return null
  const { url, key } = getMultiplayerConfig()
  if (!url || !key) return null
  try {
    const response = await fetch(`${url.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) return null
    const user = await response.json() as AuthSession['user']
    const session = withExpiry({ access_token: accessToken, refresh_token: refreshToken, user })
    saveSession(session)
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    return session
  } catch {
    return null
  }
}
