const NAV = [
  { id: 'home',     label: 'Home',     icon: IconHome },
  { id: 'tasks',    label: 'Tasks',    icon: IconTasks },
  { id: 'alerts',   label: 'Alerts',   icon: IconAlerts },
  { id: 'report',   label: 'Report',   icon: IconReport },
  { id: 'handover', label: 'Handover', icon: IconHandover },
]

export default function BottomNav({ current, onNavigate, unreadAlerts }) {
  return (
    <nav style={styles.nav}>
      {NAV.map(({ id, label, icon: Icon }) => {
        const active = current === id
        return (
          <button key={id} style={styles.btn} onClick={() => onNavigate(id)}>
            <span style={{ position: 'relative', display: 'flex' }}>
              <Icon size={22} color={active ? '#F07820' : '#555960'} />
              {id === 'alerts' && unreadAlerts > 0 && (
                <span style={styles.badge}>{unreadAlerts > 9 ? '9+' : unreadAlerts}</span>
              )}
            </span>
            <span style={{ ...styles.label, color: active ? '#F07820' : '#555960' }}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

const styles = {
  nav: {
    display: 'flex',
    height: 'var(--nav-h)',
    background: '#111114',
    borderTop: '1px solid #323238',
    flexShrink: 0,
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  btn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 0',
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.2px',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    background: '#e24b4a',
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 3px',
  },
}

function IconHome({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
}
function IconTasks({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  )
}
function IconAlerts({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  )
}
function IconReport({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10,9 9,9 8,9"/>
    </svg>
  )
}
function IconHandover({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17,1 21,5 17,9"/>
      <path d="M3 11V9a4 4 0 014-4h14"/>
      <polyline points="7,23 3,19 7,15"/>
      <path d="M21 13v2a4 4 0 01-4 4H3"/>
    </svg>
  )
}
