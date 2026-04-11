import { useState, useEffect } from 'react'
import { SHIFTS } from '../constants/mockData.js'

async function fetchOfficers() {
  try {
    const res = await fetch('http://localhost:4000/api/officers')
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export default function LoginPage({ onLogin }) {
  const [name,       setName]       = useState('')
  const [badge,      setBadge]      = useState('')
  const [shift,      setShift]      = useState('morning')
  const [error,      setError]      = useState('')
  const [officers,   setOfficers]   = useState([])
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    fetchOfficers().then(list => {
      setOfficers(list)
    })
  }, [])

  const handleOfficerSelect = (id) => {
    setSelectedId(id)
    if (!id) { setName(''); setBadge(''); return }
    const off = officers.find(o => o.id === id)
    if (off) { setName(off.name); setBadge(off.badge) }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim())  return setError('Please enter your name.')
    if (!badge.trim()) return setError('Please enter your Badge ID.')
    setError('')
    const shiftObj = SHIFTS.find(s => s.id === shift)
    const id = selectedId || `local-${badge.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}`
    onLogin({ id, name: name.trim(), badge: badge.trim().toUpperCase(), shift: shiftObj })
  }

  return (
    <div style={styles.root}>
      <div style={styles.inner}>

        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.shieldIcon}>
            <svg width={40} height={40} viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z"
                fill="#F07820" opacity="0.2"/>
              <path d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z"
                stroke="#F07820" strokeWidth="1.5" fill="none"/>
              <path d="M9 12l2 2 4-4" stroke="#F07820" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={styles.brand}>CERTIS</div>
            <div style={styles.appName}>Ground Officer</div>
          </div>
        </div>

        <p style={styles.tagline}>Sign in to begin your shift</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {officers.length > 0 && (
            <div style={styles.field}>
              <label className="input-label">Select Officer</label>
              <select
                className="input-field"
                value={selectedId}
                onChange={e => handleOfficerSelect(e.target.value)}
              >
                <option value="">— Select officer —</option>
              {officers.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.badge})</option>
                ))}
              </select>
            </div>
          )}

          <div style={styles.field}>
            <label className="input-label">Full Name</label>
            <input
              className="input-field"
              type="text"
              placeholder="e.g. John Tan"
              value={name}
              onChange={e => { setName(e.target.value); setSelectedId('') }}
              autoComplete="name"
            />
          </div>

          <div style={styles.field}>
            <label className="input-label">Badge / Officer ID</label>
            <input
              className="input-field"
              type="text"
              placeholder="e.g. SO-1024"
              value={badge}
              onChange={e => setBadge(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
            />
          </div>

          <div style={styles.field}>
            <label className="input-label">Shift</label>
            <select
              className="input-field"
              value={shift}
              onChange={e => setShift(e.target.value)}
            >
              {SHIFTS.map(s => (
                <option key={s.id} value={s.id}>{s.label} ({s.time})</option>
              ))}
            </select>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8, padding: '14px 20px', fontSize: 16 }}>
            Start Shift
          </button>
        </form>

        <p style={styles.footer}>Certis Security Management Platform · v1.0</p>
      </div>
    </div>
  )
}

const styles = {
  root: {
    width: '100%',
    maxWidth: 430,
    height: '100dvh',
    background: '#0f1923',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  inner: { width: '100%' },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  shieldIcon: {
    width: 60,
    height: 60,
    background: 'rgba(240,120,32,0.1)',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 22,
    fontWeight: 800,
    color: '#F07820',
    letterSpacing: 3,
  },
  appName: {
    fontSize: 13,
    color: '#7a8899',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#7a8899',
    marginBottom: 28,
    marginTop: 4,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column' },
  error: {
    fontSize: 13,
    color: '#e74c3c',
    background: 'rgba(231,76,60,0.1)',
    border: '1px solid rgba(231,76,60,0.3)',
    borderRadius: 8,
    padding: '8px 12px',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#3a4a5c',
    marginTop: 32,
  },
}
