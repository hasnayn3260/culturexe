import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'

// Public pages
import Home from './pages/Home'
import Login from './pages/Login'

// Portal pages
import Dashboard from './pages/Dashboard'
import ClientOrgs from './pages/ClientOrgs'
import Assessments from './pages/Assessments'
import EmployeePreview from './pages/EmployeePreview'
import InsightsReport from './pages/InsightsReport'
import CultureXeModel from './pages/CultureXeModel'
import InviteEmployees from './pages/InviteEmployees'
import Settings from './pages/Settings'

const LogoMark = () => (
  <div className="fluid-breathe">
    <svg width="38" height="38" viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="sl1" cx="30%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#C9E8A0"/>
          <stop offset="40%" stopColor="#5BBFB0"/>
          <stop offset="100%" stopColor="#1A6BAA"/>
        </radialGradient>
        <radialGradient id="sl2" cx="70%" cy="65%" r="65%">
          <stop offset="0%" stopColor="#E8D890"/>
          <stop offset="40%" stopColor="#5AB0D0"/>
          <stop offset="100%" stopColor="#1BBFB0"/>
        </radialGradient>
      </defs>
      <path d="M50 50 C50 50 20 35 18 20 C16 5 30 2 40 10 C50 18 50 50 50 50Z" fill="url(#sl1)" opacity="0.92"/>
      <path d="M50 50 C50 50 15 55 12 70 C9 85 22 92 35 85 C48 78 50 50 50 50Z" fill="url(#sl1)" opacity="0.75"/>
      <path d="M50 50 C50 50 80 35 82 20 C84 5 70 2 60 10 C50 18 50 50 50 50Z" fill="url(#sl2)" opacity="0.88"/>
      <path d="M50 50 C50 50 85 55 88 70 C91 85 78 92 65 85 C52 78 50 50 50 50Z" fill="url(#sl2)" opacity="0.72"/>
      <circle cx="50" cy="50" r="7" fill="white" opacity="0.36"/>
    </svg>
  </div>
)

const navItem = ({ isActive }) => 'nav-item' + (isActive ? ' active' : '')

const Sidebar = () => (
  <aside className="sidebar">
    <div className="logo-wrap">
      <LogoMark />
      <div>
        <div className="logo-wordmark">
          <span className="logo-cx">Culture</span>
          <span className="logo-xe">Xe</span>
        </div>
        <div className="logo-sub">by AIA Africa</div>
      </div>
    </div>

    <nav className="nav">
      <div className="nav-section">Platform</div>
      <NavLink to="/app/dashboard" className={navItem}><span className="nav-icon">◉</span> Dashboard</NavLink>
      <NavLink to="/app/clients"   className={navItem}><span className="nav-icon">🏢</span> Client Orgs</NavLink>
      <NavLink to="/app/assessments" className={navItem}><span className="nav-icon">📋</span> Assessments</NavLink>

      <div className="nav-section">Tools</div>
      <NavLink to="/app/preview" className={navItem}><span className="nav-icon">👁️</span> Employee Preview</NavLink>
      <NavLink to="/app/report"  className={navItem}><span className="nav-icon">📊</span> Insights Report</NavLink>
      <NavLink to="/app/model"   className={navItem}><span className="nav-icon">⬡</span> CultureXe Model</NavLink>

      <div className="nav-section">Admin</div>
      <NavLink to="/app/invite"   className={navItem}><span className="nav-icon">✉️</span> Invite Employees</NavLink>
      <NavLink to="/app/settings" className={navItem}><span className="nav-icon">⚙</span> Settings</NavLink>
    </nav>

    <div className="sidebar-footer">
      <div className="aia-badge">
        <div className="aia-badge-name">AIA Africa</div>
        <div className="aia-badge-role">Consultant Portal · Admin</div>
      </div>
    </div>
  </aside>
)

const Topbar = () => {
  const location = useLocation()
  const titles = {
    '/app/dashboard':   'Dashboard',
    '/app/clients':     'Client Orgs',
    '/app/assessments': 'Assessments',
    '/app/preview':     'Employee Preview',
    '/app/report':      'Insights Report',
    '/app/model':       'CultureXe Model',
    '/app/invite':      'Invite Employees',
    '/app/settings':    'Settings',
  }
  const title = titles[location.pathname] || 'CultureXe'

  return (
    <div className="topbar">
      <div className="page-title">{title}</div>
      <div className="topbar-right">
        <span className="badge badge-teal">● Platform Live</span>
        <div style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: 500 }}>Azra</div>
        <div className="avatar">AZ</div>
      </div>
    </div>
  )
}

const PortalShell = () => (
  <div className="app">
    <Sidebar />
    <div className="main">
      <Topbar />
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"   element={<Dashboard />} />
        <Route path="clients"     element={<ClientOrgs />} />
        <Route path="assessments" element={<Assessments />} />
        <Route path="preview"     element={<EmployeePreview />} />
        <Route path="report"      element={<InsightsReport />} />
        <Route path="model"       element={<CultureXeModel />} />
        <Route path="invite"      element={<InviteEmployees />} />
        <Route path="settings"    element={<Settings />} />
      </Routes>
    </div>
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<Home />} />
        <Route path="/login"  element={<Login />} />
        <Route path="/app/*"  element={<PortalShell />} />
      </Routes>
    </BrowserRouter>
  )
}
