// Mock data — replace with real API calls when backend is ready

export const SHIFTS = [
  { id: 'morning',   label: 'Morning Shift',   time: '08:00 – 16:00' },
  { id: 'afternoon', label: 'Afternoon Shift',  time: '16:00 – 00:00' },
  { id: 'night',     label: 'Night Shift',      time: '00:00 – 08:00' },
]

export const INITIAL_ALERTS = [
  {
    id: 'a1',
    priority: 'critical',
    type: 'VCA Intrusion Detection',
    location: 'Basement Carpark B2 — Camera 04',
    instruction: 'Proceed immediately to B2 carpark. Unidentified individual detected near server room door. Do NOT approach alone. Contact backup and report on arrival.',
    timestamp: '09:14',
    status: 'unread',
    source: 'Command Center (AI)',
  },
  {
    id: 'a2',
    priority: 'critical',
    type: 'Fire Alarm Response',
    location: 'Level 3 — East Wing Stairwell',
    instruction: 'Fire alarm triggered. Evacuate Level 3 east wing via north stairwell. Check for smoke and report to Command Center before entering.',
    timestamp: '09:22',
    status: 'acknowledged',
    source: 'Fire Alarm System',
  },
  {
    id: 'a3',
    priority: 'high',
    type: 'Lift Alarm & Intercom',
    location: 'Lift 2 — Between Level 5 and 6',
    instruction: 'Passenger trapped in Lift 2. Contact building facilities on ext. 4421 and standby at Level 5 landing. Update Command Center every 5 minutes.',
    timestamp: '09:35',
    status: 'in_progress',
    source: 'Lift Monitoring',
  },
  {
    id: 'a4',
    priority: 'high',
    type: 'Door Access Control Breach',
    location: 'Level 1 — Server Room A',
    instruction: 'Tailgating detected at Server Room A. Verify access logs, check for unauthorised persons, and report findings.',
    timestamp: '10:02',
    status: 'unread',
    source: 'C2 System',
  },
  {
    id: 'a5',
    priority: 'medium',
    type: 'VCA Prolonged Parking',
    location: 'Main Driveway — Gate 1',
    instruction: 'Vehicle detected stationary at Gate 1 for over 30 minutes. Verify vehicle registration and ask driver to move. Report outcome.',
    timestamp: '10:18',
    status: 'resolved',
    source: 'Command Center (AI)',
  },
]

export const INITIAL_TASKS = [
  // Routine
  { id: 't1', category: 'routine', title: 'Access Control Check', location: 'Main Entrance & Side Gates', priority: 'high',     done: false, note: '' },
  { id: 't2', category: 'routine', title: 'Patrol — Ground Floor', location: 'Lobby, Corridors, Carpark',  priority: 'medium',  done: false, note: '' },
  { id: 't3', category: 'routine', title: 'Patrol — Upper Floors', location: 'Level 2–5',                  priority: 'medium',  done: false, note: '' },
  { id: 't4', category: 'routine', title: 'Monitor CCTV (SSO)',       location: 'Control Room',                priority: 'medium',  done: true,  note: 'All clear at 08:30' },
  { id: 't5', category: 'routine', title: 'Carpark Intercom Check', location: 'B1 & B2 Carparks',          priority: 'high',    done: false, note: '' },
  { id: 't6', category: 'routine', title: 'Nursing Room Intercom',  location: 'Level 2 — Room 2A',         priority: 'low',     done: true,  note: 'Operational' },
  // Non-routine (linked from alerts)
  { id: 't7', category: 'nonroutine', title: 'Respond: VCA Intrusion B2',  location: 'Basement B2', priority: 'critical', done: false, alertId: 'a1', note: '' },
  { id: 't8', category: 'nonroutine', title: 'Respond: Fire Alarm Level 3', location: 'Level 3 East', priority: 'critical', done: false, alertId: 'a2', note: '' },
  { id: 't9', category: 'nonroutine', title: 'Lift Rescue Standby',         location: 'Lift 2',      priority: 'high',     done: false, alertId: 'a3', note: '' },
]

export const INCIDENT_TYPES = [
  'Theft / Attempted Theft',
  'Fire / Smoke Detected',
  'Unauthorised Access',
  'Public Order Incident',
  'Medical Emergency',
  'Lift / Facilities Fault',
  'Suspicious Activity',
  'Vandalism',
  'Other',
]

export const LOCATIONS = [
  'Main Entrance', 'Side Gate', 'Basement B1', 'Basement B2',
  'Lobby — Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5',
  'East Wing', 'West Wing', 'North Stairwell', 'South Stairwell',
  'Control Room', 'Carpark', 'Main Driveway — Gate 1', 'Loading Bay',
]
