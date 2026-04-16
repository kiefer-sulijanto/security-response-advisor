// Mock data — replace with real API calls when backend is ready

export const SHIFTS = [
  { id: 'morning',   label: 'Morning Shift',   time: '07:00 – 15:00' },
  { id: 'afternoon', label: 'Afternoon Shift',  time: '15:00 – 23:00' },
  { id: 'night',     label: 'Night Shift',      time: '23:00 – 07:00' },
]

export const INITIAL_ALERTS = [
  {
    id: 'a1',
    priority: 'critical',
    type: 'Intrusion Attempt',
    location: 'Basement',
    instruction: 'Proceed immediately to the basement. Unidentified individual detected near the server room door. Do NOT approach alone. Contact backup and report on arrival.',
    timestamp: '09:14',
    status: 'unread',
    source: 'Command Center (AI)',
  },
  {
    id: 'a2',
    priority: 'critical',
    type: 'Fire Alert',
    location: 'Smoking Area',
    instruction: 'Fire alarm triggered at smoking area. Check for smoke and report to Command Center before entering. Ensure area is clear.',
    timestamp: '09:22',
    status: 'acknowledged',
    source: 'Fire Alarm System',
  },
  {
    id: 'a3',
    priority: 'high',
    type: 'Emergency Distress',
    location: 'Elevators',
    instruction: 'Passenger trapped in elevator. Contact building facilities and standby at the elevators. Update Command Center every 5 minutes.',
    timestamp: '09:35',
    status: 'in_progress',
    source: 'Lift Monitoring',
  },
  {
    id: 'a4',
    priority: 'high',
    type: 'Tailgating',
    location: 'Server Room',
    instruction: 'Tailgating detected at Server Room. Verify access logs, check for unauthorised persons, and report findings.',
    timestamp: '10:02',
    status: 'unread',
    source: 'C2 System',
  },
  {
    id: 'a5',
    priority: 'medium',
    type: 'Loitering',
    location: 'Parking Lot',
    instruction: 'Individual detected loitering in the parking lot for over 30 minutes. Verify identity and ask person to move. Report outcome.',
    timestamp: '10:18',
    status: 'resolved',
    source: 'Command Center (AI)',
  },
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
  'Main Entrance', 'Front Door', 'Basement','Canteen','Smoking Area',
  'Back Door', 'Staircase','Meeting Room','Server Room','Rooftop',
  'Hallway','Storage','Control Room', 'Parking Lot','Elevators'
]
