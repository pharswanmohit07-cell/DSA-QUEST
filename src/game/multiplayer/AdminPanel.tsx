import { useCallback, useEffect, useState } from 'react'
import { readStoredSession } from './auth'
import { getMultiplayerConfig } from './realtime'
import './adminPanel.css'

type AdminUser = { id: string; email: string; created_at: string; last_sign_in_at: string | null; banned_until: string | null; email_confirmed_at: string | null }
type QuestEvent = { id: number; event_type: string; quest_id: string | null; quest_title: string | null; quest_status: string | null; xp: number; details: Record<string, unknown>; created_at: string }

async function adminRequest<T>(body: Record<string, unknown>): Promise<T> {
  const session = readStoredSession()
  const { url, key } = getMultiplayerConfig()
  if (!session?.access_token || !url || !key) throw new Error('Admin session is unavailable. Sign in again and retry.')
  const response = await fetch(`${url.replace(/\/+$/, '')}/functions/v1/dsa-quest-admin`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(result.error ?? 'Admin request failed.')
  return result
}

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [history, setHistory] = useState<QuestEvent[]>([])
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)

  const loadUsers = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const result = await adminRequest<{ users: AdminUser[] }>({ action: 'list_users', page: 1, pageSize: 100 })
      setUsers(result.users)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load accounts.') }
    finally { setLoading(false) }
  }, [refresh])

  useEffect(() => { void loadUsers() }, [loadUsers])

  const loadHistory = async (user: AdminUser) => {
    setSelectedUser(user); setHistory([]); setBusyId(user.id); setError(''); setNotice('')
    try {
      const result = await adminRequest<{ events: QuestEvent[] }>({ action: 'quest_history', userId: user.id, page: 1, pageSize: 100 })
      setHistory(result.events)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load quest history.') }
    finally { setBusyId('') }
  }

  const setSuspension = async (user: AdminUser) => {
    const suspended = Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now())
    const action = suspended ? 'reinstate' : 'suspend'
    if (!window.confirm(`${action === 'suspend' ? 'Suspend' : 'Reinstate'} ${user.email || user.id}?${action === 'suspend' ? ' They will be blocked from signing in until reinstated.' : ''}`)) return
    setBusyId(user.id); setError(''); setNotice('')
    try {
      await adminRequest({ action: 'set_user_suspension', userId: user.id, banDuration: suspended ? 'none' : '876000h' })
      setNotice(`${user.email || user.id} was ${suspended ? 'reinstated' : 'suspended'}.`)
      await loadUsers()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not change account status.') }
    finally { setBusyId('') }
  }

  const deleteUser = async (user: AdminUser) => {
    if (!window.confirm(`PERMANENTLY DELETE ${user.email || user.id}? This deletes the Auth account and cannot be undone.`)) return
    if (!window.confirm('Final confirmation: delete this account and its linked quest history?')) return
    setBusyId(user.id); setError(''); setNotice('')
    try {
      await adminRequest({ action: 'delete_user', userId: user.id })
      setUsers(current => current.filter(item => item.id !== user.id))
      if (selectedUser?.id === user.id) { setSelectedUser(null); setHistory([]) }
      setNotice('Account permanently deleted.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete account.') }
    finally { setBusyId('') }
  }

  return (
    <div className="dq-admin-overlay" role="presentation">
      <section className="dq-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="dq-admin-title">
        <header className="dq-admin-header">
          <div><span className="dq-admin-eyebrow">RESTRICTED CONTROL ROOM</span><h1 id="dq-admin-title">ADMIN TOOLS</h1></div>
          <button type="button" onClick={onClose} aria-label="Close admin tools">✕</button>
        </header>
        <div className="dq-admin-summary">
          <div><span>ACCESS LEVEL</span><strong>ADMIN</strong></div>
          <div><span>REGISTERED ACCOUNTS</span><strong>{loading ? '…' : users.length}</strong></div>
        </div>
        {error && <p className="dq-admin-message is-error" role="alert">{error}</p>}
        {notice && <p className="dq-admin-message" role="status">{notice}</p>}
        <div className="dq-admin-section-heading"><h2>PLAYER ACCOUNTS</h2><button type="button" onClick={() => setRefresh(v => v + 1)}>REFRESH ↻</button></div>
        {loading ? <p className="dq-admin-message">Loading accounts…</p> : users.length === 0 ? <p className="dq-admin-message">No accounts found.</p> : (
          <div className="dq-admin-table-wrap"><table className="dq-admin-table"><thead><tr><th>ACCOUNT</th><th>STATUS</th><th>LAST SIGN-IN</th><th>ACTIONS</th></tr></thead><tbody>
            {users.map(user => {
              const suspended = Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now())
              return <tr key={user.id}>
                <td><strong>{user.email || 'No email'}</strong><code>{user.id}</code><button className="dq-admin-link" type="button" onClick={() => void loadHistory(user)}>VIEW QUEST HISTORY</button></td>
                <td><span className={`dq-admin-status ${suspended ? 'is-suspended' : ''}`}>{suspended ? 'SUSPENDED' : 'ACTIVE'}</span></td>
                <td>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}</td>
                <td><div className="dq-admin-actions"><button type="button" disabled={busyId === user.id} onClick={() => void setSuspension(user)}>{suspended ? 'REINSTATE' : 'SUSPEND'}</button><button type="button" className="is-danger" disabled={busyId === user.id} onClick={() => void deleteUser(user)}>DELETE</button></div></td>
              </tr>
            })}
          </tbody></table></div>
        )}
        {selectedUser && <section className="dq-admin-history">
          <div className="dq-admin-section-heading"><h2>QUEST HISTORY · {selectedUser.email || selectedUser.id}</h2><button type="button" onClick={() => { setSelectedUser(null); setHistory([]) }}>CLOSE</button></div>
          {busyId === selectedUser.id ? <p className="dq-admin-message">Loading quest history…</p> : history.length === 0 ? <p className="dq-admin-message">No cloud quest events recorded for this account yet. History tracking begins after the player runs a version with progress syncing enabled.</p> : <div className="dq-admin-events">{history.map(event => <article key={event.id}><time>{new Date(event.created_at).toLocaleString()}</time><strong>{event.quest_title || event.quest_id || event.event_type.replaceAll('_', ' ')}</strong><span>{event.event_type.replaceAll('_', ' ').toUpperCase()} · {event.quest_status || '—'} · {event.xp} XP</span></article>)}</div>}
        </section>}
        <p className="dq-admin-footnote">Suspension and deletion use the server-side Supabase Auth Admin API. Deletion may fail if the account owns Storage objects. Account actions are restricted to the configured administrator identity.</p>
        <button className="dq-admin-close" type="button" onClick={onClose}>BACK TO MENU</button>
      </section>
    </div>
  )
}
