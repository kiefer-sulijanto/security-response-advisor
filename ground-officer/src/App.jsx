import { useState, useEffect, useCallback } from 'react'
import LoginPage    from './pages/LoginPage.jsx'
import HomePage     from './pages/HomePage.jsx'
import AlertsPage   from './pages/AlertsPage.jsx'
import ReportPage   from './pages/ReportPage.jsx'
import HandoverPage from './pages/HandoverPage.jsx'
import BottomNav    from './components/BottomNav.jsx'
import { api } from './services/api.js'

// Map a backend dispatch object → alert shape used by AlertsPage / HomePage
function dispatchToAlert(d) {
  return {
    id:          d.id,
    priority:    d.priority || 'high',
    type:        d.incidentType || (d.incidentId ? `Incident ${d.incidentId}` : 'Instruction from Command Center'),
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
  const [reports, setReports] = useState([])
  const [backendOnline, setBackendOnline] = useState(null)
  const [patrolLocation, setPatrolLocation] = useState(null)
  const [patrolFloor, setPatrolFloor]       = useState('floor1')
  const [reportForm,      setReportForm]      = useState({ type: '', location: '', description: '', severity: 'medium' })
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [reportErrors,    setReportErrors]    = useState({})


  const handleSetPatrolLocation = useCallback(async (nextLocation) => {
    if (!officer || !nextLocation?.locationKey) return

    const previousLocation = patrolLocation;
    setPatrolLocation(nextLocation);


    try {
      await api.updateMyStatus(officer.id, {
        location: nextLocation.locationKey,
        status: 'patrolling',
        task: `Patrolling ${nextLocation.label}`,
        online: true,
      })

      setOfficer(prev =>
        prev
          ? {
              ...prev,
              location: nextLocation.locationKey,
              status: 'patrolling',
              task: `Patrolling ${nextLocation.label}`,
              online: true,
            }
          : prev
      )

      setBackendOnline(true)
    } catch (err) {
      console.warn('Could not update patrol location:', err.message)
      setPatrolLocation(previousLocation);
      setBackendOnline(false)
    }
  }, [officer])

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
    // Fetch immediately on login, then poll. syncAlerts is async, so setState
    // runs after the await (not synchronously) — safe despite the lint rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncAlerts()
    const id = setInterval(syncAlerts, 8_000)
    return () => clearInterval(id)
  }, [officer, syncAlerts])

  const handleLogin = async (officerData) => {
    setOfficer(officerData)
    try {
      await api.updateMyStatus(officerData.id, { status: 'patrolling', task: 'On Patrol', online: true })
    } catch (err) {
      console.warn('Could not set online status:', err.message)
    }
  }

  if (!officer) {
    return <LoginPage onLogin={handleLogin} />
  }

  const unreadAlerts = alerts.filter(a => a.status === 'unread').length

  const updateAlertStatus = async (id, status) => {
    const previous = alerts.find(a => a.id === id)?.status
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    try {
      await api.updateDispatch(id, status)
    } catch (err) {
      console.warn('Could not update dispatch status:', err.message)
      if (previous !== undefined) {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: previous } : a))
      }
    }
  }

  const handleLogout = async () => {
    if (officer) {
      try {
        await api.updateMyStatus(officer.id, { status: 'offline', task: '', online: false })
      } catch (err) {
        console.warn('Could not reset officer status:', err.message)
      }
    }
    setOfficer(null)
    setPage('home')
    setAlerts([])
    setReports([])
    setReportForm({ type: '', location: '', description: '', severity: 'medium' })
    setReportSubmitted(false)
    setReportErrors({})
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

  const pages = { home: HomePage, alerts: AlertsPage, report: ReportPage, handover: HandoverPage }
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
        reports={reports}
        onUpdateAlertStatus={updateAlertStatus}
        onAddReport={addReport}
        onNavigate={setPage}
        unreadAlerts={unreadAlerts}
        onLogout={handleLogout}
        patrolLocation={patrolLocation}
        onSetPatrolLocation={handleSetPatrolLocation}
        patrolFloor={patrolFloor}
        onSetPatrolFloor={setPatrolFloor}
        reportForm={reportForm}
        onSetReportForm={setReportForm}
        reportSubmitted={reportSubmitted}
        onSetReportSubmitted={setReportSubmitted}
        reportErrors={reportErrors}
        onSetReportErrors={setReportErrors}
      />
      <BottomNav current={page} onNavigate={setPage} unreadAlerts={unreadAlerts} />
    </div>
  )
}
