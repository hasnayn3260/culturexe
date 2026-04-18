import { useState } from 'react'
import AdminLayout from './AdminLayout'
import { useAdminData } from '../../hooks/useAdminData'
import { useToast } from '../../components/Toast'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function RoleBadge({ role }) {
  const map = {
    superadmin: { bg: 'var(--coral-light)',  color: 'var(--coral)',  label: 'Superadmin' },
    consultant: { bg: 'var(--teal-light)',   color: '#0A8A7E',       label: 'Consultant' },
    client:     { bg: 'var(--blue-light)',   color: '#1A5A8C',       label: 'Client'     },
    employee:   { bg: 'var(--slate-light)',  color: 'var(--slate)',   label: 'Employee'   },
  }
  const s = map[role] || map.employee
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid rgba(27,191,176,0.18)',
        borderTopColor: 'var(--teal)',
        animation: 'um-spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes um-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Add New User Modal ──────────────────────────────────────────
function AddUserModal({ organisations, onClose, onCreate }) {
  const [form, setForm]      = useState({ full_name: '', email: '', role: 'consultant', org_id: '' })
  const [submitting, setSub] = useState(false)
  const [error, setError]    = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim()) {
      setError('Full name and email are required.')
      return
    }
    if (form.role === 'client' && !form.org_id) {
      setError('Organisation is required for client users.')
      return
    }
    setSub(true)
    setError('')
    try {
      await onCreate(form)
    } catch (err) {
      setError(err.message || 'Failed to create user.')
      setSub(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal">
        <div className="modal-title">Add New User</div>
        <div className="modal-sub">An invite email will be sent to the new user.</div>

        {error && (
          <div style={{
            padding: '11px 14px',
            background: 'var(--coral-light)',
            border: '1px solid rgba(232,86,58,0.2)',
            borderRadius: 9, color: 'var(--coral)',
            fontSize: 13, marginBottom: 16,
          }}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                className="form-input"
                placeholder="Jane Doe"
                value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                className="form-input"
                type="email"
                placeholder="jane@organisation.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="superadmin">Superadmin</option>
                <option value="consultant">Consultant</option>
                <option value="client">Client</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Organisation {form.role === 'client' ? '*' : '(optional)'}</label>
              <select className="form-input" value={form.org_id} onChange={e => set('org_id', e.target.value)}>
                <option value="">— None —</option>
                {organisations.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-teal"
              disabled={submitting}
              style={{ minWidth: 130, justifyContent: 'center', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Sending…' : 'Send Invite →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit User Modal ─────────────────────────────────────────────
function EditUserModal({ user, organisations, onClose, onSave }) {
  const [form, setForm]      = useState({
    full_name: user.full_name || '',
    role:      user.role || 'consultant',
    org_id:    user.org_id ? String(user.org_id) : '',
    active:    user.active !== false,
  })
  const [submitting, setSub] = useState(false)
  const [error, setError]    = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('Full name is required.'); return }
    setSub(true)
    setError('')
    try {
      await onSave(user.id, {
        full_name: form.full_name,
        role:      form.role,
        org_id:    form.org_id || null,
        active:    form.active,
      })
    } catch (err) {
      setError(err.message || 'Failed to update user.')
      setSub(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal">
        <div className="modal-title">Edit User</div>
        <div className="modal-sub">{user.email}</div>

        {error && (
          <div style={{
            padding: '11px 14px',
            background: 'var(--coral-light)',
            border: '1px solid rgba(232,86,58,0.2)',
            borderRadius: 9, color: 'var(--coral)',
            fontSize: 13, marginBottom: 16,
          }}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              className="form-input"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="superadmin">Superadmin</option>
                <option value="consultant">Consultant</option>
                <option value="client">Client</option>
                <option value="employee">Employee</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Organisation</label>
              <select className="form-input" value={form.org_id} onChange={e => set('org_id', e.target.value)}>
                <option value="">— None —</option>
                {organisations.map(o => (
                  <option key={o.id} value={String(o.id)}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => set('active', !form.active)}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: form.active ? 'var(--teal)' : 'var(--border2)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: form.active ? 22 : 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'white', transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                }} />
              </button>
              <span style={{ fontSize: 13, color: form.active ? '#0A8A7E' : 'var(--coral)', fontWeight: 500 }}>
                {form.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
            <button
              type="submit"
              className="btn btn-teal"
              disabled={submitting}
              style={{ minWidth: 110, justifyContent: 'center', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Deactivate Confirmation ─────────────────────────────────────
function DeactivateConfirm({ user, onClose, onConfirm }) {
  const [submitting, setSub] = useState(false)

  async function handleConfirm() {
    setSub(true)
    try { await onConfirm(user.id) }
    catch { setSub(false) }
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal">
        <div className="modal-title">Deactivate User</div>
        <div className="modal-sub" style={{ marginBottom: 24 }}>
          Are you sure you want to deactivate <strong>{user.full_name}</strong>?
          They will no longer be able to log in to CultureXe.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn"
            disabled={submitting}
            onClick={handleConfirm}
            style={{ background: 'var(--coral)', color: 'white', minWidth: 110, justifyContent: 'center', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function UserManagement() {
  const { users, organisations, loading, error, createUser, updateUser, deactivateUser } = useAdminData()
  const showToast = useToast()

  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [orgFilter, setOrgFilter]   = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editing, setEditing]           = useState(null)
  const [confirming, setConfirming]     = useState(null)

  const filtered = users.filter(u => {
    if (search) {
      const q = search.toLowerCase()
      if (!u.full_name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false
    }
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (orgFilter !== 'all' && String(u.org_id) !== orgFilter) return false
    return true
  })

  const activeCount     = users.filter(u => u.active !== false).length
  const consultantCount = users.filter(u => u.role === 'consultant' && u.active !== false).length
  const clientCount     = users.filter(u => u.role === 'client'     && u.active !== false).length

  async function handleCreate(form) {
    await createUser(form)
    setShowAddModal(false)
    showToast(`Invite sent to ${form.email}`)
  }

  async function handleEdit(id, updates) {
    await updateUser(id, updates)
    setEditing(null)
    showToast('User updated')
  }

  async function handleDeactivate(id) {
    await deactivateUser(id)
    setConfirming(null)
    showToast('User deactivated')
  }

  return (
    <AdminLayout>

      {/* ── Page Header ── */}
      <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--navy)' }}>User Management</div>
            <div style={{ fontSize: 13.5, color: 'var(--text2)', marginTop: 3 }}>
              Manage consultant, client and employee accounts across the platform.
            </div>
          </div>
          <button
            className="btn btn-teal"
            onClick={() => setShowAddModal(true)}
          >
            + Add New User
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--navy)' }} />
          <div className="stat-label">Total Active Users</div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-sub">Across all roles</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--teal)' }} />
          <div className="stat-label">Consultants</div>
          <div className="stat-value">{consultantCount}</div>
          <div className="stat-sub">Portal access</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--blue)' }} />
          <div className="stat-label">Clients</div>
          <div className="stat-value">{clientCount}</div>
          <div className="stat-sub">Organisation portals</div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '14px 18px',
          background: 'var(--coral-light)',
          border: '1px solid rgba(232,86,58,0.2)',
          borderRadius: 10, color: 'var(--coral)',
          fontSize: 13.5, marginBottom: 20,
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Search + Filters ── */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ flex: 1, minWidth: 180, maxWidth: 300 }}
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="form-input"
            style={{ width: 160 }}
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="superadmin">Superadmin</option>
            <option value="consultant">Consultant</option>
            <option value="client">Client</option>
            <option value="employee">Employee</option>
          </select>
          <select
            className="form-input"
            style={{ width: 200 }}
            value={orgFilter}
            onChange={e => setOrgFilter(e.target.value)}
          >
            <option value="all">All Organisations</option>
            {organisations.map(o => (
              <option key={o.id} value={String(o.id)}>{o.name}</option>
            ))}
          </select>
          {(search || roleFilter !== 'all' || orgFilter !== 'all') && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => { setSearch(''); setRoleFilter('all'); setOrgFilter('all') }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Users Table ── */}
      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '56px 32px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 8 }}>
            {users.length === 0 ? 'No users yet' : 'No users match your filters'}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text2)' }}>
            {users.length === 0 ? 'Add your first user above.' : 'Try adjusting the search or filters.'}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Organisation</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} style={{ opacity: u.active === false ? 0.55 : 1 }}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 14 }}>
                        {u.full_name || '—'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{u.email}</div>
                    </td>
                    <td><RoleBadge role={u.role} /></td>
                    <td style={{ fontSize: 13.5, color: 'var(--text2)' }}>{u.org_name || '—'}</td>
                    <td>
                      {u.active !== false
                        ? <span style={{ fontSize: 12, fontWeight: 600, color: '#0A8A7E' }}>● Active</span>
                        : <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--coral)' }}>● Inactive</span>
                      }
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text3)' }}>{fmtDate(u.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setEditing(u)}>
                          Edit
                        </button>
                        {u.active !== false && (
                          <button
                            className="btn btn-sm"
                            style={{ background: 'var(--coral-light)', color: 'var(--coral)', border: 'none' }}
                            onClick={() => setConfirming(u)}
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showAddModal && (
        <AddUserModal
          organisations={organisations}
          onClose={() => setShowAddModal(false)}
          onCreate={handleCreate}
        />
      )}
      {editing && (
        <EditUserModal
          user={editing}
          organisations={organisations}
          onClose={() => setEditing(null)}
          onSave={handleEdit}
        />
      )}
      {confirming && (
        <DeactivateConfirm
          user={confirming}
          onClose={() => setConfirming(null)}
          onConfirm={handleDeactivate}
        />
      )}

    </AdminLayout>
  )
}
