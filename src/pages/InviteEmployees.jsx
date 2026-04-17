import { useState } from 'react'

const clientList = ['Stanbic Bank Ghana', 'MTN Nigeria', 'Ecobank Group', 'Safaricom Kenya', 'Access Bank PLC']
const assessmentList = ['Q1 Culture Pulse', 'Annual Culture Survey', 'Mid-Year Check-in']

const initialInvited = [
  { id: 1, email: 'kofi.mensah@stanbic.com.gh', org: 'Stanbic Bank Ghana', sent: '12 Apr 2026', status: 'completed' },
  { id: 2, email: 'ama.boateng@stanbic.com.gh', org: 'Stanbic Bank Ghana', sent: '12 Apr 2026', status: 'completed' },
  { id: 3, email: 'kwame.asante@stanbic.com.gh', org: 'Stanbic Bank Ghana', sent: '12 Apr 2026', status: 'pending' },
  { id: 4, email: 'abena.owusu@stanbic.com.gh', org: 'Stanbic Bank Ghana', sent: '12 Apr 2026', status: 'pending' },
  { id: 5, email: 'yaw.darko@stanbic.com.gh', org: 'Stanbic Bank Ghana', sent: '12 Apr 2026', status: 'opened' },
]

export default function InviteEmployees() {
  const [selectedOrg, setSelectedOrg] = useState(clientList[0])
  const [selectedAssessment, setSelectedAssessment] = useState(assessmentList[0])
  const [emailInput, setEmailInput] = useState('')
  const [bulkInput, setBulkInput] = useState('')
  const [invited, setInvited] = useState(initialInvited)
  const [tab, setTab] = useState('single')
  const [sent, setSent] = useState(false)

  const stats = {
    total: invited.length,
    completed: invited.filter(i => i.status === 'completed').length,
    opened: invited.filter(i => i.status === 'opened').length,
    pending: invited.filter(i => i.status === 'pending').length,
  }

  function handleSendSingle(e) {
    e.preventDefault()
    const email = emailInput.trim()
    if (!email) return
    const newInvite = {
      id: Date.now(),
      email,
      org: selectedOrg,
      sent: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'pending',
    }
    setInvited([newInvite, ...invited])
    setEmailInput('')
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  function handleSendBulk(e) {
    e.preventDefault()
    const emails = bulkInput.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes('@'))
    if (!emails.length) return
    const newInvites = emails.map((email, idx) => ({
      id: Date.now() + idx,
      email,
      org: selectedOrg,
      sent: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'pending',
    }))
    setInvited([...newInvites, ...invited])
    setBulkInput('')
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  function handleResend(id) {
    setInvited(prev => prev.map(i => i.id === id ? { ...i, status: 'pending' } : i))
  }

  function handleRemove(id) {
    setInvited(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="content">
      <div className="page-hero">
        <div className="hero-title">Invite Employees</div>
        <div className="hero-sub">Send survey invitations to employees at your client organisations.</div>
      </div>

      <div className="flex gap-12 mb-24">
        <select className="form-input" style={{ maxWidth: 220 }} value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}>
          {clientList.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="form-input" style={{ maxWidth: 260 }} value={selectedAssessment} onChange={e => setSelectedAssessment(e.target.value)}>
          {assessmentList.map(a => <option key={a}>{a}</option>)}
        </select>
      </div>

      <div className="grid-4 mb-28">
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--navy)' }} />
          <div className="stat-label">Total Invited</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--teal)' }} />
          <div className="stat-label">Completed</div>
          <div className="stat-value" style={{ color: 'var(--teal)' }}>{stats.completed}</div>
          <div className="stat-sub">{Math.round((stats.completed / stats.total) * 100)}% response rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--blue)' }} />
          <div className="stat-label">Opened</div>
          <div className="stat-value">{stats.opened}</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--gold)' }} />
          <div className="stat-label">Pending</div>
          <div className="stat-value">{stats.pending}</div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 16 }}>Send Invitations</div>

          <div className="flex gap-8 mb-24">
            {['single', 'bulk'].map(t => (
              <button
                key={t}
                className={`btn btn-sm ${tab === t ? 'btn-navy' : 'btn-outline'}`}
                onClick={() => setTab(t)}
              >
                {t === 'single' ? 'Single Email' : 'Bulk Import'}
              </button>
            ))}
          </div>

          {tab === 'single' ? (
            <form onSubmit={handleSendSingle}>
              <div className="form-group">
                <label className="form-label">Employee Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="employee@company.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Message Preview</label>
                <div style={{
                  background: 'var(--bg)', borderRadius: 9, padding: '14px 16px',
                  fontSize: 13, color: 'var(--text2)', lineHeight: 1.7,
                  border: '1px solid var(--border)',
                }}>
                  <strong>Subject:</strong> You're invited to share your culture experience at {selectedOrg}<br />
                  <br />
                  Hi there,<br />
                  <br />
                  {selectedOrg} is running a confidential culture assessment to understand how people experience working here.
                  Your honest feedback matters — it takes around 8–10 minutes to complete.<br />
                  <br />
                  <span style={{ color: 'var(--teal)', fontWeight: 600 }}>[Take the Survey →]</span>
                </div>
              </div>
              <button type="submit" className="btn btn-teal">Send Invitation</button>
              {sent && <span style={{ marginLeft: 12, color: 'var(--teal)', fontSize: 13 }}>✓ Invitation sent!</span>}
            </form>
          ) : (
            <form onSubmit={handleSendBulk}>
              <div className="form-group">
                <label className="form-label">Paste Emails (comma, semicolon, or one per line)</label>
                <textarea
                  className="form-input"
                  rows={8}
                  placeholder={'employee1@company.com\nemployee2@company.com\nemployee3@company.com'}
                  value={bulkInput}
                  onChange={e => setBulkInput(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
                {bulkInput.split(/[\n,;]+/).filter(e => e.trim().includes('@')).length} valid emails detected
              </div>
              <button type="submit" className="btn btn-teal">Send All Invitations</button>
              {sent && <span style={{ marginLeft: 12, color: 'var(--teal)', fontSize: 13 }}>✓ Invitations sent!</span>}
            </form>
          )}
        </div>

        <div className="card">
          <div className="flex-between mb-16">
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>Invitation Tracker</div>
            <button className="btn btn-outline btn-sm">Resend All Pending</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Sent</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invited.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontSize: 13 }}>{inv.email}</td>
                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>{inv.sent}</td>
                  <td>
                    <span className={`tag ${
                      inv.status === 'completed' ? 'tag-complete' :
                      inv.status === 'opened' ? 'tag-review' :
                      'tag-pending'
                    }`}>
                      {inv.status === 'completed' ? '✓ Done' :
                       inv.status === 'opened' ? '● Opened' : '○ Pending'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-8">
                      {inv.status === 'pending' && (
                        <button className="btn btn-outline btn-sm" onClick={() => handleResend(inv.id)}>
                          Resend
                        </button>
                      )}
                      <button
                        className="btn btn-sm"
                        style={{ color: 'var(--coral)', background: 'transparent', border: '1px solid var(--border)' }}
                        onClick={() => handleRemove(inv.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
