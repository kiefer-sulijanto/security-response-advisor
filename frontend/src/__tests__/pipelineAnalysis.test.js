import { vi, describe, it, expect, beforeEach } from 'vitest'

// Must be declared before importing the module under test.
// Vitest hoists vi.mock() calls automatically.
vi.mock('../services/api.js', () => ({
  api: { processCctvFrame: vi.fn() },
}))

import { api } from '../services/api.js'
import { runPipelineMultiFrameAnalysis } from '../services/pipelineAnalysis.js'

const GREEN_RESPONSE = { results: [] }
const RED_RESPONSE = {
  results: [{
    is_system_error: false,
    advisory: { flag: 'Red', description: 'Threat', explanation: 'fight', actions: ['Respond'] },
    incident_data: { name: 'physical_altercation' },
  }],
}
const YELLOW_RESPONSE = {
  results: [{
    is_system_error: false,
    advisory: { flag: 'Yellow', description: 'Caution', explanation: 'loitering', actions: ['Monitor'] },
    incident_data: { name: 'loitering' },
  }],
}

beforeEach(() => vi.clearAllMocks())

describe('runPipelineMultiFrameAnalysis — flag aggregation', () => {
  it('returns green when all frames produce no incidents', async () => {
    api.processCctvFrame.mockResolvedValue(GREEN_RESPONSE)
    const result = await runPipelineMultiFrameAnalysis(['f1', 'f2'])
    expect(result.flag).toBe('green')
  })

  it('returns red when any frame triggers a red advisory', async () => {
    api.processCctvFrame
      .mockResolvedValueOnce(GREEN_RESPONSE)
      .mockResolvedValueOnce(RED_RESPONSE)
      .mockResolvedValueOnce(GREEN_RESPONSE)
    const result = await runPipelineMultiFrameAnalysis(['f1', 'f2', 'f3'], { earlyStopFlagLevels: [] })
    expect(result.flag).toBe('red')
  })

  it('picks red over yellow when both are present', async () => {
    api.processCctvFrame
      .mockResolvedValueOnce(YELLOW_RESPONSE)
      .mockResolvedValueOnce(RED_RESPONSE)
    const result = await runPipelineMultiFrameAnalysis(['f1', 'f2'], { earlyStopFlagLevels: [] })
    expect(result.flag).toBe('red')
  })
})

describe('runPipelineMultiFrameAnalysis — snapshotBase64 memory fix', () => {
  it('attaches snapshotBase64 only to the worst-flagged frame', async () => {
    // f1=green, f2=red (worst), f3=green — only f2 should keep snapshotBase64
    api.processCctvFrame
      .mockResolvedValueOnce(GREEN_RESPONSE)
      .mockResolvedValueOnce(RED_RESPONSE)
      .mockResolvedValueOnce(GREEN_RESPONSE)
    const result = await runPipelineMultiFrameAnalysis(['f1', 'f2', 'f3'], { earlyStopFlagLevels: [] })
    expect(result.snapshotBase64).toBe('f2')
  })

  it('updates snapshotBase64 when a later frame is worse', async () => {
    // f1=yellow (first worst), f2=red (new worst) — should end up with f2
    api.processCctvFrame
      .mockResolvedValueOnce(YELLOW_RESPONSE)
      .mockResolvedValueOnce(RED_RESPONSE)
    const result = await runPipelineMultiFrameAnalysis(['f1', 'f2'], { earlyStopFlagLevels: [] })
    expect(result.snapshotBase64).toBe('f2')
  })
})

describe('runPipelineMultiFrameAnalysis — early stop', () => {
  it('stops after the first red frame by default', async () => {
    api.processCctvFrame
      .mockResolvedValueOnce(RED_RESPONSE)
      .mockResolvedValue(GREEN_RESPONSE)
    const result = await runPipelineMultiFrameAnalysis(['f1', 'f2', 'f3'])
    expect(result.stoppedEarly).toBe(true)
    expect(api.processCctvFrame).toHaveBeenCalledTimes(1)
  })

  it('does not stop early on yellow flag alone (only red triggers flag stop)', async () => {
    // Use a high hit threshold so repeated-incident stop doesn't interfere
    api.processCctvFrame.mockResolvedValue(YELLOW_RESPONSE)
    const result = await runPipelineMultiFrameAnalysis(
      ['f1', 'f2', 'f3'],
      { earlyStopHitThreshold: 100 },
    )
    expect(result.stoppedEarly).toBe(false)
    expect(api.processCctvFrame).toHaveBeenCalledTimes(3)
  })

  it('stops early after N repeated incidents', async () => {
    api.processCctvFrame.mockResolvedValue(YELLOW_RESPONSE)
    const result = await runPipelineMultiFrameAnalysis(
      ['f1', 'f2', 'f3', 'f4'],
      { earlyStopFlagLevels: [], earlyStopHitThreshold: 2 },
    )
    expect(result.stoppedEarly).toBe(true)
    expect(api.processCctvFrame).toHaveBeenCalledTimes(2)
  })
})
