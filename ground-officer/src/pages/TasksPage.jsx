import { useState } from 'react'
import TopBar from '../components/TopBar.jsx'

const PRIORITY_COLORS = {
  critical: '#e74c3c',
  high:     '#f39c12',
  medium:   '#3b82f6',
  low:      '#22c55e',
}

export default function TasksPage({ tasks, onToggleTask }) {
  const [tab, setTab] = useState('routine')

  const list = tasks.filter(t => t.category === tab)
  const doneCount    = list.filter(t => t.done).length
  const pendingCount = list.filter(t => !t.done).length

  return (
    <>
      <TopBar
        title="My Tasks"
        subtitle={`${pendingCount} pending · ${doneCount} completed`}
      />

      {/* Tabs */}
      <div style={tabBarStyle}>
        {[
          { id: 'routine',    label: 'Routine' },
          { id: 'nonroutine', label: 'Non-Routine' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              ...tabBtnStyle,
              color: tab === t.id ? '#F07820' : '#7a8899',
              borderBottom: tab === t.id ? '2px solid #F07820' : '2px solid transparent',
            }}
          >
            {t.label}
            <span style={{
              marginLeft: 6, fontSize: 11, padding: '1px 7px', borderRadius: 10,
              background: tab === t.id ? 'rgba(240,120,32,0.15)' : '#1a2535',
              color: tab === t.id ? '#F07820' : '#7a8899',
            }}>
              {tasks.filter(x => x.category === t.id && !x.done).length}
            </span>
          </button>
        ))}
      </div>

      <div className="page-scroll" style={{ padding: '10px 16px 0' }}>

        {/* Progress bar */}
        {list.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7a8899', marginBottom: 6 }}>
              <span>Progress</span>
              <span>{doneCount}/{list.length}</span>
            </div>
            <div style={{ height: 6, background: '#1e2d42', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${list.length > 0 ? (doneCount / list.length) * 100 : 0}%`,
                background: '#22c55e',
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {list.length === 0 && (
          <div style={{ textAlign: 'center', color: '#7a8899', padding: 40, fontSize: 14 }}>
            No {tab === 'routine' ? 'routine' : 'non-routine'} tasks assigned.
          </div>
        )}

        {list.map(task => (
          <TaskCard key={task.id} task={task} onToggle={() => onToggleTask(task.id)} />
        ))}
      </div>
    </>
  )
}

function TaskCard({ task, onToggle }) {
  const pc = PRIORITY_COLORS[task.priority] || '#7a8899'

  return (
    <div
      className="card"
      style={{
        marginBottom: 10,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        opacity: task.done ? 0.55 : 1,
        borderLeft: `3px solid ${task.done ? '#253448' : pc}`,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          background: task.done ? '#22c55e' : 'transparent',
          border: `2px solid ${task.done ? '#22c55e' : '#3a4a5c'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', marginTop: 1,
          transition: 'all 0.15s',
        }}
      >
        {task.done && (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, textDecoration: task.done ? 'line-through' : 'none' }}>
          {task.title}
        </div>
        <div style={{ fontSize: 12, color: '#7a8899', marginTop: 2 }}>{task.location}</div>
        {task.note && (
          <div style={{ fontSize: 12, color: '#22c55e', marginTop: 4 }}>✓ {task.note}</div>
        )}
        {task.alertId && (
          <div style={{ fontSize: 11, color: '#f39c12', marginTop: 4 }}>⚡ Triggered by alert</div>
        )}
        <div style={{ marginTop: 8 }}>
          <span className={`badge badge-${task.priority}`}>{task.priority.toUpperCase()}</span>
          {task.category === 'routine' && (
            <span className="badge badge-routine" style={{ marginLeft: 6 }}>ROUTINE</span>
          )}
        </div>
      </div>
    </div>
  )
}

const tabBarStyle = {
  display: 'flex',
  borderBottom: '1px solid #1e2d42',
  padding: '0 16px',
  background: '#0f1923',
  flexShrink: 0,
}

const tabBtnStyle = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 0',
  background: 'none',
  border: 'none',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'color 0.15s',
}
