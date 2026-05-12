import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

// ── shared inline styles ─────────────────────────────────────
const menuItem = {
  display: 'flex', alignItems: 'center', gap: 10,
  width: '100%', padding: '10px 16px', border: 'none',
  background: 'transparent', cursor: 'pointer',
  fontSize: 13.5, fontWeight: 500, textAlign: 'left',
  color: '#0D1F3C', fontFamily: "'Plus Jakarta Sans', sans-serif",
  transition: 'background 0.12s',
}

function Input({ label, id, type = 'text', value, onChange, readOnly, placeholder }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8A9BB0', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '10px 13px', borderRadius: 9,
          border: '1.5px solid #E2E8F0',
          background: readOnly ? '#F7F9FC' : 'white',
          color: readOnly ? '#8A9BB0' : '#0D1F3C',
          fontSize: 13.5, fontFamily: "'Plus Jakarta Sans', sans-serif",
          outline: 'none', transition: 'border 0.15s',
        }}
        onFocus={e => { if (!readOnly) e.target.style.borderColor = '#1BBFB0' }}
        onBlur={e => { e.target.style.borderColor = '#E2E8F0' }}
      />
    </div>
  )
}

// ── Profile edit modal ────────────────────────────────────────
function ProfileModal({ onClose }) {
  const { profile, updateProfile } = useAuth()

  const [form, setForm] = useState({
    full_name:  profile?.full_name  || '',
    phone:      profile?.phone      || '',
    department: profile?.department || '',
    job_title:  profile?.job_title  || '',
    hire_date:  profile?.hire_date  || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')

  function set(key) { return e => setForm(p => ({ ...p, [key]: e.target.value })) }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('Full name is required.'); return }
    setSaving(true); setError(''); setSaved(false)
    try {
      await updateProfile({
        full_name:  form.full_name.trim(),
        phone:      form.phone.trim() || null,
        department: form.department.trim() || null,
        job_title:  form.job_title.trim()  || null,
        hire_date:  form.hire_date || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const initials = form.full_name
    ? form.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const roleLabel = {
    superadmin: 'Super Admin',
    consultant: 'Consultant',
    client:     'Client',
    employee:   'Employee',
  }[profile?.role] || profile?.role || ''

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(13,31,60,0.45)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white', borderRadius: 18, width: '100%', maxWidth: 480,
          boxShadow: '0 24px 64px rgba(13,31,60,0.2)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '28px 28px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#0D1F3C', marginBottom: 3 }}>My Profile</div>
              <div style={{ fontSize: 13, color: '#8A9BB0' }}>Update your personal details</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8A9BB0', lineHeight: 1, padding: 4 }}>✕</button>
          </div>

          {/* Avatar + name display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', background: '#F7F9FC', borderRadius: 12, marginBottom: 24 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1BBFB0, #3A8FC4)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 17, flexShrink: 0,
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0D1F3C' }}>{form.full_name || 'Your Name'}</div>
              <div style={{ fontSize: 12, color: '#8A9BB0', marginTop: 2 }}>
                {roleLabel}{profile?.email ? ` · ${profile.email}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} style={{ padding: '0 28px 28px' }}>
          <Input label="Full Name"   id="pf-name"  value={form.full_name}  onChange={set('full_name')}  placeholder="Your full name" />
          <Input label="Email"       id="pf-email" value={profile?.email || ''} readOnly />
          <Input label="Phone"       id="pf-phone" value={form.phone}      onChange={set('phone')}      placeholder="+27 000 000 0000" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Department" id="pf-dept"     value={form.department} onChange={set('department')} placeholder="e.g. Finance" />
            <Input label="Job Title"  id="pf-title"    value={form.job_title}  onChange={set('job_title')}  placeholder="e.g. Manager" />
          </div>

          <Input label="Start Date" id="pf-hire" type="date" value={form.hire_date} onChange={set('hire_date')} />

          {error && (
            <div style={{ background: '#FDE8E3', border: '1px solid rgba(232,86,58,0.25)', borderRadius: 9, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#C0392B' }}>
              {error}
            </div>
          )}

          {saved && (
            <div style={{ background: '#E0F7F5', border: '1px solid rgba(27,191,176,0.3)', borderRadius: 9, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#0A5550', fontWeight: 500 }}>
              ✓ Profile saved successfully.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: 'white', color: '#4A6380', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: saving ? '#8ADBD5' : '#1BBFB0', color: 'white', fontSize: 13.5, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
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

      {showProfile && <ProfileModal onClose={() => setProfile(false)} />}
    </>
  )
}
