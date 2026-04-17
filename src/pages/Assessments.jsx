import { useState } from 'react'

const clientList = [
  'Stanbic Bank Ghana', 'MTN Nigeria', 'Ecobank Group',
  'Safaricom Kenya', 'Access Bank PLC', 'Dangote Industries',
  'Old Mutual SA', 'Kenya Airways',
]

const initialAssessments = [
  { id: 1, name: 'Q1 Culture Pulse', org: 'Stanbic Bank Ghana', launched: '12 Apr 2026', closes: '26 Apr 2026', responses: 184, total: 210, status: 'live', type: 'Full Survey' },
  { id: 2, name: 'Annual Culture Survey', org: 'MTN Nigeria', launched: '8 Apr 2026', closes: '30 Apr 2026', responses: 412, total: 500, status: 'live', type: 'Full Survey' },
  { id: 3, name: 'Leadership Effectiveness', org: 'Ecobank Group', launched: '1 Mar 2026', closes: '22 Mar 2026', responses: 97, total: 97, status: 'complete', type: 'Quick Pulse' },
  { id: 4, name: 'DEI Pulse Check', org: 'Safaricom Kenya', launched: '15 Feb 2026', closes: '28 Feb 2026', responses: 240, total: 260, status: 'complete', type: 'Quick Pulse' },
  { id: 5, name: 'Onboarding Culture Fit', org: 'Access Bank PLC', launched: '20 Apr 2026', closes: '4 May 2026', responses: 12, total: 80, status: 'live', type: 'Quick Pulse' },
  { id: 6, name: 'Q4 Annual Review', org: 'Old Mutual SA', launched: '10 Jan 2026', closes: '31 Jan 2026', responses: 187, total: 187, status: 'complete', type: 'Full Survey' },
  { id: 7, name: 'Mid-Year Check-in', org: 'Dangote Industries', launched: '20 Apr 2026', closes: '10 May 2026', responses: 0, total: 350, status: 'pending', type: 'Full Survey' },
]

const emptyForm = { name: '', org: '', type: 'Full Survey', launchDate: '', closeDate: '' }

export default function Assessments() {
  const [assessments, setAssessments] = useState(initialAssessments)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [filter, setFilter] = useState('all')

  const filtered = assessments.filter(a => filter === 'all' || a.status === filter)

  const stats = {
    total: assessments.length,
    live: assessments.filter(a => a.status === 'live').length,
    complete: assessments.filter(a => a.status === 'complete').length,
    pending: assessments.filter(a => a.status === 'pending').length,
  }

  function handleCreate(e) {
    e.preventDefault()
    const newA = {
      id: Date.now(),
      name: form.name,
      org: form.org,
      launched: form.launchDate || 'Not launched',
      closes: form.closeDate || '—',
      responses: 0,
      total: 0,
      status: 'pending',
      type: form.type,
    }
    setAssessments([newA, ...assessments])
    setForm(emptyForm)
    setShowModal(false)
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
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--teal)' }} />
          <div className="stat-label">Live Now</div>
          <div className="stat-value" style={{ color: 'var(--teal)' }}>{stats.live}</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--blue)' }} />
          <div className="stat-label">Completed</div>
          <div className="stat-value">{stats.complete}</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--gold)' }} />
          <div className="stat-label">Pending Launch</div>
          <div className="stat-value">{stats.pending}</div>
        </div>
      </div>

      <div className="flex-between mb-24">
        <div className="flex gap-8">
          {['all', 'live', 'complete', 'pending'].map(f => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-navy' : 'btn-outline'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-teal" onClick={() => setShowModal(true)}>
          + New Assessment
        </button>
      </div>

      <div className="card">
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
                <td style={{ fontSize: 13 }}>{a.org}</td>
                <td>
                  <span className={`badge ${a.type === 'Full Survey' ? 'badge-teal' : 'badge-slate'}`}>
                    {a.type}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text2)' }}>{a.launched}</td>
                <td style={{ fontSize: 13, color: 'var(--text2)' }}>{a.closes}</td>
                <td>
                  {a.total > 0 ? (
                    <>
                      <div style={{ fontSize: 13 }}>{a.responses}/{a.total}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {Math.round((a.responses / a.total) * 100)}%
                      </div>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                  )}
                </td>
                <td>
                  <span className={`tag ${
                    a.status === 'live' ? 'tag-active' :
                    a.status === 'complete' ? 'tag-complete' :
                    'tag-pending'
                  }`}>
                    {a.status === 'live' ? '● Live' : a.status === 'complete' ? '✓ Complete' : '○ Pending'}
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
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">New Assessment</div>
            <div className="modal-sub">Create and schedule a culture survey for a client organisation.</div>
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
                  value={form.org}
                  onChange={e => setForm({ ...form, org: e.target.value })}
                >
                  <option value="">Select client...</option>
                  {clientList.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Survey Type</label>
                <select
                  className="form-input"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  <option>Full Survey</option>
                  <option>Quick Pulse</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Launch Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.launchDate}
                    onChange={e => setForm({ ...form, launchDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Close Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.closeDate}
                    onChange={e => setForm({ ...form, closeDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-12" style={{ marginTop: 8 }}>
                <button type="submit" className="btn btn-teal">Create Assessment</button>
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
