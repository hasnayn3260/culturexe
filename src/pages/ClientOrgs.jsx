import { useState } from 'react'

const initialOrgs = [
  { id: 1, name: 'Stanbic Bank Ghana', industry: 'Financial Services', size: 1200, assessments: 3, avgScore: 74, status: 'active', contact: 'Kofi Mensah', email: 'kofi@stanbic.com.gh' },
  { id: 2, name: 'MTN Nigeria', industry: 'Telecommunications', size: 4800, assessments: 2, avgScore: 68, status: 'active', contact: 'Amaka Obi', email: 'amaka@mtn.ng' },
  { id: 3, name: 'Ecobank Group', industry: 'Financial Services', size: 6500, assessments: 5, avgScore: 71, status: 'active', contact: 'Jean-Pierre Nkono', email: 'jp@ecobank.com' },
  { id: 4, name: 'Safaricom Kenya', industry: 'Telecommunications', size: 5200, assessments: 4, avgScore: 79, status: 'active', contact: 'Wanjiku Kamau', email: 'w.kamau@safaricom.ke' },
  { id: 5, name: 'Access Bank PLC', industry: 'Financial Services', size: 8900, assessments: 1, avgScore: 61, status: 'active', contact: 'Chidi Okafor', email: 'c.okafor@accessbank.com' },
  { id: 6, name: 'Dangote Industries', industry: 'Manufacturing', size: 15000, assessments: 2, avgScore: 58, status: 'review', contact: 'Fatima Bello', email: 'f.bello@dangote.com' },
  { id: 7, name: 'Old Mutual SA', industry: 'Insurance & Finance', size: 3200, assessments: 3, avgScore: 76, status: 'active', contact: 'Sipho Dlamini', email: 's.dlamini@oldmutual.com' },
  { id: 8, name: 'Kenya Airways', industry: 'Aviation', size: 3700, assessments: 1, avgScore: 55, status: 'inactive', contact: 'Otieno Odhiambo', email: 'o.odhiambo@kenya-airways.com' },
]

function scoreColor(score) {
  if (score >= 75) return '#0A8A7E'
  if (score >= 60) return 'var(--blue)'
  if (score >= 45) return 'var(--gold2)'
  return 'var(--coral)'
}

const emptyForm = { name: '', industry: '', contact: '', email: '', size: '' }

export default function ClientOrgs() {
  const [orgs, setOrgs] = useState(initialOrgs)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.industry.toLowerCase().includes(search.toLowerCase())
  )

  function handleCreate(e) {
    e.preventDefault()
    const newOrg = {
      id: Date.now(),
      name: form.name,
      industry: form.industry,
      size: parseInt(form.size) || 0,
      assessments: 0,
      avgScore: null,
      status: 'active',
      contact: form.contact,
      email: form.email,
    }
    setOrgs([newOrg, ...orgs])
    setForm(emptyForm)
    setShowModal(false)
  }

  return (
    <div className="content">
      <div className="page-hero">
        <div className="hero-title">Client Organisations</div>
        <div className="hero-sub">Manage your CultureXe client portfolio — {orgs.length} organisations onboarded.</div>
      </div>

      <div className="flex-between mb-24">
        <input
          className="form-input"
          style={{ maxWidth: 280 }}
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="btn btn-teal" onClick={() => setShowModal(true)}>
          + New Client
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Industry</th>
              <th>Employees</th>
              <th>Assessments</th>
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
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{org.contact} · {org.email}</div>
                </td>
                <td style={{ fontSize: 13 }}>{org.industry}</td>
                <td style={{ fontSize: 13 }}>{org.size.toLocaleString()}</td>
                <td style={{ fontSize: 13 }}>{org.assessments}</td>
                <td>
                  {org.avgScore !== null ? (
                    <span style={{ fontWeight: 700, color: scoreColor(org.avgScore), fontSize: 14 }}>
                      {org.avgScore}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text3)', fontSize: 12 }}>No data</span>
                  )}
                </td>
                <td>
                  <span className={`tag ${org.status === 'active' ? 'tag-active' : org.status === 'review' ? 'tag-review' : 'tag-pending'}`}>
                    {org.status === 'active' ? '● Active' : org.status === 'review' ? '⟳ Review' : '○ Inactive'}
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
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add New Client</div>
            <div className="modal-sub">Onboard a new organisation to the CultureXe platform.</div>
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
                    value={form.size}
                    onChange={e => setForm({ ...form, size: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Primary Contact</label>
                  <input
                    className="form-input"
                    placeholder="Full name"
                    value={form.contact}
                    onChange={e => setForm({ ...form, contact: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="name@company.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-12" style={{ marginTop: 8 }}>
                <button type="submit" className="btn btn-teal">Create Client</button>
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
