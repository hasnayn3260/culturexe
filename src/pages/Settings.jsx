import { useState } from 'react'

const initialOrg = {
  name: 'AIA Africa',
  website: 'https://africaia.com',
  country: 'South Africa',
  timezone: 'Africa/Johannesburg',
  logo: '',
}

const initialProfile = {
  firstName: 'Azra',
  lastName: 'Consulting',
  email: 'hasnayn.e@africaia.com',
  role: 'Consultant · Admin',
  currentPassword: '',
  newPassword: '',
}

const initialNotifications = {
  surveyComplete: true,
  newResponse: false,
  weeklyDigest: true,
  clientOnboard: true,
  lowResponseAlert: true,
}

export default function Settings() {
  const [org, setOrg] = useState(initialOrg)
  const [profile, setProfile] = useState(initialProfile)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [savedSection, setSavedSection] = useState(null)

  function save(section) {
    setSavedSection(section)
    setTimeout(() => setSavedSection(null), 2500)
  }

  return (
    <div className="content">
      <div className="page-hero">
        <div className="hero-title">Settings</div>
        <div className="hero-sub">Manage your CultureXe platform preferences, profile, and integrations.</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Organisation Settings */}
        <div className="card">
          <div className="flex-between mb-24">
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)', marginBottom: 3 }}>Organisation</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>Your consulting organisation details displayed on reports.</div>
            </div>
            <div className="aia-badge" style={{ background: 'var(--teal-light)', border: '1px solid var(--teal)', padding: '8px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0A8A7E' }}>AIA Africa</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Consultant Portal</div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Organisation Name</label>
              <input className="form-input" value={org.name} onChange={e => setOrg({ ...org, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="form-input" value={org.website} onChange={e => setOrg({ ...org, website: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Country</label>
              <input className="form-input" value={org.country} onChange={e => setOrg({ ...org, country: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Timezone</label>
              <select className="form-input" value={org.timezone} onChange={e => setOrg({ ...org, timezone: e.target.value })}>
                <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                <option value="Africa/Accra">Africa/Accra (GMT)</option>
                <option value="Africa/Cairo">Africa/Cairo (EET)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-12">
            <button className="btn btn-teal" onClick={() => save('org')}>Save Changes</button>
            {savedSection === 'org' && <span style={{ color: 'var(--teal)', fontSize: 13, alignSelf: 'center' }}>✓ Saved</span>}
          </div>
        </div>

        {/* Profile Settings */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)', marginBottom: 4 }}>Profile</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>Your consultant account details.</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)', margin: '20px 0 14px' }}>Change Password</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={profile.currentPassword} onChange={e => setProfile({ ...profile, currentPassword: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={profile.newPassword} onChange={e => setProfile({ ...profile, newPassword: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-12">
            <button className="btn btn-teal" onClick={() => save('profile')}>Save Profile</button>
            {savedSection === 'profile' && <span style={{ color: 'var(--teal)', fontSize: 13, alignSelf: 'center' }}>✓ Saved</span>}
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)', marginBottom: 4 }}>Notifications</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>Control which email alerts you receive from CultureXe.</div>
          {[
            { key: 'surveyComplete', label: 'Assessment completed', desc: 'When an assessment closes and all data is ready for analysis.' },
            { key: 'newResponse', label: 'New response received', desc: 'Each time an employee submits a survey response.' },
            { key: 'weeklyDigest', label: 'Weekly digest', desc: 'A summary of all activity across your client portfolio every Monday.' },
            { key: 'clientOnboard', label: 'Client onboarded', desc: 'When a new client organisation is added to the platform.' },
            { key: 'lowResponseAlert', label: 'Low response rate alert', desc: 'When an active survey falls below a 40% response rate.' },
          ].map(item => (
            <div key={item.key} className="flex-between" style={{
              padding: '14px 0',
              borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--navy)', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text3)' }}>{item.desc}</div>
              </div>
              <button
                onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none',
                  background: notifications[item.key] ? 'var(--teal)' : 'var(--border2)',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 3, left: notifications[item.key] ? 22 : 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'white', transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                }} />
              </button>
            </div>
          ))}
          <div className="flex gap-12" style={{ marginTop: 20 }}>
            <button className="btn btn-teal" onClick={() => save('notifications')}>Save Preferences</button>
            {savedSection === 'notifications' && <span style={{ color: 'var(--teal)', fontSize: 13, alignSelf: 'center' }}>✓ Saved</span>}
          </div>
        </div>

        {/* Integrations */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)', marginBottom: 4 }}>Integrations & API</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>Connect CultureXe to your existing tools.</div>
          <div className="grid-3">
            {[
              { name: 'Supabase', desc: 'Database & Auth', status: 'connected', color: 'var(--teal)' },
              { name: 'Slack', desc: 'Team notifications', status: 'available', color: 'var(--slate)' },
              { name: 'HubSpot', desc: 'CRM sync', status: 'available', color: 'var(--slate)' },
              { name: 'Google Workspace', desc: 'SSO & Sheets export', status: 'available', color: 'var(--slate)' },
              { name: 'Microsoft 365', desc: 'Teams & Outlook', status: 'available', color: 'var(--slate)' },
              { name: 'Zapier', desc: 'Workflow automation', status: 'available', color: 'var(--slate)' },
            ].map(int => (
              <div key={int.name} style={{
                border: '1px solid var(--border)', borderRadius: 12,
                padding: '16px', display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div className="flex-between">
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--navy)' }}>{int.name}</div>
                  <span className={`badge ${int.status === 'connected' ? 'badge-teal' : 'badge-slate'}`}>
                    {int.status === 'connected' ? '● Connected' : 'Available'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{int.desc}</div>
                <button className={`btn btn-sm ${int.status === 'connected' ? 'btn-outline' : 'btn-teal'}`}>
                  {int.status === 'connected' ? 'Configure' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
