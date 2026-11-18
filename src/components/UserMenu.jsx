import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import ProfileDetailsTab from '../features/profile/components/ProfileDetailsTab'
import ProfileDialog from '../features/profile/components/ProfileDialog'
import SecurityTab from '../features/profile/components/SecurityTab'

// ── shared inline styles ─────────────────────────────────────
const menuItem = {
  display: 'flex', alignItems: 'center', gap: 10,
  width: '100%', padding: '10px 16px', border: 'none',
  background: 'transparent', cursor: 'pointer',
  fontSize: 13.5, fontWeight: 500, textAlign: 'left',
  color: '#0D1F3C', fontFamily: "'Plus Jakarta Sans', sans-serif",
  transition: 'background 0.12s',
}

// ── Profile edit modal ────────────────────────────────────────
function ProfileModal({ open, onOpenChange }) {
  const { profile, updateProfile } = useAuth()

  const roleLabel = {
    superadmin: 'Super Admin',
    consultant: 'Consultant',
    client:     'Client',
    employee:   'Employee',
  }[profile?.role] || profile?.role || ''

  return (
    <ProfileDialog
      open={open}
      onOpenChange={onOpenChange}
      fullName={profile?.full_name || ''}
      email={profile?.email}
      roleLabel={roleLabel}
      profileDetails={
        <ProfileDetailsTab
          profile={profile}
          onSave={updateProfile}
          onCancel={() => onOpenChange(false)}
        />
      }
      security={<SecurityTab />}
    />
  )
}

// ── Main exported component ───────────────────────────────────
export default function UserMenu({ initials, displayName }) {
  const { role, signOut } = useAuth()
  const [open, setOpen]           = useState(false)
  const [showProfile, setProfile] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const roleLabel = {
    superadmin: 'Super Admin',
    consultant: 'Consultant',
    client:     'Client',
    employee:   'Employee',
  }[role] || role || ''

  return (
    <>
      <div style={{ position: 'relative' }} ref={ref}>
        <div
          className="avatar"
          onClick={() => setOpen(p => !p)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          title="Account"
        >
          {initials}
        </div>

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
            background: 'white', borderRadius: 14,
            boxShadow: '0 8px 40px rgba(13,31,60,0.18)',
            border: '1px solid #E2E8F0',
            minWidth: 220, zIndex: 2000, overflow: 'hidden',
          }}>
            {/* User identity */}
            <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #F0F4F8' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0D1F3C', marginBottom: 2 }}>{displayName}</div>
              <div style={{
                display: 'inline-block', fontSize: 10.5, fontWeight: 700,
                background: '#E0F7F5', color: '#0A7A72', borderRadius: 20,
                padding: '2px 9px', textTransform: 'uppercase', letterSpacing: '0.6px',
              }}>
                {roleLabel}
              </div>
            </div>

            {/* My Profile */}
            <button
              style={menuItem}
              onMouseEnter={e => e.currentTarget.style.background = '#F7F9FC'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => { setProfile(true); setOpen(false) }}
            >
              <span style={{ fontSize: 16 }}>👤</span>
              My Profile
            </button>

            <div style={{ height: 1, background: '#F0F4F8', margin: '0 16px' }} />

            {/* Sign out */}
            <button
              style={{ ...menuItem, color: '#E8563A', paddingBottom: 12 }}
              onMouseEnter={e => e.currentTarget.style.background = '#FFF5F3'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => { setOpen(false); signOut() }}
            >
              <span style={{ fontSize: 16 }}>↩</span>
              Sign Out
            </button>
          </div>
        )}
      </div>

      <ProfileModal open={showProfile} onOpenChange={setProfile} />
    </>
  )
}
