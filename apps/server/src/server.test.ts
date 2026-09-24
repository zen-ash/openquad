import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ServerMessage } from '@quad/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import { startServer } from './server'

let server: Awaited<ReturnType<typeof startServer>>
let url: string

beforeEach(async () => {
  server = await startServer(0) // 0 = any free port
  const { port } = server.http.address() as AddressInfo
  url = `ws://localhost:${port}/ws`
})

afterEach(() => server.close())

// connects and joins, collecting every message that comes back
async function connect(name: string, options?: { autoPong: boolean }) {
  const socket = new WebSocket(url, options)
  const inbox: ServerMessage[] = []
  socket.on('message', (raw) => inbox.push(JSON.parse(raw.toString())))
  await new Promise((resolve) => socket.once('open', resolve))
  socket.send(JSON.stringify({ type: 'join', name, avatar: 'male_09' }))

  const waitFor = async <T extends ServerMessage['type']>(type: T) => {
    for (let i = 0; i < 50; i++) {
      const found = inbox.find((m) => m.type === type)
      if (found) return found as Extract<ServerMessage, { type: T }>
      await new Promise((r) => setTimeout(r, 20))
    }
    throw new Error(`never got a ${type} message`)
  }

  return { socket, inbox, waitFor }
}

describe('server', () => {
  it('responds to health checks', async () => {
    const res = await fetch(url.replace('ws', 'http').replace('/ws', '/health'))
    expect(await res.json()).toEqual({ ok: true, players: 0 })
  })

  it('syncs movement between two players', async () => {
    const alice = await connect('Alice')
    const aliceId = (await alice.waitFor('welcome')).you.id

    const bob = await connect('Bob')
    const welcome = await bob.waitFor('welcome')
    expect(welcome.players.map((p) => p.name)).toEqual(['Alice'])

    alice.socket.send(JSON.stringify({ type: 'move', position: { x: 5, y: 0, z: 5 }, heading: 0 }))
    const state = await bob.waitFor('state')
    expect(state.players).toContainEqual([aliceId, 5, 5, 0])

    alice.socket.close()
    bob.socket.close()
  })

  it('lets everyone know when a player disconnects', async () => {
    const alice = await connect('Alice')
    await alice.waitFor('welcome')
    const bob = await connect('Bob')
    const bobId = (await bob.waitFor('welcome')).you.id

    bob.socket.close()
    const left = await alice.waitFor('player-left')
    expect(left.id).toBe(bobId)

    alice.socket.close()
  })

  it('hands out ice servers', async () => {
    const res = await fetch(url.replace('ws', 'http').replace('/ws', '/ice'))
    const servers = await res.json()
    expect(servers[0].urls).toContain('stun:')
  })
})

describe('heartbeat', () => {
  it('kicks players whose connection died', async () => {
    await server.close()
    server = await startServer(0, { heartbeatMs: 50 })
    const { port } = server.http.address() as AddressInfo
    url = `ws://localhost:${port}/ws`

    const alice = await connect('Alice')
    await alice.waitFor('welcome')
    // bob stops answering pings, like a laptop that got closed
    const bob = await connect('Bob', { autoPong: false })
    const bobId = (await bob.waitFor('welcome')).you.id

    const left = await alice.waitFor('player-left')
    expect(left.id).toBe(bobId)
    alice.socket.close()
  })
})

describe('serving the site', () => {
  let base: string

  beforeEach(async () => {
    // a tiny fake build
    const dir = mkdtempSync(join(tmpdir(), 'openquad-web-'))
    mkdirSync(join(dir, 'assets'))
    writeFileSync(join(dir, 'index.html'), '<script src="/assets/index-abc123.js"></script>')
    writeFileSync(join(dir, 'assets', 'index-abc123.js'), 'console.log(1)')
    await server.close()
    server = await startServer(0, { webDir: dir })
    base = `http://localhost:${(server.http.address() as AddressInfo).port}`
  })

  it('makes browsers check for a new index.html every time', async () => {
    for (const path of ['/', '/index.html', '/some/page']) {
      const res = await fetch(base + path)
      expect(res.headers.get('cache-control')).toBe('no-cache')
      expect(res.headers.get('etag')).toBeTruthy()
    }
  })

  it('answers 304 when the page did not change', async () => {
    const first = await fetch(base + '/')
    const again = await fetch(base + '/', {
      headers: { 'if-none-match': first.headers.get('etag')! },
    })
    expect(again.status).toBe(304)
  })

  it('lets browsers keep the hashed build files', async () => {
    const res = await fetch(base + '/assets/index-abc123.js')
    expect(res.headers.get('cache-control')).toContain('immutable')
  })
})
