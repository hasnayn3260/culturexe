import { useState, useEffect } from 'react'
import { useOrganisations } from '../hooks/useOrganisations'
import { useAssessments } from '../hooks/useAssessments'
import { useResponses } from '../hooks/useResponses'
import supabase from '../lib/supabaseClient'

const BASE_URL = 'https://culture-xe.com/assess'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(27,191,176,0.2)', borderTopColor: 'var(--teal)', animation: 'ie-spin 0.8s linear infinite' }} />
      <style>{`@keyframes ie-spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}

export default function InviteEmployees() {
  const { organisations, loading: orgsLoading }    = useOrganisations()
  const { assessments, loading: assessLoading }    = useAssessments()

  const [selectedOrgId, setSelectedOrgId]               = useState('')
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [emailInput, setEmailInput]                     = useState('')
  const [sending, setSending]                           = useState(false)
  const [sendError, setSendError]                       = useState('')
  const [generatedLinks, setGeneratedLinks]             = useState([])
  const [copied, setCopied]                             = useState(null)

  const {
    tokens, totalInvited, completedCount, pendingCount, completionRate,
    loading: tokensLoading, refetch: refetchTokens,
  } = useResponses(selectedAssessmentId)

  useEffect(() => {
    if (!orgsLoading && organisations.length > 0 && !selectedOrgId) {
      setSelectedOrgId(String(organisations[0].id))
    }
  }, [orgsLoading, organisations, selectedOrgId])

  const orgAssessments = assessments.filter(a => String(a.org_id) === String(selectedOrgId))

  useEffect(() => {
    if (assessLoading) return
    setGeneratedLinks([])
    if (orgAssessments.length > 0) {
      setSelectedAssessmentId(String(orgAssessments[0].id))
    } else {
      setSelectedAssessmentId('')
    }
  }, [selectedOrgId, assessLoading])

  const selectedAssessment = assessments.find(a => String(a.id) === String(selectedAssessmentId))
  const selectedOrg        = organisations.find(o => String(o.id) === String(selectedOrgId))

  const emailCount = emailInput.split(/[\n,;]+/).filter(e => e.trim().includes('@')).length

  async function handleSend(e) {
    e.preventDefault()
    if (!selectedAssessmentId) { setSendError('Please select an assessment first.'); return }
    const emails = [...new Set(
      emailInput.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes('@'))
    )]
    if (!emails.length) { setSendError('Enter at least one valid email address.'); return }
    setSendError('')
    setSending(true)
    try {
      const rows = emails.map(email => ({
        assessment_id: selectedAssessmentId,
        token: crypto.randomUUID(),
        email,
        used: false,
      }))
      const { data, error: err } = await supabase
        .from('response_tokens')
        .insert(rows)
        .select()
      if (err) throw err
      setGeneratedLinks((data || rows).map(row => ({
        email: row.email,
        token: row.token,
        url: `${BASE_URL}/${row.token}`,
      })))
      setEmailInput('')
      await refetchTokens()
    } catch (err) {
      setSendError(err.message || 'Failed to create invitation links.')
    } finally {
      setSending(false)
    }
  }

  async function copyLink(url, idx) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(idx)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* clipboard API unavailable */ }
  }

  async function copyAll() {
    const text = generatedLinks.map(l => `${l.email}: ${l.url}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied('all')
      setTimeout(() => setCopied(null), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className="content">
      <div className="page-hero">
        <div className="hero-title">Invite Employees</div>
        <div className="hero-sub">Generate survey links for employees at your client organisations.</div>
      </div>

      <div className="flex gap-12 mb-24">
        <select
          className="form-input"
          style={{ maxWidth: 220 }}
          value={selectedOrgId}
          onChange={e => { setSelectedOrgId(e.target.value); setGeneratedLinks([]) }}
          disabled={orgsLoading}
        >
          {orgsLoading
            ? <option>Loading…</option>
            : organisations.length === 0
              ? <option value="">No organisations</option>
              : organisations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)
          }
        </select>
        <select
          className="form-input"
          style={{ maxWidth: 280 }}
          value={selectedAssessmentId}
          onChange={e => { setSelectedAssessmentId(e.target.value); setGeneratedLinks([]) }}
          disabled={assessLoading || orgAssessments.length === 0}
        >
          {assessLoading
            ? <option>Loading…</option>
            : orgAssessments.length === 0
              ? <option value="">No assessments for this client</option>
              : orgAssessments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
          }
        </select>
      </div>

      <div className="grid-4 mb-28">
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--navy)' }} />
          <div className="stat-label">Total Invited</div>
          <div className="stat-value">{tokensLoading ? '—' : totalInvited}</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--teal)' }} />
          <div className="stat-label">Completed</div>
          <div className="stat-value" style={{ color: 'var(--teal)' }}>{tokensLoading ? '—' : completedCount}</div>
          {!tokensLoading && totalInvited > 0 && (
            <div className="stat-sub">{completionRate}% response rate</div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--gold)' }} />
          <div className="stat-label">Pending</div>
          <div className="stat-value">{tokensLoading ? '—' : pendingCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{ background: 'var(--blue)' }} />
          <div className="stat-label">Assessment</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginTop: 10, lineHeight: 1.4 }}>
            {selectedAssessment?.name || '—'}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Send / Generated links ── */}
        <div className="card">
          {generatedLinks.length > 0 ? (
            <>
              <div className="flex-between mb-16">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--teal)' }}>
                    ✓ {generatedLinks.length} link{generatedLinks.length !== 1 ? 's' : ''} generated
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
                    Copy these links and share them with your employees.
                  </div>
                </div>
                <div className="flex gap-8">
                  <button className="btn btn-outline btn-sm" onClick={copyAll}>
                    {copied === 'all' ? '✓ Copied!' : 'Copy All'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setGeneratedLinks([])}>
                    + New Batch
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {generatedLinks.map((link, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '11px 14px', background: 'var(--bg)', borderRadius: 9,
                      marginBottom: 8, border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 5 }}>{link.email}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{
                        flex: 1, fontSize: 12.5, color: 'var(--teal)', fontFamily: 'monospace',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {link.url}
                      </div>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ flexShrink: 0 }}
                        onClick={() => copyLink(link.url, idx)}
                      >
                        {copied === idx ? '✓' : 'Copy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 16 }}>
                Send Invitations
              </div>

              {sendError && (
                <div style={{ padding: '10px 14px', background: 'var(--coral-light)', border: '1px solid rgba(232,86,58,0.2)', borderRadius: 9, color: 'var(--coral)', fontSize: 13, marginBottom: 16 }}>
                  ⚠ {sendError}
                </div>
              )}

              <form onSubmit={handleSend}>
                <div className="form-group">
                  <label className="form-label">Employee Emails</label>
                  <textarea
                    className="form-input"
                    rows={8}
                    placeholder={'employee1@company.com\nemployee2@company.com\nemployee3@company.com\n\nOr paste comma-separated emails'}
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                  {emailCount > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--teal)', marginTop: 6 }}>
                      ✓ {emailCount} valid email{emailCount !== 1 ? 's' : ''} detected
                    </div>
                  )}
                </div>

                {selectedOrg && selectedAssessment && (
                  <div style={{
                    background: 'var(--bg)', borderRadius: 9, padding: '14px 16px',
                    fontSize: 13, color: 'var(--text2)', lineHeight: 1.7,
                    border: '1px solid var(--border)', marginBottom: 20,
                  }}>
                    <strong>Subject:</strong> You're invited to share your culture experience at {selectedOrg.name}<br />
                    <br />
                    Hi there,<br /><br />
                    {selectedOrg.name} is running a confidential culture assessment. Your honest feedback matters — it takes around 8–10 minutes to complete.<br />
                    <br />
                    <span style={{ color: 'var(--teal)', fontWeight: 600 }}>[Your unique survey link will appear here]</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-teal"
                  disabled={sending || !selectedAssessmentId || emailCount === 0}
                >
                  {sending
                    ? 'Generating…'
                    : `Generate ${emailCount > 0 ? emailCount + ' ' : ''}Link${emailCount !== 1 ? 's' : ''}`
                  }
                </button>
              </form>
            </>
          )}
        </div>

        {/* ── RIGHT: Participation tracker ── */}
        <div className="card">
          <div className="flex-between mb-16">
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>Participation Tracker</div>
            {!tokensLoading && totalInvited > 0 && (
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{totalInvited} total invited</span>
            )}
          </div>

          {tokensLoading ? (
            <Spinner />
          ) : tokens.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: 13 }}>
              ✉ No invitations sent for this assessment yet.
            </div>
          ) : (
            <>
              {totalInvited > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 5 }}>
                    <span>Completion rate</span>
                    <span style={{ fontWeight: 600, color: completionRate >= 60 ? 'var(--teal)' : 'var(--text2)' }}>{completionRate}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${completionRate}%`, background: 'var(--teal)', borderRadius: 3, transition: 'width 0.4s' }} />
                  </div>
                </div>
              )}
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Sent</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontSize: 13 }}>{t.email}</td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtDate(t.created_at)}</td>
                      <td>
                        <span className={`tag ${t.used ? 'tag-complete' : 'tag-pending'}`}>
                          {t.used ? '✓ Done' : '○ Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
