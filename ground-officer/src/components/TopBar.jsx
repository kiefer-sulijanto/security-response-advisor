export default function TopBar({ title, subtitle, right }) {
  return (
    <header style={styles.bar}>
      <div>
        <div style={styles.title}>{title}</div>
        {subtitle && <div style={styles.sub}>{subtitle}</div>}
      </div>
      {right && <div>{right}</div>}
    </header>
  )
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px 12px',
    background: '#18181b',
    borderBottom: '1px solid #323238',
    flexShrink: 0,
    paddingTop: 'calc(14px + env(safe-area-inset-top))',
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    color: '#f0f4f8',
  },
  sub: {
    fontSize: 12,
    color: '#555960',
    marginTop: 1,
  },
}
