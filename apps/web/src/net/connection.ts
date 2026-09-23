import type { ClientMessage, PlayerInfo, ServerMessage, Vec3 } from '@quad/shared'
import { pushSnapshot } from '../game/interpolation'
import { localPlayer } from '../game/localPlayer'
import { closeAll, closePeer, handleSignal } from '../voice/voice'
import { addChat } from './chat'
import { startEmote } from './emotes'
import { snapshots, useGame, type Person } from './store'

// same host the page came from. in dev vite passes /ws through to the game server
const SERVER_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

// free hosting puts the server to sleep if nothing comes in for a while. standing
// still and talking doesn't send anything, so poke it now and then
const KEEPALIVE_MS = 60_000

// how long to wait before each reconnect try. keeps using the last one after that
const RETRY_DELAYS = [500, 1000, 2000, 4000, 8000]

let socket: WebSocket | null = null
let keepalive: ReturnType<typeof setInterval> | undefined
let retry: ReturnType<typeof setTimeout> | undefined
let attempts = 0
let joinAs = { name: '', avatar: '' }

export function connect(name: string, avatar: string) {
  joinAs = { name, avatar }
  attempts = 0
  useGame.setState({ status: 'connecting', me: null, players: {} })
  open()
}

function open(position?: Vec3) {
  clearTimeout(retry)
  socket?.close()
  closeAll()
  snapshots.clear()

  const ws = new WebSocket(SERVER_URL)
  socket = ws
  ws.onopen = () => {
    send({ type: 'join', ...joinAs, ...(position && { position }) })
    clearInterval(keepalive)
    keepalive = setInterval(() => send({ type: 'ping' }), KEEPALIVE_MS)
  }
  ws.onmessage = (e) => handle(JSON.parse(e.data))
  ws.onclose = () => {
    // ignore old sockets closing after we already opened a new one
    if (socket !== ws) return
    clearInterval(keepalive)
    closeAll()

    // never got in at all, back to the join screen
    if (!useGame.getState().me) {
      useGame.setState({ status: 'disconnected' })
      return
    }

    // wifi blip, server restart, laptop woke up... keep the game on screen and quietly
    // try again, coming back in at the same spot
    snapshots.clear()
    useGame.setState({ status: 'reconnecting', players: {} })
    const delay = RETRY_DELAYS[Math.min(attempts++, RETRY_DELAYS.length - 1)]
    retry = setTimeout(() => open({ x: localPlayer.x, y: 0, z: localPlayer.z }), delay)
  }
}

export function send(msg: ClientMessage) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg))
}

// for the e2e tests, acts like the connection dropped
export function dropConnection() {
  socket?.close()
}

const person = (p: PlayerInfo): Person => ({ name: p.name, avatar: p.avatar })

function handle(msg: ServerMessage) {
  const now = performance.now()

  switch (msg.type) {
    case 'welcome': {
      attempts = 0
      const players: Record<string, Person> = {}
      for (const p of msg.players) {
        players[p.id] = person(p)
        snapshots.set(p.id, [{ t: now, x: p.position.x, z: p.position.z, heading: p.heading }])
      }
      useGame.setState({ status: 'connected', me: msg.you, players })
      break
    }
    case 'player-joined': {
      const p = msg.player
      snapshots.set(p.id, [{ t: now, x: p.position.x, z: p.position.z, heading: p.heading }])
      useGame.setState((s) => ({ players: { ...s.players, [p.id]: person(p) } }))
      break
    }
    case 'player-left': {
      snapshots.delete(msg.id)
      closePeer(msg.id)
      useGame.setState((s) => {
        const players = { ...s.players }
        delete players[msg.id]
        return { players }
      })
      break
    }
    case 'state':
      for (const [id, x, z, heading] of msg.players) {
        const buffer = snapshots.get(id)
        // no buffer = they were out of view and just came back
        if (buffer) pushSnapshot(buffer, { t: now, x, z, heading })
        else snapshots.set(id, [{ t: now, x, z, heading }])
      }
      break
    case 'out-of-view':
      for (const id of msg.ids) snapshots.delete(id)
      break
    case 'signal':
      handleSignal(msg.from, msg.data)
      break
    case 'chat':
      addChat(msg.from, msg.name, msg.text)
      break
    case 'emote':
      // this includes our own, so you only wave if the server let it through
      startEmote(msg.from, msg.name)
      break
  }
}
