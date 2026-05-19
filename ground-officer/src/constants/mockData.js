// Mock data — replace with real API calls when backend is ready

export const SHIFTS = [
  { id: 'morning',   label: 'Morning Shift',   time: '07:00 – 15:00' },
  { id: 'afternoon', label: 'Afternoon Shift',  time: '15:00 – 23:00' },
  { id: 'night',     label: 'Night Shift',      time: '23:00 – 07:00' },
]

export const INITIAL_TASKS = [
  // Routine
  { id: 't1', category: 'routine', title: 'Access Control Check', location: 'Main Entrance', priority: 'high',     done: false, note: '' },
  { id: 't2', category: 'routine', title: 'Patrol — Ground Floor', location: 'Front Door, Parking Lot, Hallway, Back Door',  priority: 'medium',  done: false, note: '' },
  { id: 't3', category: 'routine', title: 'Patrol — Upper Floors', location: 'Storage, Staircase, Rooftop',                  priority: 'medium',  done: false, note: '' },
  { id: 't4', category: 'routine', title: 'Monitor CCTV (SSO)',       location: 'Control Room',                priority: 'medium',  done: true,  note: 'All clear at 08:30' },
  { id: 't5', category: 'routine', title: 'Carpark Intercom Check', location: 'Parking Lot',          priority: 'high',    done: false, note: '' },
  { id: 't6', category: 'routine', title: 'Server Check',  location: 'Server Room',         priority: 'low',     done: true,  note: 'Operational' },
  // Non-routine (linked from alerts)
  { id: 't7', category: 'nonroutine', title: 'Respond: VCA Intrusion',  location: 'Basement', priority: 'critical', done: false, alertId: 'a1', note: '' },
  { id: 't8', category: 'nonroutine', title: 'Respond: Fire Alarm', location: 'Smoking Area', priority: 'critical', done: false, alertId: 'a2', note: '' },
  { id: 't9', category: 'nonroutine', title: 'Lift Rescue Standby',         location: 'Elevators',      priority: 'high',     done: false, alertId: 'a3', note: '' },
]

export const INCIDENT_TYPES = [
  'Intrusion Attempt',
  'Unauthorized Access',
  'Loitering',
  'After Hours Presence',
  'Tailgating',
  'Emergency Distress',
  'Fire Alert',
  'Physical Altercation',
]

export const LOCATIONS = [
  // Floor 1
  'Server Room', 'Meeting Room', 'Multi-Purpose Room', 'Gathering Area',
  'Conference Room', 'Canteen', 'Lobby',
  // Floor 2
  'CEO Office', 'Manager Office', 'Executive Office', 'Office Area', 'Control Room',
  // Underground
  'Parking Lot', 'Storage',
  // Legacy / outdoor
  'Main Entrance', 'Front Door', 'Back Door', 'Smoking Area', 'Rooftop', 'Hallway',
]
