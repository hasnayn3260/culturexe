import { useState } from 'react'
import { useOrganisations } from '../hooks/useOrganisations'

function scoreColor(s) {
  if (!s && s !== 0) return 'var(--text3)'
  if (s >= 75) return '#0A8A7E'
  if (s >= 60) return 'var(--blue)'
  if (s >= 45) return 'var(--gold2)'
  return 'var(--coral)'
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(27,191,176,0.18)', borderTopColor: 'var(--teal)', animation: 'co-spin 0.8s linear infinite' }} />
      <style>{`@keyframes co-spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}

const emptyForm = { name: '', industry: '', contact_name: '', contact_email: '', employee_count: '' }

export default function ClientOrgs() {
  const { organisations, loading, error, createOrganisation, refetch } = useOrganisations()

  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState(emptyForm)
  const [search, setSearch]         = useState('')
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState('')

  const filtered = organisations.filter(o =>
    o.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.industry?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(e) {
    e.preventDefault()
    setSaveError('')
    setSaving(true)
    try {
      await createOrganisation({
        name:           form.name,
        industry:       form.industry || null,
        contact_name:   form.contact_name || null,
        contact_email:  form.contact_email || null,
        employee_count: form.employee_count ? parseInt(form.employee_count) : null,
        status:         'active',
      })
      setForm(emptyForm)
      setShowModal(false)
    } catch (err) {
      setSaveError(err.message || 'Failed to create organisation.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="content">
      <div className="page-hero">
        <div className="hero-title">Client Organisations</div>
        <div className="hero-sub">
          Manage your CultureXe client portfolio
          {!loading && ` — ${organisations.length} organisation${organisations.length !== 1 ? 's' : ''} onboarded`}.
        </div>
      </div>

      <div className="flex-between mb-24">
        <input
          className="form-input"
          style={{ maxWidth: 280 }}
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="btn btn-teal" onClick={() => { setSaveError(''); setShowModal(true) }}>
          + New Client
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--coral-light)', border: '1px solid rgba(232,86,58,0.2)', borderRadius: 10, color: 'var(--coral)', fontSize: 13.5, marginBottom: 20 }}>
          ⚠ {error}
        </div>
      )}

      <div className="card">
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🏢</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--navy)', marginBottom: 8 }}>
              {search ? 'No clients match your search' : 'No clients yet'}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text3)', marginBottom: 20 }}>
              {search ? 'Try a different search term.' : 'Add your first client organisation to get started.'}
            </div>
            {!search && (
              <button className="btn btn-teal" onClick={() => setShowModal(true)}>+ Add First Client</button>
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Industry</th>
                <th>Employees</th>
                <th>Avg Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(org => (
                <tr key={org.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{org.name}</div>
                    {(org.contact_name || org.contact_email) && (
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                        {[org.contact_name, org.contact_email].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>{org.industry || '—'}</td>
                  <td style={{ fontSize: 13 }}>
                    {org.employee_count ? org.employee_count.toLocaleString() : '—'}
                  </td>
                  <td>
                    {org.avg_score != null ? (
                      <span style={{ fontWeight: 700, color: scoreColor(org.avg_score), fontSize: 14 }}>
                        {org.avg_score}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text3)', fontSize: 12 }}>No data</span>
                    )}
                  </td>
                  <td>
                    <span className={`tag ${
                      org.status === 'active'   ? 'tag-active'  :
                      org.status === 'review'   ? 'tag-review'  :
                      'tag-pending'
                    }`}>
                      {org.status === 'active' ? '● Active' :
                       org.status === 'review' ? '⟳ Review' : '○ Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-outline btn-sm">View</button>
                      <button className="btn btn-teal btn-sm">+ Assessment</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add New Client</div>
            <div className="modal-sub">Onboard a new organisation to the CultureXe platform.</div>

            {saveError && (
              <div style={{ padding: '11px 14px', background: 'var(--coral-light)', border: '1px solid rgba(232,86,58,0.2)', borderRadius: 9, color: 'var(--coral)', fontSize: 13, marginBottom: 16 }}>
                ⚠ {saveError}
              </div>
            )}

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Organisation Name *</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. Zenith Bank Nigeria"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Industry</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Financial Services"
                    value={form.industry}
                    onChange={e => setForm({ ...form, industry: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Employee Count</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="e.g. 2500"
                    value={form.employee_count}
                    onChange={e => setForm({ ...form, employee_count: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Primary Contact</label>
                  <input
                    className="form-input"
                    placeholder="Full name"
                    value={form.contact_name}
                    onChange={e => setForm({ ...form, contact_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="name@company.com"
                    value={form.contact_email}
                    onChange={e => setForm({ ...form, contact_email: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-12" style={{ marginTop: 8 }}>
                <button type="submit" className="btn btn-teal" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Client'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
