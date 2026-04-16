import { useState } from 'react'
import TopBar from '../components/TopBar.jsx'

export default function HandoverPage({ officer, alerts, tasks, reports, onLogout }) {
  const [signedOff, setSignedOff] = useState(false)

  const tasksDone      = tasks.filter(t => t.done).length
  const tasksTotal     = tasks.length
  const openAlerts     = alerts.filter(a => a.status !== 'resolved')
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved')

  if (signedOff) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <TopBar title="Shift Ended" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 24,
            background: 'rgba(240,120,32,0.15)', border: '2px solid #F07820',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#F07820" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Sign Off Complete</div>
            <div style={{ fontSize: 14, color: '#555960' }}>
              Have a good rest, {officer.name.split(' ')[0]}!
            </div>
          </div>
          <div className="card" style={{ width: '100%' }}>
            <SummaryRow label="Tasks Completed"  value={`${tasksDone} / ${tasksTotal}`} />
            <SummaryRow label="Alerts Resolved"  value={resolvedAlerts.length} />
            <SummaryRow label="Open Incidents"   value={openAlerts.length} color={openAlerts.length > 0 ? '#efaf27' : '#22c55e'} />
            <SummaryRow label="Reports Submitted" value={reports.length} />
          </div>
          <button
            className="btn btn-primary btn-full"
            style={{ marginTop: 8, padding: '14px 20px', fontSize: 15 }}
            onClick={() => onLogout()}
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <TopBar title="Sign Off" subtitle={`${officer.shift.label} · ${officer.badge}`} />

      <div className="page-scroll" style={{ padding: '16px 16px 0' }}>

        {/* Shift summary */}
        <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#555960', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Shift Summary
        </div>
        <div className="card" style={{ marginBottom: 16 }}>
          <SummaryRow label="Officer"           value={`${officer.name} (${officer.badge})`} />
          <SummaryRow label="Shift"             value={`${officer.shift.label} · ${officer.shift.time}`} />
          <SummaryRow label="Tasks Completed"   value={`${tasksDone} / ${tasksTotal}`} />
          <SummaryRow label="Reports Submitted" value={reports.length} />
          <SummaryRow label="Alerts Handled"    value={resolvedAlerts.length} />
          {openAlerts.length > 0 && (
            <SummaryRow label="Open Incidents"  value={openAlerts.length} color="#efaf27" />
          )}
        </div>

        {/* Carry-over incidents */}
        {openAlerts.length > 0 && (
          <>
            <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, color: '#efaf27', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Carry-Over Incidents ({openAlerts.length})
            </div>
            {openAlerts.map(a => (
              <div key={a.id} className="card" style={{ marginBottom: 8, borderLeft: `3px solid ${PCOL[a.priority]}` }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.type}</div>
                <div style={{ fontSize: 12, color: '#555960', marginTop: 2 }}>{a.location}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                  <span className={`badge badge-${a.priority}`}>{a.priority.toUpperCase()}</span>
                  <span style={{ fontSize: 12, color: '#555960' }}>{STATUS_LABEL[a.status]}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Confirm card */}
        <div className="card" style={{ marginTop: 16, background: 'rgba(240,120,32,0.05)', borderColor: 'rgba(240,120,32,0.3)' }}>
          <div style={{ fontSize: 13, color: '#9a9da3' }}>
            By tapping <strong>Sign Off</strong>, you confirm that your shift summary is accurate and all incidents have been recorded.
          </div>
        </div>

        <button
          className="btn btn-primary btn-full"
          style={{ marginTop: 14, padding: '14px 20px', fontSize: 16, marginBottom: 8 }}
          onClick={() => setSignedOff(true)}
        >
          Sign Off
        </button>
      </div>
    </>
  )
}

function SummaryRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #323238' }}>
      <span style={{ fontSize: 13, color: '#555960' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || '#f0f0f0' }}>{value}</span>
    </div>
  )
}

const PCOL = { critical: '#e24b4a', high: '#efaf27', medium: '#4a9eff', low: '#22c55e' }
const STATUS_LABEL = { unread: 'New', acknowledged: 'Acknowledged', in_progress: 'In Progress', resolved: 'Resolved' }
