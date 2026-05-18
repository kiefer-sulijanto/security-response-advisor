import { describe, it, expect } from 'vitest'

// Tests for the null-guard fix in ResultsPage:
//   (result.segments || []).filter(...)
// Previously `result.segments.filter(...)` crashed when segments was undefined.

const GREEN = '#22c55e'

function getIncidentSegments(segments) {
  return (segments || []).filter(s => s.color !== GREEN)
}

describe('ResultsPage segment null guard', () => {
  it('returns empty array when segments is null', () => {
    expect(getIncidentSegments(null)).toEqual([])
  })

  it('returns empty array when segments is undefined', () => {
    expect(getIncidentSegments(undefined)).toEqual([])
  })

  it('returns empty array when segments is empty', () => {
    expect(getIncidentSegments([])).toEqual([])
  })

  it('filters out green segments', () => {
    const segments = [
      { color: GREEN, label: 'All Clear' },
      { color: '#ef4444', label: 'Threat' },
    ]
    const result = getIncidentSegments(segments)
    expect(result).toHaveLength(1)
    expect(result[0].color).toBe('#ef4444')
  })

  it('keeps all segments when none are green', () => {
    const segments = [
      { color: '#ef4444', label: 'Threat' },
      { color: '#f59e0b', label: 'Caution' },
    ]
    expect(getIncidentSegments(segments)).toHaveLength(2)
  })

  it('returns empty array when all segments are green', () => {
    const segments = [
      { color: GREEN, label: 'All Clear' },
      { color: GREEN, label: 'Normal' },
    ]
    expect(getIncidentSegments(segments)).toHaveLength(0)
  })
})
