import { useEffect, useState } from 'react'
import { readStoredSession } from './auth'
import { getMultiplayerConfig } from './realtime'
import './adminPanel.css'

type PlayerProfile = { id: string; display_name: string; created_at: string; updated_at: string }

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [profiles, setProfiles] = useState<PlayerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    const session = readStoredSession()
    const { url, key } = getMultiplayerConfig()
    if (!session?.access_token || !url || !key) {
      setError('Admin session is unavailable. Sign in again and retry.')
      setLoading(false)
      return
    }
    void fetch(`${url.replace(/\\/+$/, '')}/rest/v1/player_profiles?select=id,display_name,created_at,updated_at&order=created_at.desc`, {
      headers: { apikey: key, Authorization: `Bearer ${session.access_token}` },
    }).then(async response => {
      if (!response.ok) throw new Error(response.status === 403 || response.status === 401 ? 'Admin access was denied by the database policy.' : 'Could not load player accounts.')
      return response.json() as Promise<PlayerProfile[]>
    }).then(data => {
      if (active) setProfiles(data)
    }).catch(err => {
      if (active) setError(err instanceof Error ? err.message : 'Could not load player accounts.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])

  return (
    <div className="dq-admin-overlay" role="presentation">
      <section className="dq-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="dq-admin-title">
        <header className="dq-admin-header">
          <div><span className="dq-admin-eyebrow">RESTRICTED CONTROL ROOM</span><h1 id="dq-admin-title">ADMIN TOOLS</h1></div>
          <button type="button" onClick={onClose} aria-label="Close admin tools">✕</button>
        </header>
        <div className="dq-admin-summary">
          <div><span>ACCESS LEVEL</span><strong>ADMIN</strong></div>
          <div><span>REGISTERED PROFILES</span><strong>{loading ? '…' : profiles.length}</strong></div>
        </div>
        <div className="dq-admin-section-heading"><h2>PLAYER ACCOUNTS</h2><button type="button" onClick={() => { setLoading(true); setError(''); setRefresh(value => value + 1) }}>REFRESH ↻</button></div>
        {loading ? <p className="dq-admin-message">Loading player profiles…</p> : error ? <p className="dq-admin-message is-error" role="alert">{error}</p> : profiles.length === 0 ? <p className="dq-admin-message">No player profiles found yet.</p> : (
          <div className="dq-admin-table-wrap"><table className="dq-admin-table"><thead><tr><th>PLAYER</th><th>USER ID</th><th>REGISTERED</th></tr></thead><tbody>
            {profiles.map(profile => <tr key={profile.id}><td>{profile.display_name || 'Adventurer'}</td><td><code>{profile.id}</code></td><td>{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</td></tr>)}
          </tbody></table></div>
        )}
        <p className="dq-admin-footnote">Read-only account overview. Database row-level security restricts this list to the authenticated admin account.</p>
        <button className="dq-admin-close" type="button" onClick={onClose}>BACK TO MENU</button>
      </section>
    </div>
  )
}
