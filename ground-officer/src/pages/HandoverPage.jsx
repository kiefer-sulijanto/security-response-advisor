import { useState } from 'react'
import TopBar from '../components/TopBar.jsx'

const PCOL = { critical: '#e74c3c', high: '#f39c12', medium: '#3b82f6', low: '#22c55e' }
const STATUS_LABEL = { unread: 'New', acknowledged: 'Acknowledged', in_progress: 'In Progress', resolved: 'Resolved' }

export default function HandoverPage({ officer, alerts, reports, onLogout }) {
  const [signedOff, setSignedOff] = useState(false)

  const openAlerts     = alerts.filter(a => a.status !== 'resolved')
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved')

  if (signedOff) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#0d1823' }}>
        <TopBar title="Shift Ended" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 20px', gap: 20 }}>

          <div style={{
            width: 80, height: 80, borderRadius: 28,
            background: 'rgba(240,120,32,0.12)', border: '2px solid rgba(240,120,32,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(240,120,32,0.15)',
          }}>
            <svg width={38} height={38} viewBox="0 0 24 24" fill="none" stroke="#F07820" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#eef2f7', marginBottom: 6 }}>Sign Off Complete</div>
            <div style={{ fontSize: 14, color: '#5a7a99' }}>
              Have a good rest, {officer.name.split(' ')[0]}!
            </div>
          </div>

          {/* Final stats */}
          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <MiniStat value={resolvedAlerts.length} label="Resolved"  color="#22c55e" />
            <MiniStat value={openAlerts.length}     label="Open"      color={openAlerts.length > 0 ? '#f39c12' : '#22c55e'} />
            <MiniStat value={reports.length}        label="Reports"   color="#F07820" />
          </div>

          <button
            style={{
              width: '100%', padding: '15px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #F07820, #d4610f)',
              color: '#fff', fontSize: 15, fontWeight: 700,
              boxShadow: '0 4px 20px rgba(240,120,32,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onClick={onLogout}
          >
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <TopBar title="Sign Off" subtitle={`${officer.shift.label} · ${officer.badge}`} />

      <div className="page-scroll" style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Officer card */}
        <div style={{
          background: 'linear-gradient(135deg, #1a2d42, #1e3650)',
          borderRadius: 16, border: '1px solid #2a4060',
          padding: '16px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16, flexShrink: 0,
            background: 'rgba(240,120,32,0.15)', border: '1px solid rgba(240,120,32,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#F07820" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#eef2f7' }}>{officer.name}</div>
            <div style={{ fontSize: 12, color: '#7a9ab8', marginTop: 2 }}>{officer.badge} · {officer.shift.label} · {officer.shift.time}</div>
          </div>
        </div>

        {/* Stats grid */}
        <div>
          <SectionLabel>Shift Summary</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <StatCard value={resolvedAlerts.length} label="Alerts Resolved" color="#22c55e" />
            <StatCard value={openAlerts.length}     label="Open Incidents"  color={openAlerts.length > 0 ? '#f39c12' : '#22c55e'} />
            <StatCard value={reports.length}        label="Reports Sent"    color="#F07820" />
          </div>
        </div>

        {/* Carry-over incidents */}
        {openAlerts.length > 0 && (
          <div>
            <SectionLabel color="#f39c12">Carry-Over Incidents ({openAlerts.length})</SectionLabel>
            {openAlerts.map(a => (
              <div key={a.id} style={{
                background: '#111c2b', borderRadius: 14,
                border: '1px solid #1a2840',
                borderLeft: `3px solid ${PCOL[a.priority]}`,
                padding: '12px 14px', marginBottom: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${PCOL[a.priority]}18`, border: `1px solid ${PCOL[a.priority]}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={PCOL[a.priority]} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#eef2f7' }}>{a.type}</div>
                    <div style={{ fontSize: 12, color: '#5a7a99', marginTop: 2 }}>{a.location}</div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6,
                        background: `${PCOL[a.priority]}20`, color: PCOL[a.priority],
                        border: `1px solid ${PCOL[a.priority]}40`,
                      }}>
                        {a.priority.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 11, color: '#5a7a99' }}>{STATUS_LABEL[a.status]}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confirm card */}
        <div style={{
          background: 'rgba(240,120,32,0.06)', borderRadius: 14,
          border: '1px solid rgba(240,120,32,0.2)', padding: '14px 16px',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#F07820" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div style={{ fontSize: 13, color: '#9aacbe', lineHeight: 1.6 }}>
            By tapping <strong style={{ color: '#F07820' }}>Sign Off</strong>, you confirm that your shift summary is accurate and all incidents have been recorded.
          </div>
        </div>

        <button
          style={{
            width: '100%', padding: '15px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #F07820, #d4610f)',
            color: '#fff', fontSize: 16, fontWeight: 700,
            boxShadow: '0 4px 20px rgba(240,120,32,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 8,
          }}
          onClick={() => setSignedOff(true)}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          Sign Off
        </button>

      </div>
    </>
  )
}

function SectionLabel({ children, color = '#5a7a99' }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function StatCard({ value, label, color }) {
  return (
    <div style={{
      background: '#111c2b', borderRadius: 14, border: '1px solid #1a2840',
      padding: '14px 10px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#5a7a99', marginTop: 5, lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}

function MiniStat({ value, label, color }) {
  return (
    <div style={{
      background: '#111c2b', borderRadius: 14, border: '1px solid #1a2840',
      padding: '14px 8px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#5a7a99', marginTop: 4 }}>{label}</div>
    </div>
  )
}
