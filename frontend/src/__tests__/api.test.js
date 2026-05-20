import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { api } from '../services/api.js'

// Builds a minimal fetch mock that returns the given status and body.
function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(200, {}))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api — request construction', () => {
  it('sends a GET request to the incidents endpoint', async () => {
    vi.stubGlobal('fetch', mockFetch(200, []))
    await api.getIncidents()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/incidents'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('sends a POST request with a JSON-serialised body', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { id: 1 }))
    await api.createIncident({ type: 'theft' })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/incidents'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ type: 'theft' }),
      }),
    )
  })

  it('sends a PATCH request with the correct id in the URL', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { id: 7 }))
    await api.updateIncident(7, { status: 'resolved' })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/incidents/7'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('omits Content-Type and body for GET requests', async () => {
    vi.stubGlobal('fetch', mockFetch(200, []))
    await api.getOfficers()
    const [, options] = fetch.mock.calls[0]
    expect(options.body).toBeUndefined()
    expect(options.headers?.['Content-Type']).toBeUndefined()
  })
})

describe('api — success responses', () => {
  it('returns the parsed JSON on a 200 response', async () => {
    vi.stubGlobal('fetch', mockFetch(200, [{ id: 1, status: 'open' }]))
    const result = await api.getIncidents()
    expect(result).toEqual([{ id: 1, status: 'open' }])
  })

  it('returns the parsed JSON for a POST response', async () => {
    vi.stubGlobal('fetch', mockFetch(201, { id: 42 }))
    const result = await api.createDispatch({ officerId: 3, incidentId: 5 })
    expect(result).toEqual({ id: 42 })
  })
})

describe('api — error responses', () => {
  it('throws using err.detail when present', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: 'Bad request detail' }),
    }))
    await expect(api.getIncidents()).rejects.toThrow('Bad request detail')
  })

  it('throws using err.error when detail is absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ error: 'Validation failed' }),
    }))
    await expect(api.getIncidents()).rejects.toThrow('Validation failed')
  })

  it('falls back to "HTTP <status>" when no detail or error field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    }))
    await expect(api.getIncidents()).rejects.toThrow('HTTP 500')
  })

  it('falls back to "HTTP <status>" when the error body is unparseable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.reject(new SyntaxError('bad json')),
    }))
    await expect(api.getIncidents()).rejects.toThrow('HTTP 503')
  })
})

describe('api — endpoint smoke tests', () => {
  it('getOfficers calls the officers endpoint', async () => {
    vi.stubGlobal('fetch', mockFetch(200, []))
    await api.getOfficers()
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/officers'), expect.anything())
  })

  it('getDispatches calls the dispatches endpoint', async () => {
    vi.stubGlobal('fetch', mockFetch(200, []))
    await api.getDispatches()
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/dispatches'), expect.anything())
  })

  it('analyze calls the analyze endpoint', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { flag: 'green' }))
    await api.analyze({ frames: [] })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/analyze'), expect.anything())
  })
})
