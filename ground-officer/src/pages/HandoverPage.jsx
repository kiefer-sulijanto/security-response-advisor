import { useState } from 'react'
import TopBar from '../components/TopBar.jsx'

export default function HandoverPage({ officer, alerts, tasks, reports, onLogout }) {
  const [notes,       setNotes]       = useState('')
  const [handedOver,  setHandedOver]  = useState(false)
  const [nextOfficer, setNextOfficer] = useState('')

  const tasksDone    = tasks.filter(t => t.done).length
  const tasksTotal   = tasks.length
  const openAlerts   = alerts.filter(a => a.status !== 'resolved')
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved')

  if (handedOver) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <TopBar title="Shift Ended" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 24,
            background: 'rgba(240,120,32,0.15)', border: '2px solid #F07820',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
          }}>👋</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Handover Complete</div>
            <div style={{ fontSize: 14, color: '#7a8899' }}>
              Shift handed over to {nextOfficer || 'next officer'}. Have a good rest, {officer.name.split(' ')[0]}!
            </div>
          </div>
          <div className="card" style={{ width: '100%' }}>
            <SummaryRow icon="✅" label="Tasks Completed" value={`${tasksDone} / ${tasksTotal}`} />
            <SummaryRow icon="🔔" label="Alerts Resolved"  value={resolvedAlerts.length} />
            <SummaryRow icon="⚠️" label="Open Incidents"   value={openAlerts.length} color={openAlerts.length > 0 ? '#f39c12' : '#22c55e'} />
            <SummaryRow icon="📋" label="Reports Submitted" value={reports.length} />
          </div>
          <button
            className="btn btn-primary btn-full"
            style={{ marginTop: 8, padding: '14px 20px', fontSize: 15 }}
            onClick={onLogout}
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <TopBar title="Shift Handover" subtitle={`${officer.shift.label} · ${officer.badge}`} />

      <div className="page-scroll" style={{ padding: '16px 16px 0' }}>

        {/* Shift summary */}
        <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#7a8899', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Shift Summary
        </div>
        <div className="card" style={{ marginBottom: 16 }}>
          <SummaryRow icon="👤" label="Officer"          value={`${officer.name} (${officer.badge})`} />
          <SummaryRow icon="🕐" label="Shift"            value={`${officer.shift.label} · ${officer.shift.time}`} />
          <SummaryRow icon="✅" label="Tasks Completed"  value={`${tasksDone} / ${tasksTotal}`} />
          <SummaryRow icon="📋" label="Reports Submitted" value={reports.length} />
          <SummaryRow icon="🔔" label="Alerts Handled"   value={resolvedAlerts.length} />
          {openAlerts.length > 0 && (
            <SummaryRow icon="⚠️" label="Open Incidents" value={openAlerts.length} color="#f39c12" />
          )}
        </div>

        {/* Open alerts — carry-over */}
        {openAlerts.length > 0 && (
          <>
            <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, color: '#f39c12', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚠️ Carry-Over Incidents ({openAlerts.length})
            </div>
            {openAlerts.map(a => (
              <div key={a.id} className="card" style={{ marginBottom: 8, borderLeft: `3px solid ${PCOL[a.priority]}` }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.type}</div>
                <div style={{ fontSize: 12, color: '#7a8899', marginTop: 2 }}>{a.location}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                  <span className={`badge badge-${a.priority}`}>{a.priority.toUpperCase()}</span>
                  <span style={{ fontSize: 12, color: '#7a8899' }}>{STATUS_LABEL[a.status]}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Next officer */}
        <div style={{ marginTop: 16 }}>
          <label className="input-label">Next Officer (Name / Badge)</label>
          <input
            className="input-field"
            type="text"
            placeholder="e.g. Sarah Lim / SO-2031"
            value={nextOfficer}
            onChange={e => setNextOfficer(e.target.value)}
          />
        </div>

        {/* Handover notes */}
        <div style={{ marginTop: 14 }}>
          <label className="input-label">Handover Notes</label>
          <textarea
            className="input-field"
            rows={5}
            placeholder="Any observations, pending tasks, or follow-up instructions for the next officer..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ resize: 'vertical', minHeight: 110 }}
          />
        </div>

        {/* Sign off */}
        <div className="card" style={{ marginTop: 16, background: 'rgba(240,120,32,0.05)', borderColor: 'rgba(240,120,32,0.3)' }}>
          <div style={{ fontSize: 13, color: '#c0ccd8' }}>
            By tapping <strong>Sign Off & Hand Over</strong>, you confirm that all information above is accurate and the incoming officer has been briefed.
          </div>
        </div>

        <button
          className="btn btn-primary btn-full"
          style={{ marginTop: 14, padding: '14px 20px', fontSize: 16, marginBottom: 8 }}
          onClick={() => setHandedOver(true)}
        >
          Sign Off & Hand Over
        </button>
      </div>
    </>
  )
}

function SummaryRow({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #1e2d42' }}>
      <span style={{ fontSize: 13, color: '#7a8899' }}>{icon} {label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || '#f0f4f8' }}>{value}</span>
    </div>
  )
}

const PCOL = { critical: '#e74c3c', high: '#f39c12', medium: '#3b82f6', low: '#22c55e' }
const STATUS_LABEL = { unread: 'New', acknowledged: 'Acknowledged', in_progress: 'In Progress', resolved: 'Resolved' }
