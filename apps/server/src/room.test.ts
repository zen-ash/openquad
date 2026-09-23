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

    room.join('a', 'Alice', 'male_09', a.send)
    room.join('b', 'Bob', 'male_09', b.send)

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
    room.join('a', 'Alice', 'male_09', a.send)
    room.join('b', 'Bob', 'male_09', () => {})
    room.leave('b')

    expect(a.inbox.map((m) => m.type)).toEqual(['welcome', 'player-joined', 'player-left'])
  })

  it('only sends players that moved since last tick', () => {
    const room = new Room()
    const a = fakeClient()
    room.join('a', 'Alice', 'male_09', a.send)
    room.join('b', 'Bob', 'male_09', () => {})
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
    room.join('a', 'Alice', 'male_09', a.send)
    room.join('b', 'Bob', 'male_09', b.send)
    room.join('c', 'Cara', 'male_09', c.send)
    b.inbox.length = 0
    c.inbox.length = 0

    const data = { kind: 'candidate' as const, candidate: { foo: 1 } }
    room.relaySignal('a', 'b', data)

    expect(b.inbox).toEqual([{ type: 'signal', from: 'a', data }])
    expect(c.inbox).toEqual([])
  })

  it('starts you where you asked when reconnecting', () => {
    const room = new Room()
    const info = room.join('a', 'Alice', 'female_01', () => {}, { x: 40, y: 0, z: -12 })
    expect(info.position).toEqual({ x: 40, y: 0, z: -12 })
    expect(info.avatar).toBe('female_01')
  })

  it('sends chat to everyone, sender included', () => {
    const room = new Room()
    const a = fakeClient()
    const b = fakeClient()
    room.join('a', 'Alice', 'male_09', a.send)
    room.join('b', 'Bob', 'male_09', b.send)

    room.chat('a', 'hi everyone')

    const msg = { type: 'chat', from: 'a', name: 'Alice', text: 'hi everyone' }
    expect(a.inbox).toContainEqual(msg)
    expect(b.inbox).toContainEqual(msg)
  })

  it('drops chat spam', () => {
    const room = new Room()
    room.join('a', 'Alice', 'male_09', () => {})
    const sent = Array.from({ length: 8 }, (_, i) => room.chat('a', `msg ${i}`, 1000 + i))
    expect(sent.filter(Boolean)).toHaveLength(5)
    // fine again once the window has passed
    expect(room.chat('a', 'later', 7000)).toBe(true)
  })
})
