import { useAuth } from '../../hooks/useAuth'
import { useClientData } from '../../hooks/useClientData'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function completionColor(rate) {
  if (rate >= 70) return 'var(--teal)'
  if (rate >= 40) return 'var(--gold2)'
  return 'var(--coral)'
}

function StatusTag({ assessment, reports }) {
  const hasReport = reports.some(r => r.assessment_id === assessment.id)
  if (hasReport) return <span className="tag tag-complete">✓ Report Ready</span>
  if (assessment.status === 'active') return <span className="tag tag-active">● Live</span>
  if (assessment.close_date && new Date(assessment.close_date) < new Date()) {
    return <span className="tag tag-pending">Closed</span>
  }
  if (assessment.status === 'closed') return <span className="tag tag-pending">Closed</span>
  return <span className="tag tag-review" style={{ textTransform: 'capitalize' }}>{assessment.status || 'Pending'}</span>
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(27,191,176,0.18)', borderTopColor: 'var(--teal)', animation: 'cas-spin 0.8s linear infinite' }} />
      <style>{`@keyframes cas-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function ClientAssessments() {
  const { profile } = useAuth()
  const { assessments, reports, loading, error } = useClientData(profile?.org_id)

  return (
    <div className="content">
      <div className="page-hero">
        <div className="hero-title">Assessments</div>
        <div className="hero-sub">Track all culture assessments launched for your organisation.</div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--coral-light)', border: '1px solid rgba(232,86,58,0.2)', borderRadius: 10, color: 'var(--coral)', fontSize: 13.5, marginBottom: 20 }}>
          ⚠ {error}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : assessments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '56px 32px' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)', marginBottom: 8 }}>No assessments yet</div>
          <div style={{ fontSize: 13.5, color: 'var(--text2)', maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
            No assessments have been launched for your organisation yet.
            Contact Africa International Advisors to get started.
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 680 }}>
              <thead>
                <tr>
                  <th>Assessment</th>
                  <th>Type</th>
                  <th>Period</th>
                  <th>Invited</th>
                  <th>Responded</th>
                  <th>Completion</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{a.name}</td>
                    <td>
                      <span className="badge badge-slate" style={{ textTransform: 'capitalize' }}>
                        {a.type || 'Full'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                      {fmtDate(a.launch_date)}<br />
                      <span style={{ color: 'var(--text3)' }}>→ {fmtDate(a.close_date)}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{a.total_invited}</td>
                    <td style={{ fontWeight: 600 }}>{a.total_responses}</td>
                    <td style={{ minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${a.completion_rate}%`,
                            background: completionColor(a.completion_rate),
                            borderRadius: 99,
                          }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: completionColor(a.completion_rate), minWidth: 34 }}>
                          {a.completion_rate}%
                        </span>
                      </div>
                    </td>
                    <td><StatusTag assessment={a} reports={reports} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
