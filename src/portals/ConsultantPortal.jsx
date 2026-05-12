import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOrganisations } from '../hooks/useOrganisations'
import { useAssessments } from '../hooks/useAssessments'
import { useReports } from '../hooks/useReports'
import { useAdminData } from '../hooks/useAdminData'
import { usePulse } from '../hooks/usePulse'
import { useYSWH } from '../hooks/useYSWH'
import supabase from '../lib/supabaseClient'
import UserMenu from '../components/UserMenu'
import './consultant.css'

// ── DIMENSIONS DATA ──────────────────────────────────────
const DIMENSIONS = [
  { name: 'Strategic Coherence', need: 'Clarity', quad: 'Direction & Structure', score: 82, color: '#1BBFB0', desc: 'Clear direction and shared understanding of where the organisation is going.', needDesc: 'People need to know where they are going and why.' },
  { name: 'Systems Intelligence', need: 'Connection', quad: 'Direction & Structure', score: 71, color: '#1BBFB0', desc: 'Ability to see the whole, connect the parts, and work beyond silos.', needDesc: 'People need to feel connected — to others, to the whole.' },
  { name: 'Execution Discipline', need: 'Progress', quad: 'Direction & Structure', score: 69, color: '#1A3560', desc: 'Ability to turn plans into results through clear roles and accountability.', needDesc: 'People need to feel they are getting somewhere.' },
  { name: 'Purpose & Meaning', need: 'Meaning', quad: 'Performance & Compliance', score: 74, color: '#1A3560', desc: 'Clear sense of why the organisation exists and how work contributes to value.', needDesc: 'People need to feel that what they do matters.' },
  { name: 'Governance & Decision Rights', need: 'Autonomy', quad: 'Performance & Compliance', score: 61, color: '#C9B882', desc: 'Clear authority and decision rights enabling timely, principled decisions.', needDesc: 'People need the freedom to use their own judgement.' },
  { name: 'Value Recognition', need: 'Worth', quad: 'Performance & Compliance', score: 47, color: '#E8563A', desc: 'Ability to see and reward all forms of value creation.', needDesc: 'People need to feel that their contribution has worth.' },
  { name: 'Listening & Learning', need: 'Growth', quad: 'Mobilisation & Engagement', score: 63, color: '#3A8FC4', desc: 'Listening without judgement, translating insight into learning and change.', needDesc: 'People need to grow — to learn, develop, become more.' },
  { name: 'Leadership Influence', need: 'Trust', quad: 'Mobilisation & Engagement', score: 67, color: '#1A3560', desc: 'Leaders creating trust, credibility, and using influence to guide behaviour.', needDesc: 'People need to trust those who lead them.' },
  { name: 'Psychological Safety', need: 'Voice', quad: 'Mobilisation & Engagement', score: 58, color: '#E8563A', desc: 'An environment where people speak up and challenge without fear.', needDesc: 'People need to be heard — to speak truthfully without fear.' },
  { name: 'Innovation', need: 'Imagination', quad: 'Transformation & Change', score: 71, color: '#1BBFB0', desc: 'Encouraging risk-taking and experimentation to drive competitive advantage.', needDesc: 'People need to imagine what isn\'t yet there.' },
  { name: 'Agility & Resilience', need: 'Confidence', quad: 'Transformation & Change', score: 76, color: '#1BBFB0', desc: 'Capacity to absorb change, recover from setbacks, and adapt quickly.', needDesc: 'People need to feel they can handle what comes.' },
  { name: 'Customer Orientation', need: 'Curiosity', quad: 'Transformation & Change', score: 79, color: '#1BBFB0', desc: 'Making decisions through the lens of customer value.', needDesc: 'People need to wonder about those they serve.' },
]

// ── SVG LOGO / FLUID MARK ────────────────────────────────
function FluidSVG({ size = 38, id = 'cf' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id={`${id}-a`} cx="30%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#C9E8A0" />
          <stop offset="40%" stopColor="#5BBFB0" />
          <stop offset="100%" stopColor="#1A6BAA" />
        </radialGradient>
        <radialGradient id={`${id}-b`} cx="70%" cy="65%" r="65%">
          <stop offset="0%" stopColor="#E8D890" />
          <stop offset="40%" stopColor="#5AB0D0" />
          <stop offset="100%" stopColor="#1BBFB0" />
        </radialGradient>
      </defs>
      <path d="M50 50 C50 50 20 35 18 20 C16 5 30 2 40 10 C50 18 50 50 50 50Z" fill={`url(#${id}-a)`} opacity="0.92" />
      <path d="M50 50 C50 50 15 55 12 70 C9 85 22 92 35 85 C48 78 50 50 50 50Z" fill={`url(#${id}-a)`} opacity="0.75" />
      <path d="M50 50 C50 50 80 35 82 20 C84 5 70 2 60 10 C50 18 50 50 50 50Z" fill={`url(#${id}-b)`} opacity="0.88" />
      <path d="M50 50 C50 50 85 55 88 70 C91 85 78 92 65 85 C52 78 50 50 50 50Z" fill={`url(#${id}-b)`} opacity="0.72" />
      <circle cx="50" cy="50" r="7" fill="white" opacity="0.36" />
    </svg>
  )
}

// ── DIMENSION BAR COLOR ───────────────────────────────────
function scoreBarClass(score) {
  if (score >= 75) return 'bar-teal'
  if (score >= 60) return 'bar-blue'
  if (score >= 50) return 'bar-gold'
  return 'bar-coral'
}

// ── MODEL WHEEL ───────────────────────────────────────────
function ModelWheel() {
  const cx = 360, cy = 360, r = 360
  const innerR = 80
  const segments = 12
  const angleStep = (2 * Math.PI) / segments

  const QUADS = [
    { name: 'Direction & Structure', color: '#1BBFB0', startIdx: 0, count: 3 },
    { name: 'Performance & Compliance', color: '#1A3560', startIdx: 3, count: 3 },
    { name: 'Mobilisation & Engagement', color: '#3A8FC4', startIdx: 6, count: 3 },
    { name: 'Transformation & Change', color: '#C9B882', startIdx: 9, count: 3 },
  ]

  function polar(angle, radius) {
    return {
      x: cx + radius * Math.cos(angle - Math.PI / 2),
      y: cy + radius * Math.sin(angle - Math.PI / 2),
    }
  }

  function arcPath(startAngle, endAngle, outerRadius, innerRadius) {
    const o1 = polar(startAngle, outerRadius)
    const o2 = polar(endAngle, outerRadius)
    const i1 = polar(endAngle, innerRadius)
    const i2 = polar(startAngle, innerRadius)
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
    return `M ${o1.x} ${o1.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${i2.x} ${i2.y} Z`
  }

  const scoreRings = DIMENSIONS.map((dim, i) => {
    const startAngle = i * angleStep
    const endAngle = startAngle + angleStep - 0.02
    const maxR = 280
    const minR = innerR + 20
    const scoreR = minR + ((dim.score / 100) * (maxR - minR))
    const quad = QUADS.find(q => q.startIdx <= i && i < q.startIdx + q.count)
    return { startAngle, endAngle, scoreR, color: quad?.color || '#1BBFB0', dim }
  })

  const labelRings = DIMENSIONS.map((dim, i) => {
    const midAngle = (i + 0.5) * angleStep - Math.PI / 2
    const labelR = 310
    const lp = {
      x: cx + labelR * Math.cos(midAngle),
      y: cy + labelR * Math.sin(midAngle),
    }
    const rotate = (midAngle * 180) / Math.PI + 90
    const flip = lp.x < cx
    return { lp, rotate: flip ? rotate + 180 : rotate, dim }
  })

  const quadArcs = QUADS.map((q, qi) => {
    const startAngle = q.startIdx * angleStep
    const endAngle = (q.startIdx + q.count) * angleStep - 0.02
    const midAngle = ((q.startIdx + q.count / 2) * angleStep) - Math.PI / 2
    const labelR = 345
    const lp = {
      x: cx + labelR * Math.cos(midAngle),
      y: cy + labelR * Math.sin(midAngle),
    }
    return { ...q, startAngle, endAngle, lp, midAngle }
  })

  return (
    <svg viewBox="0 0 720 720" style={{ width: '100%', maxWidth: 560, display: 'block', margin: '0 auto' }}>
      {/* Quadrant background arcs */}
      {quadArcs.map((q, i) => (
        <path
          key={i}
          d={arcPath(q.startAngle, q.endAngle, 330, innerR)}
          fill={q.color}
          opacity="0.06"
          stroke={q.color}
          strokeWidth="1"
          strokeOpacity="0.15"
        />
      ))}

      {/* Score arcs */}
      {scoreRings.map((s, i) => (
        <path
          key={i}
          d={arcPath(s.startAngle, s.endAngle, s.scoreR, innerR + 4)}
          fill={s.color}
          opacity="0.82"
        />
      ))}

      {/* Divider lines */}
      {DIMENSIONS.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2
        const p1 = { x: cx + innerR * Math.cos(angle), y: cy + innerR * Math.sin(angle) }
        const p2 = { x: cx + 330 * Math.cos(angle), y: cy + 330 * Math.sin(angle) }
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
      })}

      {/* Score text */}
      {scoreRings.map((s, i) => {
        const midAngle = (i + 0.5) * angleStep - Math.PI / 2
        const labelR = (innerR + 4 + s.scoreR) / 2
        const lp = { x: cx + labelR * Math.cos(midAngle), y: cy + labelR * Math.sin(midAngle) }
        return (
          <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill="white" opacity="0.9">
            {s.dim.score}
          </text>
        )
      })}

      {/* Center circle */}
      <circle cx={cx} cy={cy} r={innerR} fill="#0D1F3C" />
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1BBFB0">CultureXe</text>
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.5)">12-DIMENSION</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.5)">MODEL</text>

      {/* Quadrant labels */}
      {quadArcs.map((q, i) => (
        <text key={i} x={q.lp.x} y={q.lp.y} textAnchor="middle" dominantBaseline="middle" fontSize="8.5" fontWeight="700" fill={q.color} opacity="0.85" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {q.name}
        </text>
      ))}

      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={333} fill="none" stroke="#E2E8F0" strokeWidth="1" />
    </svg>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────
export default function ConsultantPortal() {
  const navigate = useNavigate()
  const { profile, role, signOut } = useAuth()
  const { organisations, createOrganisation, refetch: refetchOrgs } = useOrganisations()
  const { assessments, createAssessment, updateAssessment, refetch: refetchAssessments } = useAssessments()
  const { reports, releaseReport, updateReport } = useReports()
  const { users, createUser, updateUser, deactivateUser, loading: usersLoading } = useAdminData()
  const { entries: pulseEntries, stats: pulseStats } = usePulse(null)

  const [screen, setScreen] = useState('dashboard')
  const [showClientModal, setShowClientModal] = useState(false)
  const [showAssessmentModal, setShowAssessmentModal] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', industry: '', employee_count: '', contact_name: '', contact_email: '', country: '' })
  const [newAssessment, setNewAssessment] = useState({ name: '', org_id: '', type: '', open_date: '', close_date: '', target_respondents: '' })
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'client', org_id: '' })
  const [saving, setSaving] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [consultantNotes, setConsultantNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const [responseCount, setResponseCount] = useState(null)
  const [previewTab, setPreviewTab] = useState('welcome')
  const [previewQuestion, setPreviewQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [aopOrgFilter, setAopOrgFilter] = useState('all')
  const [inviteForm, setInviteForm] = useState({ org_id: '', assessment_id: '', emails: '', message: '' })
  const [inviteAssessments, setInviteAssessments] = useState([])
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteSent, setInviteSent] = useState(null)

  // Fetch total response count
  useEffect(() => {
    supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setResponseCount(count ?? 0))
  }, [])

  // Filter assessments for invite screen when org changes
  useEffect(() => {
    setInviteAssessments(assessments.filter(a => a.org_id === inviteForm.org_id))
    setInviteForm(p => ({ ...p, assessment_id: '' }))
  }, [inviteForm.org_id, assessments])

  // Derived report / assessment for report screen
  const selectedReport = selectedReportId
    ? reports.find(r => r.id === selectedReportId)
    : reports.find(r => r.status === 'released') || reports[0] || null

  const selectedAssessment = selectedReport
    ? assessments.find(a => a.id === selectedReport.assessment_id)
    : null

  // Load consultant notes when selected report changes
  useEffect(() => {
    setConsultantNotes(selectedReport?.consultant_notes || '')
    setNotesSaved(false)
  }, [selectedReport?.id])

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AIA'
  const displayName = profile?.full_name?.split(' ')[0] || 'User'

  const activeClients = organisations.length
  const activeAssessments = assessments.filter(a => ['active', 'live'].includes(a.status)).length
  const releasedReports = reports.filter(r => r.status === 'released').length
  const pendingReview = assessments.filter(a => ['pending_review', 'review'].includes(a.status)).length

  // New clients this month
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const newClientsThisMonth = organisations.filter(o => o.created_at && new Date(o.created_at) >= thirtyDaysAgo).length

  // Reports awaiting release
  const awaitingRelease = reports.filter(r => r.status !== 'released').length

  // Compute overall score from selected report
  const overallScore = (() => {
    const scores = selectedReport?.scores
    if (!scores || typeof scores !== 'object') return null
    const vals = Object.values(scores).map(Number).filter(v => !isNaN(v))
    if (!vals.length) return null
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  })()

  // Pulse themes — count dimension mentions, top 3
  const pulseThemes = (() => {
    const counts = {}
    pulseEntries.forEach(e => {
      if (Array.isArray(e.dimensions)) {
        e.dimensions.forEach(d => { counts[d] = (counts[d] || 0) + 1 })
      }
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([theme, count]) => ({ theme, count }))
  })()

  // Org lookup for pulse feed
  const orgById = organisations.reduce((m, o) => { m[o.id] = o; return m }, {})

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hr ago`
    return `${Math.floor(hrs / 24)} days ago`
  }

  const SCREEN_TITLES = {
    dashboard: 'Dashboard',
    clients: 'Client Orgs',
    assessments: 'Assessments',
    'assessment-take': 'Employee Preview',
    'always-on': 'Always On Pulse',
    'leadership-360': 'Leadership 360',
    report: 'Insights Report',
    model: 'CultureXe Model',
    invite: 'Invite Employees',
    settings: 'Platform Settings',
  }

  const NAV_ITEMS = [
    { key: 'dashboard', icon: '◉', label: 'Dashboard', section: 'Platform' },
    { key: 'clients', icon: '🏢', label: 'Client Orgs' },
    { key: 'assessments', icon: '📋', label: 'Assessments' },
    { key: 'always-on', icon: '⚡', label: 'Always On Pulse' },
    { key: 'leadership-360', icon: '◎', label: 'Leadership 360' },
    { key: 'assessment-take', icon: '👁️', label: 'Employee Preview', section: 'Tools' },
    { key: 'report', icon: '📊', label: 'Insights Report' },
    { key: 'model', icon: '⬡', label: 'CultureXe Model' },
    { key: 'invite', icon: '✉️', label: 'Invite Employees', section: 'Admin' },
    { key: 'settings', icon: '⚙', label: 'Settings' },
  ]

  const PREVIEW_QUESTIONS = [
    { dim: 'Strategic Coherence', text: 'I have a clear understanding of where our organisation is heading over the next 3 years.' },
    { dim: 'Systems Intelligence', text: 'Teams in our organisation collaborate effectively across departments and functions.' },
    { dim: 'Execution Discipline', text: 'We consistently follow through on plans and deliver on our commitments.' },
    { dim: 'Purpose & Meaning', text: 'I understand how my daily work contributes to our organisation\'s overall purpose.' },
    { dim: 'Psychological Safety', text: 'I feel safe to speak up, share concerns, and challenge ideas in my team.' },
  ]

  async function handleCreateClient() {
    if (!newClient.name.trim()) return
    setSaving(true)
    try {
      await createOrganisation(newClient)
      setShowClientModal(false)
      setNewClient({ name: '', industry: '', employee_count: '', contact_name: '', contact_email: '', country: '' })
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleCreateAssessment() {
    if (!newAssessment.name.trim() || !newAssessment.org_id) return
    setSaving(true)
    try {
      await createAssessment({
        name: newAssessment.name,
        org_id: newAssessment.org_id,
        type: newAssessment.type || 'Culture Baseline',
        open_date: newAssessment.open_date || null,
        close_date: newAssessment.close_date || null,
        target_respondents: newAssessment.target_respondents ? parseInt(newAssessment.target_respondents) : null,
        status: 'pending',
      })
      setShowAssessmentModal(false)
      setNewAssessment({ name: '', org_id: '', type: '', open_date: '', close_date: '', target_respondents: '' })
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleCreateUser() {
    if (!newUser.full_name.trim() || !newUser.email.trim() || !newUser.password.trim()) return
    setSaving(true)
    try {
      await createUser(newUser)
      setShowAddUserModal(false)
      setNewUser({ full_name: '', email: '', password: '', role: 'client', org_id: '' })
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  async function saveNotes() {
    if (!selectedReport) return
    await updateReport(selectedReport.id, { consultant_notes: consultantNotes })
    setNotesSaved(true)
  }

  async function handleRelease() {
    if (!selectedReport) return
    if (!window.confirm('Release this report to the client? This cannot be undone.')) return
    await releaseReport(selectedReport.id)
  }

  async function handleSendInvitations() {
    if (!inviteForm.org_id || !inviteForm.assessment_id || !inviteForm.emails.trim()) return
    const emailList = inviteForm.emails.split(/[\n,]+/).map(e => e.trim()).filter(Boolean)
    if (!emailList.length) return
    setInviteSending(true)
    try {
      const tokens = emailList.map(() => ({
        assessment_id: inviteForm.assessment_id,
        token: crypto.randomUUID(),
        used: false,
      }))
      const { data, error } = await supabase.from('response_tokens').insert(tokens).select()
      if (error) throw error
      await supabase.from('invitations').upsert(
        emailList.map((email, i) => ({
          assessment_id: inviteForm.assessment_id,
          org_id: inviteForm.org_id,
          email,
          token_id: data[i]?.id,
          status: 'pending',
        })),
        { onConflict: 'assessment_id,email' }
      )
      setInviteSent({ count: emailList.length })
      setInviteForm(p => ({ ...p, emails: '' }))
      await refetchAssessments()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setInviteSending(false) }
  }

  return (
    <div className="portal-c">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="logo-wrap">
          <div className="fluid-breathe">
            <FluidSVG size={38} id="cp-logo" />
          </div>
          <div>
            <div className="logo-wordmark">
              <span className="logo-cx">Culture</span>
              <span className="logo-xe">Xe</span>
            </div>
            <div className="logo-sub">by Africa International Advisors</div>
          </div>
        </div>

        <nav className="nav">
          {NAV_ITEMS.map((item, idx) => (
            <div key={item.key}>
              {item.section && <div className="nav-section">{item.section}</div>}
              <div
                className={`nav-item${screen === item.key ? ' active' : ''}`}
                onClick={() => setScreen(item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="aia-badge">
            <div className="aia-badge-name">Africa International Advisors</div>
            <div className="aia-badge-role">Consultant Portal · {role === 'superadmin' ? 'Super Admin' : 'Admin'}</div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main">
        {/* ── TOPBAR ── */}
        <div className="topbar">
          <div className="page-title">{SCREEN_TITLES[screen] || 'CultureXe'}</div>
          <div className="topbar-right">
            {role === 'superadmin' && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => navigate('/client')}
              >
                Client View →
              </button>
            )}
            <span className="badge badge-teal">● Platform Live</span>
            <UserMenu initials={initials} displayName={profile?.full_name || displayName} />
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="content">

          {/* ════════════════════════════════════════════════
              DASHBOARD SCREEN
          ════════════════════════════════════════════════ */}
          {screen === 'dashboard' && (
            <div>
              {/* Hero */}
              <div className="page-hero">
                <div className="hero-title">Welcome back, {displayName} 👋</div>
                <div className="hero-sub">Your platform is live across {activeClients} client organisations. Here's today's snapshot.</div>
                <div className="hero-fluid-pos fluid-spin">
                  <FluidSVG size={88} id="dash-hero" />
                </div>
              </div>

              {/* Stats */}
              <div className="grid-4 mb-28">
                <div className="stat-card">
                  <div className="stat-accent" style={{ background: '#1BBFB0' }} />
                  <div className="stat-label">Active Clients</div>
                  <div className="stat-value">{activeClients}</div>
                  <div className="stat-trend trend-up">↑ {newClientsThisMonth} new this month</div>
                </div>
                <div className="stat-card">
                  <div className="stat-accent" style={{ background: '#3A8FC4' }} />
                  <div className="stat-label">Assessments Running</div>
                  <div className="stat-value">{activeAssessments}</div>
                  <div className="stat-sub">{pendingReview} pending AIA review</div>
                </div>
                <div className="stat-card">
                  <div className="stat-accent" style={{ background: '#C9B882' }} />
                  <div className="stat-label">Responses Collected</div>
                  <div className="stat-value">{responseCount ?? 0}</div>
                  <div className="stat-trend trend-up">All time</div>
                </div>
                <div className="stat-card">
                  <div className="stat-accent" style={{ background: '#1A3560' }} />
                  <div className="stat-label">Reports Released</div>
                  <div className="stat-value">{releasedReports}</div>
                  <div className="stat-sub">{awaitingRelease} awaiting release</div>
                </div>
              </div>

              {/* AI Panel */}
              <div className="ai-panel">
                <div className="ai-panel-brain fluid-think">
                  <FluidSVG size={52} id="dash-ai" />
                </div>
                <div className="ai-panel-text">
                  <div className="ai-panel-title">CultureXE Intelligence Engine — Active</div>
                  <div className="ai-panel-desc">Real-time analysis running across all active assessments. {pulseStats.flagged} flagged entries require attention. Pulse active across {organisations.length} organisations.</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setScreen('report')}>View Reports →</button>
              </div>

              {/* Always On Pulse summary */}
              <div className="card mb-24">
                <div className="flex-between mb-16">
                  <div>
                    <div className="section-title">Always On Pulse — This Week</div>
                    <div className="section-sub">{pulseStats.thisWeek} sentiments collected across {organisations.length} organisations</div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FDE8E3', color: '#9A3825', borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E8563A', display: 'inline-block', animation: 'portal-c-breathe 1.5s ease-in-out infinite' }} />
                    LIVE
                  </span>
                </div>
                <div className="grid-3">
                  <div className="stat-card">
                    <div className="stat-accent" style={{ background: '#E8563A' }} />
                    <div className="stat-label">Flagged Concerns</div>
                    <div className="stat-value" style={{ color: '#E8563A' }}>{pulseStats.flagged}</div>
                    <div className="stat-sub">Require consultant review</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-accent" style={{ background: '#C9B882' }} />
                    <div className="stat-label">Emerging Themes</div>
                    <div className="stat-value" style={{ color: '#B8A060' }}>{pulseThemes.length}</div>
                    <div className="stat-sub">Cross-org pattern detected</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-accent" style={{ background: '#1BBFB0' }} />
                    <div className="stat-label">Total Submissions</div>
                    <div className="stat-value" style={{ color: '#0A8A7E' }}>{pulseStats.total}</div>
                    <div className="stat-sub">This week: {pulseStats.thisWeek}</div>
                  </div>
                </div>
              </div>

              {/* Grid 2 bottom cards */}
              <div className="grid-2">
                {/* Pending AIA Review */}
                <div className="card">
                  <div className="section-title mb-16">Pending AIA Review</div>
                  {assessments.filter(a => ['review', 'pending_review'].includes(a.status)).slice(0, 5).map((a, i) => (
                    <div className="onboard-step" key={a.id} onClick={() => { setSelectedReportId(reports.find(r => r.assessment_id === a.id)?.id || null); setScreen('report') }}>
                      <div className="step-num">{i + 1}</div>
                      <div>
                        <div className="step-title">{a.name}</div>
                        <div className="step-desc">{a.org_name} · {a.total_responses} responses · {a.completion_rate}% completion · Awaiting AIA sign-off</div>
                      </div>
                    </div>
                  ))}
                  {assessments.filter(a => ['review', 'pending_review'].includes(a.status)).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: 13 }}>No assessments awaiting review.</div>
                  )}
                </div>

                {/* Active Assessments */}
                <div className="card">
                  <div className="section-title mb-16">Active Assessments</div>
                  <table>
                    <thead>
                      <tr>
                        <th>Organisation</th>
                        <th>Progress</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.filter(a => ['active', 'live'].includes(a.status)).slice(0, 6).map(a => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 600 }}>{a.org_name}</td>
                          <td>
                            <div className="dim-bar-bg" style={{ width: 100 }}>
                              <div className={`dim-bar ${a.completion_rate > 60 ? 'bar-teal' : a.completion_rate > 30 ? 'bar-gold' : 'bar-coral'}`} style={{ width: `${a.completion_rate}%` }} />
                            </div>
                          </td>
                          <td style={{ fontWeight: 700, color: a.completion_rate > 50 ? '#0A8A7E' : a.completion_rate > 20 ? '#7A6030' : '#9A3825' }}>{a.completion_rate}%</td>
                        </tr>
                      ))}
                      {assessments.filter(a => ['active', 'live'].includes(a.status)).length === 0 && (
                        <tr><td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: 13 }}>No active assessments.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════
              CLIENTS SCREEN
          ════════════════════════════════════════════════ */}
          {screen === 'clients' && (
            <div>
              <div className="page-hero">
                <div className="hero-title">Client Organisations</div>
                <div className="hero-sub">Manage and monitor your active client portfolio.</div>
              </div>

              <div className="grid-3 mb-24">
                <div className="stat-card">
                  <div className="stat-accent" style={{ background: '#1BBFB0' }} />
                  <div className="stat-label">Total Clients</div>
                  <div className="stat-value">{activeClients}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-accent" style={{ background: '#3A8FC4' }} />
                  <div className="stat-label">Active Assessments</div>
                  <div className="stat-value">{activeAssessments}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-accent" style={{ background: '#1A3560' }} />
                  <div className="stat-label">Completed</div>
                  <div className="stat-value">{releasedReports}</div>
                </div>
              </div>

              <div className="card">
                <div className="flex-between mb-16">
                  <div className="section-title">All Clients</div>
                  <button className="btn btn-teal btn-sm" onClick={() => setShowClientModal(true)}>+ New Client</button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Organisation</th>
                      <th>Industry</th>
                      <th>Employees</th>
                      <th>Contact</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organisations.map(org => (
                      <tr key={org.id}>
                        <td style={{ fontWeight: 600 }}>{org.name}</td>
                        <td>{org.industry || '—'}</td>
                        <td>{org.employee_count ? org.employee_count.toLocaleString() : '—'}</td>
                        <td>{org.contact_name || '—'}</td>
                        <td>
                          <span className={`tag ${org.status === 'active' ? 'tag-active' : org.status === 'onboarding' ? 'tag-review' : 'tag-pending'}`}>
                            {org.status === 'active' ? '● Active' : org.status === 'onboarding' ? '⬡ Onboarding' : '○ Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {organisations.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text3)', fontSize: 13 }}>No clients yet. Add your first client above.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* New Client Modal */}
              {showClientModal && (
                <div className="modal-overlay" onClick={() => setShowClientModal(false)}>
                  <div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-title">Add New Client</div>
                    <div className="modal-sub">Create a new client organisation on the platform.</div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="cl-name">Organisation Name</label>
                      <input id="cl-name" className="form-input" type="text" placeholder="e.g. Nedbank" value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="cl-industry">Industry</label>
                        <select id="cl-industry" className="form-input" value={newClient.industry} onChange={e => setNewClient(p => ({ ...p, industry: e.target.value }))}>
                          <option value="">Select industry</option>
                          <option>Finance</option>
                          <option>Telecoms</option>
                          <option>Energy</option>
                          <option>Healthcare</option>
                          <option>Retail</option>
                          <option>Mining</option>
                          <option>Government</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="cl-emp">Employee Count</label>
                        <input id="cl-emp" className="form-input" type="number" placeholder="e.g. 5000" value={newClient.employee_count} onChange={e => setNewClient(p => ({ ...p, employee_count: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="cl-cname">Primary Contact Name</label>
                        <input id="cl-cname" className="form-input" type="text" placeholder="Full name" value={newClient.contact_name} onChange={e => setNewClient(p => ({ ...p, contact_name: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="cl-cemail">Primary Contact Email</label>
                        <input id="cl-cemail" className="form-input" type="email" placeholder="name@org.com" value={newClient.contact_email} onChange={e => setNewClient(p => ({ ...p, contact_email: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="cl-country">Country</label>
                      <input id="cl-country" className="form-input" type="text" placeholder="e.g. South Africa" value={newClient.country} onChange={e => setNewClient(p => ({ ...p, country: e.target.value }))} />
                    </div>
                    <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline" onClick={() => setShowClientModal(false)}>Cancel</button>
                      <button className="btn btn-teal" onClick={handleCreateClient} disabled={saving}>{saving ? 'Creating…' : 'Create Client'}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════
              ASSESSMENTS SCREEN
          ════════════════════════════════════════════════ */}
          {screen === 'assessments' && (
            <div>
              <div className="page-hero">
                <div className="hero-title">Assessments</div>
                <div className="hero-sub">Manage all culture and leadership assessments across your client portfolio.</div>
              </div>

              <div className="card">
                <div className="flex-between mb-16">
                  <div className="section-title">All Assessments</div>
                  <button className="btn btn-teal btn-sm" onClick={() => setShowAssessmentModal(true)}>+ New Assessment</button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Assessment</th>
                      <th>Client</th>
                      <th>Responses</th>
                      <th>Completion</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map(a => {
                      let statusTag = null
                      if (a.status === 'live' || a.status === 'active') statusTag = <span className="tag tag-active">● Live</span>
                      else if (a.status === 'pending_review' || a.status === 'review') statusTag = <span className="tag tag-review">⬡ AIA Review</span>
                      else if (a.status === 'completed' || a.status === 'complete') statusTag = <span className="tag tag-complete">✓ Complete</span>
                      else statusTag = <span className="tag tag-pending">◷ Pending</span>
                      return (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 600 }}>{a.name}</td>
                          <td>{a.org_name}</td>
                          <td>{a.total_responses}/{a.total_invited}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="dim-bar-bg" style={{ width: 70 }}>
                                <div className={`dim-bar ${a.completion_rate > 60 ? 'bar-teal' : a.completion_rate > 40 ? 'bar-gold' : 'bar-coral'}`} style={{ width: `${a.completion_rate}%` }} />
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{a.completion_rate}%</span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {statusTag}
                              {(a.status === 'active' || a.status === 'live') && (
                                <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }}
                                  onClick={() => updateAssessment(a.id, { status: 'review' })}>
                                  Close →
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {assessments.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text3)', fontSize: 13 }}>No assessments yet. Create your first assessment above.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* New Assessment Modal */}
              {showAssessmentModal && (
                <div className="modal-overlay" onClick={() => setShowAssessmentModal(false)}>
                  <div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-title">New Assessment</div>
                    <div className="modal-sub">Configure a new assessment for a client organisation.</div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="as-name">Assessment Name</label>
                      <input id="as-name" className="form-input" type="text" placeholder="e.g. Annual Culture Survey 2025" value={newAssessment.name} onChange={e => setNewAssessment(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="as-org">Client Organisation</label>
                      <select id="as-org" className="form-input" value={newAssessment.org_id} onChange={e => setNewAssessment(p => ({ ...p, org_id: e.target.value }))}>
                        <option value="">Select client…</option>
                        {organisations.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="as-type">Assessment Type</label>
                      <select id="as-type" className="form-input" value={newAssessment.type} onChange={e => setNewAssessment(p => ({ ...p, type: e.target.value }))}>
                        <option value="">Select type…</option>
                        <option>Culture Baseline</option>
                        <option>Culture Pulse</option>
                        <option>Leadership 360</option>
                        <option>Post-Merger Alignment</option>
                        <option>Employee Experience</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="as-open">Open Date</label>
                        <input id="as-open" className="form-input" type="date" value={newAssessment.open_date} onChange={e => setNewAssessment(p => ({ ...p, open_date: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="as-close">Close Date</label>
                        <input id="as-close" className="form-input" type="date" value={newAssessment.close_date} onChange={e => setNewAssessment(p => ({ ...p, close_date: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="as-target">Target Respondents</label>
                      <input id="as-target" className="form-input" type="number" placeholder="e.g. 500" value={newAssessment.target_respondents} onChange={e => setNewAssessment(p => ({ ...p, target_respondents: e.target.value }))} />
                    </div>
                    <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline" onClick={() => setShowAssessmentModal(false)}>Cancel</button>
                      <button className="btn btn-teal" onClick={handleCreateAssessment} disabled={saving}>{saving ? 'Creating…' : 'Create Assessment'}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════
              EMPLOYEE PREVIEW SCREEN
          ════════════════════════════════════════════════ */}
          {screen === 'assessment-take' && (
            <div>
              <div className="page-hero">
                <div className="hero-title">Employee Assessment Preview</div>
                <div className="hero-sub">See exactly how the assessment appears to employees before launch.</div>
              </div>

              {/* Tab switcher */}
              <div className="flex gap-8 mb-24">
                {['welcome', 'questions', 'complete'].map(t => (
                  <button
                    key={t}
                    className={`btn${previewTab === t ? ' btn-teal' : ' btn-outline'}`}
                    onClick={() => { setPreviewTab(t); setPreviewQuestion(0); setSelectedAnswer(null) }}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {t === 'complete' ? 'Completion' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* Preview window */}
              <div style={{ border: '2px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', maxWidth: 680, margin: '0 auto', boxShadow: 'var(--shadow-lg)' }}>
                {/* Browser chrome */}
                <div style={{ background: '#F0F0F0', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
                  {['#FF5F57', '#FFBD2E', '#28C840'].map((c, i) => (
                    <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
                  ))}
                  <div style={{ flex: 1, background: 'white', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#8A9BB0', textAlign: 'center' }}>
                    culturexe.com/assess/tlk-2025-abc123
                  </div>
                </div>

                {/* Welcome screen */}
                {previewTab === 'welcome' && (
                  <div style={{ background: 'white' }}>
                    <div style={{ background: 'linear-gradient(135deg, #1BBFB0 0%, #3A8FC4 100%)', padding: '32px 32px 24px', textAlign: 'center' }}>
                      <FluidSVG size={48} id="prev-logo" />
                      <div style={{ fontWeight: 800, fontSize: 20, color: 'white', marginTop: 10 }}>Culture<span style={{ color: '#C9E8A0' }}>Xe</span></div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Culture Assessment</div>
                    </div>
                    <div style={{ padding: '28px 32px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                        {[['⏱', '12–15 min', 'Completion time'], ['❓', '25 questions', 'Total questions'], ['⬡', '12 dimensions', 'Culture areas']].map(([icon, val, lbl]) => (
                          <div key={lbl} style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                            <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{val}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{lbl}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: '#E0F7F5', border: '1px solid rgba(27,191,176,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ color: '#1BBFB0', fontWeight: 700, flexShrink: 0 }}>🔒</span>
                        <div style={{ fontSize: 12.5, color: '#0A5550', lineHeight: 1.65 }}>
                          <strong>Your anonymity is guaranteed.</strong> Responses are fully anonymised. No individual response can be traced back to you. Results are only reported in aggregate groups of 5 or more.
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '16px 18px', marginBottom: 24, borderLeft: '3px solid var(--teal)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>Message from Leadership</div>
                        <div style={{ fontSize: 13, color: 'var(--navy)', lineHeight: 1.65 }}>
                          "This survey is our commitment to truly understanding our culture. Your honest input will shape our next chapter. Thank you for taking the time."
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text2)', marginTop: 8 }}>— Group CEO</div>
                      </div>
                      <button className="btn btn-teal" style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 15 }} onClick={() => setPreviewTab('questions')}>
                        Begin Assessment →
                      </button>
                    </div>
                  </div>
                )}

                {/* Questions screen */}
                {previewTab === 'questions' && (
                  <div style={{ background: 'white', padding: '28px 32px' }}>
                    {/* Progress */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
                        <span>Question {previewQuestion + 1} of {PREVIEW_QUESTIONS.length}</span>
                        <span>{PREVIEW_QUESTIONS[previewQuestion].dim}</span>
                      </div>
                      <div className="dim-bar-bg">
                        <div className="dim-bar bar-teal" style={{ width: `${((previewQuestion + 1) / PREVIEW_QUESTIONS.length) * 100}%`, transition: 'width 0.3s ease' }} />
                      </div>
                    </div>

                    {/* Question */}
                    <div style={{ marginBottom: 28 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
                        {PREVIEW_QUESTIONS[previewQuestion].dim}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.65 }}>
                        {PREVIEW_QUESTIONS[previewQuestion].text}
                      </div>
                    </div>

                    {/* Scale */}
                    <div style={{ marginBottom: 28 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            onClick={() => setSelectedAnswer(n)}
                            style={{
                              width: 50, height: 50, borderRadius: 12, border: `2px solid ${selectedAnswer === n ? 'var(--teal)' : 'var(--border)'}`,
                              background: selectedAnswer === n ? 'var(--teal-light)' : 'white',
                              color: selectedAnswer === n ? '#0A8A7E' : 'var(--navy)',
                              fontSize: 18, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                        <span>Strongly Disagree</span>
                        <span>Strongly Agree</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => { if (previewQuestion > 0) { setPreviewQuestion(p => p - 1); setSelectedAnswer(null) } }}
                        disabled={previewQuestion === 0}
                      >
                        ← Previous
                      </button>
                      <button
                        className="btn btn-teal btn-sm"
                        onClick={() => {
                          if (previewQuestion < PREVIEW_QUESTIONS.length - 1) {
                            setPreviewQuestion(p => p + 1)
                            setSelectedAnswer(null)
                          } else {
                            setPreviewTab('complete')
                          }
                        }}
                      >
                        {previewQuestion < PREVIEW_QUESTIONS.length - 1 ? 'Next →' : 'Submit →'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Completion screen */}
                {previewTab === 'complete' && (
                  <div style={{ background: 'white' }}>
                    <div style={{ background: 'linear-gradient(135deg, #0D1F3C, #0E3462)', padding: '40px 32px', textAlign: 'center', color: 'white' }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
                      <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Assessment Complete</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Thank you for your participation</div>
                    </div>
                    <div style={{ padding: '28px 32px', textAlign: 'center' }}>
                      <div style={{ background: 'var(--teal-light)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: 20, display: 'inline-block' }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Your Culture Score</div>
                        <div style={{ fontFamily: 'Arial', fontWeight: 800, fontSize: 52, color: 'var(--navy)', lineHeight: 1 }}>72</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>out of 100</div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20 }}>
                        Your responses have been recorded securely and anonymously. The CultureXe AI will synthesise all responses to provide your organisation with actionable culture intelligence.
                      </div>
                      <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setPreviewTab('welcome')}>
                        ← Back to Welcome
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════
              ALWAYS ON PULSE SCREEN
          ════════════════════════════════════════════════ */}
          {screen === 'always-on' && (
            <div>
              <div className="page-hero" style={{ background: 'linear-gradient(135deg, #0D1F3C 0%, #0A2A52 55%, #0E3462 100%)' }}>
                <div className="hero-title" style={{ color: 'white' }}>Always On Pulse</div>
                <div className="hero-sub" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 10 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1BBFB0', display: 'inline-block' }} />
                    LIVE
                  </span>
                  Real-time sentiment intelligence across all active organisations.
                </div>
              </div>

              <div className="grid-4 mb-24">
                <div className="stat-card">
                  <div className="stat-accent" style={{ background: '#1BBFB0' }} />
                  <div className="stat-label">Sentiments This Week</div>
                  <div className="stat-value">{pulseStats.thisWeek}</div>
                  <div className="stat-sub">Total: {pulseStats.total}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-accent" style={{ background: '#E8563A' }} />
                  <div className="stat-label">Flagged Concerns</div>
                  <div className="stat-value" style={{ color: '#E8563A' }}>{pulseStats.flagged}</div>
                  <div className="stat-sub">Require consultant review</div>
                </div>
                <div className="stat-card">
                  <div className="stat-accent" style={{ background: '#3A8FC4' }} />
                  <div className="stat-label">Active Organisations</div>
                  <div className="stat-value">{organisations.length}</div>
                  <div className="stat-sub">Across all platforms</div>
                </div>
                <div className="stat-card">
                  <div className="stat-accent" style={{ background: '#C9B882' }} />
                  <div className="stat-label">Avg Sentiment</div>
                  <div className="stat-value">{pulseStats.avgSentiment != null ? pulseStats.avgSentiment : '—'}<span style={{ fontSize: 16, fontWeight: 500 }}>{pulseStats.avgSentiment != null ? '/5' : ''}</span></div>
                  <div className="stat-sub">Based on scored entries</div>
                </div>
              </div>

              {/* AI Panel */}
              <div className="ai-panel">
                <div className="ai-panel-brain fluid-think">
                  <FluidSVG size={52} id="aop-ai" />
                </div>
                <div className="ai-panel-text">
                  <div className="ai-panel-title">AI Sentiment Analysis — Processing</div>
                  <div className="ai-panel-desc">Cross-referencing {pulseStats.total} submissions with historical baselines. {pulseThemes.length} emerging themes identified. {pulseStats.flagged} flagged entries require attention.</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setScreen('report')}>Full Report →</button>
              </div>

              <div className="grid-2">
                {/* Identified Themes */}
                <div className="card">
                  <div className="flex-between mb-16">
                    <div className="section-title">Identified Themes</div>
                    <select className="form-input" style={{ width: 'auto', fontSize: 12, padding: '5px 10px' }} value={aopOrgFilter} onChange={e => setAopOrgFilter(e.target.value)}>
                      <option value="all">All Orgs</option>
                      {organisations.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                  {pulseThemes.length > 0 ? pulseThemes.map((item, idx) => (
                    <div key={item.theme} className={idx === 0 ? 'insight alert' : idx === 1 ? 'insight warn' : 'insight'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div className="insight-title">{item.theme}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: idx === 0 ? '#9A3825' : idx === 1 ? '#7A6030' : '#0A8A7E' }}>
                          {item.count} mentions
                        </span>
                      </div>
                      <div className="insight-text">Top dimension mentioned in pulse entries.</div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: 13 }}>No pulse data yet.</div>
                  )}
                </div>

                {/* Live Sentiment Feed */}
                <div className="card">
                  <div className="section-title mb-16">Live Sentiment Feed</div>
                  {pulseEntries
                    .filter(e => aopOrgFilter === 'all' || e.org_id === aopOrgFilter)
                    .slice(0, 4)
                    .map((entry, i) => {
                      const org = orgById[entry.org_id]
                      const sentiment = entry.flagged ? 'alert' : (entry.sentiment && Number(entry.sentiment) < 2.5 ? 'warn' : 'positive')
                      return (
                        <div key={entry.id} style={{ padding: '14px 16px', background: sentiment === 'alert' ? 'var(--coral-light)' : sentiment === 'warn' ? 'var(--gold-light)' : 'var(--teal-light)', borderRadius: 10, marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{org?.name || '—'}</span>
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{timeAgo(entry.created_at)}</span>
                          </div>
                          {Array.isArray(entry.dimensions) && entry.dimensions.length > 0 && (
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                              {entry.dimensions.map(t => <span key={t} className="badge badge-slate">{t}</span>)}
                            </div>
                          )}
                          <div style={{ fontSize: 12.5, color: 'var(--navy)', lineHeight: 1.6, fontStyle: 'italic' }}>"{entry.text}"</div>
                        </div>
                      )
                    })}
                  {pulseEntries.filter(e => aopOrgFilter === 'all' || e.org_id === aopOrgFilter).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: 13 }}>No pulse entries yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════
              LEADERSHIP 360 SCREEN
          ════════════════════════════════════════════════ */}
          {screen === 'leadership-360' && (
            <div>
              <div className="page-hero">
                <div className="hero-title">Leadership 360</div>
                <div className="hero-sub">Multi-rater feedback integrated with culture dimension analysis.</div>
              </div>

              <div className="grid-3 mb-24">
                <div className="stat-card">
                  <div className="stat-accent" style={{ background: '#1BBFB0' }} />
                  <div className="stat-label">Leaders Assessed</div>
                  <div className="stat-value">8</div>
                </div>
                <div className="stat-card">
                  <div className="stat-accent" style={{ background: '#3A8FC4' }} />
                  <div className="stat-label">Total Raters</div>
                  <div className="stat-value">96</div>
                </div>
                <div className="stat-card">
                  <div className="stat-accent" style={{ background: '#C9B882' }} />
                  <div className="stat-label">Completion</div>
                  <div className="stat-value">74%</div>
                </div>
              </div>

              <div className="grid-2">
                {/* Culture vs 360 Alignment */}
                <div className="card">
                  <div className="section-title mb-16">Cross-Assessment Alignment</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textAlign: 'center' }}>Culture Survey</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textAlign: 'center' }}>Leadership 360</div>
                  </div>
                  {[
                    { dim: 'Strategic Coherence', cScore: 82, lScore: 76 },
                    { dim: 'Leadership Influence', cScore: 67, lScore: 71 },
                    { dim: 'Psychological Safety', cScore: 58, lScore: 64 },
                    { dim: 'Value Recognition', cScore: 47, lScore: 53 },
                    { dim: 'Listening & Learning', cScore: 63, lScore: 68 },
                  ].map(row => (
                    <div key={row.dim} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11.5, color: 'var(--navy)', fontWeight: 500, marginBottom: 5 }}>{row.dim}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <div className="dim-bar-bg">
                            <div className={`dim-bar ${scoreBarClass(row.cScore)}`} style={{ width: `${row.cScore}%` }} />
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{row.cScore}</div>
                        </div>
                        <div>
                          <div className="dim-bar-bg">
                            <div className={`dim-bar ${scoreBarClass(row.lScore)}`} style={{ width: `${row.lScore}%` }} />
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{row.lScore}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Leader Leaderboard */}
                <div className="card">
                  <div className="section-title mb-16">Leader Leaderboard</div>
                  <table>
                    <thead>
                      <tr>
                        <th>Leader</th>
                        <th>Self</th>
                        <th>Reports</th>
                        <th>Peers</th>
                        <th>Mgr</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'Sipho N.', self: 78, reports: 74, peers: 72, mgr: 80 },
                        { name: 'Naledi D.', self: 71, reports: 76, peers: 69, mgr: 74 },
                        { name: 'Thabo M.', self: 66, reports: 61, peers: 63, mgr: 58 },
                        { name: 'Priya K.', self: 82, reports: 79, peers: 77, mgr: 85 },
                        { name: 'Johan V.', self: 59, reports: 52, peers: 55, mgr: 61 },
                        { name: 'Fatima A.', self: 74, reports: 71, peers: 73, mgr: 76 },
                        { name: 'Kwame S.', self: 68, reports: 65, peers: 67, mgr: 70 },
                        { name: 'Lerato B.', self: 77, reports: 80, peers: 75, mgr: 78 },
                      ].map(l => (
                        <tr key={l.name}>
                          <td style={{ fontWeight: 600 }}>{l.name}</td>
                          <td style={{ color: 'var(--text2)' }}>{l.self}</td>
                          <td style={{ fontWeight: 600, color: l.reports >= 70 ? '#0A8A7E' : l.reports >= 60 ? '#7A6030' : '#9A3825' }}>{l.reports}</td>
                          <td style={{ color: 'var(--text2)' }}>{l.peers}</td>
                          <td style={{ color: 'var(--text2)' }}>{l.mgr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="insight" style={{ marginTop: 16 }}>
                    <div className="insight-title">Key Finding</div>
                    <div className="insight-text">Thabo M. and Johan V. show significant self-overestimation (self score vs. direct reports gap of 5–7 points). Recommend coaching conversation with AIA consultant.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════
              REPORT SCREEN
          ════════════════════════════════════════════════ */}
          {screen === 'report' && (
            <div>
              {/* Report selector */}
              {reports.length > 1 && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <select className="form-input" value={selectedReportId || ''} onChange={e => setSelectedReportId(e.target.value || null)}>
                    {reports.map(r => {
                      const a = assessments.find(x => x.id === r.assessment_id)
                      return <option key={r.id} value={r.id}>{a?.org_name || '—'} · {a?.name || 'Report'} · {r.status}</option>
                    })}
                  </select>
                </div>
              )}

              {selectedReport ? (
                <>
                  {/* Report hero */}
                  <div className="report-hero">
                    <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, background: 'radial-gradient(circle, rgba(27,191,176,0.12) 0%, transparent 68%)', borderRadius: '50%' }} />
                    <div className="report-org">{(selectedAssessment?.org_name || '—').toUpperCase()}</div>
                    <div className="report-title">{selectedAssessment?.name || '—'} — Full Assessment Report</div>
                    <div className="report-date">
                      {selectedReport.released_at
                        ? `Released: ${new Date(selectedReport.released_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : selectedReport.status === 'draft' ? 'Draft — Not yet released' : ''}
                    </div>
                    <div className="report-scores">
                      <div className="report-score-item">
                        <div className="report-score-val">{overallScore ?? '—'}</div>
                        <div className="report-score-lbl">Overall Score</div>
                      </div>
                      <div className="report-score-item">
                        <div className="report-score-val">{selectedAssessment?.completion_rate != null ? `${selectedAssessment.completion_rate}%` : '—'}</div>
                        <div className="report-score-lbl">Participation</div>
                      </div>
                      <div className="report-score-item">
                        <div className="report-score-val">{selectedAssessment?.total_responses ?? '—'}</div>
                        <div className="report-score-lbl">Responses</div>
                      </div>
                    </div>
                  </div>

                  {/* Quadrant overview + participation */}
                  <div className="grid-2 mb-24">
                    <div className="card">
                      <div className="section-title mb-16">Quadrant Overview</div>
                      {[
                        { name: 'Direction & Structure', dims: ['Strategic Coherence', 'Systems Intelligence', 'Execution Discipline'], color: '#0A8A7E', bg: 'var(--teal-light)' },
                        { name: 'Performance & Compliance', dims: ['Purpose & Meaning', 'Governance & Decision Rights', 'Value Recognition'], color: '#7A6030', bg: 'var(--gold-light)' },
                        { name: 'Mobilisation & Engagement', dims: ['Listening & Learning', 'Leadership Influence', 'Psychological Safety'], color: 'var(--slate)', bg: 'var(--slate-light)' },
                        { name: 'Transformation & Change', dims: ['Innovation', 'Agility & Resilience', 'Customer Orientation'], color: '#0A8A7E', bg: 'var(--teal-light)' },
                      ].map(q => {
                        const scores = q.dims.map(d => selectedReport?.scores?.[d] ?? DIMENSIONS.find(x => x.name === d)?.score ?? 0)
                        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                        return (
                          <div key={q.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, marginBottom: 8, background: q.bg }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy)' }}>{q.name}</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: q.color }}>{avg}</div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="card">
                      <div className="section-title mb-16">Assessment Details</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                          { label: 'Organisation', value: selectedAssessment?.org_name || '—' },
                          { label: 'Assessment', value: selectedAssessment?.name || '—' },
                          { label: 'Status', value: selectedReport.status },
                          { label: 'Total Invited', value: selectedAssessment?.total_invited ?? '—' },
                          { label: 'Total Responses', value: selectedAssessment?.total_responses ?? '—' },
                          { label: 'Completion Rate', value: selectedAssessment?.completion_rate != null ? `${selectedAssessment.completion_rate}%` : '—' },
                        ].map(row => (
                          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                            <span style={{ color: 'var(--text3)', fontWeight: 500 }}>{row.label}</span>
                            <span style={{ color: 'var(--navy)', fontWeight: 600 }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 12-Dimension Scores */}
                  <div className="card mb-24">
                    <div className="flex-between mb-16">
                      <div>
                        <div className="section-title">12-Dimension Culture Scores</div>
                        <div className="section-sub">{selectedAssessment?.org_name || '—'} · {selectedAssessment?.name || '—'} · n={selectedAssessment?.total_responses ?? '—'}</div>
                      </div>
                      <select className="form-input" style={{ width: 'auto', fontSize: 12, padding: '6px 10px' }}>
                        <option>All Segments</option>
                      </select>
                    </div>
                    <div className="grid-2">
                      {[DIMENSIONS.slice(0, 6), DIMENSIONS.slice(6, 12)].map((col, ci) => (
                        <div key={ci}>
                          {col.map(dim => {
                            const score = selectedReport?.scores?.[dim.name] ?? dim.score
                            return (
                              <div key={dim.name} className="dim-item">
                                <div className="dim-header">
                                  <span className="dim-name">{dim.name}</span>
                                  <span className="dim-score">{score}</span>
                                </div>
                                <div className="dim-bar-bg">
                                  <div className={`dim-bar ${scoreBarClass(score)}`} style={{ width: `${score}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Insights */}
                  <div className="ai-panel mb-24">
                    <div className="ai-panel-brain fluid-think">
                      <FluidSVG size={52} id="rep-ai" />
                    </div>
                    <div className="ai-panel-text">
                      <div className="ai-panel-title">CultureXE AI Key Insights</div>
                      <div className="ai-panel-desc">AI-generated insights based on cross-dimensional analysis and benchmark comparison.</div>
                    </div>
                  </div>

                  {/* Always On Pulse section */}
                  <div className="card mb-24">
                    <div className="section-title mb-16">Always On Pulse — Integrated Findings</div>
                    <div className="grid-3">
                      <div className="insight alert">
                        <div className="insight-title">Flagged Entries</div>
                        <div className="insight-text">{pulseStats.flagged} entries flagged for consultant review.</div>
                      </div>
                      <div className="insight warn">
                        <div className="insight-title">This Week</div>
                        <div className="insight-text">{pulseStats.thisWeek} new pulse submissions in the last 7 days.</div>
                      </div>
                      <div className="insight">
                        <div className="insight-title">Total Submissions</div>
                        <div className="insight-text">{pulseStats.total} entries collected across all organisations.</div>
                      </div>
                    </div>
                  </div>

                  {/* Consultant Notes + Release */}
                  <div className="card">
                    <div className="section-title mb-16">AIA Consultant Notes</div>
                    <textarea
                      className="form-input"
                      style={{ height: 120, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                      placeholder="Add your professional interpretation and recommendations before releasing this report to the client..."
                      value={consultantNotes}
                      onChange={e => { setConsultantNotes(e.target.value); setNotesSaved(false) }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                      <button className="btn btn-outline" onClick={saveNotes}>
                        {notesSaved ? 'Saved ✓' : 'Save Notes'}
                      </button>
                      {selectedReport.status !== 'released' && (
                        <button className="btn btn-teal" onClick={handleRelease}>Release Report to Client →</button>
                      )}
                      {selectedReport.status === 'released' && (
                        <span className="badge badge-teal">● Released</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text3)' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>No Reports Yet</div>
                  <div style={{ fontSize: 14 }}>Reports will appear here once an assessment is complete and a report is created.</div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════
              MODEL SCREEN
          ════════════════════════════════════════════════ */}
          {screen === 'model' && (
            <div>
              <div className="page-hero">
                <div className="hero-title">The CultureXe Model</div>
                <div className="hero-sub">Africa's most advanced 12-dimension organisational culture framework — built on human needs theory.</div>
              </div>

              {/* Premise */}
              <div className="card mb-24">
                <div className="section-title mb-16">The Premise</div>
                <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.8, maxWidth: 720 }}>
                  CultureXe is built on a single belief: <strong style={{ color: 'var(--navy)' }}>culture is the expression of human needs at work.</strong> Twelve universal human needs — from Clarity to Curiosity — shape how people experience their organisation. When those needs are met, culture thrives. When they're neglected, it deteriorates. Each dimension maps to one need, one quadrant, and one measurable behaviour cluster.
                </div>
              </div>

              {/* Wheel */}
              <div className="card mb-24">
                <div className="section-title mb-16" style={{ textAlign: 'center' }}>The 12-Dimension Culture Wheel</div>
                <ModelWheel />
              </div>

              {/* Axes */}
              <div className="grid-2 mb-24">
                <div className="card">
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 10 }}>Horizontal Axis: Internal → External</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75 }}>
                    The left hemisphere captures <strong>inward-facing</strong> culture dynamics — how the organisation manages itself, its people, and its structures. The right hemisphere captures <strong>outward-facing</strong> dynamics — how it creates value, adapts, and engages its market.
                  </div>
                </div>
                <div className="card">
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 10 }}>Vertical Axis: Stability → Adaptability</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75 }}>
                    The upper hemisphere captures dimensions that drive <strong>stability, structure, and performance</strong>. The lower hemisphere captures dimensions that drive <strong>transformation, agility, and human connection</strong>.
                  </div>
                </div>
              </div>

              {/* Wellbeing note */}
              <div className="card mb-24" style={{ background: 'linear-gradient(135deg, var(--teal-light), var(--blue-light))' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 8 }}>On Wellbeing</div>
                <div style={{ fontSize: 13, color: '#2A4560', lineHeight: 1.75 }}>
                  CultureXe intentionally avoids a standalone "wellbeing" dimension. Wellbeing is not a programme — it is the <em>outcome</em> of culture. When all 12 dimensions are in healthy alignment, wellbeing emerges naturally. When they are not, no amount of yoga classes or EAP programmes will compensate.
                </div>
              </div>

              {/* 12 dimensions by quadrant */}
              {['Direction & Structure', 'Performance & Compliance', 'Mobilisation & Engagement', 'Transformation & Change'].map(quad => {
                const dims = DIMENSIONS.filter(d => d.quad === quad)
                const quadColor = dims[0]?.color || '#1BBFB0'
                return (
                  <div key={quad} className="card mb-24">
                    <div style={{ fontWeight: 700, fontSize: 16, color: quadColor, marginBottom: 16 }}>{quad}</div>
                    <div className="grid-3">
                      {dims.map(dim => (
                        <div key={dim.name} style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: 16 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--navy)', marginBottom: 4 }}>{dim.name}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: quadColor, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Need: {dim.need}</div>
                          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 8 }}>{dim.desc}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--navy)', fontStyle: 'italic', paddingLeft: 10, borderLeft: `2px solid ${quadColor}` }}>{dim.needDesc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ════════════════════════════════════════════════
              INVITE SCREEN
          ════════════════════════════════════════════════ */}
          {screen === 'invite' && (
            <div>
              <div className="page-hero">
                <div className="hero-title">Invite Employees</div>
                <div className="hero-sub">Send assessment invitations and track participation across organisations.</div>
              </div>

              <div className="grid-2">
                <div>
                  {/* Send Invitations */}
                  <div className="card mb-24">
                    <div className="section-title mb-16">Send Invitations</div>
                    {inviteSent && (
                      <div className="insight" style={{ marginBottom: 16 }}>
                        <div className="insight-title">Invitations Sent</div>
                        <div className="insight-text">{inviteSent.count} invitation tokens created successfully.</div>
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label" htmlFor="inv-org">Client Organisation</label>
                      <select id="inv-org" className="form-input" value={inviteForm.org_id} onChange={e => setInviteForm(p => ({ ...p, org_id: e.target.value }))}>
                        <option value="">Select organisation…</option>
                        {organisations.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="inv-assessment">Assessment</label>
                      <select id="inv-assessment" className="form-input" value={inviteForm.assessment_id} onChange={e => setInviteForm(p => ({ ...p, assessment_id: e.target.value }))} disabled={!inviteForm.org_id}>
                        <option value="">Select assessment…</option>
                        {inviteAssessments.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="inv-emails">Email List</label>
                      <textarea
                        id="inv-emails"
                        className="form-input"
                        style={{ height: 100, resize: 'vertical', fontFamily: 'inherit' }}
                        placeholder="Paste email addresses, one per line or comma separated..."
                        value={inviteForm.emails}
                        onChange={e => setInviteForm(p => ({ ...p, emails: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="inv-msg">Custom Message (optional)</label>
                      <textarea
                        id="inv-msg"
                        className="form-input"
                        style={{ height: 80, resize: 'vertical', fontFamily: 'inherit' }}
                        placeholder="Add a personalised message from the organisation's leadership..."
                        value={inviteForm.message}
                        onChange={e => setInviteForm(p => ({ ...p, message: e.target.value }))}
                      />
                    </div>
                    <button className="btn btn-teal" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSendInvitations} disabled={inviteSending}>
                      {inviteSending ? 'Sending…' : 'Send Invitations →'}
                    </button>
                  </div>
                </div>

                <div>
                  {/* Participation Tracker */}
                  <div className="card mb-24">
                    <div className="section-title mb-16">Participation Tracker</div>
                    {assessments.filter(a => ['active', 'live'].includes(a.status)).map(a => (
                      <div key={a.id} className="dim-item">
                        <div className="dim-header">
                          <span className="dim-name" style={{ fontSize: 14, fontWeight: 600 }}>{a.org_name}</span>
                          <span className="dim-score">{a.completion_rate}% <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>({a.total_responses}/{a.total_invited})</span></span>
                        </div>
                        <div className="dim-bar-bg" style={{ height: 9 }}>
                          <div className={`dim-bar ${a.completion_rate > 60 ? 'bar-teal' : a.completion_rate > 30 ? 'bar-gold' : 'bar-coral'}`} style={{ width: `${a.completion_rate}%` }} />
                        </div>
                      </div>
                    ))}
                    {assessments.filter(a => ['active', 'live'].includes(a.status)).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: 13 }}>No active assessments to track.</div>
                    )}
                  </div>

                  {/* Send Reminders */}
                  <div className="card">
                    <div className="section-title mb-16">Send Reminders</div>
                    {assessments.filter(a => ['active', 'live'].includes(a.status) && a.completion_rate < 30).map(a => (
                      <div key={a.id} className="insight warn" style={{ marginBottom: 12 }}>
                        <div className="insight-title">Low Participation Alert — {a.org_name}</div>
                        <div className="insight-text">Only {a.completion_rate}% completion. Consider sending a reminder to drive urgency.</div>
                      </div>
                    ))}
                    {assessments.filter(a => ['active', 'live'].includes(a.status) && a.completion_rate < 30).length === 0 && (
                      <div style={{ fontSize: 13, color: 'var(--text3)' }}>No low-participation alerts at this time.</div>
                    )}
                    <div className="flex-between" style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 13, color: 'var(--text2)' }}>Send automated reminder to non-respondents</div>
                      <button className="btn btn-outline btn-sm">Send Reminder</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════
              SETTINGS SCREEN
          ════════════════════════════════════════════════ */}
          {screen === 'settings' && (
            <div>
              <div className="page-hero">
                <div className="hero-title">Platform Settings</div>
                <div className="hero-sub">Configure platform branding, assessment defaults, and user management.</div>
              </div>

              <div className="grid-2 mb-24">
                {/* AIA Branding */}
                <div className="card">
                  <div className="section-title mb-16">AIA Branding</div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="set-pname">Platform Name</label>
                    <input id="set-pname" className="form-input" defaultValue="CultureXe by Africa International Advisors" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="set-domain">Custom Domain</label>
                    <input id="set-domain" className="form-input" defaultValue="culturexe.africaia.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="set-email">Contact Email</label>
                    <input id="set-email" className="form-input" type="email" defaultValue="support@africaia.com" />
                  </div>
                  <button className="btn btn-teal">Save Branding</button>
                </div>

                {/* Assessment Defaults */}
                <div className="card">
                  <div className="section-title mb-16">Assessment Defaults</div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="set-qpd">Questions per Dimension</label>
                    <select id="set-qpd" className="form-input" defaultValue="2">
                      <option value="1">1 question</option>
                      <option value="2">2 questions</option>
                      <option value="3">3 questions</option>
                      <option value="4">4 questions</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="set-scale">Scale Type</label>
                    <select id="set-scale" className="form-input">
                      <option>1–5 Agreement Scale</option>
                      <option>1–7 Agreement Scale</option>
                      <option>1–10 Agreement Scale</option>
                      <option>Frequency Scale</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="set-release">Report Release</label>
                    <select id="set-release" className="form-input">
                      <option>Requires AIA consultant approval</option>
                      <option>Auto-release on completion</option>
                      <option>Manual release by client</option>
                    </select>
                  </div>
                  <button className="btn btn-teal">Save Defaults</button>
                </div>
              </div>

              {/* User Management */}
              <div className="card">
                <div className="flex-between mb-16">
                  <div>
                    <div className="section-title">User Management</div>
                    <div className="section-sub">All platform users across all organisations.</div>
                  </div>
                  <button className="btn btn-teal btn-sm" onClick={() => setShowAddUserModal(true)}>+ Add User</button>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Organisation</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>Loading users…</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text3)', fontSize: 13 }}>No users found.</td></tr>
                    ) : users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.full_name || '—'}</td>
                        <td style={{ color: 'var(--text2)' }}>{u.email}</td>
                        <td><span className="badge badge-slate">{u.role}</span></td>
                        <td>{u.org_name || '—'}</td>
                        <td>
                          {u.active !== false
                            ? <span className="tag tag-active">● Active</span>
                            : <span className="tag tag-pending">○ Inactive</span>
                          }
                        </td>
                        <td>
                          {u.active !== false && (
                            <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }}
                              onClick={() => { if (window.confirm(`Deactivate ${u.full_name}?`)) deactivateUser(u.id) }}>
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Consultants</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {users.filter(u => u.role === 'consultant' || u.role === 'superadmin').map(u => (
                      <div key={u.id} style={{ background: 'var(--teal-light)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{u.full_name || u.email}</span>
                        <span style={{ color: 'var(--text3)', marginLeft: 6 }}>({u.role})</span>
                      </div>
                    ))}
                    {users.filter(u => u.role === 'consultant' || u.role === 'superadmin').length === 0 && (
                      <div style={{ color: 'var(--text3)', fontSize: 13 }}>No consultants found.</div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Client Users</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {users.filter(u => u.role === 'client').map(u => (
                      <div key={u.id} style={{ background: 'var(--blue-light)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{u.full_name || u.email}</span>
                        <span style={{ color: 'var(--text3)', marginLeft: 6 }}>({u.org_name || '—'})</span>
                      </div>
                    ))}
                    {users.filter(u => u.role === 'client').length === 0 && (
                      <div style={{ color: 'var(--text3)', fontSize: 13 }}>No client users found.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Add User Modal */}
              {showAddUserModal && (
                <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
                  <div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-title">Add New User</div>
                    <div className="modal-sub">Create a new platform user account.</div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="usr-name">Full Name</label>
                      <input id="usr-name" className="form-input" type="text" placeholder="e.g. Sipho Nkosi" value={newUser.full_name} onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="usr-email">Email</label>
                      <input id="usr-email" className="form-input" type="email" placeholder="user@example.com" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="usr-pass">Password</label>
                      <input id="usr-pass" className="form-input" type="password" placeholder="Temporary password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="usr-role">Role</label>
                        <select id="usr-role" className="form-input" value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                          <option value="consultant">Consultant</option>
                          <option value="client">Client</option>
                          <option value="employee">Employee</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="usr-org">Organisation</label>
                        <select id="usr-org" className="form-input" value={newUser.org_id} onChange={e => setNewUser(p => ({ ...p, org_id: e.target.value }))}>
                          <option value="">No organisation</option>
                          {organisations.map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline" onClick={() => setShowAddUserModal(false)}>Cancel</button>
                      <button className="btn btn-teal" onClick={handleCreateUser} disabled={saving}>{saving ? 'Creating…' : 'Create User'}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
