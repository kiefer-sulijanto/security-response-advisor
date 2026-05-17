import { describe, it, expect } from 'vitest'

// Pure logic extracted from DashboardPage — tests the flag-based severity counts
// that were previously using segment color comparisons (s.color === C.red) and
// were fixed to use result.flag === "red" / "yellow".

function criticalCount(analyses) {
  return analyses.filter(a => a.result?.flag === 'red').length
}

function warningCount(analyses) {
  return analyses.filter(a => a.result?.flag === 'yellow').length
}

describe('Dashboard severity counts', () => {
  it('counts red-flagged analyses as critical', () => {
    const analyses = [
      { result: { flag: 'red' } },
      { result: { flag: 'yellow' } },
      { result: { flag: 'green' } },
    ]
    expect(criticalCount(analyses)).toBe(1)
  })

  it('counts yellow-flagged analyses as warnings', () => {
    const analyses = [
      { result: { flag: 'yellow' } },
      { result: { flag: 'yellow' } },
      { result: { flag: 'red' } },
    ]
    expect(warningCount(analyses)).toBe(2)
  })

  it('handles missing result gracefully via optional chaining', () => {
    const analyses = [{}, { result: null }, { result: undefined }, { result: {} }]
    expect(criticalCount(analyses)).toBe(0)
    expect(warningCount(analyses)).toBe(0)
  })

  it('returns zero when analyses array is empty', () => {
    expect(criticalCount([])).toBe(0)
    expect(warningCount([])).toBe(0)
  })

  it('flag comparison is case-sensitive and exact', () => {
    const analyses = [
      { result: { flag: 'Red' } },   // uppercase — should NOT count
      { result: { flag: 'RED' } },   // uppercase — should NOT count
      { result: { flag: 'red' } },   // correct
    ]
    expect(criticalCount(analyses)).toBe(1)
  })
})
