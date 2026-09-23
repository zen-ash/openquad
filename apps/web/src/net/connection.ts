import type { ClientMessage, ServerMessage } from '@quad/shared'
import { pushSnapshot } from '../game/interpolation'
import { closeAll, closePeer, handleSignal } from '../voice/voice'
import { snapshots, useGame } from './store'

// same host the page came from. in dev vite passes /ws through to the game server
const SERVER_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

// free hosting puts the server to sleep if nothing comes in for a while. standing
// still and talking doesn't send anything, so poke it now and then
const KEEPALIVE_MS = 60_000

let socket: WebSocket | null = null
let keepalive: ReturnType<typeof setInterval> | undefined

export function connect(name: string) {
  socket?.close()
  closeAll()
  snapshots.clear()
  useGame.setState({ status: 'connecting', me: null, players: {} })

  const ws = new WebSocket(SERVER_URL)
  socket = ws
  ws.onopen = () => {
    send({ type: 'join', name })
    clearInterval(keepalive)
    keepalive = setInterval(() => send({ type: 'ping' }), KEEPALIVE_MS)
  }
  ws.onmessage = (e) => handle(JSON.parse(e.data))
  ws.onclose = () => {
    // ignore old sockets closing after a reconnect
    if (socket !== ws) return
    clearInterval(keepalive)
    closeAll()
    useGame.setState({ status: 'disconnected' })
  }
}

export function send(msg: ClientMessage) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg))
}

function handle(msg: ServerMessage) {
  const now = performance.now()

  switch (msg.type) {
    case 'welcome': {
      const players: Record<string, string> = {}
      for (const p of msg.players) {
        players[p.id] = p.name
        snapshots.set(p.id, [{ t: now, x: p.position.x, z: p.position.z, heading: p.heading }])
      }
      useGame.setState({ status: 'connected', me: msg.you, players })
      break
    }
    case 'player-joined': {
      const p = msg.player
      snapshots.set(p.id, [{ t: now, x: p.position.x, z: p.position.z, heading: p.heading }])
      useGame.setState((s) => ({ players: { ...s.players, [p.id]: p.name } }))
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
      for (const p of msg.players) {
        const buffer = snapshots.get(p.id)
        if (!buffer) continue // this includes ourselves
        pushSnapshot(buffer, { t: now, x: p.position.x, z: p.position.z, heading: p.heading })
      }
      break
    case 'signal':
      handleSignal(msg.from, msg.data)
      break
  }
}
