import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { TICK_RATE } from '@quad/shared'
import sirv from 'sirv'
import { WebSocketServer, WebSocket } from 'ws'
import { getIceServers } from './ice'
import { parseMessage } from './messages'
import { Room } from './room'

type Options = {
  // built web app to serve. in dev vite serves it instead
  webDir?: string
  // how often to check for dead connections (laptop closed, wifi dropped)
  heartbeatMs?: number
}

export function startServer(port: number, { webDir, heartbeatMs = 30_000 }: Options = {}) {
  const room = new Room()
  const serveWeb = webDir && existsSync(webDir) ? sirv(webDir, { single: true }) : null

  const http = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, players: room.size }))
      return
    }
    if (req.url === '/ice') {
      void getIceServers().then((servers) => {
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
        res.end(JSON.stringify(servers))
      })
      return
    }
    if (serveWeb) return serveWeb(req, res)
    res.writeHead(404).end()
  })

  const wss = new WebSocketServer({ server: http, path: '/ws' })
  const alive = new WeakMap<WebSocket, boolean>()

  wss.on('connection', (socket) => {
    const id = randomUUID()
    let joined = false

    alive.set(socket, true)
    socket.on('pong', () => alive.set(socket, true))

    const send = (msg: unknown) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg))
    }

    socket.on('message', (raw) => {
      const msg = parseMessage(raw.toString())
      if (!msg) return

      if (msg.type === 'join') {
        if (joined) return
        joined = true
        room.join(id, msg.name, msg.avatar, send, msg.position)
        return
      }
      if (!joined) return

      if (msg.type === 'move') room.move(id, msg.position, msg.heading)
      else if (msg.type === 'signal') room.relaySignal(id, msg.to, msg.data)
      else if (msg.type === 'chat') room.chat(id, msg.text)
    })

    socket.on('close', () => room.leave(id))
  })

  const tick = setInterval(() => room.tick(), 1000 / TICK_RATE)

  // browsers answer pings on their own, even in background tabs. no answer since
  // the last ping = gone, so kick them instead of leaving a frozen player around
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!alive.get(socket)) {
        socket.terminate()
        continue
      }
      alive.set(socket, false)
      socket.ping()
    }
  }, heartbeatMs)

  return new Promise<{ http: Server; close: () => Promise<void> }>((resolve) => {
    http.listen(port, () => {
      resolve({
        http,
        close: () =>
          new Promise((done) => {
            clearInterval(tick)
            clearInterval(heartbeat)
            for (const client of wss.clients) client.terminate()
            wss.close()
            http.close(() => done())
          }),
      })
    })
  })
}
