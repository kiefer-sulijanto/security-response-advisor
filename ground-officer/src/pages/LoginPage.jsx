import { useState } from 'react'
import { SHIFTS } from '../constants/mockData.js'
import certisLogo from '../images/new-logo-certis-x2.png'

const VALID_OFFICERS = [
  { id: 'go1',  name: 'Richard Woods',  badge: 'SO-1001' },
  { id: 'go2',  name: 'Carolyn Fuller',  badge: 'SO-1002' },
  { id: 'go3',  name: 'Stephen Davies',  badge: 'SO-1003' },
  { id: 'go4',  name: 'Franklin Gibson', badge: 'SO-1004' },
  { id: 'go5',  name: 'Carol Barnes',    badge: 'SO-1005' },
  { id: 'go6',  name: 'Eric Diaz',       badge: 'SO-1006' },
  { id: 'go7',  name: 'Alex Hugh',       badge: 'SO-1007' },
  { id: 'go8',  name: 'Sarah Moreno',    badge: 'SO-1008' },
  { id: 'go9',  name: 'Gilbert Leonard', badge: 'SO-1009' },
  { id: 'go10', name: 'Tyson Bernard',   badge: 'SO-1010' },
]

export default function LoginPage({ onLogin }) {
  const [name,  setName]  = useState('')
  const [badge, setBadge] = useState('')
  const [shift, setShift] = useState(() => {
    const h = new Date().getHours()
    if (h >= 7 && h < 15) return 'morning'
    if (h >= 15 && h < 23) return 'afternoon'
    return 'night'
  })
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim())  return setError('Please enter your name.')
    if (!badge.trim()) return setError('Please enter your Badge ID.')

    const match = VALID_OFFICERS.find(
      o => o.name.toLowerCase() === name.trim().toLowerCase() &&
           o.badge.toUpperCase() === badge.trim().toUpperCase()
    )

    if (!match) return setError('Name and Badge ID do not match any authorised officer.')

    setError('')
    const shiftObj = SHIFTS.find(s => s.id === shift)
    onLogin({ id: match.id, name: match.name, badge: match.badge, shift: shiftObj })
  }

  return (
    <div style={styles.root}>
      <div style={styles.inner}>

        {/* Logo */}
        <div style={styles.logoWrap}>
          <img src={certisLogo} alt="Certis" style={{ width: 72, height: 72, objectFit: 'contain' }} />
          <div>
            <div style={styles.brand}>CERTIS</div>
            <div style={styles.appName}>Ground Officer</div>
          </div>
        </div>

        <p style={styles.tagline}>Sign in to begin your shift</p>

        <form onSubmit={handleSubmit} style={styles.form}>

          <div style={styles.field}>
            <label className="input-label">Full Name</label>
            <input
              className="input-field"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              autoComplete="name"
            />
          </div>

          <div style={styles.field}>
            <label className="input-label">Badge / Officer ID</label>
            <input
              className="input-field"
              type="text"
              value={badge}
              onChange={e => { setBadge(e.target.value); setError('') }}
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

          <button type="submit" className="btn btn-primary btn-full"
            style={{ marginTop: 8, padding: '14px 20px', fontSize: 16 }}>
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
    background: '#18181b',
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
  brand: {
    fontSize: 22,
    fontWeight: 800,
    color: '#F07820',
    letterSpacing: 3,
  },
  appName: {
    fontSize: 13,
    color: '#555960',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#555960',
    marginBottom: 28,
    marginTop: 4,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column' },
  error: {
    fontSize: 13,
    color: '#e24b4a',
    background: 'rgba(226,75,74,0.1)',
    border: '1px solid rgba(226,75,74,0.3)',
    borderRadius: 8,
    padding: '8px 12px',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#323238',
    marginTop: 32,
  },
}
