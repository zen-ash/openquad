import type { PlayerInfo, ServerMessage, SignalData, Vec3 } from '@quad/shared'

type Send = (msg: ServerMessage) => void

type Member = {
  info: PlayerInfo
  send: Send
  moved: boolean
}

const SPAWN_RADIUS = 3

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

  join(id: string, name: string, send: Send) {
    const info: PlayerInfo = { id, name, position: spawnPoint(), heading: 0 }

    send({ type: 'welcome', you: info, players: [...this.members.values()].map((m) => m.info) })
    this.broadcast({ type: 'player-joined', player: info })

    this.members.set(id, { info, send, moved: false })
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
