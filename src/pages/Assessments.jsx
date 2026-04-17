import { useState } from 'react'
import { useAssessments } from '../hooks/useAssessments'
import { useOrganisations } from '../hooks/useOrganisations'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(27,191,176,0.18)', borderTopColor: 'var(--teal)', animation: 'as-spin 0.8s linear infinite' }} />
      <style>{`@keyframes as-spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}

// DB status → display helpers
const STATUS_LABEL = {
  active:   '● Live',
  complete: '✓ Complete',
  review:   '⟳ Review',
  pending:  '○ Pending',
}
const STATUS_TAG = {
  active:   'tag-active',
  complete: 'tag-complete',
  review:   'tag-review',
  pending:  'tag-pending',
}
const FILTER_LABELS = {
  all:      'All',
  active:   'Live',
  complete: 'Complete',
  pending:  'Pending',
  review:   'Review',
}

const emptyForm = { name: '', org_id: '', type: 'full_survey', launch_date: '', close_date: '' }

export default function Assessments() {
  const { assessments, loading, error, createAssessment, refetch } = useAssessments()
  const { organisations, loading: orgsLoading }                    = useOrganisations()

  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState(emptyForm)
  const [filter, setFilter]       = useState('all')
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState('')

  const filtered = filter === 'all'
    ? assessments
    : assessments.filter(a => a.status === filter)

  const stats = {
    total:    assessments.length,
    active:   assessments.filter(a => a.status === 'active').length,
    complete: assessments.filter(a => a.status === 'complete').length,
    pending:  assessments.filter(a => a.status === 'pending').length,
    review:   assessments.filter(a => a.status === 'review').length,
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaveError('')
    setSaving(true)
    try {
      await createAssessment({
        name:        form.name,
        org_id:      form.org_id || null,
        type:        form.type,
        status:      'pending',
        launch_date: form.launch_date || null,
        close_date:  form.close_date  || null,
      })
      setForm(emptyForm)
      setShowModal(false)
    } catch (err) {
      setSaveError(err.message || 'Failed to create assessment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="content">
      <div className="page-hero">
        <div className="hero-title">Assessments</div>
        <div className="hero-sub">Launch, manage, and track culture surveys across all client organisations.</div>
      </div>

      <div className="grid-4 mb-28">
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--navy)' }} />
          <div className="stat-label">Total Assessments</div>
          <div className="stat-value">{loading ? '—' : stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--teal)' }} />
          <div className="stat-label">Live Now</div>
          <div className="stat-value" style={{ color: 'var(--teal)' }}>{loading ? '—' : stats.active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--blue)' }} />
          <div className="stat-label">Completed</div>
          <div className="stat-value">{loading ? '—' : stats.complete}</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--gold)' }} />
          <div className="stat-label">Pending Launch</div>
          <div className="stat-value">{loading ? '—' : stats.pending}</div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--coral-light)', border: '1px solid rgba(232,86,58,0.2)', borderRadius: 10, color: 'var(--coral)', fontSize: 13.5, marginBottom: 20 }}>
          ⚠ {error}
        </div>
      )}

      <div className="flex-between mb-24">
        <div className="flex gap-8">
          {Object.entries(FILTER_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`btn btn-sm ${filter === key ? 'btn-navy' : 'btn-outline'}`}
              onClick={() => setFilter(key)}
            >
              {label}
              {!loading && key !== 'all' && stats[key] > 0 && (
                <span style={{ marginLeft: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 9, padding: '1px 6px', fontSize: 11 }}>
                  {stats[key]}
                </span>
              )}
            </button>
          ))}
        </div>
        <button className="btn btn-teal" onClick={() => { setSaveError(''); setShowModal(true) }}>
          + New Assessment
        </button>
      </div>

      <div className="card">
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>📋</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--navy)', marginBottom: 8 }}>
              {filter !== 'all' ? `No ${FILTER_LABELS[filter].toLowerCase()} assessments` : 'No assessments yet'}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text3)', marginBottom: 20 }}>
              {filter !== 'all' ? 'Try a different filter.' : 'Create your first assessment to get started.'}
            </div>
            {filter === 'all' && (
              <button className="btn btn-teal" onClick={() => setShowModal(true)}>+ New Assessment</button>
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Assessment</th>
                <th>Client</th>
                <th>Type</th>
                <th>Launched</th>
                <th>Closes</th>
                <th>Responses</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600, fontSize: 13.5 }}>{a.name}</td>
                  <td style={{ fontSize: 13 }}>{a.org_name}</td>
                  <td>
                    <span className={`badge ${a.type === 'full_survey' ? 'badge-teal' : 'badge-slate'}`}>
                      {a.type === 'full_survey' ? 'Full Survey' : 'Quick Pulse'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text2)' }}>{fmtDate(a.launch_date)}</td>
                  <td style={{ fontSize: 13, color: 'var(--text2)' }}>{fmtDate(a.close_date)}</td>
                  <td>
                    {a.total_invited > 0 ? (
                      <>
                        <div style={{ fontSize: 13 }}>{a.response_count ?? 0}/{a.total_invited}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {Math.round(((a.response_count ?? 0) / a.total_invited) * 100)}%
                        </div>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={`tag ${STATUS_TAG[a.status] || 'tag-pending'}`}>
                      {STATUS_LABEL[a.status] || a.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-outline btn-sm">Report</button>
                      <button className="btn btn-outline btn-sm">Edit</button>
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
            <div className="modal-title">New Assessment</div>
            <div className="modal-sub">Create and schedule a culture survey for a client organisation.</div>

            {saveError && (
              <div style={{ padding: '11px 14px', background: 'var(--coral-light)', border: '1px solid rgba(232,86,58,0.2)', borderRadius: 9, color: 'var(--coral)', fontSize: 13, marginBottom: 16 }}>
                ⚠ {saveError}
              </div>
            )}

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Assessment Name *</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. Q2 Culture Pulse"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Client Organisation *</label>
                <select
                  className="form-input"
                  required
                  value={form.org_id}
                  onChange={e => setForm({ ...form, org_id: e.target.value })}
                >
                  <option value="">Select client...</option>
                  {orgsLoading
                    ? <option disabled>Loading…</option>
                    : organisations.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))
                  }
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Survey Type</label>
                <select
                  className="form-input"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  <option value="full_survey">Full Survey</option>
                  <option value="quick_pulse">Quick Pulse</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Launch Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.launch_date}
                    onChange={e => setForm({ ...form, launch_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Close Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.close_date}
                    onChange={e => setForm({ ...form, close_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-12" style={{ marginTop: 8 }}>
                <button type="submit" className="btn btn-teal" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Assessment'}
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
