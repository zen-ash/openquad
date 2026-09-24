import {
  insideFence,
  VIEW_DISTANCE,
  type PlayerInfo,
  type PlayerUpdate,
  type ServerMessage,
  type SignalData,
  type Vec3,
} from '@quad/shared'

type Send = (msg: ServerMessage) => void

type Member = {
  info: PlayerInfo
  send: Send
  moved: boolean
  // when their recent chat messages were sent, for the rate limit
  chatTimes: number[]
  lastEmote: number
  // who this person currently gets updates about
  sees: Set<string>
}

const SPAWN_RADIUS = 3

const cm = (n: number) => Math.round(n * 100) / 100
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.z - b.z)
const update = ({ id, position, heading }: PlayerInfo): PlayerUpdate => [
  id,
  cm(position.x),
  cm(position.z),
  cm(heading),
]
// at most this many chat messages per window, anything past that is dropped
const CHAT_LIMIT = 5
const CHAT_WINDOW = 5000
// one emote at a time is plenty, stops people spamming the animation
const EMOTE_COOLDOWN = 1500

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
    // back from a reconnect you keep your spot, unless it's somewhere you can't be
    if (!insideFence(position.x, position.z)) position = spawnPoint()
    const info: PlayerInfo = { id, name, avatar, position, heading: 0 }

    send({ type: 'welcome', you: info, players: [...this.members.values()].map((m) => m.info) })
    this.broadcast({ type: 'player-joined', player: info })

    // they got everyone's position in the welcome, so start out "seeing" everyone. the next
    // tick sorts out who's actually in range and tells them to hide the rest
    const sees = new Set(this.members.keys())
    for (const m of this.members.values()) m.sees.add(id)
    this.members.set(id, { info, send, moved: false, chatTimes: [], lastEmote: -Infinity, sees })
    return info
  }

  leave(id: string) {
    if (!this.members.delete(id)) return
    for (const m of this.members.values()) m.sees.delete(id)
    this.broadcast({ type: 'player-left', id })
  }

  // returns false if it got ignored. the client keeps you inside the fence, so anything
  // past it is a modified client. everyone else keeps seeing you where you last were
  move(id: string, position: Vec3, heading: number) {
    const member = this.members.get(id)
    if (!member || !insideFence(position.x, position.z)) return false
    member.info.position = position
    member.info.heading = heading
    member.moved = true
    return true
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

  emote(id: string, name: string, now = Date.now()) {
    const member = this.members.get(id)
    if (!member || now - member.lastEmote < EMOTE_COOLDOWN) return false
    member.lastEmote = now
    this.broadcast({ type: 'emote', from: id, name })
    return true
  }

  // called every tick. you get updates about people near you who moved, plus anyone who
  // just came into range. people who went out of range get an 'out-of-view' so they
  // don't stay frozen on your screen where you last saw them
  tick() {
    const moved = new Map<string, PlayerUpdate>()
    for (const m of this.members.values()) {
      if (!m.moved) continue
      m.moved = false
      moved.set(m.info.id, update(m.info))
    }

    for (const viewer of this.members.values()) {
      const players: PlayerUpdate[] = []
      const gone: string[] = []
      for (const other of this.members.values()) {
        if (other === viewer) continue
        const id = other.info.id
        const close = distance(other.info.position, viewer.info.position) <= VIEW_DISTANCE
        const saw = viewer.sees.has(id)
        if (close && !saw) {
          viewer.sees.add(id)
          players.push(moved.get(id) ?? update(other.info))
        } else if (close && moved.has(id)) {
          players.push(moved.get(id)!)
        } else if (!close && saw) {
          viewer.sees.delete(id)
          gone.push(id)
        }
      }
      if (players.length > 0) viewer.send({ type: 'state', players })
      if (gone.length > 0) viewer.send({ type: 'out-of-view', ids: gone })
    }
  }

  private broadcast(msg: ServerMessage) {
    for (const m of this.members.values()) m.send(msg)
  }
}
