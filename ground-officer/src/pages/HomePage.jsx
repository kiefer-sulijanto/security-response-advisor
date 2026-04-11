import TopBar from '../components/TopBar.jsx'

const PRIORITY_COLORS = {
  critical: '#e74c3c',
  high:     '#f39c12',
  medium:   '#3b82f6',
  low:      '#22c55e',
}

export default function HomePage({ officer, alerts, tasks, reports, onNavigate, unreadAlerts }) {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' })

  const criticalAlerts = alerts.filter(a => a.priority === 'critical' && a.status !== 'resolved')
  const tasksDone  = tasks.filter(t => t.done).length
  const tasksPending = tasks.filter(t => !t.done).length
  const recentReports = reports.slice(0, 3)

  // Latest unread instruction from Command Center
  const latestInstruction = alerts.find(a => a.status === 'unread')

  return (
    <>
      <TopBar
        title={`Hey, ${officer.name.split(' ')[0]}`}
        subtitle={`${officer.badge} · ${officer.shift.label}`}
        right={<StatusDot />}
      />

      <div className="page-scroll" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Shift banner */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #1a2d42, #1e3650)', borderColor: '#2a4060' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: '#7a8899', marginBottom: 2 }}>Current Shift</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{officer.shift.label}</div>
              <div style={{ fontSize: 13, color: '#7a8899' }}>{officer.shift.time}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#F07820' }}>{timeStr}</div>
              <div style={{ fontSize: 11, color: '#7a8899' }}>{dateStr}</div>
            </div>
          </div>
        </div>

        {/* Critical alert banner */}
        {criticalAlerts.length > 0 && (
          <button
            onClick={() => onNavigate('alerts')}
            style={critBannerStyle}
            className="pulse-critical"
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20 }}>🚨</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e74c3c' }}>
                  {criticalAlerts.length} CRITICAL ALERT{criticalAlerts.length > 1 ? 'S' : ''} ACTIVE
                </div>
                <div style={{ fontSize: 12, color: '#f0a0a0', marginTop: 2 }}>
                  {criticalAlerts[0].type} — {criticalAlerts[0].location}
                </div>
              </div>
              <span style={{ color: '#e74c3c', fontSize: 16 }}>›</span>
            </div>
          </button>
        )}

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <StatCard value={tasksDone}    label="Tasks Done"  color="#22c55e" />
          <StatCard value={tasksPending} label="Pending"     color="#f39c12" />
          <StatCard value={reports.length} label="Reports"  color="#F07820" />
        </div>

        {/* Latest instruction */}
        {latestInstruction && (
          <div>
            <SectionTitle>Latest Instruction</SectionTitle>
            <button
              className="card"
              onClick={() => onNavigate('alerts')}
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: '1px solid #253448' }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${PRIORITY_COLORS[latestInstruction.priority]}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
                    stroke={PRIORITY_COLORS[latestInstruction.priority]} strokeWidth={2}
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f4f8' }}>
                    {latestInstruction.type}
                  </div>
                  <div style={{ fontSize: 12, color: '#7a8899', marginTop: 2 }}>
                    {latestInstruction.location}
                  </div>
                  <div style={{
                    fontSize: 12, color: '#c0ccd8', marginTop: 6,
                    overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {latestInstruction.instruction}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                <PriorityBadge p={latestInstruction.priority} />
                <span style={{ fontSize: 11, color: '#7a8899' }}>{latestInstruction.timestamp} · {latestInstruction.source}</span>
              </div>
            </button>
          </div>
        )}

        {/* Pending tasks preview */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <SectionTitle>Pending Tasks</SectionTitle>
            <button style={{ fontSize: 13, color: '#F07820', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => onNavigate('tasks')}>View all ›</button>
          </div>
          {tasks.filter(t => !t.done).slice(0, 3).map(task => (
            <div key={task.id} className="card" style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{
                width: 8, height: 8, borderRadius: 4, flexShrink: 0,
                background: PRIORITY_COLORS[task.priority] || '#7a8899',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{task.title}</div>
                <div style={{ fontSize: 12, color: '#7a8899' }}>{task.location}</div>
              </div>
              <PriorityBadge p={task.priority} />
            </div>
          ))}
          {tasks.filter(t => !t.done).length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: '#7a8899', fontSize: 13 }}>
              All tasks completed ✓
            </div>
          )}
        </div>

        {/* Recent reports */}
        {recentReports.length > 0 && (
          <div>
            <SectionTitle>Recent Reports Sent</SectionTitle>
            {recentReports.map(r => (
              <div key={r.id} className="card" style={{ marginBottom: 8, display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.type}</div>
                  <div style={{ fontSize: 12, color: '#7a8899' }}>{r.location} · {r.timestamp}</div>
                </div>
                <PriorityBadge p={r.severity} />
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  )
}

function StatCard({ value, label, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#7a8899', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: '#7a8899', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>{children}</div>
}

function PriorityBadge({ p }) {
  const map = {
    critical: ['badge badge-critical', 'CRITICAL'],
    high:     ['badge badge-high',     'HIGH'],
    medium:   ['badge badge-medium',   'MEDIUM'],
    low:      ['badge badge-low',      'LOW'],
    routine:  ['badge badge-routine',  'ROUTINE'],
  }
  const [cls, text] = map[p] || ['badge badge-low', p]
  return <span className={cls}>{text}</span>
}

function StatusDot() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: '4px 10px' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse-dot 2s infinite' }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>ON DUTY</span>
    </div>
  )
}

const critBannerStyle = {
  width: '100%',
  background: 'rgba(231,76,60,0.1)',
  border: '1px solid rgba(231,76,60,0.4)',
  borderRadius: 12,
  padding: '12px 14px',
  cursor: 'pointer',
}
