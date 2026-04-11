import { useState } from 'react'
import TopBar from '../components/TopBar.jsx'

const STATUS_LABELS = {
  unread:      { label: 'New',         color: '#e74c3c', bg: 'rgba(231,76,60,0.15)' },
  acknowledged:{ label: 'Acknowledged',color: '#f39c12', bg: 'rgba(243,156,18,0.15)' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  resolved:    { label: 'Resolved',    color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
}

const PRIORITY_COLORS = {
  critical: '#e74c3c',
  high:     '#f39c12',
  medium:   '#3b82f6',
  low:      '#22c55e',
}

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

export default function AlertsPage({ alerts, onUpdateAlertStatus }) {
  const [expanded, setExpanded] = useState(null)
  const [filter,   setFilter]   = useState('all')

  const filtered = alerts
    .filter(a => filter === 'all' || a.status === filter || a.priority === filter)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  return (
    <>
      <TopBar title="Alerts & Instructions" subtitle="From Command Center" />

      <div style={{ padding: '12px 16px 6px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {FILTER_TABS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              ...filterTabStyle,
              background: filter === f.id ? '#F07820' : '#1e2d42',
              color: filter === f.id ? '#fff' : '#7a8899',
              border: `1px solid ${filter === f.id ? '#F07820' : '#253448'}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="page-scroll" style={{ padding: '8px 16px 0' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#7a8899', padding: 40, fontSize: 14 }}>
            No alerts matching this filter.
          </div>
        )}

        {filtered.map(alert => {
          const isOpen = expanded === alert.id
          const st = STATUS_LABELS[alert.status] || STATUS_LABELS.unread
          const pc = PRIORITY_COLORS[alert.priority]

          return (
            <div key={alert.id} style={{ marginBottom: 10 }}>
              <div
                className="card"
                style={{ borderLeft: `3px solid ${pc}`, cursor: 'pointer' }}
                onClick={() => setExpanded(isOpen ? null : alert.id)}
              >
                {/* Header row */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: `${pc}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>
                    {PRIORITY_ICON[alert.priority]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{alert.type}</span>
                      {alert.status === 'unread' && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#e74c3c', display: 'inline-block' }} />
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#7a8899', marginTop: 2 }}>{alert.location}</div>
                  </div>
                  <span style={{ fontSize: 16, color: '#7a8899', flexShrink: 0 }}>{isOpen ? '▾' : '›'}</span>
                </div>

                {/* Meta row */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={`badge badge-${alert.priority}`}>{alert.priority.toUpperCase()}</span>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: st.bg, color: st.color, fontWeight: 600 }}>
                    {st.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#7a8899', marginLeft: 'auto' }}>{alert.timestamp}</span>
                </div>

                {/* Expanded instruction */}
                {isOpen && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ height: 1, background: '#253448', marginBottom: 12 }} />
                    <div style={{ fontSize: 12, color: '#7a8899', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Instructions from {alert.source}
                    </div>
                    <div style={{ fontSize: 14, color: '#c0ccd8', lineHeight: 1.6, background: '#141f2e', borderRadius: 10, padding: 14 }}>
                      {alert.instruction}
                    </div>

                    {/* Action buttons */}
                    {alert.status !== 'resolved' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        {alert.status === 'unread' && (
                          <button className="btn btn-outline" style={{ flex: 1, fontSize: 13 }}
                            onClick={(e) => { e.stopPropagation(); onUpdateAlertStatus(alert.id, 'acknowledged') }}>
                            Acknowledge
                          </button>
                        )}
                        {(alert.status === 'unread' || alert.status === 'acknowledged') && (
                          <button className="btn" style={{ flex: 1, fontSize: 13, background: '#1d3a6e', color: '#60a5fa', border: '1px solid #2a4a8a' }}
                            onClick={(e) => { e.stopPropagation(); onUpdateAlertStatus(alert.id, 'in_progress') }}>
                            Mark In Progress
                          </button>
                        )}
                        <button className="btn btn-success" style={{ flex: 1, fontSize: 13 }}
                          onClick={(e) => { e.stopPropagation(); onUpdateAlertStatus(alert.id, 'resolved') }}>
                          Mark Resolved
                        </button>
                      </div>
                    )}
                    {alert.status === 'resolved' && (
                      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: '#22c55e' }}>
                        ✓ Resolved
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

const FILTER_TABS = [
  { id: 'all',         label: 'All' },
  { id: 'unread',      label: 'New' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'critical',    label: 'Critical' },
  { id: 'high',        label: 'High' },
  { id: 'resolved',    label: 'Resolved' },
]

const PRIORITY_ICON = {
  critical: '🚨',
  high:     '⚠️',
  medium:   '🔔',
  low:      '📋',
}

const filterTabStyle = {
  padding: '6px 14px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
}
