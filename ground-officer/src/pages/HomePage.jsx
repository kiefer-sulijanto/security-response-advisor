import TopBar from '../components/TopBar.jsx'

const PRIORITY_COLORS = {
  critical: '#e74c3c',
  high:     '#f39c12',
  medium:   '#3b82f6',
  low:      '#22c55e',
}

const FLOOR_PLANS = {
  floor1: {
    label: 'Floor 1',
    rooms: [
      {
        id: 'server-room',
        lines: ['Server', 'Room'],
        x: 2,
        y: 2,
        w: 80,
        h: 50,
        loc: 'Server Room',
        locationKey: 'server_room',
      },
      {
        id: 'meeting-room',
        lines: ['Meeting', 'Room'],
        x: 84,
        y: 2,
        w: 90,
        h: 50,
        loc: 'Meeting Room',
        locationKey: 'meeting_room',
      },
      {
        id: 'multipurpose',
        lines: ['Multi-Purpose', 'Room'],
        x: 176,
        y: 2,
        w: 122,
        h: 50,
        loc: 'Multi-Purpose Room',
        locationKey: 'multi_purpose_room',
      },
      {
        id: 'gathering',
        lines: ['Gathering', 'Area'],
        x: 2,
        y: 54,
        w: 296,
        h: 90,
        loc: 'Gathering Area',
        locationKey: 'gathering_area',
      },
      {
        id: 'conference',
        lines: ['Conference', 'Room'],
        x: 2,
        y: 146,
        w: 80,
        h: 62,
        loc: 'Conference Room',
        locationKey: 'conference_room',
      },
      {
        id: 'canteen',
        lines: ['Canteen'],
        x: 84,
        y: 146,
        w: 90,
        h: 62,
        loc: 'Canteen',
        locationKey: 'canteen',
      },
      {
        id: 'lobby',
        lines: ['Lobby'],
        x: 176,
        y: 146,
        w: 122,
        h: 62,
        loc: 'Lobby',
        locationKey: 'lobby',
      },
    ],
  },

  floor2: {
    label: 'Floor 2',
    rooms: [
      {
        id: 'ceo',
        lines: ['CEO'],
        x: 2,
        y: 2,
        w: 90,
        h: 46,
        loc: 'CEO Office',
        locationKey: 'ceo_office',
      },
      {
        id: 'manager',
        lines: ['Manager'],
        x: 94,
        y: 2,
        w: 100,
        h: 46,
        loc: 'Manager Office',
        locationKey: 'manager_office',
      },
      {
        id: 'executive',
        lines: ['Executive'],
        x: 196,
        y: 2,
        w: 102,
        h: 46,
        loc: 'Executive Office',
        locationKey: 'executive_office',
      },
      {
        id: 'office',
        lines: ['Office', 'Area'],
        x: 2,
        y: 50,
        w: 240,
        h: 158,
        loc: 'Office Area',
        locationKey: 'office_area',
      },
      {
        id: 'command',
        lines: ['Command', 'Centre'],
        x: 244,
        y: 50,
        w: 54,
        h: 158,
        loc: 'Command Center',
        locationKey: 'command_center',
      },
    ],
  },

  underground: {
    label: 'Underground',
    rooms: [
      {
        id: 'parking',
        lines: ['Parking', 'Area'],
        x: 2,
        y: 2,
        w: 240,
        h: 206,
        loc: 'Parking Area',
        locationKey: 'parking_area',
      },
      {
        id: 'storage',
        lines: ['Store', 'Room'],
        x: 244,
        y: 2,
        w: 54,
        h: 206,
        loc: 'Store Room',
        locationKey: 'store_room',
      },
    ],
  },
}

export default function HomePage({ officer, alerts, reports, onNavigate, patrolLocation, onSetPatrolLocation, patrolFloor, onSetPatrolFloor }) {
  const myLocation    = patrolLocation
  const setMyLocation = onSetPatrolLocation
  const floor         = patrolFloor
  const setFloor      = onSetPatrolFloor

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' })

  const criticalAlerts  = alerts.filter(a => a.priority === 'critical' && a.status !== 'resolved')
  const activeAlerts    = alerts.filter(a => a.status !== 'resolved')
  const recentReports   = reports.slice(0, 3)

  const latestInstruction = [...alerts]
    .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
    .find(a => a.status === 'unread')

  const plan = FLOOR_PLANS[floor]

  const handleRoomClick = async (room) => {
    if (!room.locationKey) return

    const nextLocation = {
      floor,
      roomId: room.id,
      label: room.loc,
      floorLabel: plan.label,
      locationKey: room.locationKey,
    }

    await setMyLocation(nextLocation)
  }

  return (
    <>
      <TopBar
        title={`Hey, ${officer.name.split(' ')[0]}`}
        subtitle={`${officer.badge} · ${officer.shift.label}`}
        right={<StatusDot />}
      />

      <div className="page-scroll" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Shift banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1a2d42 0%, #1e3a58 100%)',
          borderRadius: 16, border: '1px solid #2a4060',
          padding: '16px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#6a8aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              Current Shift
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#eef2f7' }}>{officer.shift.label}</div>
            <div style={{ fontSize: 13, color: '#6a8aaa', marginTop: 3 }}>{officer.shift.time}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#F07820', lineHeight: 1 }}>{timeStr}</div>
            <div style={{ fontSize: 12, color: '#6a8aaa', marginTop: 5 }}>{dateStr}</div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={() => onNavigate('alerts')}
            style={{
              background: activeAlerts.length > 0 ? 'rgba(231,76,60,0.08)' : '#111c2b',
              borderRadius: 14, border: `1px solid ${activeAlerts.length > 0 ? 'rgba(231,76,60,0.25)' : '#1a2840'}`,
              padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: activeAlerts.length > 0 ? 'rgba(231,76,60,0.15)' : '#1a2840',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={activeAlerts.length > 0 ? '#e74c3c' : '#5a7a99'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: activeAlerts.length > 0 ? '#e74c3c' : '#eef2f7' }}>{activeAlerts.length}</div>
              <div style={{ fontSize: 11, color: '#5a7a99' }}>Active Alerts</div>
            </div>
          </button>

          <div style={{
            background: '#111c2b', borderRadius: 14, border: '1px solid #1a2840',
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: '#1a2840', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#F07820" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#F07820' }}>{reports.length}</div>
              <div style={{ fontSize: 11, color: '#5a7a99' }}>Reports Sent</div>
            </div>
          </div>
        </div>

        {/* Critical alert banner */}
        {criticalAlerts.length > 0 && (
          <button
            onClick={() => onNavigate('alerts')}
            className="pulse-critical"
            style={{
              width: '100%', background: 'rgba(231,76,60,0.1)', cursor: 'pointer',
              border: '1px solid rgba(231,76,60,0.35)', borderRadius: 14,
              padding: '14px 16px', boxShadow: '0 0 20px rgba(231,76,60,0.12)',
              display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: 'rgba(231,76,60,0.2)', border: '1px solid rgba(231,76,60,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e74c3c' }}>
                {criticalAlerts.length} CRITICAL ALERT{criticalAlerts.length > 1 ? 'S' : ''} ACTIVE
              </div>
              <div style={{ fontSize: 12, color: '#f0a0a0', marginTop: 2 }}>
                {criticalAlerts[0].type} — {criticalAlerts[0].location}
              </div>
            </div>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}

        {/* Patrol Location */}
        <div>
          <SectionTitle>Patrol Location</SectionTitle>

          {/* My Location banner */}
          <div style={{
            marginBottom: 10, padding: '12px 14px',
            background: '#111c2b', borderRadius: 12,
            border: `1px solid ${myLocation ? 'rgba(240,120,32,0.4)' : '#1a2840'}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: myLocation ? 'rgba(240,120,32,0.15)' : '#1a2840',
              border: `1px solid ${myLocation ? 'rgba(240,120,32,0.3)' : '#253448'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={myLocation ? '#F07820' : '#5a7a99'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#5a7a99', letterSpacing: '0.05em', fontWeight: 700, textTransform: 'uppercase' }}>My Location</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: myLocation ? '#F07820' : '#5a7a99' }}>
                {myLocation ? `${myLocation.label}  ·  ${myLocation.floorLabel}` : 'Tap a room to set your location'}
              </div>
            </div>
            {myLocation && (
              <button
                onClick={() => setMyLocation(null)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#5a7a99', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
              >×</button>
            )}
          </div>

          {/* Floor selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {Object.entries(FLOOR_PLANS).map(([key, f]) => (
              <button
                key={key}
                onClick={() => setFloor(key)}
                className={floor !== key ? 'chip-hover' : ''}
                style={{
                  flex: 1, padding: '8px 4px', fontSize: 12, fontWeight: 700,
                  borderRadius: 10, border: `1px solid ${floor === key ? '#F07820' : '#1a2840'}`,
                  cursor: 'pointer',
                  background: floor === key ? 'rgba(240,120,32,0.15)' : '#111c2b',
                  color: floor === key ? '#F07820' : '#5a7a99',
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* SVG Floor Plan */}
          <div style={{ background: '#0d1823', borderRadius: 14, border: '1px solid #1a2840', padding: 10 }}>
            <svg viewBox="0 0 300 210" style={{ width: '100%', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
              <rect x={0} y={0} width={300} height={210} fill="none" stroke="#2d3f55" strokeWidth={1.5} rx={3} />
              {plan.rooms.map(room => {
                const isSelected = myLocation?.floor === floor && myLocation?.roomId === room.id
                const fontSize = room.w < 60 ? 7.5 : room.h > 80 ? 12 : 9
                return (
                  <g key={room.id} onClick={() => handleRoomClick(room)} style={{ cursor: 'pointer' }}>
                    <rect
                      x={room.x} y={room.y} width={room.w} height={room.h}
                      fill={isSelected ? 'rgba(240,120,32,0.22)' : '#13202f'}
                      stroke={isSelected ? '#F07820' : '#2d3f55'}
                      strokeWidth={isSelected ? 1.8 : 1} rx={2}
                    />
                    {room.lines.map((line, i) => (
                      <text
                        key={i}
                        x={room.x + room.w / 2}
                        y={room.y + room.h / 2 + (i - (room.lines.length - 1) / 2) * (fontSize + 2.5)}
                        textAnchor="middle" dominantBaseline="middle"
                        fill={isSelected ? '#F07820' : '#b0c4d8'}
                        fontSize={fontSize} fontWeight={isSelected ? '700' : '500'}
                        fontFamily="system-ui, -apple-system, sans-serif"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      >
                        {line}
                      </text>
                    ))}
                    {isSelected && (
                      <>
                        <circle cx={room.x + room.w / 2} cy={room.y + 10} r={5.5} fill="#F07820" />
                        <circle cx={room.x + room.w / 2} cy={room.y + 10} r={2}   fill="#fff" />
                      </>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#5a7a99' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F07820', display: 'inline-block' }} />
              My location
            </span>
            <span style={{ marginLeft: 'auto', color: '#3a4a5c' }}>Tap to set · tap again to clear</span>
          </div>
        </div>

        {/* Latest alert */}
        {latestInstruction && (
          <div>
            <SectionTitle>Alerts</SectionTitle>
            <button
              onClick={() => onNavigate('alerts')}
              style={{
                width: '100%', textAlign: 'left', cursor: 'pointer',
                background: '#111c2b', borderRadius: 14,
                border: `1px solid ${PRIORITY_COLORS[latestInstruction.priority]}33`,
                borderLeft: `3px solid ${PRIORITY_COLORS[latestInstruction.priority]}`,
                padding: '14px 14px',
                boxShadow: latestInstruction.priority === 'critical' ? '0 0 18px rgba(231,76,60,0.1)' : 'none',
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: `${PRIORITY_COLORS[latestInstruction.priority]}18`,
                  border: `1px solid ${PRIORITY_COLORS[latestInstruction.priority]}33`,
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#eef2f7' }}>{latestInstruction.type}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.5px',
                      color: '#e74c3c', background: 'rgba(231,76,60,0.15)',
                      border: '1px solid rgba(231,76,60,0.4)',
                      borderRadius: 6, padding: '2px 6px', flexShrink: 0,
                    }}>NEW</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#5a7a99', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#5a7a99" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    {latestInstruction.location}
                  </div>
                  <div style={{
                    fontSize: 12, color: '#7a9ab8', marginTop: 6, lineHeight: 1.5,
                    overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {latestInstruction.instruction}
                  </div>
                </div>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#3a4a5c" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                  background: `${PRIORITY_COLORS[latestInstruction.priority]}20`,
                  color: PRIORITY_COLORS[latestInstruction.priority],
                  border: `1px solid ${PRIORITY_COLORS[latestInstruction.priority]}40`,
                }}>
                  {latestInstruction.priority.toUpperCase()}
                </span>
                <span style={{ fontSize: 11, color: '#3a4a5c' }}>{latestInstruction.timestamp} · {latestInstruction.source}</span>
              </div>
            </button>
          </div>
        )}

        {/* Recent reports */}
        {recentReports.length > 0 && (
          <div>
            <SectionTitle>Reports Sent</SectionTitle>
            {recentReports.map(r => {
              const sc = PRIORITY_COLORS[r.severity] || '#5a7a99'
              return (
                <div key={r.id} style={{
                  background: '#111c2b', borderRadius: 14,
                  border: '1px solid #1a2840', borderLeft: `3px solid ${sc}`,
                  padding: '12px 14px', marginBottom: 8,
                  display: 'flex', gap: 12, alignItems: 'center',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${sc}15`, border: `1px solid ${sc}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={sc} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#eef2f7' }}>{r.type}</div>
                    <div style={{ fontSize: 12, color: '#5a7a99', marginTop: 2 }}>{r.location} · {r.timestamp}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6,
                    background: `${sc}20`, color: sc, border: `1px solid ${sc}40`, flexShrink: 0,
                  }}>
                    {(r.severity || 'low').toUpperCase()}
                  </span>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#5a7a99', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function StatusDot() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 20, padding: '4px 10px' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse-dot 2s infinite' }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: '0.3px' }}>ON DUTY</span>
    </div>
  )
}
