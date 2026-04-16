import { useState, useEffect, useCallback } from 'react'
import LoginPage    from './pages/LoginPage.jsx'
import HomePage     from './pages/HomePage.jsx'
import TasksPage    from './pages/TasksPage.jsx'
import AlertsPage   from './pages/AlertsPage.jsx'
import ReportPage   from './pages/ReportPage.jsx'
import HandoverPage from './pages/HandoverPage.jsx'
import BottomNav    from './components/BottomNav.jsx'
import { INITIAL_TASKS } from './constants/mockData.js'

const TASKS_VERSION = '2'  // bump this whenever INITIAL_TASKS changes
import { api } from './services/api.js'

// Map a backend dispatch object → alert shape used by AlertsPage / HomePage
function dispatchToAlert(d) {
  return {
    id:          d.id,
    priority:    d.priority || 'high',
    type:        d.incidentType || (d.incidentId ? `Incident ${d.incidentId}` : 'Instruction from Command Centre'),
    location:    d.incidentLocation || 'See instruction',
    instruction: d.instruction,
    timestamp:   d.timestamp || '—',
    status:      d.status,          // unread | acknowledged | in_progress | resolved
    source:      'Command Center (CC)',
  }
}

export default function App() {
  const [officer, setOfficer] = useState(null)
  const [page, setPage]       = useState('home')
  const [alerts, setAlerts]   = useState([])          // live from backend
  const [tasks, setTasks]     = useState(() => {
    try {
      const savedVersion = localStorage.getItem('certis_tasks_version')
      const saved = localStorage.getItem('certis_tasks')
      if (saved && savedVersion === TASKS_VERSION) return JSON.parse(saved)
      // Version mismatch — reset to latest INITIAL_TASKS
      localStorage.removeItem('certis_tasks')
      localStorage.setItem('certis_tasks_version', TASKS_VERSION)
      return INITIAL_TASKS
    } catch { return INITIAL_TASKS }
  })
  const [reports, setReports] = useState([])
  const [backendOnline, setBackendOnline] = useState(null)

  // Poll backend every 8 seconds for new dispatches after login
  const syncAlerts = useCallback(async () => {
    if (!officer) return
    try {
      const dispatches = await api.getMyDispatches(officer.id)
      setAlerts(dispatches.map(dispatchToAlert))
      setBackendOnline(true)
    } catch {
      setBackendOnline(false)
    }
  }, [officer])

  useEffect(() => {
    if (!officer) return
    syncAlerts()
    const id = setInterval(syncAlerts, 8_000)
    return () => clearInterval(id)
  }, [officer, syncAlerts])

  const handleLogin = async (officerData) => {
    setOfficer(officerData)
    try {
      await api.updateMyStatus(officerData.id, { online: true })
    } catch (err) {
      console.warn('Could not set online status:', err.message)
    }
  }

  if (!officer) {
    return <LoginPage onLogin={handleLogin} />
  }

  const unreadAlerts = alerts.filter(a => a.status === 'unread').length

  const updateAlertStatus = async (id, status) => {
    // Optimistic update
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    try {
      await api.updateDispatch(id, status)
    } catch (err) {
      console.warn('Could not update dispatch status:', err.message)
    }
  }

  const handleLogout = async () => {
    if (officer) {
      try {
        await api.updateMyStatus(officer.id, { status: "standby", task: "Standby — awaiting assignment", online: false })
      } catch (err) {
        console.warn('Could not reset officer status:', err.message)
      }
    }
    setOfficer(null)
    setPage('home')
    setAlerts([])
    setReports([])
  }

  const toggleTask = (id) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, done: !t.done } : t)
      localStorage.setItem('certis_tasks', JSON.stringify(updated))
      localStorage.setItem('certis_tasks_version', TASKS_VERSION)
      return updated
    })
  }

  const addReport = async (report) => {
    const timestamp = new Date().toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })
    const local = { ...report, id: `r${Date.now()}`, timestamp }
    setReports(prev => [local, ...prev])
    try {
      await api.createReport({
        officerId:    officer.id,
        officerName:  report.officerName,
        officerBadge: report.officerBadge,
        type:         report.type,
        location:     report.location,
        severity:     report.severity,
        description:  report.description,
      })
    } catch (err) {
      console.warn('Could not sync report to backend:', err.message)
    }
  }

  const pages = { home: HomePage, tasks: TasksPage, alerts: AlertsPage, report: ReportPage, handover: HandoverPage }
  const CurrentPage = pages[page] || HomePage

  return (
    <div className="app-shell">
      {/* Backend offline banner */}
      {backendOnline === false && (
        <div style={{
          background: 'rgba(231,76,60,0.15)', borderBottom: '1px solid rgba(231,76,60,0.4)',
          padding: '6px 16px', fontSize: 11, color: '#e74c3c', textAlign: 'center', flexShrink: 0,
        }}>
          ⚠ Backend offline — alerts unavailable
        </div>
      )}

      <CurrentPage
        officer={officer}
        alerts={alerts}
        tasks={tasks}
        reports={reports}
        onUpdateAlertStatus={updateAlertStatus}
        onToggleTask={toggleTask}
        onAddReport={addReport}
        onNavigate={setPage}
        unreadAlerts={unreadAlerts}
        onLogout={handleLogout}
      />
      <BottomNav current={page} onNavigate={setPage} unreadAlerts={unreadAlerts} />
    </div>
  )
}
