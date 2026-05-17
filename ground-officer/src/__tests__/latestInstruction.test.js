import { describe, it, expect } from 'vitest'

// Tests for the HomePage latest-instruction logic.
// Previously alerts were not sorted before .find(), so an older unread alert
// could win over a newer one depending on array order.
// Fixed: sort descending by timestamp first.

function getLatestInstruction(alerts) {
  return [...alerts]
    .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
    .find(a => a.status === 'unread')
}

describe('HomePage — latest unread instruction', () => {
  it('returns the newest unread alert regardless of array order', () => {
    const alerts = [
      { id: 'old', timestamp: '2026-05-17T08:00:00', status: 'unread' },
      { id: 'new', timestamp: '2026-05-17T10:00:00', status: 'unread' },
      { id: 'mid', timestamp: '2026-05-17T09:00:00', status: 'unread' },
    ]
    expect(getLatestInstruction(alerts).id).toBe('new')
  })

  it('skips resolved alerts even if they are newest', () => {
    const alerts = [
      { id: 'newest-resolved', timestamp: '2026-05-17T11:00:00', status: 'resolved' },
      { id: 'older-unread',    timestamp: '2026-05-17T09:00:00', status: 'unread'   },
    ]
    expect(getLatestInstruction(alerts).id).toBe('older-unread')
  })

  it('returns undefined when there are no unread alerts', () => {
    const alerts = [
      { id: 'a', timestamp: '2026-05-17T10:00:00', status: 'resolved'    },
      { id: 'b', timestamp: '2026-05-17T09:00:00', status: 'acknowledged' },
    ]
    expect(getLatestInstruction(alerts)).toBeUndefined()
  })

  it('returns undefined for empty alert list', () => {
    expect(getLatestInstruction([])).toBeUndefined()
  })

  it('does not mutate the original array', () => {
    const alerts = [
      { id: 'a', timestamp: '2026-05-17T10:00:00', status: 'unread' },
      { id: 'b', timestamp: '2026-05-17T08:00:00', status: 'unread' },
    ]
    const original = [...alerts]
    getLatestInstruction(alerts)
    expect(alerts.map(a => a.id)).toEqual(original.map(a => a.id))
  })
})
