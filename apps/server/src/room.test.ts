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

    expect(a.inbox).toEqual([{ type: 'state', players: [['b', 1, 2, 0.5]] }])
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

  it('sends emotes to everyone but not too often', () => {
    const room = new Room()
    const a = fakeClient()
    room.join('a', 'Alice', 'male_09', a.send)

    expect(room.emote('a', 'Wave', 1000)).toBe(true)
    expect(room.emote('a', 'Clap', 1500)).toBe(false) // still in cooldown
    expect(room.emote('a', 'Clap', 3000)).toBe(true)
    expect(a.inbox.filter((m) => m.type === 'emote')).toEqual([
      { type: 'emote', from: 'a', name: 'Wave' },
      { type: 'emote', from: 'a', name: 'Clap' },
    ])
  })

  it('rounds positions to centimeters to keep updates small', () => {
    const room = new Room()
    const a = fakeClient()
    room.join('a', 'Alice', 'male_09', a.send, { x: 0, y: 0, z: 0 })
    room.join('b', 'Bob', 'male_09', () => {}, { x: 0, y: 0, z: 0 })
    room.move('b', { x: 1.234567, y: 0, z: -2.345678 }, 0.123456)
    room.tick()
    expect(a.inbox.at(-1)).toEqual({ type: 'state', players: [['b', 1.23, -2.35, 0.12]] })
  })

  it('only sends updates about people nearby', () => {
    const room = new Room()
    const near = fakeClient()
    const far = fakeClient()
    room.join('near', 'Near', 'male_09', near.send, { x: 0, y: 0, z: 0 })
    room.join('far', 'Far', 'male_09', far.send, { x: 400, y: 0, z: 0 })
    room.join('c', 'Cara', 'male_09', () => {}, { x: 0, y: 0, z: 0 })
    room.tick() // sorts out who can see who
    near.inbox.length = far.inbox.length = 0

    room.move('c', { x: 5, y: 0, z: 0 }, 0)
    room.tick()

    expect(near.inbox).toEqual([{ type: 'state', players: [['c', 5, 0, 0]] }])
    expect(far.inbox).toEqual([])
  })

  it('tells you when someone goes out of range, and when they come back', () => {
    const room = new Room()
    const a = fakeClient()
    room.join('a', 'Alice', 'male_09', a.send, { x: 0, y: 0, z: 0 })
    room.join('b', 'Bob', 'male_09', () => {}, { x: 0, y: 0, z: 0 })
    room.tick()
    a.inbox.length = 0

    room.move('b', { x: 300, y: 0, z: 0 }, 0)
    room.tick()
    expect(a.inbox).toEqual([{ type: 'out-of-view', ids: ['b'] }])

    // standing still out there, nothing more to say
    room.tick()
    expect(a.inbox).toHaveLength(1)

    room.move('b', { x: 10, y: 0, z: 0 }, 0)
    room.tick()
    expect(a.inbox.at(-1)).toEqual({ type: 'state', players: [['b', 10, 0, 0]] })
  })

  it('hides people who were already far away when you joined', () => {
    const room = new Room()
    room.join('far', 'Far', 'male_09', () => {}, { x: 400, y: 0, z: 0 })
    const a = fakeClient()
    room.join('a', 'Alice', 'male_09', a.send, { x: 0, y: 0, z: 0 })
    room.tick()
    expect(a.inbox).toContainEqual({ type: 'out-of-view', ids: ['far'] })
  })

  it('does not send you your own position', () => {
    const room = new Room()
    const a = fakeClient()
    room.join('a', 'Alice', 'male_09', a.send)
    a.inbox.length = 0
    room.move('a', { x: 1, y: 0, z: 1 }, 0)
    room.tick()
    expect(a.inbox).toEqual([])
  })
})
