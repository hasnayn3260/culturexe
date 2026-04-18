export default function AdminLayout({ children }) {
  return (
    <div className="content">
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px',
        background: 'rgba(232,86,58,0.06)',
        border: '1px solid rgba(232,86,58,0.18)',
        borderRadius: 10,
        marginBottom: 24,
        fontSize: 13,
      }}>
        <span style={{ color: 'var(--coral)', fontWeight: 700 }}>⬡ Admin Panel</span>
        <span style={{ color: 'var(--text3)', fontSize: 12 }}>
          Superadmin access · Changes affect all platform users
        </span>
      </div>
      {children}
    </div>
  )
}
