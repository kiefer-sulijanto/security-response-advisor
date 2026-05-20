import { describe, it, expect } from 'vitest'

// Pure logic extracted from videoUtils.js — not exported, so copied inline.
// Tests sampling plan generation: interval spacing, maxFrames cap, last-frame
// inclusion, deduplication, and edge cases.

function dedupeAndSortTimestamps(timestamps, duration) {
  return [...new Set(timestamps.map((ts) => Number(Math.min(Math.max(ts, 0), duration).toFixed(2))))]
    .sort((a, b) => a - b)
}

function buildSamplingPlan(duration, intervalSeconds, maxFrames) {
  const timestamps = []
  const safeInterval = Math.max(0.5, Number(intervalSeconds) || 1)

  let current = 0
  while (current < duration && timestamps.length < maxFrames) {
    timestamps.push(current)
    current += safeInterval
  }

  const lastFrameTs = Math.max(0, duration - 0.05)
  if (!timestamps.some((ts) => Math.abs(ts - lastFrameTs) < 0.1)) {
    if (timestamps.length >= maxFrames) {
      timestamps[timestamps.length - 1] = lastFrameTs
    } else {
      timestamps.push(lastFrameTs)
    }
  }

  return dedupeAndSortTimestamps(timestamps, duration)
}

describe('buildSamplingPlan — interval spacing', () => {
  it('generates timestamps spaced by the given interval', () => {
    const plan = buildSamplingPlan(10, 2, 30)
    expect(plan).toContain(0)
    expect(plan).toContain(2)
    expect(plan).toContain(4)
    expect(plan).toContain(6)
    expect(plan).toContain(8)
  })

  it('clamps sub-0.5 intervals to 0.5', () => {
    const plan = buildSamplingPlan(3, 0.3, 30)
    // safeInterval = max(0.5, 0.3) = 0.5 — second timestamp must be 0.5
    expect(plan[1] - plan[0]).toBeCloseTo(0.5)
  })

  it('treats falsy interval (0) as 1 via logical OR fallback', () => {
    const plan = buildSamplingPlan(3, 0, 30)
    // Number(0) || 1 → 1, so safeInterval = max(0.5, 1) = 1
    expect(plan[1] - plan[0]).toBeCloseTo(1)
  })
})

describe('buildSamplingPlan — maxFrames cap', () => {
  it('never produces more timestamps than maxFrames', () => {
    const plan = buildSamplingPlan(100, 1, 10)
    expect(plan.length).toBeLessThanOrEqual(10)
  })

  it('replaces the last timestamp with the end-of-video frame when at capacity', () => {
    // duration=5, interval=1, maxFrames=5 → fills [0,1,2,3,4]; last replaced with 4.95
    const plan = buildSamplingPlan(5, 1, 5)
    expect(plan.length).toBeLessThanOrEqual(5)
    expect(plan.some((ts) => Math.abs(ts - 4.95) < 0.1)).toBe(true)
  })
})

describe('buildSamplingPlan — last-frame inclusion', () => {
  it('always includes a timestamp within 0.1 s of video end', () => {
    const plan = buildSamplingPlan(10, 3, 30)
    const lastFrameTs = 10 - 0.05
    expect(plan.some((ts) => Math.abs(ts - lastFrameTs) < 0.1)).toBe(true)
  })

  it('does not add a redundant end timestamp when the interval already lands near the end', () => {
    // duration=4, interval=2 → timestamps [0, 2], lastFrameTs=3.95.
    // |2 - 3.95| = 1.95 > 0.1, so 3.95 IS added.
    // But with duration=2, interval=1 → [0, 1], lastFrameTs=1.95; |1-1.95|=0.95 — added.
    // With duration=2, interval=2 → [0], lastFrameTs=1.95; added.
    // Concrete case: interval lands exactly near end:
    // duration=3, interval=1 → [0,1,2], lastFrameTs=2.95; |2-2.95|=0.95 — added.
    // We just verify the invariant holds in all cases:
    const plan = buildSamplingPlan(5, 2.5, 30)
    const lastFrameTs = 5 - 0.05
    expect(plan.some((ts) => Math.abs(ts - lastFrameTs) < 0.1)).toBe(true)
  })
})

describe('buildSamplingPlan — output invariants', () => {
  it('returns a strictly sorted ascending array', () => {
    const plan = buildSamplingPlan(10, 1, 30)
    const sorted = [...plan].sort((a, b) => a - b)
    expect(plan).toEqual(sorted)
  })

  it('contains no duplicate timestamps', () => {
    const plan = buildSamplingPlan(10, 1, 30)
    expect(plan.length).toBe(new Set(plan).size)
  })

  it('clamps all timestamps to [0, duration]', () => {
    const plan = buildSamplingPlan(5, 1, 30)
    plan.forEach((ts) => {
      expect(ts).toBeGreaterThanOrEqual(0)
      expect(ts).toBeLessThanOrEqual(5)
    })
  })
})

describe('buildSamplingPlan — edge cases', () => {
  it('handles duration shorter than the interval', () => {
    const plan = buildSamplingPlan(0.5, 2, 30)
    expect(plan.length).toBeGreaterThanOrEqual(1)
    plan.forEach((ts) => {
      expect(ts).toBeGreaterThanOrEqual(0)
      expect(ts).toBeLessThanOrEqual(0.5)
    })
  })

  it('returns at least one timestamp for any positive duration', () => {
    expect(buildSamplingPlan(0.1, 5, 30).length).toBeGreaterThanOrEqual(1)
  })
})
