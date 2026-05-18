import { describe, it, expect } from 'vitest'

// Tests for the AlertsPage sort fix.
// Previously: PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
// With an unknown priority this produced NaN, causing unpredictable sort order.
// Fixed: (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

function sortAlerts(alerts) {
  return [...alerts].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99),
  )
}

describe('AlertsPage sort', () => {
  it('sorts critical before high before medium before low', () => {
    const alerts = [
      { id: 'low',      priority: 'low'      },
      { id: 'critical', priority: 'critical' },
      { id: 'medium',   priority: 'medium'   },
      { id: 'high',     priority: 'high'     },
    ]
    const sorted = sortAlerts(alerts)
    expect(sorted.map(a => a.id)).toEqual(['critical', 'high', 'medium', 'low'])
  })

  it('puts undefined priority at the end (not NaN-corrupted)', () => {
    const alerts = [
      { id: 'unknown',  priority: undefined  },
      { id: 'critical', priority: 'critical' },
    ]
    const sorted = sortAlerts(alerts)
    expect(sorted[0].id).toBe('critical')
    expect(sorted[1].id).toBe('unknown')
  })

  it('puts unknown string priority at the end', () => {
    const alerts = [
      { id: 'typo', priority: 'CRITICAL' },  // wrong casing
      { id: 'low',  priority: 'low'      },
    ]
    const sorted = sortAlerts(alerts)
    expect(sorted[0].id).toBe('low')
    expect(sorted[1].id).toBe('typo')
  })

  it('is stable for equal priorities', () => {
    const alerts = [
      { id: 'a', priority: 'high' },
      { id: 'b', priority: 'high' },
    ]
    const sorted = sortAlerts(alerts)
    expect(sorted.map(a => a.id)).toEqual(['a', 'b'])
  })

  it('handles empty array', () => {
    expect(sortAlerts([])).toEqual([])
  })
})
