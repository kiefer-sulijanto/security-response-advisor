import { useState } from 'react'
import TopBar from '../components/TopBar.jsx'
import { INCIDENT_TYPES, LOCATIONS } from '../constants/mockData.js'

const SEVERITIES = [
  { id: 'critical', label: 'Critical', color: '#e74c3c' },
  { id: 'high',     label: 'High',     color: '#f39c12' },
  { id: 'medium',   label: 'Medium',   color: '#3b82f6' },
  { id: 'low',      label: 'Low',      color: '#22c55e' },
]

const EMPTY = { type: '', location: '', description: '', severity: 'medium' }

export default function ReportPage({ officer, onAddReport }) {
  const [form,      setForm]      = useState(EMPTY)
  const [submitted, setSubmitted] = useState(false)
  const [errors,    setErrors]    = useState({})

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.type)        e.type        = 'Select an incident type.'
    if (!form.location)    e.location    = 'Select a location.'
    if (!form.description.trim() || form.description.trim().length < 10)
                           e.description = 'Describe the incident (min 10 chars).'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) return setErrors(errs)
    onAddReport({ ...form, officerName: officer.name, officerBadge: officer.badge })
    setSubmitted(true)
  }

  const handleNew = () => {
    setForm(EMPTY)
    setErrors({})
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <TopBar title="Report Submitted" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 24,
            background: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none"
              stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Report Sent</div>
            <div style={{ fontSize: 14, color: '#7a8899' }}>
              Your incident report has been submitted to Command Center.
            </div>
          </div>

          {/* Summary */}
          <div className="card" style={{ width: '100%', marginTop: 8 }}>
            <Row label="Type"     value={form.type} />
            <Row label="Location" value={form.location} />
            <Row label="Severity" value={form.severity.toUpperCase()} />
            <div style={{ height: 1, background: '#253448', margin: '10px 0' }} />
            <div style={{ fontSize: 12, color: '#7a8899', marginBottom: 4 }}>Description</div>
            <div style={{ fontSize: 13, color: '#c0ccd8' }}>{form.description}</div>
          </div>

          <button className="btn btn-primary btn-full" style={{ marginTop: 8 }} onClick={handleNew}>
            Submit Another Report
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <TopBar title="Submit Report" subtitle="Report to Command Center" />

      <div className="page-scroll" style={{ padding: '16px 16px 0' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Incident type */}
          <div>
            <label className="input-label">Incident Type *</label>
            <select className="input-field" value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="">— Select type —</option>
              {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.type && <ErrMsg>{errors.type}</ErrMsg>}
          </div>

          {/* Location */}
          <div>
            <label className="input-label">Location *</label>
            <select className="input-field" value={form.location} onChange={e => set('location', e.target.value)}>
              <option value="">— Select location —</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {errors.location && <ErrMsg>{errors.location}</ErrMsg>}
          </div>

          {/* Severity */}
          <div>
            <label className="input-label">Severity *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
              {SEVERITIES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set('severity', s.id)}
                  style={{
                    padding: '10px 4px',
                    borderRadius: 10,
                    border: `2px solid ${form.severity === s.id ? s.color : '#253448'}`,
                    background: form.severity === s.id ? `${s.color}22` : '#1e2d42',
                    color: form.severity === s.id ? s.color : '#7a8899',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="input-label">Description *</label>
            <textarea
              className="input-field"
              rows={5}
              placeholder="Describe what happened, who was involved, and any immediate actions taken..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              style={{ resize: 'vertical', minHeight: 100 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {errors.description ? <ErrMsg>{errors.description}</ErrMsg> : <span />}
              <span style={{ fontSize: 11, color: '#7a8899' }}>{form.description.length} chars</span>
            </div>
          </div>

          {/* Officer info (read-only) */}
          <div className="card" style={{ background: '#141f2e' }}>
            <div style={{ fontSize: 12, color: '#7a8899', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Submitted by</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{officer.name}</div>
            <div style={{ fontSize: 12, color: '#7a8899' }}>{officer.badge} · {officer.shift.label}</div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" style={{ padding: '14px 20px', fontSize: 16, marginBottom: 8 }}>
            Submit Report to Command Center
          </button>
        </form>
      </div>
    </>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: '#7a8899' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f4f8' }}>{value}</span>
    </div>
  )
}

function ErrMsg({ children }) {
  return <div style={{ fontSize: 12, color: '#e74c3c', marginTop: 5 }}>{children}</div>
}
