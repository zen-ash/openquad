import type { PlayerInfo, ServerMessage, SignalData, Vec3 } from '@quad/shared'

type Send = (msg: ServerMessage) => void

type Member = {
  info: PlayerInfo
  send: Send
  moved: boolean
  // when their recent chat messages were sent, for the rate limit
  chatTimes: number[]
}

const SPAWN_RADIUS = 3
// at most this many chat messages per window, anything past that is dropped
const CHAT_LIMIT = 5
const CHAT_WINDOW = 5000

function spawnPoint(): Vec3 {
  const angle = Math.random() * Math.PI * 2
  return { x: Math.cos(angle) * SPAWN_RADIUS, y: 0, z: Math.sin(angle) * SPAWN_RADIUS }
}

/**
 * Keeps track of everyone on the quad. Doesn't know about sockets at all,
 * it just gets a send function per player (makes it easy to test).
 */
export class Room {
  private members = new Map<string, Member>()

  get size() {
    return this.members.size
  }

  join(id: string, name: string, avatar: string, send: Send, position = spawnPoint()) {
    const info: PlayerInfo = { id, name, avatar, position, heading: 0 }

    send({ type: 'welcome', you: info, players: [...this.members.values()].map((m) => m.info) })
    this.broadcast({ type: 'player-joined', player: info })

    this.members.set(id, { info, send, moved: false, chatTimes: [] })
    return info
  }

  leave(id: string) {
    if (!this.members.delete(id)) return
    this.broadcast({ type: 'player-left', id })
  }

  move(id: string, position: Vec3, heading: number) {
    const member = this.members.get(id)
    if (!member) return
    member.info.position = position
    member.info.heading = heading
    member.moved = true
  }

  relaySignal(from: string, to: string, data: SignalData) {
    if (!this.members.has(from)) return
    this.members.get(to)?.send({ type: 'signal', from, data })
  }

  // returns false if it got dropped for spam
  chat(id: string, text: string, now = Date.now()) {
    const member = this.members.get(id)
    if (!member) return false
    member.chatTimes = member.chatTimes.filter((t) => now - t < CHAT_WINDOW)
    if (member.chatTimes.length >= CHAT_LIMIT) return false
    member.chatTimes.push(now)
    this.broadcast({ type: 'chat', from: id, name: member.info.name, text })
    return true
  }

  // called every tick - only sends people who actually moved
  tick() {
    const updates = []
    for (const m of this.members.values()) {
      if (!m.moved) continue
      m.moved = false
      updates.push({ id: m.info.id, position: m.info.position, heading: m.info.heading })
    }
    if (updates.length > 0) this.broadcast({ type: 'state', players: updates })
  }

  private broadcast(msg: ServerMessage) {
    for (const m of this.members.values()) m.send(msg)
  }
}
