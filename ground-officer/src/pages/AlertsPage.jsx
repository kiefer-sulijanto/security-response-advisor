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

const FILTER_TABS = [
  { id: 'all',       label: 'All' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'resolved',  label: 'Resolved' },
]

export default function AlertsPage({ alerts, onUpdateAlertStatus }) {
  const [expanded, setExpanded] = useState(null)
  const [filter,   setFilter]   = useState('all')

  const matchesFilter = (a) => {
    if (filter === 'all') return true
    if (filter === 'incidents') return a.status !== 'resolved' && (a.status === 'in_progress' || a.priority === 'critical' || a.priority === 'high' || a.priority === 'medium')
    if (filter === 'resolved') return a.status === 'resolved'
    return true
  }

  const filtered = alerts
    .filter(matchesFilter)
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99))

  const countFor = (id) => alerts.filter(a => {
    if (id === 'all') return true
    if (id === 'incidents') return a.status !== 'resolved' && (a.status === 'in_progress' || a.priority === 'critical' || a.priority === 'high' || a.priority === 'medium')
    if (id === 'resolved') return a.status === 'resolved'
    return false
  }).length

  const unreadCount = alerts.filter(a => a.status === 'unread').length

  return (
    <>
      <TopBar
        title="Alerts"
        subtitle={unreadCount > 0 ? `${unreadCount} new alert${unreadCount > 1 ? 's' : ''}` : 'From Command Center'}
      />

      {/* Filter tabs */}
      <div style={{ padding: '10px 16px 0', display: 'flex', gap: 8 }}>
        {FILTER_TABS.map(f => {
          const count = countFor(f.id)
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={filter !== f.id ? 'chip-hover' : ''}
              style={{
                flex: 1,
                padding: '9px 4px',
                borderRadius: 10,
                border: `1px solid ${active ? '#F07820' : '#1e2d42'}`,
                background: active ? 'rgba(240,120,32,0.15)' : '#111c2b',
                color: active ? '#F07820' : '#7a8899',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <span>{f.label}</span>
              <span style={{
                fontSize: 16,
                fontWeight: 800,
                color: active ? '#F07820' : '#c0ccd8',
                lineHeight: 1,
              }}>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="page-scroll" style={{ padding: '12px 16px 0' }}>
        {filtered.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 20px', gap: 12 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 18,
              background: '#111c2b', border: '1px solid #1e2d42',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#3a4a5c" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </div>
            <div style={{ fontSize: 14, color: '#3a4a5c', fontWeight: 600 }}>No alerts here</div>
          </div>
        )}

        {filtered.map(alert => {
          const isOpen  = expanded === alert.id
          const st      = STATUS_LABELS[alert.status] || STATUS_LABELS.unread
          const pc      = PRIORITY_COLORS[alert.priority]
          const isCrit  = alert.priority === 'critical'
          const isNew   = alert.status === 'unread'

          return (
            <div
              key={alert.id}
              style={{ marginBottom: 10 }}
              onClick={() => setExpanded(isOpen ? null : alert.id)}
            >
              <div style={{
                background: isCrit ? 'rgba(231,76,60,0.07)' : '#111c2b',
                borderRadius: 14,
                border: `1px solid ${isCrit ? 'rgba(231,76,60,0.3)' : '#1a2840'}`,
                borderLeft: `3px solid ${pc}`,
                boxShadow: isCrit ? `0 0 18px rgba(231,76,60,0.12)` : (alert.priority === 'high' ? `0 0 14px rgba(243,156,18,0.08)` : 'none'),
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}>
                <div style={{ padding: '14px 14px 12px' }}>

                  {/* Top row: icon + title + chevron */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: `${pc}18`,
                      border: `1px solid ${pc}33`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <PriorityIcon priority={alert.priority} color={pc} size={20} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 14, fontWeight: 700, color: '#eef2f7',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {alert.type}
                        </span>
                        {isNew && (
                          <span style={{
                            fontSize: 9, fontWeight: 800, letterSpacing: '0.5px',
                            color: '#e74c3c', background: 'rgba(231,76,60,0.15)',
                            border: '1px solid rgba(231,76,60,0.4)',
                            borderRadius: 6, padding: '2px 6px', flexShrink: 0,
                          }}>NEW</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#5a7a99', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#5a7a99" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        {alert.location}
                      </div>
                    </div>

                    <svg
                      width={18} height={18} viewBox="0 0 24 24" fill="none"
                      stroke="#3a4a5c" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                      style={{ flexShrink: 0, marginTop: 2, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                    >
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>

                  {/* Bottom meta row */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, letterSpacing: '0.5px',
                      padding: '3px 8px', borderRadius: 6,
                      background: `${pc}20`, color: pc, border: `1px solid ${pc}40`,
                    }}>
                      {alert.priority.toUpperCase()}
                    </span>
                    <span style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 6,
                      background: st.bg, color: st.color, fontWeight: 600,
                    }}>
                      {st.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#3a4a5c', marginLeft: 'auto' }}>{alert.timestamp}</span>
                  </div>
                </div>

                {/* Expanded panel */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #1a2840', padding: '14px 14px' }}>
                    <div style={{ fontSize: 11, color: '#5a7a99', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                      From {alert.source}
                    </div>
                    <div style={{
                      fontSize: 13, color: '#b0c8e0', lineHeight: 1.7,
                      background: '#0d1823', borderRadius: 10,
                      padding: '12px 14px',
                      border: '1px solid #1a2840',
                    }}>
                      {alert.instruction}
                    </div>

                    {alert.status !== 'resolved' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        {(alert.status === 'unread' || alert.status === 'acknowledged') && (
                          <button
                            style={{
                              flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                              background: 'rgba(59,130,246,0.12)', color: '#60a5fa',
                              border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}
                            onClick={(e) => { e.stopPropagation(); onUpdateAlertStatus(alert.id, 'in_progress') }}
                          >
                            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                            In Progress
                          </button>
                        )}
                        <button
                          style={{
                            flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                            background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                            border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}
                          onClick={(e) => { e.stopPropagation(); onUpdateAlertStatus(alert.id, 'resolved') }}
                        >
                          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Resolved
                        </button>
                      </div>
                    )}

                    {alert.status === 'resolved' && (
                      <div style={{
                        marginTop: 12, padding: '10px 14px', borderRadius: 10,
                        background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        color: '#22c55e', fontSize: 13, fontWeight: 600,
                      }}>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Incident Resolved
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

function PriorityIcon({ priority, color, size = 20 }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (priority === 'critical') return (
    <svg {...s} strokeWidth={2.5}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
  if (priority === 'high') return (
    <svg {...s} strokeWidth={2.5}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
  if (priority === 'medium') return (
    <svg {...s} strokeWidth={2}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  )
  return (
    <svg {...s} strokeWidth={2}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}
