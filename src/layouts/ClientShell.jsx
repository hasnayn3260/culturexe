import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import supabase from '../lib/supabaseClient'

const LogoMark = () => (
  <div className="fluid-breathe">
    <svg width="38" height="38" viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="csl1" cx="30%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#C9E8A0"/>
          <stop offset="40%" stopColor="#5BBFB0"/>
          <stop offset="100%" stopColor="#1A6BAA"/>
        </radialGradient>
        <radialGradient id="csl2" cx="70%" cy="65%" r="65%">
          <stop offset="0%" stopColor="#E8D890"/>
          <stop offset="40%" stopColor="#5AB0D0"/>
          <stop offset="100%" stopColor="#1BBFB0"/>
        </radialGradient>
      </defs>
      <path d="M50 50 C50 50 20 35 18 20 C16 5 30 2 40 10 C50 18 50 50 50 50Z" fill="url(#csl1)" opacity="0.92"/>
      <path d="M50 50 C50 50 15 55 12 70 C9 85 22 92 35 85 C48 78 50 50 50 50Z" fill="url(#csl1)" opacity="0.75"/>
      <path d="M50 50 C50 50 80 35 82 20 C84 5 70 2 60 10 C50 18 50 50 50 50Z" fill="url(#csl2)" opacity="0.88"/>
      <path d="M50 50 C50 50 85 55 88 70 C91 85 78 92 65 85 C52 78 50 50 50 50Z" fill="url(#csl2)" opacity="0.72"/>
      <circle cx="50" cy="50" r="7" fill="white" opacity="0.36"/>
    </svg>
  </div>
)

const navItem = ({ isActive }) => 'nav-item' + (isActive ? ' active' : '')

const MOB_NAV = [
  { to: '/client/dashboard',   icon: '◉',  label: 'Home'    },
  { to: '/client/assessments', icon: '📋', label: 'Assess'  },
  { to: '/client/reports',     icon: '📊', label: 'Reports' },
]

function ClientSidebar({ orgName }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (isMobile) {
    return (
      <aside className="sidebar">
        {MOB_NAV.map(item => (
          <NavLink key={item.to} to={item.to} className={navItem}>
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </aside>
    )
  }

  return (
    <aside className="sidebar">
      <div className="logo-wrap">
        <LogoMark />
        <div>
          <div className="logo-wordmark">
            <span className="logo-cx">Culture</span>
            <span className="logo-xe">Xe</span>
          </div>
          <div className="logo-sub">by Africa International Advisors</div>
        </div>
      </div>

      <nav className="nav">
        <div className="nav-section">Client Portal</div>
        <NavLink to="/client/dashboard"   className={navItem}><span className="nav-icon">◉</span> Dashboard</NavLink>
        <NavLink to="/client/assessments" className={navItem}><span className="nav-icon">📋</span> Assessments</NavLink>
        <NavLink to="/client/reports"     className={navItem}><span className="nav-icon">📊</span> Reports</NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="aia-badge">
          <div className="aia-badge-name">{orgName || 'Client Portal'}</div>
          <div className="aia-badge-role">Organisation · Client</div>
        </div>
      </div>
    </aside>
  )
}

function ClientTopbar({ orgName }) {
  const location = useLocation()
  const { profile, signOut } = useAuth()

  const titles = {
    '/client/dashboard':   'Dashboard',
    '/client/assessments': 'Assessments',
    '/client/reports':     'Reports',
  }
  const title = titles[location.pathname] || 'Client Portal'

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : ''
  const displayName = profile?.full_name?.split(' ')[0] || ''

  return (
    <div className="topbar">
      <div className="page-title">{title}</div>
      <div className="topbar-right">
        {orgName && <span className="badge badge-teal">{orgName}</span>}
        <div style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: 500 }}>{displayName}</div>
        <div
          className="avatar"
          title="Sign out"
          onClick={signOut}
          style={{ cursor: 'pointer' }}
        >
          {initials}
        </div>
      </div>
    </div>
  )
}

export default function ClientShell({ children }) {
  const { profile } = useAuth()
  const [orgName, setOrgName] = useState('')

  useEffect(() => {
    if (!profile?.org_id) return
    supabase
      .from('organisations')
      .select('name')
      .eq('id', profile.org_id)
      .maybeSingle()
      .then(({ data }) => { if (data?.name) setOrgName(data.name) })
  }, [profile?.org_id])

  return (
    <div className="app">
      <ClientSidebar orgName={orgName} />
      <div className="main">
        <ClientTopbar orgName={orgName} />
        {children}
      </div>
    </div>
  )
}
