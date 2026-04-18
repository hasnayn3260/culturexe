import { useAuth } from '../hooks/useAuth'

export default function ClientDashboard() {
  const { profile, signOut } = useAuth()

  return (
    <div style={{
      minHeight: '100vh', background: '#EEF5F9',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Simple topbar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #E2E8F0',
        height: 62, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 32px',
        boxShadow: '0 1px 8px rgba(13,31,60,0.05)',
      }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#0D1F3C' }}>
          Culture<span style={{ color: '#1BBFB0' }}>Xe</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: '#8A9BB0', marginLeft: 10 }}>Client Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, color: '#4A6380', fontWeight: 500 }}>
            {profile?.full_name || profile?.email || 'Client'}
          </span>
          <button
            onClick={signOut}
            style={{
              background: 'none', border: '1px solid #E2E8F0',
              borderRadius: 8, padding: '7px 14px',
              fontSize: 12.5, color: '#4A6380', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 40, maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0D1F3C', marginBottom: 6 }}>
            Your Culture Dashboard
          </h1>
          <p style={{ fontSize: 14.5, color: '#4A6380' }}>
            Welcome back. Your culture insights will appear here once an assessment is complete.
          </p>
        </div>

        <div style={{
          background: 'white', borderRadius: 20, border: '1px solid #E2E8F0',
          padding: '60px 40px', textAlign: 'center',
          boxShadow: '0 2px 16px rgba(13,31,60,0.05)',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, #E0F7F5, #EAF4FB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, margin: '0 auto 20px',
          }}>
            📊
          </div>
          <div style={{ fontWeight: 700, fontSize: 19, color: '#0D1F3C', marginBottom: 10 }}>
            Client Portal — Coming Soon
          </div>
          <div style={{ fontSize: 14, color: '#8A9BB0', lineHeight: 1.75, maxWidth: 400, margin: '0 auto' }}>
            Your organisation's culture insights, dimension scores, and historical reports
            will be accessible here. Contact your Africa International Advisors consultant to get started.
          </div>
        </div>
      </div>
    </div>
  )
}
