import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Tests for demo-trigger/src/services/api.js
// Validates that resetDemoState sends the X-Demo-Secret header — the fix that
// prevents unauthenticated callers from wiping demo state.

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ status: 'reset' }),
  })
})

afterEach(() => vi.clearAllMocks())

describe('api.resetDemoState', () => {
  it('sends a POST request to /demo/reset', async () => {
    const { api } = await import('../services/api.js')
    await api.resetDemoState()
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toMatch(/\/demo\/reset$/)
    expect(opts.method).toBe('POST')
  })

  it('includes the X-Demo-Secret header', async () => {
    const { api } = await import('../services/api.js')
    await api.resetDemoState()
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers).toHaveProperty('X-Demo-Secret')
  })

  it('throws when the server returns 403', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Forbidden' }),
    })
    const { api } = await import('../services/api.js')
    await expect(api.resetDemoState()).rejects.toThrow('Forbidden')
  })

  it('throws a timeout error when request is aborted', async () => {
    mockFetch.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    const { api } = await import('../services/api.js')
    await expect(api.resetDemoState()).rejects.toThrow(/timed out/i)
  })
})
