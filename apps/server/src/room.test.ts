import type { ServerMessage } from '@quad/shared'
import { describe, expect, it } from 'vitest'
import { Room } from './room'

function fakeClient() {
  const inbox: ServerMessage[] = []
  return { inbox, send: (msg: ServerMessage) => inbox.push(msg) }
}

describe('Room', () => {
  it('welcomes a new player with everyone already there', () => {
    const room = new Room()
    const a = fakeClient()
    const b = fakeClient()

    room.join('a', 'Alice', a.send)
    room.join('b', 'Bob', b.send)

    const welcome = b.inbox[0]
    expect(welcome?.type).toBe('welcome')
    if (welcome?.type !== 'welcome') return
    expect(welcome.you.id).toBe('b')
    expect(welcome.you.name).toBe('Bob')
    expect(welcome.players.map((p) => p.name)).toEqual(['Alice'])
  })

  it('tells existing players when someone joins or leaves', () => {
    const room = new Room()
    const a = fakeClient()
    room.join('a', 'Alice', a.send)
    room.join('b', 'Bob', () => {})
    room.leave('b')

    expect(a.inbox.map((m) => m.type)).toEqual(['welcome', 'player-joined', 'player-left'])
  })

  it('only sends players that moved since last tick', () => {
    const room = new Room()
    const a = fakeClient()
    room.join('a', 'Alice', a.send)
    room.join('b', 'Bob', () => {})
    a.inbox.length = 0

    room.move('b', { x: 1, y: 0, z: 2 }, 0.5)
    room.tick()
    room.tick() // nothing moved this time, shouldn't send anything

    expect(a.inbox).toEqual([
      { type: 'state', players: [{ id: 'b', position: { x: 1, y: 0, z: 2 }, heading: 0.5 }] },
    ])
  })

  it('relays signals only to the target player', () => {
    const room = new Room()
    const a = fakeClient()
    const b = fakeClient()
    const c = fakeClient()
    room.join('a', 'Alice', a.send)
    room.join('b', 'Bob', b.send)
    room.join('c', 'Cara', c.send)
    b.inbox.length = 0
    c.inbox.length = 0

    const data = { kind: 'candidate' as const, candidate: { foo: 1 } }
    room.relaySignal('a', 'b', data)

    expect(b.inbox).toEqual([{ type: 'signal', from: 'a', data }])
    expect(c.inbox).toEqual([])
  })
})
