import TopBar from '../components/TopBar.jsx'
import { INCIDENT_TYPES, LOCATIONS } from '../constants/mockData.js'

const SEVERITIES = [
  { id: 'critical', label: 'Critical', color: '#e74c3c' },
  { id: 'high',     label: 'High',     color: '#f39c12' },
  { id: 'medium',   label: 'Medium',   color: '#3b82f6' },
  { id: 'low',      label: 'Low',      color: '#22c55e' },
]

const EMPTY = { type: '', location: '', description: '', severity: 'medium' }

export default function ReportPage({ officer, onAddReport, reportForm, onSetReportForm, reportSubmitted, onSetReportSubmitted, reportErrors, onSetReportErrors }) {
  const form      = reportForm
  const submitted = reportSubmitted
  const errors    = reportErrors

  const set = (key, val) => {
    onSetReportForm(f => ({ ...f, [key]: val }))
    if (errors[key]) onSetReportErrors(e => ({ ...e, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.type)        e.type        = 'Select an incident type.'
    if (!form.location)    e.location    = 'Select a location.'
    if (!form.description.trim())
                           e.description = 'Please describe the incident.'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) return onSetReportErrors(errs)
    onAddReport({ ...form, officerName: officer.name, officerBadge: officer.badge })
    onSetReportSubmitted(true)
  }

  const handleNew = () => { onSetReportForm(EMPTY); onSetReportErrors({}); onSetReportSubmitted(false) }

  const selectedSev = SEVERITIES.find(s => s.id === form.severity)

  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#0d1823' }}>
        <TopBar title="Report Submitted" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 20px', gap: 20 }}>

          <div style={{
            width: 80, height: 80, borderRadius: 28,
            background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(34,197,94,0.15)',
          }}>
            <svg width={38} height={38} viewBox="0 0 24 24" fill="none"
              stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#eef2f7', marginBottom: 6 }}>Report Sent</div>
            <div style={{ fontSize: 14, color: '#5a7a99', lineHeight: 1.5 }}>
              Your incident report has been submitted to Command Center.
            </div>
          </div>

          {/* Summary card */}
          <div style={{
            width: '100%', background: '#111c2b', borderRadius: 16,
            border: '1px solid #1a2840', overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 16px', background: '#0d1823', borderBottom: '1px solid #1a2840' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#5a7a99', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Report Summary
              </span>
            </div>
            <div style={{ padding: '4px 0' }}>
              <SummaryRow icon="type"     label="Type"     value={form.type} />
              <SummaryRow icon="pin"      label="Location" value={form.location} />
              <SummaryRow icon="severity" label="Severity" value={form.severity.toUpperCase()} color={selectedSev?.color} />
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #1a2840' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#5a7a99', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Description</div>
              <div style={{ fontSize: 13, color: '#b0c4d8', lineHeight: 1.6 }}>{form.description}</div>
            </div>
          </div>

          <button
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 12, cursor: 'pointer',
              background: '#111c2b', border: '1px solid #1a2840',
              color: '#F07820', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onClick={handleNew}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#F07820" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Submit Another Report
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <TopBar title="Submit Report" subtitle={`${officer.badge} · ${officer.name}`} />

      <div className="page-scroll" style={{ padding: '14px 16px 0' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Incident Type */}
          <FormSection label="Incident Type" icon="type" required error={errors.type}>
            <div style={selectWrapStyle}>
              <select
                style={selectStyle}
                value={form.type}
                onChange={e => set('type', e.target.value)}
              >
                <option value="">Select incident type</option>
                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#5a7a99" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </FormSection>

          {/* Location */}
          <FormSection label="Location" icon="pin" required error={errors.location}>
            <div style={selectWrapStyle}>
              <select
                style={selectStyle}
                value={form.location}
                onChange={e => set('location', e.target.value)}
              >
                <option value="">Select location</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#5a7a99" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </FormSection>

          {/* Severity */}
          <FormSection label="Severity" icon="severity" required>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {SEVERITIES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set('severity', s.id)}
                  className={form.severity !== s.id ? 'chip-hover' : ''}
                  style={{
                    padding: '12px 4px', borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${form.severity === s.id ? '#F07820' : '#1a2840'}`,
                    background: form.severity === s.id ? 'rgba(240,120,32,0.15)' : '#0d1823',
                    color: form.severity === s.id ? '#F07820' : '#5a7a99',
                    fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </FormSection>

          {/* Description */}
          <FormSection label="Description" icon="desc" required error={errors.description}>
            <textarea
              style={{
                width: '100%', minHeight: 110, padding: '12px 14px', borderRadius: 10,
                background: '#0d1823', border: `1px solid ${errors.description ? 'rgba(231,76,60,0.5)' : '#1a2840'}`,
                color: '#eef2f7', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6,
                resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
              rows={5}
              placeholder="Describe what happened..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span />
              <span style={{
                fontSize: 11, color: form.description.length >= 10 ? '#22c55e' : '#5a7a99',
                fontWeight: 600,
              }}>
                {form.description.length} chars
              </span>
            </div>
          </FormSection>

          <button
            type="submit"
            style={{
              width: '100%', padding: '15px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #F07820, #d4610f)',
              color: '#fff', fontSize: 15, fontWeight: 700,
              boxShadow: '0 4px 20px rgba(240,120,32,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 8,
            }}
          >
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Submit to Command Center
          </button>
        </form>
      </div>
    </>
  )
}

function FormSection({ label, icon, required, error, children }) {
  return (
    <div style={{ background: '#111c2b', borderRadius: 14, border: `1px solid ${error ? 'rgba(231,76,60,0.35)' : '#1a2840'}`, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
        <FieldIcon type={icon} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#5a7a99', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}{required && <span style={{ color: '#e74c3c', marginLeft: 3 }}>*</span>}
        </span>
      </div>
      <div style={{ padding: '8px 14px 12px' }}>
        {children}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: '#e74c3c' }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

function FieldIcon({ type }) {
  const s = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: '#5a7a99', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (type === 'type') return <svg {...s}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
  if (type === 'pin')  return <svg {...s}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
  if (type === 'severity') return <svg {...s}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  return <svg {...s}><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
}

function SummaryRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #1a2840' }}>
      <span style={{ fontSize: 12, color: '#5a7a99' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || '#eef2f7' }}>{value}</span>
    </div>
  )
}

const selectWrapStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
  background: '#0d1823', border: '1px solid #1a2840', borderRadius: 10,
  padding: '0 14px', height: 44,
}

const selectStyle = {
  flex: 1, background: 'none', border: 'none', outline: 'none',
  color: '#eef2f7', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none',
}
