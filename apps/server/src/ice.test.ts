import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearIceCache, getIceServers } from './ice'

const env = { CF_TURN_KEY_ID: 'key', CF_TURN_API_TOKEN: 'token' }

const cloudflareResponse = {
  iceServers: [
    { urls: ['stun:stun.cloudflare.com:3478'] },
    {
      urls: [
        'turn:turn.cloudflare.com:3478?transport=udp',
        'turn:turn.cloudflare.com:53?transport=udp',
        'turns:turn.cloudflare.com:443?transport=tcp',
      ],
      username: 'u',
      credential: 'c',
    },
  ],
}

beforeEach(() => {
  clearIceCache()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

function mockFetch(response: Response) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
}

describe('getIceServers', () => {
  it('uses stun only when turn is not configured', async () => {
    const fetch = mockFetch(new Response())
    expect(await getIceServers({})).toEqual([{ urls: 'stun:stun.cloudflare.com:3478' }])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('gets turn credentials from cloudflare and drops port 53', async () => {
    mockFetch(Response.json(cloudflareResponse, { status: 201 }))
    const servers = await getIceServers(env)

    expect(servers[1]).toEqual({
      urls: [
        'turn:turn.cloudflare.com:3478?transport=udp',
        'turns:turn.cloudflare.com:443?transport=tcp',
      ],
      username: 'u',
      credential: 'c',
    })
  })

  it('reuses credentials instead of asking every time', async () => {
    const fetch = mockFetch(Response.json(cloudflareResponse, { status: 201 }))
    await getIceServers(env, 0)
    await getIceServers(env, 60_000)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('falls back to stun if cloudflare fails', async () => {
    mockFetch(new Response('nope', { status: 401 }))
    expect(await getIceServers(env)).toEqual([{ urls: 'stun:stun.cloudflare.com:3478' }])
  })
})
