import { SERVER_PORT, type ClientMessage, type ServerMessage } from '@quad/shared'
import { pushSnapshot } from '../game/interpolation'
import { snapshots, useGame } from './store'

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ?? `ws://${window.location.hostname}:${SERVER_PORT}`

let socket: WebSocket | null = null

export function connect(name: string) {
  socket?.close()
  snapshots.clear()
  useGame.setState({ status: 'connecting', me: null, players: {} })

  const ws = new WebSocket(SERVER_URL)
  socket = ws
  ws.onopen = () => send({ type: 'join', name })
  ws.onmessage = (e) => handle(JSON.parse(e.data))
  ws.onclose = () => {
    // ignore old sockets closing after a reconnect
    if (socket === ws) useGame.setState({ status: 'disconnected' })
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
      // voice chat, next milestone
      break
  }
}
